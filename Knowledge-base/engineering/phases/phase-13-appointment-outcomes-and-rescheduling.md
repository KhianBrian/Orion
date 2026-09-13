# Phase 13 — Appointment Outcomes and Rescheduling

**Status:** Superseded — merged into Phase 4 for the current roadmap.

## Important Scope Note

The Phase 4 plan was expanded after the owner decisions were recorded. It now includes the baseline
appointment lifecycle, psychiatrist cancellation, patient rescheduling requests and approval,
completed/no-show outcomes, outcome correction, audit events, status-aware history, and the required
frontend surfaces.

Phase 13 must not implement a second version of those same flows. The owner decision is now recorded:
Phase 13 is merged into Phase 4 and is superseded as a separate implementation phase.

The decisions already recorded for the shared baseline are:

- The assigned psychiatrist records `completed` or `no_show`.
- No-show is manual, never automatic, and uses a 15-minute grace period.
- The absent party is recorded as patient or psychiatrist.
- Only admin may correct an outcome, with the original and correction retained in the audit trail.
- Patients may request rescheduling more than 24 hours before the appointment.
- The original appointment stays `booked` until the assigned psychiatrist approves; the requested slot
  remains open and is checked again at approval.
- The replacement is finalized atomically and remains linked to the original appointment.

These rules are authoritative in [Phase 4](phase-4-scheduling.md) until the scope is reconciled.

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

## Decisions already resolved by the Phase 4 contract

- The work remains part of Phase 4; Phase 13 is superseded for the current roadmap.
- No additional outcome or rescheduling capability is approved for a separate Phase 13.
- No-show consequences remain deferred: record the outcome only, with no penalty, fee, forfeiture, or
  automatic patient restriction.

## Gate

Phase 13 has no independent implementation gate. Its outcome and rescheduling requirements are part of
the Phase 4 gate, and the Phase 4 as-built audit is the evidence source for later phases.

The historical requirements below must not be implemented from this file separately:

- Server-side transition checks for role, appointment ownership, current state, and authoritative time.
- Atomic, idempotent rescheduling that either preserves both linked records or makes no change.
- No automatic no-show/completion transitions, including in scheduled jobs and UI code.
- Status-aware history with no cancellation action on historical, cancelled, completed, or no-show appointments.
- RLS, policy-boundary, audit, and desktop/mobile human-check coverage for outcomes and rescheduling.

## Tier 2 status

Not applicable as a separate plan. Phase 4 is the designated implementation plan for these requirements.

## UI/UX Rule

Any frontend work delivered through Phase 4 must match the current Orion theme and reuse the shared
buttons, colors, typography, spacing, dialogs, status messages, focus states, responsive patterns, and
other UI primitives. No separate visual language may be introduced.
