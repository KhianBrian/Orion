# Phase 19 support ticket lifecycle audit (first slice)

> Historical first-slice record. Phase 19 was closed on 17 October 2026; see
> [20261017-phase-19-close-off-audit.md](20261017-phase-19-close-off-audit.md).

**Date:** 16 October 2026
**Scope:** Admin-only ticket status, append-only history, and in-app notifications. Tickets have no owner.
**Branch:** `codex/phase-19-support-lifecycle` (not merged; no code committed at the time of writing)
**Environment:** Orion demo Supabase project, synthetic data only. No real-user activation.

## Owner decisions implemented

Recorded in the pilot decision register (Amendment — 16 October 2026): admin-only status changes,
every admin sees every ticket and no ticket has an owner (an earlier same-day direction that the
available developer handles a ticket was withdrawn), ticket
attachments are allowed, notifications are in-app only. See the Phase 19 plan for the approved design.

## What was built

- Statuses `submitted`, `in_progress`, `awaiting_requester`, `resolved`, `closed`. Only an admin can
  change status; the database checks the actor and an allowed-move list. Replying never changes
  status; a closed ticket accepts no replies.
- Append-only `support_ticket_history` (IDs and codes only) and audit events without message content.
- In-app notification counts (navigation badge and per-ticket markers) carrying counts only.
- Migrations `20261016090000`, `20261016090100`, `20261016090200` (privilege correction), and
  `20261016090300` (removes the ownership surface, see below), Edge Function `support-tickets`
  actions `set-status` and `notifications`, and the support page, navigation badge, and status helpers.

## Ownership removed

The first build included take, release, reassign, and a handler field, following an earlier direction
that the available developer handles a ticket. The owners then stated that tickets are not ownable:
every admin sees every ticket, replies, and resolves it. Migration `20261016090300` drops those
commands, the `assigned_to` column, and the assignee history columns, and the page, function, tests,
and documents were updated. The earlier migrations stay as applied history.

## Adversarial review and fixes

An independent read-only review found: a reply-versus-close race (fixed with a row lock in
`send_support_ticket_message`), a notification badge that counted one new ticket twice (the double
count no longer exists once the unassigned count was removed), and a database test that could not fail
(strengthened). Smaller fixes: focus returns to the status controls after an action, the admin list
refreshes every 30 seconds, and a unit test compares the browser status rules with the database rules.

The database test then exposed a real defect the review could not see: Supabase gives `service_role`
full rights on new tables by default, so history rows could be deleted. Migration `20261016090200`
revokes that. Edits were already blocked by the trigger.

## Verification (exact results)

- `npm run lint`: passed. `npm run test:unit`: 18 of 18 passed.
- `npm run test:db:phase19` against the demo project: passed. The check cleaned up after itself.
- `tests/e2e/support.spec.js` with `RUN_SCHEDULING_E2E=1`, desktop and mobile: 8 of 8 passed, three
  separate runs, no test data left behind.
- Existing support tests were updated for the September wording (heading, label, warning text).
- A mobile layout bug already in `main` was fixed: the support page showed two columns on phones and
  overflowed the screen.
- `tests/e2e/scheduling.spec.js` "a signed-in account remains signed in across every restored public
  route" failed identically on unmodified `main`: the test matched the "Sign in to Orion" call to
  action in the page body. It now checks only the account menu and passes on desktop and mobile. That
  exposed a contrast failure on the account page's "Open" label (4.15:1), also already in `main`, now
  darkened to pass. The new notification badge also measured 4.16:1 and was darkened before it could
  ship. A second, separate failure in that
  file, "a patient can cancel a booked appointment" ("No available time found"), was first suspected to
  be demo data. Re-saving each demo psychiatrist's 08:00-17:00 hours regenerated 476 open slots each
  (slots are only generated for 14 days after a schedule is saved), and a leftover synthetic
  appointment outside published hours was cancelled through the psychiatrist cancellation command, but
  the test still failed. The real cause was the weekday: the suite-wide slot lands on Monday 26 October
  (10 days ahead, rolled past the weekend), and the cancellation test asked for "8 days ahead", which
  on a Friday is a Saturday that also rolls to the same Monday and hour. Its slot overlapped the
  already-booked one and the booking page hid it. The test now uses its own hour. A third failure,
  "a cancellation inside 24 hours is denied", had the same weekend roll-over: 12 hours ahead from a
  Friday evening became Monday, outside the 24-hour window, so the cancellation correctly succeeded.
  Near-term test slots now keep their real day. All 16 scheduling tests pass on desktop and mobile.
- After ownership was removed: lint passed, unit tests 18 of 18, the database checks passed, the support
  spec passed 8 of 8, and the accessibility, public-navigation, back-button, and performance specs
  passed (64 tests). The demo project has migrations through `20261016090300` and the matching function.
- Running the whole authenticated suite in parallel produced one support failure that did not repeat
  when the support tests ran alone; the suites share demo accounts. Not investigated further.
- `npm run build` was not run in this pass.

## Not covered and still open

- Only one synthetic admin exists, so what two admins see at once was not exercised. The queue has no
  per-admin filter, so every admin sees every ticket. Concurrent close and reply was reasoned about
  and covered by a row lock, not load-tested.
- Not built from the Phase 19 plan: rate limits, abuse handling beyond closing with a reason, a support
  kill switch, the read-only Google Meet incident view, runbooks, retention and data-rights actions,
  and payment exception handling. Several depend on Phase 17 or on DPO and legal decisions.
- Attachments remain as built in September with no retention rule; retention follows the DPO decision.
- Production activation is not approved by this entry.
