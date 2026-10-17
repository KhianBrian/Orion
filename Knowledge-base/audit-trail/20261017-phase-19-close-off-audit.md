# Phase 19 close-off audit

**Date:** 17 October 2026
**Scope:** Rate limits, reporting a recent call by ID, wider permission tests, and the close-off of Phase 19
**Branch:** `codex/phase-19-support-hardening`
**Environment:** Orion demo Supabase project, synthetic data only. No real-user activation.

This follows the first-slice audit [20261016-phase-19-support-lifecycle-audit.md](20261016-phase-19-support-lifecycle-audit.md)
and the [booking conflict audit](20261017-booking-conflict-message-audit.md).

## Owner direction

On 17 October 2026 the remaining Phase 19 work was limited to rate limits, wider permission tests, and a
way to report a recent call by its ID. A support on/off switch, an admin Google Meet problem view,
runbooks and drills, and a separate privacy-leak test pass were not required. Support tickets are kept
for a maximum of 1 year. These are recorded in the pilot decision register.

## What was built

- **Rate limits, enforced in the database.** Per person per rolling hour: 5 new tickets and 30 replies
  (admins exempt from the reply limit), 3 attachments per ticket (previously a browser-only limit) and
  10 attachments registered. A signed upload link is issued only after a reservation is recorded (10 per
  person per hour, and never when the ticket already has 3 attachments). Counting is serialised per
  person with an advisory lock so parallel requests cannot slip past. A repeated request with the same
  idempotency key returns the earlier result and is never refused. Over-limit requests return
  `support_rate_limited` (429) and the page shows a plain "please wait" message.
- **Report a recent call.** The new-ticket form lists the person's own calls from the last 14 days (or
  starting within the hour, not cancelled) with the other participant's name and a short call ID (the
  first 8 characters of the appointment ID). The chosen call's ID is stored on the ticket. Requesters see
  the short ID and time. Admins also see the full ID, status, and both participants' names, and can
  search the queue by call ID. The reference grants no access to the call or its notes and changes no
  appointment.
- **Wider permission tests.** `npm run test:support:permissions` signs in as each kind of user (two
  patients, two psychiatrists, an admin, and an anonymous caller) and checks the Edge Function, direct
  table reads, updates and deletes, the support commands, and private storage. `npm run
  test:db:support-hardening` covers the limits and the call rules. Browser tests cover the call report,
  the admin search by ID, the limit message, the signed-out redirect, and a patient opening admin pages.
- Migration `20261017100000_phase19_support_hardening.sql` and updates to the `support-tickets` Edge
  Function, the support page, and the status helpers.

## Adversarial review and fixes

An independent read-only review found no blocker. Fixed: limits that parallel requests could exceed
(advisory lock added), unbounded signed upload links (reservations added; the storage-count approach was
dropped because orphaned files would have locked a ticket's attachment slots permanently), a failed
attachment upload after the ticket was created being reported as "not submitted" and prompting a
duplicate ticket (the ticket now counts as submitted), a stale call picker, a call window that used the
end instead of the start time, unknown database errors reported as "not permitted" instead of a server
error, and tests that could not fail (admin reply exemption now seeded past 30, the permission checks now
use a real column per table and assert a permission refusal, and assertions no longer assume an empty
database). Accepted and left: a one-character call search matches many IDs, and the search has no live
result count.

## Verification (exact results)

- `npm run lint` passed; `npm run test:unit` 20 of 20.
- Database scripts all passed against the demo project: support-hardening, support permissions, phase19,
  phase15 (its stale create call was updated earlier), booking, booking-conflict, reschedule-conflict,
  cancellation, phase4, phase14, rls, phase2.
- Browser tests: support 14 of 14, scheduling 22 of 22, and accessibility, public-navigation,
  back-button, and performance 64 of 64, on desktop and mobile.
- No test data was left behind: no future booked appointments, tickets, upload reservations, or stored
  files remained.
- Not run: the production build, the security scan (no scan key is set), and the Direct WebRTC browser
  spec (that feature is shelved).

Phase 19 is closed for the approved scope. This entry does not approve real-user activation.
