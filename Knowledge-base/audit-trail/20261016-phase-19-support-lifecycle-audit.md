# Phase 19 support ticket lifecycle audit (first slice)

**Date:** 16 October 2026
**Scope:** Admin-only ticket status, take/release/reassign assignment, append-only history, and in-app notifications
**Branch:** `codex/phase-19-support-lifecycle` (not merged; no code committed at the time of writing)
**Environment:** Orion demo Supabase project, synthetic data only. No real-user activation.

## Owner decisions implemented

Recorded in the pilot decision register (Amendment — 16 October 2026): admin-only status changes,
the available developer (an `admin` account) handles a ticket, every admin sees every ticket, ticket
attachments are allowed, notifications are in-app only. See the Phase 19 plan for the approved design.

## What was built

- Statuses `submitted`, `in_progress`, `awaiting_requester`, `resolved`, `closed`. Only an admin can
  change status; the database checks the actor and an allowed-move list. Replying never changes
  status; a closed ticket accepts no replies.
- Take, release, and reassign commands with row locking so two admins cannot take one ticket. Reopening
  makes the reopening admin the handler.
- Append-only `support_ticket_history` (IDs and codes only) and audit events without message content.
- In-app notification counts (navigation badge and per-ticket markers) carrying counts only. A ticket
  that is both unread and unassigned counts once.
- Migrations `20261016090000`, `20261016090100`, and `20261016090200` (privilege correction),
  Edge Function `support-tickets` actions `take`, `release`, `reassign`, `set-status`, `handlers`,
  `notifications`, and the support page, navigation badge, and status helpers.

## Adversarial review and fixes

An independent read-only review found: a reply-versus-close race (fixed with a row lock in
`send_support_ticket_message`), a notification badge that counted one new ticket twice (fixed with a
single distinct count), and a database test that could not fail (strengthened). Smaller fixes: admin
profile deletion no longer blocked by a held ticket, released tickets that wait on the requester count
as unassigned, focus returns to the handling controls after an action, the admin list refreshes
every 30 seconds, and a unit test now compares the browser status rules with the database rules.

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
  ship. The remaining failure in that file, "a patient can cancel a booked appointment", is caused by
  demo data: the demo psychiatrists have no open time in the two-week booking horizon.
- After these changes the support, accessibility, public-navigation, back-button, and performance
  specs passed (72 tests) and the unit tests passed (18 of 18).
- Running the whole authenticated suite in parallel produced one support failure that did not repeat
  when the support tests ran alone; the suites share demo accounts. Not investigated further.
- `npm run build` was not run in this pass.

## Not covered and still open

- Only one synthetic admin exists, so "already taken" and reassignment between two admins were not
  exercised against the database. Concurrent take/close was reasoned about, not load-tested.
- Not built from the Phase 19 plan: rate limits, abuse handling beyond closing with a reason, a support
  kill switch, the read-only Google Meet incident view, runbooks, retention and data-rights actions,
  and payment exception handling. Several depend on Phase 17 or on DPO and legal decisions.
- Attachments remain as built in September with no retention rule; retention follows the DPO decision.
- Production activation is not approved by this entry.
