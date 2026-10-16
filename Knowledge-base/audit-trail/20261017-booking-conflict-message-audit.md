# Booking conflict message audit

**Date:** 17 October 2026
**Scope:** What a patient sees when another patient books the same or an overlapping time first
**Branch:** `codex/phase-19-support-lifecycle`
**Environment:** Orion demo Supabase project, synthetic data only.

## Finding

Booking already followed the usual best practice: the command locks the slot row and marks it booked
in one step, a unique index allows one active appointment per slot, and an exclusion constraint
(`appointments_no_overlapping_active_sessions`) forbids overlapping active sessions for one
psychiatrist. A race of four simultaneous requests for one slot, repeated five times, produced exactly
one booking each time, and a repeated request (double click) returned the same appointment.

The gap: when two patients booked different but overlapping times with the same psychiatrist at the
same instant, the database correctly admitted one, but the loser received a raw exclusion violation.
`book_appointment_for_patient` only handled unique violations, so the Edge Function returned a generic
500 and the page showed a generic failure instead of the clear conflict message.

## Change

- Migration `20261017090000_booking_overlap_reports_slot_unavailable.sql` makes the booking command
  treat an exclusion violation like a unique violation, so the loser receives `slot_unavailable` (409).
  Only the exception clause changed.
- The booking page message is now "That time was just booked by someone else. Please choose another
  time." and the availability list refreshes.
- Not changed: the reschedule approval path (`review_appointment_reschedule`) uses the same
  unique-violation-only pattern and would show the same generic failure to the approving psychiatrist
  on an overlap.

## Verification

- Before the fix, the new database check and the overlapping-slot browser test failed as expected; the
  same-slot browser test passed.
- After the fix: `npm run test:db:booking-conflict` passed (three same-slot rounds, three overlapping
  rounds, retry safety), `npm run test:db:booking` passed, and all 20 scheduling browser tests passed
  on desktop and mobile, including a patient who has the confirmation dialog open while a rival books
  first, for both the same slot and an overlapping slot.
- The test data was removed after each run.
- Weekend booking depends on each psychiatrist's schedule. The demo psychiatrists are currently set to
  all seven days by the temporary Phase 18 test-path schedule, so weekends are bookable in the demo.
