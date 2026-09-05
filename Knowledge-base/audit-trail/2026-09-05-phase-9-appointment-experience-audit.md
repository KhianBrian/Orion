# Phase 9 appointment experience audit — 5 September 2026

## Scope and boundary

This audit records the completed Phase 9 appointment-experience slice for Orion's five-account
synthetic demo. It does not approve real accounts, clinical outcomes, rescheduling, no-show
handling, secretary workflows, contact details, or any controlled-pilot gate. Those lifecycle
extensions are deliberately deferred to [Phase 13](../engineering/phases/phase-13-appointment-outcomes-and-rescheduling.md).

## As built

- Applied migration `20260905090000_safe_appointment_projection.sql` to the hosted Supabase project.
  It adds `public.get_my_appointments()`, a `security definer` RPC that authenticates with
  `auth.uid()` and returns only appointment ID, start/end times, status, and the permitted
  counterpart display name. The patient receives the assigned psychiatrist's display name; only the
  assigned psychiatrist receives the patient's synthetic full name. No broad `profiles` read policy
  was added.
- Moved appointment reads and mutations into `src/features/appointments/`, using the Phase 7
  in-memory query boundary and invalidating affected appointment/availability data after booking or
  cancellation.
- Replaced the undifferentiated appointment grid with responsive upcoming and history sections,
  shared cards and status badges, and a `Join call` action during the existing allowed meeting window.
- Booking now ends with a dedicated confirmation panel that clearly identifies the booked
  psychiatrist, time, and next action instead of a transient green banner. UI-facing synthetic/demo
  wording was removed from the appointment and related account surfaces.
- Cancellation uses a native, centered, focus-restoring confirmation dialog with Escape, labelled
  close control, duplicate-submission protection, and clear keep/cancel actions. A server policy
  denial becomes a red destructive-state dialog that explains both the denial and the 24-hour
  cancellation policy without exposing server internals.
- Corrected a history-action defect: patient cancellation is now rendered only for an upcoming
  `booked` appointment. A past `booked` appointment remains history and has no cancellation action;
  the server remains the final authority for every cancellation request.
- Reset the synthetic account credentials through the provisioning script to support repeatable
  checks. The common development credential remains local ignored configuration and is not recorded
  in this audit.

## Verification evidence

| Command or check | Result | What it established |
| --- | --- | --- |
| `supabase db push` | Passed | The Phase 9 safe appointment-projection migration was applied to the configured hosted project. |
| `supabase migration list` | Passed | Local and remote both include version `20260905090000`. |
| `npm run test:db:rls` | Passed | An assigned psychiatrist can receive only the permitted synthetic patient display name; unrelated roles cannot obtain relationship-protected appointment data. |
| `npm run lint` | Passed | Appointment components, dialogs, copy changes, and tests are lint-clean. |
| `npm run test:unit` | Passed | Existing timing and client-state boundaries remain valid. |
| `npm run build` | Passed | The production bundle builds successfully. |
| `RUN_SCHEDULING_E2E=1 npx playwright test tests/e2e/scheduling.spec.js --grep 'a patient (books a slot|can cancel)'` | 4 passed | Booking and cancellation passed on Chromium desktop and Pixel 5 mobile, including the history action regression assertion. |
| Repeatable human checks | Passed by owner | The booking confirmation and cancellation-policy denial paths were exercised using the seeded synthetic accounts. |
| Visual browser checks | Passed | The booking and cancellation dialogs are centered at desktop and mobile viewports; confirmation and denial states have the intended presentation. |
| `git diff --check` | Passed | No whitespace errors in the working patch. |

## Remaining boundary

An appointment's place in history is currently determined from its recorded status and whether its
end time has passed. Passing time does not make it completed or no-show. A psychiatrist-recorded
outcome, a clinical grace period, outcome correction rules, and an atomic linked reschedule workflow
remain Phase 13 work, pending the owner and clinical decisions recorded in that phase.
