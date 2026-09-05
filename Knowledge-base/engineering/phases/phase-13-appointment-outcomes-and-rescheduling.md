# Phase 13 — Appointment Outcomes and Rescheduling

## Outcome

Appointment history communicates the recorded state of care rather than making clinical assumptions from the clock. Psychiatrists can record the appropriate post-appointment outcome, and an eligible patient can reschedule through a server-authoritative, auditable change that preserves both appointment records.

## Scope

- Add controlled outcome transitions from `booked` to `completed` or `no_show`, consistent with the [appointment lifecycle](../../product/appointment-lifecycle.md).
- Ensure a no-show is recorded by an authorized psychiatrist after the approved grace period; it must never be assigned automatically merely because an appointment has ended.
- Add a patient reschedule flow that is available only while the existing patient-cancellation policy allows it. The server must validate ownership, timing, availability, and idempotency, then cancel the original appointment and book the replacement atomically.
- Persist the relationship between the original and replacement appointments so history remains accurate and auditable. There is no canonical `rescheduled` status.
- Make appointment history status-aware: a past `booked` appointment awaiting a clinician-recorded outcome must not offer cancellation or be presented as a completed/no-show appointment.
- Extend the least-privilege appointment projection and tests only with fields that each role needs to see.
- Record outcome and reschedule audit events with the acting role, server time, source and resulting appointment IDs, and the policy decision used.

## Non-goals

- Automatically marking an appointment `completed` or `no_show` from `starts_at` or `ends_at`.
- A patient, psychiatrist, or administrator changing an outcome outside the approved role and audit rules.
- A standalone `rescheduled` status, a client-side cancel-then-book sequence, or an unlinked replacement appointment.
- No-show penalties, billing changes, notifications, session notes, or a general late-cancellation administration workflow.
- Production activation. The current synthetic-demo safety boundaries, RLS coverage, and server-authoritative time requirements remain in force.

## Dependencies

- Phase 9's as-built safe appointment projection, cancellation policy enforcement, and repeatable booking/cancellation checks.
- The canonical [appointment lifecycle](../../product/appointment-lifecycle.md), including its server-time rule and rescheduling model.
- The [access-control policy](../../product/access-control-and-demo-policy.md) and the pilot decision register's outstanding policy ratification.
- A schema review at implementation time to choose the minimal auditable representation for outcome metadata and linked original/replacement appointments.

## Decisions needed before implementation

- The clinical owner must set the late grace period after which a psychiatrist may record a no-show.
- The clinical owner must decide whether the recorded outcome distinguishes the absent party, and who may mark an appointment completed.
- The owner must ratify the current appointment lifecycle policy, including the reschedule and cancellation rules.
- The owner must define whether an incorrectly recorded outcome can be corrected, by whom, and what immutable audit trail that correction requires.

## Gate

Phase 13 may move to a detailed implementation plan only after the decisions above are recorded and Phase 9's as-built behavior remains verified. Its completion gate will require:

- Server-side transition checks for role, appointment ownership, current state, and authoritative time.
- Atomic, idempotent rescheduling that either preserves both linked records or makes no change.
- No automatic no-show/completion transitions, including in scheduled jobs and UI code.
- Status-aware history with no cancellation action on historical, cancelled, completed, or no-show appointments.
- RLS, policy-boundary, audit, and desktop/mobile human-check coverage for outcomes and rescheduling.

## Tier 2 status

Not yet drafted. The implementation plan must be written from the then-current database and application as-built state after the owner and clinical decisions above are ratified.
