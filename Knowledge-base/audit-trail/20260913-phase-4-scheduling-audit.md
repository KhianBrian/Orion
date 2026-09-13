# Phase 4 scheduling implementation audit — 2026-09-13

## Scope and delivery record

Phase 4 implemented the approved single, server-authoritative appointment workflow. Development was
performed on branch `codex/phase-4-scheduling` in worktree `../Orion-phase-4`, then merged into local
`main` with merge commit `b2d6966` (`Merge Phase 4 scheduling workflow`). The temporary branch and
worktree were removed after the merge and the final combined work was later published from `main`.

The implementation remained synthetic and non-production. No real patient data, real identities, or
production consultation workflow was introduced. Phase 12 MFA remained deferred as approved.

## User-visible flow

1. A patient opens the appointment flow and sees active psychiatrists and protected, server-projected
   availability rather than a browser-owned mock slot list.
2. The patient selects a psychiatrist, date, and available time. The browser sends the selected slot
   identifier to the booking Edge Function; it does not decide whether the slot is still bookable.
3. The server validates the authenticated patient, email-confirmed state, requested slot, booking
   control, horizon, and current slot state. The database transaction locks the relevant row, derives
   the 45-minute appointment timestamps, creates the appointment, marks the slot booked, and records
   the audit event atomically.
4. A retry with the same idempotency key returns the same result safely. Two users attempting the same
   slot are serialized so only one can win, while the other receives a clear conflict.
5. Patients can cancel more than 24 hours before the session. The confirmation UI explains a denied
   cancellation when the boundary is reached, and a successful cancellation reopens the slot through
   the server transaction.
6. Psychiatrists can cancel their own sessions only more than 48 hours ahead and must provide a
   reason. Admins can perform administrative cancellations and must also provide a reason. These
   actions are separate from the patient cancellation path and are checked by role and ownership on
   the server.
7. Psychiatrists record completed, no-show, or cancelled outcomes. They can add protected session
   notes through a server-authorized path. Existing appointment history remains immutable; corrections
   are represented as audited actions rather than destructive edits.
8. A patient or psychiatrist can request a reschedule through the approved workflow. An authorized
   reviewer approves or rejects the request atomically, validates the requested replacement slot,
   and records the decision and reason in the audit trail.
9. Admins can control whether new booking is enabled through a server-side booking kill switch. This
   control is independent from meeting/video access and is tested in both enabled and disabled states.

## Implementation details

### Database and trust boundary

Migration `20260912184158_phase4_scheduling_workflow.sql` adds the Phase 4 lifecycle and protected
transactions. It preserves the existing appointment model while adding the outcome, cancellation,
reschedule, note, booking-control, idempotency, and audit behavior required by the phase.

The database is the final authority for ownership, role, state, time boundaries, slot locking,
conflict detection, and derived timestamps. Protected functions are not exposed as a general client
mutation surface. RLS and relationship-scoped projections limit what patients, assigned
psychiatrists, and admins can read.

The new Edge Functions validate the caller and payload, then invoke the protected server transaction:

- `appointment-outcome`
- `book-appointment`
- `booking-control`
- `cancel-admin-appointment`
- `cancel-appointment`
- `cancel-psychiatrist-appointment`
- `correct-appointment-outcome`
- `request-appointment-reschedule`
- `review-appointment-reschedule`
- `session-note`

The shared function helper accepts standard Supabase JWT claims and keeps service-role operations on
the server side. The forward-only migration `20260913090000_fix_session_note_lint.sql` preserves the
appointment row lock used for note authorization while replacing an unused row variable that caused
the pre-existing `create_session_note` migration-lint warning.

### Frontend

The duplicate mock booking route was replaced with the protected server workflow. Patient,
psychiatrist, and admin appointment surfaces now expose the approved actions, loading/empty/error/
conflict states, reason dialogs, outcomes, notes, and reschedule review using the existing Orion
theme, responsive spacing, typography, focus states, and accessible controls.

### Audit and safety

Important lifecycle changes write audit events with the acting user, action, affected appointment, and
reason or decision metadata where applicable. Idempotency and row locking protect retries and
concurrent requests. No migration rewrites applied history, and no appointment is silently moved or
deleted.

## Verification performed

### Static and application checks

- `npm run check:env-examples` — passed.
- `npm run lint` — passed.
- `npm run test:unit` — passed.
- `npm run build` — passed; the initial JavaScript bundle remained within the configured gzip budget.
- `git diff --check` — passed on the phase merge and final main comparison.

### Database, RLS, and migration checks

- Local Supabase was started with Docker and the database was reset/applied from forward-only
  migrations.
- Booking, cancellation, RLS, Phase 2 regression, and Phase 4 database scripts passed against the
  synthetic local project.
- Concurrency, retry/idempotency, ownership, cancellation boundaries, slot reopening, audit events,
  outcomes, notes, and reschedule authorization were exercised by the database checks.
- `supabase db lint --local` first exposed the pre-existing `create_session_note` unused-variable
  warning. The forward-only cleanup migration was added, then local lint returned `No schema errors
  found`.

### Browser checks

- The authenticated scheduling Playwright scenarios passed on desktop and mobile projects: 14 tests
  passed across seven scheduling behaviors and two browser projects.
- The complete integrated Playwright suite passed: 70 tests passed across its public, protected,
  scheduling, desktop, and mobile coverage.
- Coverage included patient booking, cancellation success and denial, psychiatrist/admin actions,
  rescheduling, schedule-aware availability, responsive UI, error/conflict states, and authorization
  allow/deny behavior.

### Linked non-production deployment

After the user confirmed `Orion-demo` as the target, the Phase 4 migration and the lint cleanup
migration were applied to the linked project. The Phase 4 Edge Functions were deployed and
`supabase migration list --linked` matched the local migration history. No remote Git branch was
created and no production environment was used.

## Remaining risks and boundaries

- This is synthetic, non-production evidence. It does not approve real users, real health data, real
  payments, or a controlled pilot.
- Hosted Supabase leaked-password protection remains disabled on the Free project and must be revisited
  before broader password-account use.
- Phase 12 MFA is intentionally deferred.
- Real payment-authorized booking belongs to Phase 17, and real Google Meet admission/timing belongs
  to Phase 18. Phase 4 must remain the shared scheduling foundation and must not grow competing paths.
