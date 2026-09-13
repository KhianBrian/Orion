# Phase 4 — One Safe Scheduling Workflow

**Tier 2 status:** Drafted 12 September 2026 and updated 13 September 2026 with the recorded
owner/clinical decisions. The cancellation list is approved. The plan becomes executable after P4-0
freezes the current live contract. No implementation should
begin from this file alone if the live schema, deployed functions, or policy decisions differ.

## R1 supersession boundary

The 8 September direction changes the future scheduling contract: payment-pending appointments carry
the PayMaya tracking relationship but are not bookable consultations; only verified payment confirms
them. It also records a 15-minute early-join window, a 45-minute call, and a 15-minute psychiatrist
note-writing window. R1.3 owns the payment-authorised booking plan and R1.1/R1.4 own the data and
provider timing contracts. This charter's older adults-only and unset-timing text is baseline history,
not current implementation authority.

## R1 impact and work ownership — 10 September 2026

The appointment lifecycle is now clearer: 45-minute sessions, patient cancellation, psychiatrist
cancellation, linked rescheduling, psychiatrist-recorded no-shows, and session notes. Some edge values
still need owner or clinical approval, so Phase 4 is plannable
but not complete.

Phase 4 remains responsible for the baseline appointment lifecycle, cancellation/rescheduling/no-show
mechanisms, notes surface, conflict handling, and one booking workflow. [Phase 17](phase-17-paymaya-payment-authorised-booking.md)
owns the R1 payment-pending/reservation/verified-payment booking change, while [Phase 18](phase-18-google-meet-and-session-timing.md)
owns the database-authoritative 15/45/15 timing and real meeting admission. Phase 4 must not create a
second booking path or duplicate those state transitions.

## Purpose

Replace the duplicate mock booking pages with a single server-authoritative workflow covering booking,
cancellation, the clinician's appointment view, the admin operational view, error and conflict
states, the session notes surface, and the approved rebooking and no-show policy.

The emphasis is *one* workflow. A second booking path is a correctness hazard, not a convenience.

## Gate

Concurrent booking, retry and idempotency, cancellation boundary, timezone, and mobile and desktop
checks all pass.

## Consumes

- **Phase 2 as-built:** the slot-lock function's actual signature and semantics, the appointment status model, the notes table and its release state, and the RLS predicates governing who may read or write each. This phase's code is written directly against them.
- **Phase 3 as-built:** how the server establishes caller identity and checks clinician approval, which is the basis of booking authorisation.

## Owner decisions now available

| Decision | Effect on this phase |
| --- | --- |
| **Q5 — appointment transitions** | The state machine is now defined. The [appointment lifecycle](../../product/appointment-lifecycle.md) *Approved transitions* section is authoritative: 45-minute sessions; patient cancellation beyond 24 hours; psychiatrist self-service cancellation beyond 48 hours with a required reason; late cancellation executed by admin on the psychiatrist's behalf with a required reason; patient rescheduling requests beyond 24 hours with assigned-psychiatrist approval before finalization; no-show set by the psychiatrist after a grace period, never automatically; patient-cancelled slots reopen, psychiatrist-cancelled slots do not. |
| **Q6 — session notes** | The psychiatrist writes a note after each session and releases it; the patient reads it once released. This is a new surface in this phase, tied to the appointment record. |
| **Q4 — service boundary** | Orion remains a scheduled psychiatry-appointment service, not emergency or urgent care. Phase 4 does not attempt clinical triage or automatically decide that a booking is inappropriate. Any general service-boundary wording belongs in separately approved legal/clinical content, not in the booking decision logic. |

## Still blocked

The core state machine and most values are now decided. The following items remain open or require an
implementation detail to be frozen before the affected slice starts.

| Item | Owner | Effect |
| --- | --- | --- |
| Psychiatrist approval workflow for patient rescheduling | Company owners with clinical lead | Resolved: the original appointment remains `booked` while waiting; the requested replacement slot remains open and is rechecked when the psychiatrist approves. |
| Early join window and session-end treatment | Clinical lead | Join behaviour cannot be finalised. |
| No-show consequences — forfeiture, fee treatment, whether it counts against a patient | Company owners with clinical lead | This phase records the state only. Do not build any consequence. |
| Booking kill switch | Company owners | No booking kill switch currently exists in the code, migrations, environment configuration, or hosted Supabase secrets. Phase 4 must implement and verify an independent server-side switch; an admin is recorded as the operator. |

Q5 is now ratified for implementation using the rules recorded below. A change after coding begins
would still require a migration and workflow review.

## Deliverables

- A single server-authoritative booking operation, idempotent under retry.
- Patient cancellation honouring the 24-hour boundary, with the cancelling party stored and the slot reopened.
- Psychiatrist self-service cancellation honouring the 48-hour boundary, with a required reason and the slot not reopened.
- A coordinator-executed late cancellation path with a mandatory reason and an audit event — required, because without it a phoned-in cancellation leaves the appointment `booked` while it is off in reality.
- Patient-initiated rescheduling requests more than 24 hours ahead, followed by assigned-psychiatrist approval and a linked cancel-and-rebook in one transaction.
- A psychiatrist-set no-show with a configurable grace period, never an automatic transition.
- A clinician appointment view scoped by RLS rather than by client filtering.
- An admin operational appointment view scoped to the minimum fields required for support.
- A session notes surface: psychiatrist authoring and release, patient read-after-release, admin excluded by default.
- Explicit error and conflict states — including the case where a slot is taken between display and submission.
- Correct timezone handling for display, storage, and boundary calculation.
- **Removal:** the duplicate mock booking route consolidated away.
- Verification across concurrency, retry, cancellation boundary, timezone, and both mobile and desktop.

## Authoritative documents

- [Appointment lifecycle](../../product/appointment-lifecycle.md) — the primary authority for this phase.
- [Product scope](../../product/product-scope.md) — reconciled to include session notes and the three-role model; Q5/Q11 policy decisions still apply.
- [Database and RBAC](../../architecture/database-and-rbac.md) — the functions and policies this workflow calls.
- [Clinical safety and telepsychiatry policy](../../product/clinical-safety-and-telepsychiatry-policy.md) — the service boundary; Phase 4 does not perform automated clinical triage.
- [QA and Playwright](../qa-and-playwright.md) — click-path and route verification.
- [Test strategy and test data policy](../test-strategy-and-test-data-policy.md) — concurrency and synthetic data expectations.

## Known removal target

The audit trail records consolidating `DoctorAvailability.jsx` and `PatientAppointment.jsx` into one
database-backed patient booking workflow, with this phase's completion as the close condition. Verify
the current route inventory; the ledger entry dates from 26 August 2026.

## What this fixes for later phases

The as-built appointment record determines Phase 5's answer to who may join which room and when, and
which appointment states admit a participant at all. Record the appointment shape and its state
transitions precisely in the as-built entry.

## Inputs I did not have

This plan was grounded in the repository, applied migration files, existing scripts, and the Phase 2,
Phase 3, and Phase 11 audits. The following still must be checked directly in P4-0 before coding:

1. The linked Supabase project's actual migration parity, table definitions, grants, RLS policies,
   function signatures, and deployed Edge Function versions.
2. The required booking kill-switch mechanism and its server-side configuration; the current-state check
   found no existing booking switch. An admin is the recorded operator.
3. The exact data representation for a pending psychiatrist rescheduling request and its idempotency
   behavior.
4. The approved fixed cancellation-reason list, optional explanation limit, and reader/retention rule.
5. Whether the stale `Sessions.jsx` prototype is still reachable through any route or import after the
   latest frontend changes.

## Constraints carried from policy

- Do not add a second booking flow, a duplicate client, or a new dependency before applying the minimal implementation ladder.
- RLS and protected server functions are authoritative; client-side filtering is presentation only.
- No appointment or note data in `localStorage`, Redux persistence, logs, analytics, screenshots, URLs, or test artefacts.
- A booking kill switch must be implemented as server-side state and operable independently of the
  video kill switch. The current-state check found no existing booking switch, so this is a Phase 4
  implementation requirement rather than a Phase 1 as-built capability.

## Plain-English explanation

Phase 4 makes appointments behave like one reliable system instead of several disconnected screens.

In plain English:

1. A patient sees an open time, chooses it, and asks Orion to book it.
2. The server—not the browser—checks that the time is still open, the patient is allowed to book,
   and nobody else won the slot first.
3. Patients, psychiatrists, and admins see only the appointment information their role permits.
4. Each cancellation follows the correct notice period and records who cancelled and why when a reason
   is required.
5. A patient asks to reschedule more than 24 hours ahead. The assigned psychiatrist approves or
   declines the request, and only approval triggers one safe operation: the old appointment is retained
   as history and the new one is linked to it. The browser must never cancel first and book later as two
   unrelated actions.
6. A psychiatrist manually records whether the appointment was completed or was a no-show. Orion never
   guesses this from the clock.
7. The psychiatrist can write and release a session note, and the patient can read only the released
   current note. Admins do not receive note content.

The result is a single auditable appointment workflow that later phases can safely extend with payment,
real meeting admission, and availability management.

## Outcome

Deliver one server-authoritative baseline scheduling workflow over the existing synthetic/non-production
foundation. It must preserve immutable appointment history, prevent conflicting writes, enforce role and
time boundaries at the database/server boundary, and expose only the minimum data needed by each role.

Phase 4 closes when its booking, cancellation, rescheduling, outcome, note, projection, conflict, and
responsive verification gates pass and a dated as-built audit records the exact implementation.

## Current State

The repository already contains a narrow synthetic scheduling slice:

- `Orion_React_App/src/pages/PatientAppointment.jsx` lists open 45-minute slots and invokes the
  `book-appointment` Edge Function with an idempotency key.
- `Orion_React_App/src/pages/Appointments.jsx` lists patient or assigned-psychiatrist appointments and
  currently exposes patient cancellation only.
- `Orion_React_App/src/features/appointments/queries.js` reads open slots directly through RLS and reads
  appointments through `get_my_appointments()`.
- `Orion_React_App/src/features/appointments/mutations.js` invokes `cancel-appointment`.
- `supabase/functions/book-appointment/index.ts` authenticates the caller, requires confirmed email,
  and invokes the service-role-only booking transaction.
- `supabase/functions/cancel-appointment/index.ts` authenticates the caller and invokes the
  patient-only cancellation transaction.
- The database already stores `booked`, `cancelled`, `completed`, and `no_show` appointment states;
  `no_show_party` and `rescheduled_from_id` were added by Phase 2.
- The database already has protected session-note functions, but there is no browser-facing note API or
  note UI.
- `get_my_appointments()` is scoped to the patient or assigned psychiatrist and intentionally excludes
  admin appointment access. A separate minimum-field admin projection is required.
- The current cancellation migration supports patient cancellation idempotency only. Psychiatrist
  cancellation, admin late cancellation, rescheduling, and outcome-transition functions are not yet
  implemented.
- Existing database tests cover booking concurrency/idempotency, patient cancellation, RLS, and note
  protection. They do not cover the Phase 4 actor matrix.

The current foundation is synthetic and non-production. Phase 4 must extend it with forward-only
migrations and protected functions; it must not edit an applied migration or add a second booking path.

## Non-Goals

- PayMaya, `payment_pending`, payment webhooks, refunds, chargebacks, or payment reconciliation. These
  belong to Phase 17.
- Google Meet, production video admission, meeting timing, or provider-specific room behavior. These
  belong to Phase 18.
- Doctor-managed recurring availability or the two-week/15-minute-grid experience. That belongs to
  Phase 14.
- Automatic `completed` or `no_show` transitions, scheduled jobs, no-show penalties, billing changes,
  notifications, or patient-risk scoring.
- A new support role, unrestricted admin patient-data access, or admin access to note content.
- Retention/deletion jobs, real-user activation, production deployment, or real personal data.
- A standalone `rescheduled` status or a client-side cancel-then-book sequence.
- Rewriting the existing D0–D7 synthetic fixtures or changing the JaaS demo into a real-session path.

## Decisions Recorded — 13 September 2026

These decisions are now the Phase 4 working contract. They should be copied into the pilot decision
register or owner meeting record as the formal authority before implementation begins.

| Decision | Owner | Required treatment |
| --- | --- | --- |
| Appointment lifecycle/Q5 | Company owners, with clinical lead where applicable | Approved: patient cancellation more than 24 hours ahead; psychiatrist cancellation more than 48 hours ahead; admin handles late psychiatrist cancellation; patient rescheduling requires assigned-psychiatrist approval and remains linked history; psychiatrists record outcomes; no automatic no-show. |
| Patient rescheduling boundary | Company owners | Approved: patient may request rescheduling more than 24 hours before the appointment. The original remains `booked`, the requested slot remains open, and the assigned psychiatrist must approve before the replacement is finalized. |
| No-show grace period | Clinical lead | Approved: 15 minutes after the scheduled start. |
| Who records outcomes | Clinical lead and owners | Approved: the assigned psychiatrist records `completed` or `no_show`. |
| No-show information | Clinical lead and owners | Approved: record who was absent — patient or psychiatrist. |
| Outcome correction | Company owners | Approved: only an admin may correct an outcome, and the original outcome and correction must remain in the audit trail. |
| Cancellation reasons | Operations/owners | Approved: both psychiatrist self-cancellation and admin late-cancellation require a fixed reason from the approved list. An optional free-text explanation is supported, limited to 500 characters, operational-only, excluded from analytics/logs, and covered by the approved reader/retention rules. |
| Automated crisis/referral detection | Company owners | Not part of Phase 4. Orion will not infer clinical appropriateness from booking data or automatically block a booking for that reason. General service-boundary wording remains outside the scheduling decision logic. |

## Decisions Still Required Before Coding

1. Implement and verify the booking kill switch; the admin role is recorded as its operator. The
   current-state check found no existing switch in the repository or hosted Supabase secrets.

### Proposed cancellation reasons

These are general operational categories for either a psychiatrist cancelling their own session or an
admin cancelling on behalf of a psychiatrist. They are not clinical notes:

- Psychiatrist illness or unavailable.
- Psychiatrist emergency.
- Technical problem preventing the session.
- Safety or clinical direction.
- Scheduling or administrative error.
- Other approved operational reason — requires the 500-character explanation.

## Architecture Plan

### Authority boundaries

- **Browser:** displays slots and appointment state, formats ISO timestamps in `Asia/Manila`, starts
  commands with a fresh idempotency key, and renders safe error states. It never decides permission,
  timing eligibility, status, ownership, or availability.
- **Edge Functions:** authenticate the bearer token with Supabase Auth, obtain the caller's user ID,
  validate request shape, call one protected database function, and map stable internal errors to safe
  HTTP responses. Service-role credentials remain server-only.
- **Database functions:** enforce role, ownership/assignment, active-clinician status, authoritative
  `now()`, state transitions, locking, idempotency, and audit insertion in the same transaction.
- **RLS/projections:** remain the read boundary. Client-side filtering is presentation only. Admin gets
  a dedicated minimum-field projection rather than broad appointment-table access.
- **Audit:** records actor, transition, target, outcome, reason code, server timestamp, and correlation
  ID without note bodies, credentials, room IDs, or provider payloads.

### One workflow, multiple role-specific commands

“One workflow” means one appointment state machine and one set of database invariants, not necessarily
one URL. Role-specific commands may have separate Edge Function names for clarity, but they must call
protected functions that share the same transition rules and audit conventions.

### Transaction and locking rules

- Every mutation uses database time and derives appointment times from the locked slot or existing
  appointment.
- A command locks the appointment row before changing it. A command that touches slots locks the
  related slot rows in a deterministic order.
- Rescheduling locks the original appointment, verifies the policy, locks the replacement slot, and
  commits the old-record cancellation, new-record insert, slot changes, relationship link, and audit
  events together.
- A retry with the same idempotency key returns the original safe result. A reused key for a different
  operation or target is rejected without revealing another user's data.

## Data Model Impact

Use a new forward-only migration after P4-0 confirms the live schema. Preserve all existing synthetic
rows and applied migration files.

### Existing facts to reuse

- `appointments.status` already has `booked`, `cancelled`, `completed`, and `no_show`.
- `appointments.cancelled_at` and `appointments.cancelled_by` already preserve cancellation facts.
- `appointments.no_show_party` already records the absent party when the status is `no_show`.
- `appointments.rescheduled_from_id` already provides the original-to-replacement relationship and has
  a one-reschedule-per-original unique index.
- `appointments.idempotency_key` handles ordinary patient booking retries.
- `appointments.cancellation_idempotency_key` handles patient cancellation retries and may be extended
  only if its semantics remain unambiguous for the additional cancellation actors.
- `audit_events.reason_code` and `audit_events.correlation_id` already provide content-free policy
  evidence.

### Minimal additions to evaluate in P4-0

- Add a pending reschedule-request representation with patient ownership, original appointment,
  requested slot, assigned psychiatrist, request status, approval/decline facts, and an idempotency key.
  P4-0 must choose whether this is a small table or an equivalent existing representation.
- Add a reschedule-operation idempotency fact for the final approval transaction, preferably on the
  request/original appointment with a partial unique index scoped to the patient, unless live inspection
  shows an equally safe existing key can be reused.
- Add only constrained reason-code handling needed for admin late cancellation. Prefer the existing
  audit `reason_code` field over a new free-text appointment column.
- Add no new canonical appointment status. A rescheduled appointment remains `cancelled`, and its
  replacement remains `booked`.
- Add no outcome actor/timestamp columns unless the approved dictionary requires them; the status plus
  immutable audit event should be the minimal representation.
- Add or replace indexes only after checking existing data and active-booking overlap behavior.

### Constraints and integrity

- Keep 45-minute slot and appointment checks.
- Keep slot overlap and one-active-booking protections; extend them only if a new active state is later
  introduced by an approved phase. Phase 4 itself does not add `payment_pending` or `held`.
- Keep cancellation and no-show fact consistency checks.
- Keep foreign keys and restrict destructive deletion of appointment history.
- Ensure the replacement appointment preserves the same patient/psychiatrist relationship and derives
  its times from the selected replacement slot.

## API And Server Plan

The exact filenames may be finalized in P4-0, but the contracts below are the required behavior.

### Existing booking command

Preserve the current synthetic baseline contract for `book-appointment` unless live inspection finds a
security defect:

- Request: `{ slotId, idempotencyKey }`.
- Caller: confirmed authenticated patient only.
- Server checks: booking kill switch, patient role, slot existence/open state, future start, active
  psychiatrist, and idempotency.
- Success: `201` with the new or retried appointment projection.
- Conflict: `409 { error: "slot_unavailable" }`.
- Safe denial: `401/403` with a stable generic code.

### Cancellation commands

1. **Patient cancellation** — preserve and harden the existing command. Require ownership, `booked`
   state, `starts_at > server_now + 24 hours`, and the patient cancellation idempotency key. Reopen the
   slot only for a patient cancellation while the psychiatrist is active.
2. **Psychiatrist cancellation** — require assignment to the appointment, `booked` state,
   `starts_at > server_now + 48 hours`, and one controlled reason code. Record
   `cancelled_by = psychiatrist`; do not reopen the slot.
3. **Admin late cancellation** — require an admin actor, `booked` state, the approved late boundary,
   and one controlled reason code. Record `cancelled_by = admin`, audit the reason, and do not reopen
   the slot. Do not create unrestricted admin appointment mutation.

All three commands must be ownership-safe, idempotent, audited, and return indistinguishable denial
responses where revealing appointment existence would leak data.

### Reschedule request and approval commands

Add a patient request plus assigned-psychiatrist approval flow for rescheduling:

- Patient request: original appointment ID, requested replacement slot ID, and request idempotency key.
- Request checks: authenticated patient ownership, approved more-than-24-hours boundary, original
  `booked` state, and a valid future slot belonging to an active psychiatrist.
- Approval: only the assigned psychiatrist may approve or decline the request. The psychiatrist must
  not be able to approve a request for another clinician's appointment.
- Finalization: after approval, lock the original appointment and replacement slot in deterministic
  order; recheck the original state, timing, and slot availability; then cancel the original, reopen its
  old slot under the approved policy, create the replacement with derived times and
  `rescheduled_from_id`, book the replacement slot, and write audit evidence in one transaction.
- Retry: the request and finalization keys each return their original safe result; no duplicate request
  or replacement may be created.
- Decline or conflict: leave the original appointment unchanged and return a safe status. A replacement
  slot is not reserved unless a separate approved hold/expiry policy is added later.

### Outcome command

Add one protected psychiatrist outcome command with an explicit action contract:

- Caller: assigned psychiatrist only.
- Actions: approved `completed` and `no_show` transitions.
- `no_show`: manual only, after the approved grace period, with the approved `no_show_party` fact.
- `completed`: only after the approved clinical rule; never inferred from elapsed time.
- Every success and denial writes an audit event. If an outcome is wrong, only an admin may use a
  separate audited correction path; the original outcome must remain visible in audit history and no
  direct status update is exposed.

### Session-note commands

Expose the existing service-role-only note functions through authenticated Edge Functions:

- Psychiatrist creates a draft note for an assigned appointment.
- Psychiatrist releases a note explicitly.
- Patient reads only the latest released note for their own appointment.
- Assigned psychiatrist reads authorized note content.
- Admin and unrelated roles receive no note content.

The existing versioning, release immutability, correction linkage, and audited read behavior remain the
database authority. The browser never calls the service-role RPC directly.

### Read projections

- Extend `get_my_appointments()` only with fields needed for status-aware patient and assigned-
  psychiatrist experiences, such as cancellation party and reschedule linkage where approved.
- Add a separate admin operational projection containing only the minimum approved fields: appointment
  identifier, times, status, permitted participant display names, cancellation party, and linkage facts.
  Exclude note bodies, phone/email, room identifiers, and unrestricted profile data.
- Keep direct appointment-table writes denied to application roles.

### Stable error mapping

Use safe, documented codes such as `invalid_request`, `slot_unavailable`,
`cancellation_not_permitted`, `reschedule_pending`, `reschedule_not_permitted`,
`outcome_not_permitted`,
`note_not_permitted`, `booking_disabled`, and `operation_failed`. Do not return SQL messages,
identifiers belonging to another user, clinical content, or provider details.

## UI/UX Plan

### Patient

- Keep one booking surface and add a reschedule-request entry point that reuses the same open-slot
  source. Show that the request is waiting for psychiatrist approval; do not imply the new appointment
  exists until approval and finalization succeed.
- Show Manila-local display while preserving server-returned ISO timestamps.
- Show clear loading, empty, retry, conflict, policy-denied, and success states.
- Do not offer cancellation on cancelled, completed, no-show, or otherwise historical appointments.
- Show a linked-reschedule explanation without exposing internal IDs.
- Show released notes only after the server confirms release; never preload note bodies into URLs,
  local storage, analytics, screenshots, or generic error messages.

### Psychiatrist

- Show assigned appointments only.
- Provide cancellation only when the 48-hour rule permits it, and require an approved reason before
  submission.
- Show pending reschedule requests for assigned appointments and provide approve/decline actions.
- Provide explicit outcome actions only when the server allows them; show no automatic outcome label.
- Provide draft-note, release-note, and correction behavior only according to the approved note policy.
- Keep patient display data to the approved safe projection.

### Admin

- Add a protected operational appointment view with minimum fields.
- Provide the late-cancellation action only with a required fixed reason and optional operational
  explanation.
- Provide the approved outcome-correction action only to admins; preserve the original outcome and
  record the correction in the audit trail.
- Do not show consultation notes, unrestricted appointment rows, provider room data, or hidden profile
  fields.
- Keep provisioning and appointment operations separate in navigation and authorization.

### Accessibility and responsive behavior

- Add direct-route, keyboard, focus, accessible-name, loading/error/empty, and real-click checks.
- Verify patient-facing booking, cancellation, and rescheduling on Chromium desktop and Pixel 5.
- Keep the Phase 11 bundle, no-third-party-font, no-horizontal-overflow, and lazy-loading protections.
- Verify stale mock pages are not reachable or linked.

### Current Orion visual theme

- Any Phase 4 feature that adds or changes a frontend surface must match the current Orion theme and
  existing visual language.
- Reuse the existing shared components and design tokens for buttons, colors, typography, spacing,
  borders, radii, form controls, alerts, badges, loading states, and dialogs before creating anything
  new.
- New patient, psychiatrist, and admin actions must use the same button hierarchy, focus treatment,
  disabled/busy states, error styling, and confirmation-dialog patterns already used by the app.
- Do not introduce a new color palette, font, icon style, layout convention, or one-off control for
  Phase 4. If the existing theme lacks a needed pattern, extend the shared component/token layer first
  so the pattern is reusable.
- Review every new or modified screen at desktop and mobile widths for visual consistency, readable
  contrast, keyboard focus, touch-target size, and the existing no-horizontal-overflow requirement.

## Security, Privacy, And Abuse Controls

- Enforce all role, ownership, assignment, active-clinician, and timing checks server-side.
- Keep service-role keys only in Edge Function secrets.
- Revoke direct application insert/update/delete on appointments, notes, and audit events.
- Use fixed `search_path` security-definer functions and explicit execute grants.
- Prevent IDOR by deriving actor identity from `auth.getUser()` and validating relationship in the
  database; never trust patient, psychiatrist, role, or cancellation-party values from the browser.
- Make denial responses safe and non-enumerating.
- Do not log appointment bodies, note bodies, phone/email, room identifiers, or secrets.
- The admin cancellation explanation is operational free text only, length-limited, excluded from logs
  and analytics, and visible only to approved operational readers.
- Use idempotency and database locks to limit duplicate actions and race conditions.
- Verify the booking kill switch is independent of video and cannot be bypassed by another route.
- Keep all fixtures, browser state, screenshots, traces, and test data synthetic and ignored by Git.

## Quotas, Billing, Or Entitlements

Phase 4 introduces no billing, payment, quota, subscription, or entitlement model. The only operational
control is the existing booking kill switch. Payment-authorized booking is explicitly deferred to
Phase 17.

## Observability And Analytics

- Record success and denied events for booking, each cancellation actor, rescheduling, outcome changes,
  note creation/release/read, and kill-switch denials.
- Every event contains an actor where available, event code, target type/ID, outcome, reason code, server
  timestamp, and correlation ID.
- Audit events remain content-free and append-only for application roles.
- Keep application logs to safe operation/error codes and durations; do not add appointment or clinical
  content to logs or analytics.
- Record transition and conflict counts only if the existing monitoring path can do so without creating
  a new privacy or vendor dependency. Production monitoring remains a Phase 1/20 prerequisite.

## Implementation Slices

Each slice has one owner in the Phase 4 worktree. A slice is complete only when its focused verification
passes and its contract is recorded for the next slice.

### P4-0 — Re-ground and freeze the contract

**Purpose:** Confirm the live system and close the policy inputs before any migration or UI work.

**Files/areas:** current phase plan, decision register, appointment lifecycle, database catalog,
applied migrations, deployed Edge Functions, route inventory, booking kill-switch configuration.

**Actions:** verify the exact live schema/functions/policies/grants; confirm the Q5 state machine and
rescheduling boundary; record the psychiatrist approval workflow; record grace/outcome/reason-code
decisions; freeze operation names, return shapes, error codes, and role matrix. If a decision is
missing, keep that capability disabled and do not guess.

**Verification:** migration parity, function signature inspection, route inventory, kill-switch
implementation and off/on check,
and a signed-off Phase 4 contract table.

### P4-1 — Add only required forward schema support

**Purpose:** Make retries and immutable history safe without changing existing statuses or synthetic
rows.

**Likely files:** new timestamped migration under `supabase/migrations/`; database test additions under
`Orion_React_App/scripts/`.

**Actions:** add the approved reschedule-request and finalization idempotency facts/indexes; add
constraints/indexes only after current-data validation; preserve existing booking/cancellation keys;
define approved audit event codes/reason codes; keep direct application writes denied.

**Risks:** ambiguous retry semantics, migration failure over existing fixtures, accidental overlap-rule
change.

**Verification:** apply from empty and current synthetic state; inspect constraints/indexes/grants/RLS;
run existing booking, cancellation, RLS, and Phase 2 tests.

### P4-2 — Implement the protected appointment state machine

**Purpose:** Put every mutation behind database-authoritative, atomic functions.

**Likely files:** new forward migration(s) with protected SQL functions; focused database test script.

**Actions:** implement psychiatrist cancellation, admin late cancellation, patient reschedule request,
psychiatrist approve/decline, final rescheduling, and outcome commands; harden patient booking/cancellation
as needed; add the admin-only audited outcome-correction command; use fixed lock order, server time,
idempotency, approved boundaries, and same-transaction audit writes.

**Risks:** deadlocks, partial reschedules, stale requests, accidental slot holds, status bypasses,
incorrect boundary interpretation, and unauthorized psychiatrist approval.

**Verification:** database allow/deny matrix, concurrent booking/reschedule attempts, retries, boundary
tests around 24/48 hours and grace period, invalid transitions, cross-user/role attempts, and audit
content checks.

### P4-3 — Add protected server APIs and safe projections

**Purpose:** Give the browser usable authenticated APIs without exposing service-role access or broad
tables.

**Likely files:** new or extended functions under `supabase/functions/`; appointment query/mutation
modules under `Orion_React_App/src/features/appointments/`.

**Actions:** add Edge Function adapters for psychiatrist/admin cancellation, rescheduling, outcomes, and
notes; add the admin projection; extend the shared appointment projection only with approved fields;
map stable safe error codes; keep the existing booking and patient-cancellation response contracts
compatible.

**Risks:** inconsistent error mapping, admin overexposure, direct-RPC bypass, stale cached state.

**Verification:** unauthenticated, wrong-role, wrong-owner, and successful API calls; inspect response
redaction; confirm service-role secrets are absent from browser bundles; test cache invalidation after
each mutation.

### P4-4 — Build the role-aware scheduling UI

**Purpose:** Make the complete workflow understandable and safe for patients, psychiatrists, and
admins.

**Likely files:** `PatientAppointment.jsx`, `Appointments.jsx`, appointment components, new note/admin
components as needed, `queries.js`, `mutations.js`, route configuration, and scoped CSS.

**Actions:** add reschedule selection, role-specific cancellation/outcome/note/admin controls, status-
aware history, safe confirmation dialogs, required reason-code selection, loading/empty/error/conflict
states, and responsive accessible behavior. Remove or disconnect stale mock session/booking surfaces
only after route/import verification.

**Risks:** client-only authorization, duplicate booking path, stale optimistic state, accidental note
content leakage, regressions in Phase 11 layout/performance.

**Verification:** direct routes, role allow/deny paths, keyboard/focus checks, desktop/mobile click
paths, refresh/cache invalidation, and browser storage inspection.

### P4-5 — Run the complete verification matrix

**Purpose:** Prove the state machine at the database, API, and browser boundaries.

**Likely files:** new/extended `test-*-db.mjs`, unit helpers/tests, and Playwright scheduling specs.

**Actions:** use isolated synthetic users and fixtures; test every transition, retry, conflict, denial,
projection, note-release, and responsive path; run existing regression suites without modifying the
five-account seed contract.

**Risks:** shared mutable fixtures, tests passing through service-role shortcuts, hidden environment
dependencies, test artifacts containing sensitive data.

**Verification:** see the Verification Plan below; record command, result, environment, and evidence
path for every required gate.

### P4-6 — Acceptance, audit, and handoff

**Purpose:** Make Phase 4 consumable by Phase 5/13/14 without requiring rediscovery.

**Likely files:** dated audit entry, `implementation-status.md`, Supabase engineering notes, QA/test
strategy documentation, appointment lifecycle if a decision changed, and this phase plan.

**Actions:** capture exact migrations, function signatures, projections, policies, grants, route map,
state-transition table, error codes, audit codes, test results, deviations, and deferred decisions.

**Verification:** clean diff, no secrets, fresh regression run, owner/clinical decision references,
and a dated Phase 4 as-built audit.

## Verification Plan

### Unit and pure helpers

- 24-hour patient cancellation boundary.
- 48-hour psychiatrist cancellation boundary.
- Approved no-show grace-period boundary.
- Manila display formatting from UTC timestamps.
- Request validation, idempotency-key handling, and stable error mapping.
- Status/action visibility helpers that never replace server authorization.

### Database and RLS

- Patient can book and cancel only their own eligible appointment.
- Confirmed email is required for booking; unconfirmed booking is denied.
- Psychiatrist can cancel only an assigned appointment and only outside 48 hours.
- Admin can execute only the approved late-cancellation path with a reason code.
- Wrong patient, wrong psychiatrist, unauthenticated, and direct-table mutation attempts are denied.
- Patient cancellation reopens an active psychiatrist's slot; psychiatrist/admin cancellation does not.
- Concurrent booking has one winner; concurrent reschedule approval cannot create two replacements.
- Reschedule request retry returns the same request; approval/finalization retry returns the same
  replacement; declined, expired, or unavailable requests leave the original state unchanged.
- Completed/no-show transitions require the correct role, state, timing, and facts.
- Incorrect outcomes can be corrected only through the admin path, with the original outcome retained
  and both actions audited.
- No automatic transition exists in SQL, Edge Functions, UI, or scheduled jobs.
- Note creation/release/read rules remain protected, latest-release-only for patients, and audited.
- Admin projection excludes note content and fields outside the approved minimum.
- Audit rows are append-only to application roles and contain no prohibited content.

### API/integration

- Missing/invalid bearer token and malformed payloads return safe 401/400 responses.
- Stable conflict and policy errors map to documented HTTP statuses.
- Service-role key never appears in source sent to the browser.
- Every mutation invalidates the correct React Query keys and does not leave stale appointment state.
- Booking kill switch blocks all booking entry points while leaving video controls independent.

### Playwright

For Chromium desktop and Pixel 5 mobile where patient-facing:

- Patient opens booking, confirms an appointment, sees success, and sees the appointment in history.
- Patient loses a race for a slot and receives a safe conflict with refreshed availability.
- Patient cancellation succeeds beyond 24 hours and is denied inside 24 hours.
- Patient submits a reschedule request more than 24 hours ahead, sees pending/declined/conflict states,
  and sees linked status-aware history only after psychiatrist approval and finalization.
- Assigned psychiatrist can approve or decline only their own patient's reschedule request.
- Psychiatrist sees assigned appointments, can perform approved outcomes, and cannot access another
  psychiatrist's appointments.
- Admin sees the minimum operational view and can perform only the approved late cancellation.
- Released note appears for the patient; draft/unreleased/admin/unrelated access is denied.
- Historical cancelled/completed/no-show appointments do not offer cancellation.
- Direct protected routes and wrong-role navigation are denied.
- Loading, empty, conflict, error, focus, keyboard, and overflow checks pass.

### Required commands

At minimum, run the repository's documented checks plus new Phase 4 checks:

```text
npm run lint
npm run test:unit
npm run build
npm run check:env-examples
npm run test:e2e
CI=1 npm run test:e2e:authenticated
npm run test:db:booking
npm run test:db:cancellation
npm run test:db:phase2
npm run test:db:phase4
```

If a command is unavailable because Docker, hosted CI, or another dependency is missing, record it as
unverified rather than treating a partial result as the Phase 4 gate.

## Rollout And Fallback

- Work only against the synthetic/non-production project.
- Apply forward-only migrations first, verify schema/grants/RLS, then deploy protected functions, then
  enable the UI path behind the booking kill switch.
- Keep the booking kill switch independent and test its off/on behavior before enabling the workflow.
- Do not delete or rewrite appointment history, applied migrations, audit events, notes, or fixtures.
- If a new command fails, disable that command through the feature boundary and fix forward. Never fall
  back to direct client booking, direct table writes, public video, or unaudited admin access.
- Existing synthetic booking/cancellation behavior must remain compatible until the replacement command
  passes its focused and regression checks.
- Phase 4 completion does not authorize production or real users; later provider, payment, timing,
  operations, and governance gates remain required.

## Documentation And Audit Updates

On completion, update:

- The dated Phase 4 as-built audit under `Knowledge-base/audit-trail/`.
- `Knowledge-base/engineering/implementation-status.md` with the exact completion boundary.
- `Knowledge-base/engineering/supabase.md` with migration parity and deployed function details.
- `Knowledge-base/engineering/qa-and-playwright.md` with Phase 4 commands and coverage.
- `Knowledge-base/engineering/test-strategy-and-test-data-policy.md` if new fixtures or test layers are
  added.
- `Knowledge-base/product/appointment-lifecycle.md` only when an owner/clinical decision changes its
  authoritative text.
- `Knowledge-base/product/pilot-decision-register.md` with Q5, grace, outcome, correction, and
  reason-code decisions as they are formally supplied.
- This phase file's status, exact implementation slices, and remaining handoff inputs.

## Open Questions

1. Implement and verify the booking kill switch; the admin role is recorded as its operator. The
   current-state check found no existing switch in the repository or hosted Supabase secrets.
