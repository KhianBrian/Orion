# R1 Implementation Phase Map — From R1.1 Contract to Feature Completion

**Status:** Planning synthesis completed 9 September 2026 — no application, database, provider, or
deployment implementation is authorised by this document.

## Purpose

This document groups every implementation concern in
[R1.1 — Data, Consent, and Audit Extension](../launch-readiness/r1.1-data-consent-and-audit-extension.md)
into the numbered Phase 15–20 delivery continuation while retaining R1.1–R1.5 requirement
traceability. It is the cross-phase bridge; the linked numbered phase file is the canonical plan
location for each increment, and its provisional Tier 2 outline becomes executable only after the
phase re-grounds it from predecessor evidence, approved decisions, and current deployed state.

R1 remains separate from the historical Phase 0–6, D0–D7, and Phase 7–14 tracks. This map does not
rewrite a historical gate or claim that Phase 15–20 have been implemented. The
[authority order](../../README.md#authority-order),
[R1.0 governance boundary](../launch-readiness/r1.0-governance-and-change-control.md), and
[phase planning contract](README.md#prompt-contract-for-planning) continue to govern.

Implementation begins from this evidence chain, not from this synthesis alone:

```text
governing authority and recorded decisions
  -> fresh inspection of deployed/as-built state
  -> dated predecessor-phase audit (or an explicit sequencing amendment)
  -> exact numbered phase plan and gate
  -> implementation and verification
  -> new dated as-built audit for the next phase
```

## Outcome

When all work in this map is implemented, verified, approved, and operationally activated:

```text
Adult patient registers and satisfies approved eligibility
  OR
Minor account remains pending -> guardian submits approved evidence
  -> approved reviewer accepts -> patient becomes eligible

Eligible patient selects a slot
  -> one server command locks and reserves it
  -> creates one payment_pending appointment and payment attempt
  -> creates PayMaya checkout server-side
  -> verified provider event changes that same appointment to booked
  -> browser return only reads Orion's status

Booked patient and assigned psychiatrist
  -> server/database checks relationship, eligibility, status, and [start-15m, end)
  -> approved Google Meet admission is issued
  -> scheduled consultation ends at end
  -> psychiatrist sees the derived 15-minute note-writing window
  -> note outcome/release remains manual and separately controlled

Patient can create an administrative support ticket
  -> patient sees only their own ticket
  -> approved admin operators use the audited queue
  -> no ticket grants appointment, payment, meeting, or note authority
```

The final real-user activation step still requires the production-service launch gate and company
owner go/no-go. Successful implementation alone is insufficient.

## Current verified baseline consumed

The R1.1 plan verified the following before this synthesis:

- Six forward migrations are applied through `20260905090000_safe_appointment_projection`.
- The live synthetic schema has three roles and five public tables; it has no separate support role, patient
  eligibility, consent, session-note, payment, or support-ticket object.
- The current `book-appointment` route immediately creates `booked`; there is no `payment_pending` or
  reserved slot.
- The current JaaS Edge Function is synthetic-demo-only and uses application runtime time rather than
  a database admission decision.
- The active React application has one booking route, one appointment query/mutation feature, one
  Supabase client, and no R1.2–R1.5 feature routes.
- Existing D1–D7 and Phase 9 evidence remains synthetic history and must stay green.

Implementation must re-query this state at the start of every work item. This map is not a substitute
for an as-built check.

## Baseline-to-R1 prerequisite handshakes

R1 consumes unfinished baseline work without pretending that it is already complete. At the start of
each detailed plan, record whether the prerequisite below exists. If it does not, schedule it as an
explicit prerequisite increment under its owning authority and give it separate as-built evidence.

| Existing track | Verified unfinished dependency | R1 consumer and boundary |
| --- | --- | --- |
| Phase 2 — Data/RBAC | The three-role schema, general consent records, session notes, audited note reads, and full RLS matrix are not built. | R1.2 may add current-authority eligibility/guardian schema; R1.4 consumes the note contract. Neither silently closes Phase 2. |
| Phase 3 — Identity | The synthetic three-role Auth/CASL slice exists, but public registration, approval, recovery, and approved consent capture are not built. | R1.2 re-grounds and delivers the current eligibility identity path; Phase 3 history remains separately assessed. |
| Phase 4 — Scheduling | Synthetic booking/cancellation exists, but full cancellation/reschedule/no-show/notes workflow is not built. | R1.3 replaces the future real booking behavior with payment authorisation while retaining approved cancellation and concurrency rules. |
| Phase 5 — Video | JaaS exists only for the synthetic demo; production provider work is blocked. | R1.4 creates a separate approved Google Meet boundary and does not promote or overwrite D5 evidence. |
| Phase 6 — Operations | Production support, retention, incidents, access review, recovery, and release exercises are not implemented. | R1.5 extends and consumes this work; it does not claim Phase 6 closure without Phase 6 evidence. |
| Phase 13 — Outcomes | Completion/no-show/reschedule/correction behavior is planned but decision-blocked. | R1.4/R1.5 preserve manual outcomes and hand those decisions back to Phase 13. |

This handshake is especially important for session notes: the 15-minute display window can be
planned independently, but a usable note flow still requires the separately authorised note schema,
function-only audited read/write/release controls, and patient/psychiatrist UI.

## Formal numbered phase sequence

| Numbered phase | R1 mapping | Primary result | Status and gate |
| --- | --- | --- | --- |
| [Phase 15 — Data, consent, and audit foundation](phase-15-data-consent-and-audit-foundation.md) | R1.1 | Provider-neutral objects, role/action matrix, active-state compatibility, RLS/functions, typed audit, and tests. | Planned; wait for Phase 14 as-built evidence or an explicit sequencing amendment, then resolve named data/role/retention decisions. |
| [Phase 16 — Identity and minor eligibility](phase-16-identity-and-minor-eligibility.md) | R1.2 | A server-held patient eligibility state and approved consent-review path that fails closed before booking/admission. | Planned; blocked on Phase 15 as-built plus guardian, clinical, DPO/legal, and wording decisions. |
| [Phase 17 — PayMaya payment-authorised booking](phase-17-paymaya-payment-authorised-booking.md) | R1.3 | One booking path creates a reserved `payment_pending` appointment and confirms it only through a verified provider event. | Planned; blocked on Phase 16 as-built, official PayMaya material, and commercial/DPO decisions. |
| [Phase 18 — Google Meet and session timing](phase-18-google-meet-and-session-timing.md) | R1.4 | Approved provider admission consumes `booked` and database-authoritative 15/45/15 boundaries. | Planned; blocked on Phase 17 as-built, Workspace/vendor validation, and clinical timing decisions. |
| [Phase 19 — Support tickets and launch operations](phase-19-support-tickets-and-launch-operations.md) | R1.5 | Patient tickets, audited operations, approved exceptions, kill switches, retention processes, and runbooks. | Planned; blocked on Phase 15–18 as-built plus support, operations, retention, DPO/legal, finance, and provider decisions. |
| [Phase 20 — Integrated launch verification and controlled release](phase-20-integrated-launch-verification-and-controlled-release.md) | R1.5 | Integrated evidence, restore/rollback exercises, named approvals, and controlled release decision. | Planned; blocked on all prior gates, production-baseline controls, and company-owner go/no-go. |

The plans now exist, but implementation remains sequential because every phase consumes exact
as-built facts from its predecessor. Since Phase 14 is currently planned rather than evidenced,
Phase 15 waits for its dated as-built audit unless the governing owners record a deliberate sequencing
amendment with the scheduling compatibility risk and compensating checks.

## Cross-cutting implementation rules

Every later Tier 2 plan inherits these rules from R1.1:

1. Add only new forward migrations; never edit the six applied migrations.
2. Create RLS, revoke default grants, define protected functions, and add allow/deny tests in the same
   increment as each new table.
3. Treat the service role as infrastructure, not authorization. Edge Functions authenticate the
   caller and database functions re-check roles and relationships.
4. Derive patient, psychiatrist, appointment, amount, currency, eligibility, payment state, and role
   from server-held facts; never trust browser values.
5. Store current state only where a fast authorization decision needs it; retain consent, provider,
   ticket, and privileged transition evidence as append-only events.
6. Put no guardian identity document, payment credential/raw payload, ticket body, note body, meeting
   URL, or provider secret in audit, logs, analytics, URLs, errors, screenshots, fixtures, reports, or
   browser persistence.
7. Use database time for authorization. Client clocks may display or schedule refreshes only.
8. Keep all R1 work disabled and synthetic until its phase gate and the overall launch gate close.
9. A failed rollout stops the new operation. It never falls back to direct booking, public Jitsi,
   placeholder consent, or unaudited staff access.
10. Record exact as-built migrations, grants, RLS predicates, function signatures, event codes, test
    evidence, deviations, and remaining blockers before the next work item consumes the phase.

## Phase 15 / R1.1 — Contract and data foundation

### Outcome

R1.1 remains the design authority for the common data and safety boundary. It does not create schema
or application behavior itself.

### Decisions already confirmed

- Adult self-registration at 18+ and a non-bookable minor-consent path.
- Submission alone never activates a minor.
- `payment_pending` is not confirmed and cannot grant meeting admission.
- A browser payment return is informational only.
- Tickets are patient-owned with an administrative queue, no uploads, no email, and no clinical or
  emergency purpose.
- The patient join interval is `[starts_at - 15 minutes, ends_at)` using server/database time.
- The following 15 minutes is a note-writing display window only; no automatic completion, lock, or
  release occurs.

### Changes completed by planning

- Field-level logical models for patient eligibility, guardian cases/events, payment attempts/events,
  ticket metadata/messages, and timing derivation.
- Role/action and direct-table-versus-function matrix.
- Booking, webhook, browser-return, reconciliation, consent, ticket, and audit contracts.
- Forward migration/compatibility sequence and synthetic verification matrix.
- Explicit owner, clinical, DPO/legal, and vendor decision log.

### Exit condition

The R1.1 plan, this synthesis, and the canonical
[Phase 15 plan](phase-15-data-consent-and-audit-foundation.md) are linked from the active indexes. No
code or audit completion is claimed. The next implementation action is Phase 15 only after Phase 14
as-built evidence or an explicit sequencing amendment and Phase 15's named decision gates exist.

## Phase 16 / R1.2 — Identity, eligibility, and guardian consent

### Outcome

Every patient account has a server-held eligibility state independent of `profiles.role`. Adults use
the approved adult path. Minors remain pending until the approved guardian evidence is accepted by an
authorised reviewer. Pending, rejected, absent, superseded, or merely submitted consent denies booking
and meeting admission.

### Decisions required before implementation

| Authority | Required decision |
| --- | --- |
| Company owners | Guardian account versus bounded submission; reviewer/acceptor; patient/guardian status visibility; whether admin is reviewer or operations only. |
| Clinical lead | Minimum age, suitability, required acceptance facts, refusal behavior, and emergency/referral route. |
| DPO/legal | Age representation, guardian identity/relationship assurance, lawful basis, notice/consent wording, readers, withdrawal/correction, rights, retention, and disposal. |
| Operations/security | Sign-up and bounded-submission abuse controls, rate-limit ownership, review queue access, and kill-switch authority. |

Do not implement the minor submission path, seed wording, or make a patient eligible while any
required decision for that path is absent.

### Database changes to plan and implement

- Do not add a separate support-role enum value or account. Operational support remains an admin
  capability and any later role expansion requires a new owner decision and RLS review.
- Add one `patient_eligibility` current-state row per patient with immutable patient relationship and
  protected status transitions.
- Add `guardian_consent_cases` and append-only `guardian_consent_events` only after the chosen guardian
  subject/assurance model fixes their exact fields.
- Add approved document version/hash references without seeding unapproved text.
- Add relationship constraints, state constraints, indexes for own/reviewer lookup, RLS, revoked
  grants, protected status/read/review functions, and safe audit events.
- Extend profile creation so every new patient is created with a safe eligibility state; failure must
  leave the account non-bookable rather than create a role-only patient.
- Add one database predicate/function used by both booking and meeting admission. No lower-level
  booking or provider function may bypass it.

### Server/API changes to plan and implement

- Public patient registration with role fixed server-side to `patient`.
- Approved adult eligibility capture and email/account prerequisites.
- Either the approved guardian-authenticated flow or a scoped, expiring, single-case bounded
  submission flow; never a general unauthenticated table insert.
- Protected reviewer accept/reject command that locks the case, writes consent evidence, changes
  eligibility, and writes audit evidence atomically.
- Safe own-status and reviewer-queue projections that omit assurance/reviewer detail from patient
  responses unless specifically approved.
- Generic `eligibility_pending`/`eligibility_not_met` errors that do not expose guardian or reviewer
  information.

### React changes to plan and implement

- Add registration and eligibility feature boundaries under a new `src/features/eligibility/` or the
  exact feature path chosen by the R1.2 Tier 2 plan.
- Add adult, minor-consent-required, submission-pending, accepted-but-not-yet-eligible, eligible, and
  ineligible states using only approved copy.
- Add patient/guardian receipt/status UI only within the approved access model.
- Add reviewer UI only for the explicitly appointed role; do not infer it from `admin`.
- Gate booking presentation from server status while keeping RLS/functions authoritative.
- Add no guardian appointment, payment, meeting, profile, or note navigation unless a later approved
  policy explicitly grants it.

### Expected current files affected

- New forward migrations under `supabase/migrations/`.
- The Auth/profile creation function currently originating in
  `supabase/migrations/20260830084121_demo_identity_and_scheduling.sql` is changed only through a new
  forward migration.
- New eligibility/consent Edge Functions if the approved flow needs them.
- `Orion_React_App/src/features/auth/`, `src/routes/routeConfig.jsx`, `src/constants/roles.js`,
  `src/constants/routes.js`, and new eligibility pages/features.
- New database/RLS scripts and desktop/mobile Playwright journeys.
- Data dictionary, privacy, clinical, database/RBAC, access/audit, Supabase, implementation-status,
  and R1.2 as-built documentation.

### Verification gate

- Every eligibility/guardian table and function has allow and deny coverage for patient,
  psychiatrist, admin, unauthenticated, server, and conditional guardian contexts.
- A patient cannot self-assign any role, reviewer, guardian relationship, or eligible status through
  signup metadata, recovery, URL, client state, direct table write, or function arguments.
- Every absent/pending/rejected/superseded/unaccepted minor state denies reservation and admission.
- Accepted status can be reached only through the approved reviewer path with immutable consent and
  audit evidence.
- Guardian evidence does not appear in appointment, payment, note, ticket, audit-content, log, or
  browser-artifact paths.
- Existing sign-in, role navigation, booking, cancellation, RLS, and D5 synthetic tests remain green.

### Handoff to R1.3 and R1.4

The R1.2 as-built entry records the exact bookability/admission predicate, status codes, function
signatures, RLS policies, and guardian model. R1.3 and R1.4 consume those exact facts rather than the
logical names in R1.1.

## Phase 17 / R1.3 — PayMaya payment-authorised booking

### Outcome

The existing single booking entry point reserves a slot and creates one `payment_pending`
appointment/payment attempt. Only an authentic, idempotently processed PayMaya provider result changes
that same appointment to `booked`. A browser return can only read status.

### Decisions and inputs required before implementation

| Authority | Required decision/input |
| --- | --- |
| PayMaya/vendor | Official selected-product API docs, merchant sandbox, checkout/event/reference fields, signing/authenticity, replay/retry/order, expiry, status, and reconciliation semantics. |
| Company owners/finance/operations | Amount/currency source, reservation expiry, checkout failure/abandonment, cancellation, reschedule, no-show, refund, chargeback, receipt, late success, duplicate charge, manual settlement, and reconciliation authority. |
| DPO/legal | PayMaya/vendor approval, lawful basis, notice, data flow, readers, retention/disposal, cross-border position, and evidence requirements. |
| Security/operations | Webhook exposure controls, secret rotation, rate limits, payment and booking kill switches, alerting, and incident owner. |

No official documentation means no final provider field names, webhook verifier, or production
checkout. No expiry policy means no real payment booking activation.

### Database changes to plan and implement

- Add `payment_pending` to appointment status and `reserved` to slot status through forward changes.
- Add an immutable booking-authorisation basis so historical synthetic direct bookings are not
  misrepresented as paid.
- Replace booked-only slot uniqueness and appointment-overlap constraints with active-state rules
  covering both `payment_pending` and `booked`.
- Add `payment_attempts` current state and append-only `payment_events` using the final approved field
  dictionary.
- Enforce the immutable `appointment_id`/`patient_id`/`psychiatrist_id` triple through composite
  database integrity plus protected functions.
- Add unique checkout/request/provider-event identities and idempotent transition constraints.
- Add no raw provider payload or card/wallet/credential column.
- Add safe patient/coarse psychiatrist/admin payment-status projections and keep unapproved support denied
  until the owner records a scope.
- Add typed payment audit events and reason/status codes without ticket, clinical, credential, or raw
  provider content.

### Server/API changes to plan and implement

- Change the existing `book-appointment` contract; do not add a second booking endpoint or page.
- Accept only selected slot and patient-scoped idempotency key; derive every relationship and
  commercial value server-side.
- Lock and re-check the slot using database time, call the R1.2 eligibility predicate, create the
  pending appointment/reserved slot/attempt atomically, then call PayMaya outside the transaction.
- Reuse the same attempt/checkout result for retries and return `slot_unavailable` generically to a
  losing concurrent caller.
- Add a provider adapter and server-only checkout creation using official material.
- Add webhook processing that verifies authenticity, resolves by stored provider reference, inserts
  one unique event, and transitions pending to booked once.
- Add authenticated Orion status retrieval for the browser-return page. Ignore client success/failure
  parameters as state evidence.
- Add manual reconciliation only after actor, evidence, reason, review, and audit policy is approved.
- Keep unresolved, failed, cancelled, out-of-order, late, and conflicting provider outcomes
  non-booked until policy explicitly determines them.

### React changes to plan and implement

- Replace immediate “Appointment confirmed” behavior in
  `Orion_React_App/src/pages/PatientAppointment.jsx` with reserving, checkout-ready, redirecting,
  pending/verifying, booked, unresolved, and provider-unavailable states.
- Extend appointment queries/mutations/components under `src/features/appointments/`; introduce a
  payment feature boundary only for payment-specific status/return behavior.
- Add an authenticated payment-return/status route that never claims success from its URL.
- Show `payment_pending` distinctly in My appointments and never render Join for it.
- Show only the approved coarse reservation status to the assigned psychiatrist.
- Keep provider references, webhook material, and sensitive failures out of browser storage, query
  strings, analytics, console, toasts, and screenshots.

### Expected current files affected

- New forward appointment/slot/payment/RLS/function migrations.
- `supabase/functions/book-appointment/index.ts` and new PayMaya checkout, webhook, status, and
  reconciliation Edge Functions selected by the R1.3 Tier 2 plan.
- `Orion_React_App/src/pages/PatientAppointment.jsx`, `src/pages/Appointments.jsx`,
  `src/features/appointments/queries.js`, `src/features/appointments/mutations.js`, appointment
  components, route constants/configuration, and new payment-return feature files.
- Booking, payment, RLS, webhook, redaction, unit, integration, and Playwright tests.
- Appointment lifecycle, data dictionary, privacy, database/RBAC, access/audit, Supabase,
  implementation-status, R1.3 plan, and eventual as-built audit.

### Verification gate

- Concurrent booking has exactly one pending reservation; retry returns the original result and does
  not create a duplicate checkout.
- Client IDs, amount, currency, status, and provider references cannot rebind payment to another
  patient, psychiatrist, slot, or appointment.
- Forged browser return parameters and direct RPC attempts cannot mark paid/booked.
- Authentic duplicate provider events produce one event identity and one transition.
- Missing/bad/replayed/stale provider authenticity is safely denied without raw payload leakage.
- `payment_pending`, failed, cancelled, ineligible, unrelated, and out-of-window users receive no
  meeting admission.
- Expiry/failure/late success/refund/chargeback tests exist only for the recorded approved policy.
- Current booking concurrency, cancellation, RLS, appointment projection, and D5 demo tests remain
  green; old direct-book behavior is not a real-environment fallback.

### Handoff to R1.4 and R1.5

The R1.3 as-built entry records the exact appointment/payment states, payment-confirmation predicate,
provider adapter/events, kill switches, projections, and exception states. R1.4 consumes `booked` only;
R1.5 consumes operational exceptions and reconciliation evidence.

## Phase 18 / R1.4 — Google Meet, admission timing, and note-window integration

### Outcome

An eligible assigned patient or approved assigned psychiatrist can enter only an approved Google Meet
session for a `booked` appointment during the database-authoritative early-join/session window. The
scheduled end and subsequent note-writing display window do not create automatic clinical outcomes or
note transitions.

### Decisions and inputs required before implementation

| Authority | Required decision/input |
| --- | --- |
| Google Workspace/vendor | Organisation/domain, edition, host identity, meeting creation, participant invitation/admission, early entry, participant removal/end-session, event/reconciliation data, quotas, outage behavior, and API documentation. |
| DPO/legal/security | Vendor and transfer approval, provider data flow, secret/auth model, retention/deletion, subprocessors, breach support, and permitted provider features. |
| Clinical lead | Confirmation of 15/45/15, early end, late/no note, no-show edges, patient visibility, completion authority, and correction interaction. |
| Company owners/operations | Outage/fallback position, host/end-session responsibility, stop authority, support communication, and service commitment. |

Google Meet remains proposed, not approved. JaaS behavior and JWT claims are not a Google Meet API
specification.

### Database and server changes to plan and implement

- Add or finalize one database admission-decision function using `now()`, R1.2 eligibility,
  R1.3 `booked`, patient/psychiatrist relationship, clinician approval, and
  `[starts_at - 15 minutes, ends_at)`.
- Return decision codes and boundary timestamps needed by clients; do not persist duplicate derived
  join/note timestamps.
- Keep `appointments.video_room_id` and `get-demo-meeting-access` confined to synthetic JaaS
  compatibility; create a separate approved provider abstraction/resource model.
- Create/retrieve one provider meeting only after `booked` and only through the approved server
  context. No provider secret or reusable unrestricted entry point reaches the browser.
- Add provider event/reconciliation fields only after Workspace material establishes their need.
- Do not add `meeting_ended_at` unless a trustworthy provider fact and approved early-end consequence
  require it. If added, it records history and does not silently move scheduled note/outcome rules.
- Before R1.4 can complete, verify whether the Phase 2/4 session-note schema, protected functions, and
  UI actually exist. If absent, schedule that baseline prerequisite with its own migration, RLS/test
  gate, and as-built audit; do not hide it inside a Google Meet completion claim.
- Preserve the Phase 2 session-note contract: function-only audited reads, psychiatrist authorship,
  patient after manual release, explicit admin support/default-admin denial, and immutable amendments.
- Add no automatic completion, no-show, note lock, note release, or note publication job.

### React changes to plan and implement

- Replace the demo-specific meeting route only for the real-launch provider boundary while retaining
  the labelled JaaS synthetic path as historical/demo behavior.
- Render Join from server state for eligible assigned users on `booked` only; client time schedules a
  refresh but never grants access.
- Add approved preflight, provider-unavailable, admission-waiting/denied, session-ended, and return
  states without revealing meeting identifiers.
- Display the post-session note-writing window from server-returned scheduled boundaries.
- Keep note authoring and manual release independent from the 15-minute display window.

### Expected current files affected

- New forward provider/admission/note migrations only where the final R1.4 contract requires them.
- A new Google Meet Edge Function/adapter boundary; do not repurpose
  `supabase/functions/get-demo-meeting-access/index.ts` as if its JaaS claims apply.
- `Orion_React_App/src/pages/DemoMeeting.jsx` remains demo-specific; R1.4 adds an approved real-meeting
  surface and updates appointment Join behavior.
- `src/lib/appointmentTiming.js` and `src/lib/meetingWindowClock.js` remain display helpers; server
  decision tests prove they are not authorization.
- Appointment/note features, route constants/configuration, unit/admission/RLS/provider/Playwright
  tests, and R1.4/provider/operations documentation.

### Verification gate

- Patient and assigned psychiatrist allow; unrelated patient/psychiatrist, admin support, admin,
  guardian, unauthenticated, unapproved clinician, and ineligible patient deny.
- `payment_pending`, cancelled, failed, completed/no-show where policy excludes, and non-booked states
  deny admission.
- One millisecond before/at early-open and before/at scheduled end behave exactly from database time.
- Copied provider entry data does not bypass Orion/Workspace admission.
- Provider outage follows the approved behavior without falling back to public Jitsi or weakening
  privacy.
- Scheduled end and `end + 15 minutes` cause no automatic appointment outcome, note lock, or release.
- Existing D5 JaaS synthetic access matrix stays green and remains clearly non-production.

### Handoff to R1.5 and Phase 13

R1.4 records exact provider resources, admission rules, event data, kill-switch behavior, and timing
facts. R1.5 builds the outage/support process from those facts. Phase 13 continues to own human-recorded
appointment outcomes, no-show, rescheduling, and outcome correction.

## Phase 19–20 / R1.5 — Support, operations, verification, and controlled launch

[Phase 19](phase-19-support-tickets-and-launch-operations.md) is the canonical feature/operations
plan. [Phase 20](phase-20-integrated-launch-verification-and-controlled-release.md) is the separate
canonical integrated-acceptance and release-control plan. The combined material below is only their
cross-phase summary.

### Outcome

Patients can submit and view administrative support tickets. Approved admin operators can use a
least-privilege audited queue. The service has controlled payment/provider exception handling,
independent kill switches, retention/data-rights processes, incident ownership, and integrated launch
evidence. Email remains absent until separately activated after implementation and approval.

### Decisions required before implementation

| Authority | Required decision |
| --- | --- |
| Company owners/support operations | Ticket categories, free text, responder roles, admin support scope, assignment, reply, close/reopen/escalation, support hours, response promises, abuse/spam handling, and future support-email owner. |
| Operations/security | Admin queue ownership, payment reconciliation roles, stop/kill-switch authority, alerts, incident communication, access review, recovery, and on-call process. |
| Clinical lead | Approved non-emergency boundary and clinical escalation/referral wording; tickets must never become triage or treatment. |
| DPO/legal | Ticket/payment/provider lawful basis, notices, readers, audit review, retention clocks/periods, disposal, export/deletion/correction, legal hold, backup purge, and incident obligations. |
| Company owners | Final residual-risk acceptance and controlled-pilot go/no-go after all other authorities approve. |

### Database and server changes to plan and implement

- Add `support_tickets` metadata and append-only `support_ticket_messages` only with the approved
  categories/content/lifecycle field dictionary.
- Enable RLS and revoke default grants in the same forward migration. Patient owns one ticket;
  authorised admin functions serve the queue. Psychiatrist and unauthenticated access deny.
- Keep any separate support access denied; no separate support role is in the current product.
- Route all ticket reads through audited functions because read access itself must be evidenced.
- Derive patient/author identity from Auth; no caller can submit another patient ID or role.
- Add approved rate limiting, length/category checks, no upload path, and safe generic errors.
- Add protected reply/status/close/reopen/escalation commands only for approved transitions.
- Add approved payment reconciliation and Google Meet outage/incident operations from R1.3/R1.4
  as-built contracts; no ticket message itself changes a payment, appointment, meeting, or note.
- Implement retention/export/deletion/disposal only after Q11/DPO decisions, with evidence and legal
  hold behavior. Until then, those actions remain unavailable.
- Add independent server controls for eligibility/guardian intake, booking/payment initiation,
  webhook transition, Google Meet creation/admission, and ticket mutation.

### React and operations changes to plan and implement

- Add patient ticket create/list/detail/status and only the approved reply/reopen actions.
- Display prominent approved “administrative support only; not emergency or clinical care” language.
- Provide no upload, email, diagnosis, notes, treatment-advice, or emergency-request affordance.
- Add minimal admin queue/detail/action surfaces through audited server functions. Do not broaden
  profile, appointment, payment, or note browsing.
- Do not add a separate support UI; admin operations use the least-privilege queue surface.
- Add operational dashboards using counts/statuses only; no ticket body, guardian evidence, note,
  payment credential, provider payload, or meeting identifier in telemetry.
- Finalize runbooks for payment exceptions, provider outage, guardian/privacy request, ticket abuse,
  security incident, clinical escalation, access review, backup/restore, and kill-switch activation.
- Add the support email only after implementation is otherwise complete and its owner/address/copy/
  notification behavior is separately approved. It is not a silent extension of tickets.

### Expected current files affected

- New forward ticket/RLS/function/audit migrations and approved operational functions.
- New ticket Edge Functions if required by audited read/mutation or rate limiting.
- New `Orion_React_App/src/features/support/` pages/components/queries/mutations, route/ability
  constants, authenticated navigation, and minimal admin queue surfaces.
- Payment/provider operations surfaces from R1.3/R1.4 only after their exact as-built contracts.
- Database/RLS, API, redaction, rate-limit, unit, integration, desktop/mobile Playwright, accessibility,
  security, performance, restore, and manual runbook exercises.
- Operations policies/runbooks, privacy/data dictionary, access/audit, implementation status, R1.5
  plan, release evidence, and eventual as-built audit.

### Verification and release gate

- Own-patient ticket and approved-admin queue allow; other patient and psychiatrist by
  default, guardian, and unauthenticated deny at table and function layers.
- Ticket reads/status/mutations produce safe audit facts without message/category content.
- Direct insert/update/delete, upload, cross-patient ownership, unapproved lifecycle transitions, and
  role spoofing fail.
- Synthetic sentinel content cannot leak into logs, errors, URLs, analytics, screenshots, traces,
  reports, fixtures, or audit metadata.
- Reconciliation and provider incident operations require approved actors/reasons/evidence and cannot
  rebind relationship IDs or expose sensitive provider content.
- Kill switches are independently exercised and fail closed without deleting history or re-enabling
  direct booking/public video.
- Retention/data-rights tests match the approved schedule and legal-hold behavior; they remain deferred
  if policy is still absent.
- Full R1.2–R1.5 RLS/API/browser flow passes with synthetic data, alongside D1–D7, Phase 9, lint,
  build, security, accessibility, performance, restore, and manual provider checks.
- Named product, clinical, DPO/legal, security, and operations owners approve their evidence. Company
  owners record go/no-go. No technical check substitutes for that decision.

## Integrated migration and rollout order

The grouped sequence is intentionally incremental rather than one large R1 migration:

1. **Predecessor gate.** Complete Phase 14 and record its dated as-built audit, or record an explicit
   sequencing amendment with compatibility checks.
2. **Phase 15 re-ground and foundation.** Query live state; add approved provider-neutral objects,
   active-state compatibility, deny-first RLS/functions/audit, tests, and a dated as-built audit.
3. **Phase 16 identity and eligibility.** Add approved guardian evidence and reviewer path,
   registration/status/review surfaces, booking/admission predicate, tests, and as-built audit.
4. **Phase 17 payment domain.** Add pending/reserved states, active constraints, payment
   attempts/events, protected transitions, and safe projections; keep payment initiation disabled.
5. **Phase 17 provider/application.** Add the official PayMaya adapter, webhook, return/status,
   pending UI, synthetic provider tests, and as-built audit.
6. **Phase 18 admission/provider.** Add database-time admission and only approved provider resource
   fields; no duplicate derived timestamps.
7. **Phase 18 application.** Add Google Meet admission, scheduled end, note-window display,
   synthetic/manual provider checks, and as-built audit.
8. **Phase 19 tickets.** Add approved ticket fields, audited patient/operator functions, UI, rate
   limits, and synthetic isolation/redaction tests.
9. **Phase 19 operations.** Add approved reconciliation, retention/data rights, runbooks, access
   review, restore inputs, kill-switch/incident exercises, and as-built audit.
10. **Phase 20 acceptance and release control.** Run the full synthetic matrix and security/privacy/
    clinical/accessibility/performance/restore/rollback reviews, assemble evidence, obtain named
    approvals, and then obtain the company-owner go/no-go.

At each step, a failed release disables the affected new capability and is corrected by another
forward change. No rollback hard-deletes consent, appointment, payment, ticket, note, or audit history.

## Cross-phase file/change matrix

| Area | Phase 15 | Phase 16 | Phase 17 | Phase 18 | Phase 19 | Phase 20 |
| --- | --- | --- | --- | --- | --- | --- |
| `profiles`/roles | Add only approved compatibility/role foundation | Safe eligibility initialization and approved reviewer boundary | Read caller only | Read caller/clinician approval | Read approved operator only | Verify full cross-role matrix |
| Appointments/slots | Prepare active-state-compatible foundation | Supply eligibility predicate | Add pending/reserved constraints and verified-payment transition | Consume booked/times for admission | Read safe status only if approved | Verify the complete lifecycle |
| Guardian consent | Provider-neutral protected cases/events foundation | Implement approved submission/review/status path | Bookability decision only | Eligibility decision only | Privacy/support process only if approved | Verify collection, access, rights, and denial cases |
| Payments | Protected attempts/events foundation | No payment access | Provider/webhook/status/reconciliation implementation | Booked result consumed | Exception operations and support boundary | Verify happy/failure/retry/outage/security cases |
| Google Meet/timing | Protected admission/audit basis only as approved | Eligibility predicate supplied | Booked result supplied | Provider/admission/15/45/15 implementation | Outage/support/runbook operations | Verify timing, privacy, outage, and rollback |
| Session notes | Preserve separate protected-note prerequisite | Eligibility grants no note access | Payment grants no note access | Scheduled-window display; manual release remains independent | Ticket tooling cannot read notes | Verify clinical/manual-release boundary |
| Tickets | Protected metadata/message foundation | No access implied | No automatic ticket from payment return | No provider data copied into tickets | Patient/operator feature and approved operations | Verify isolation, redaction, retention, and operations |
| Audit | Common typed facts/functions | Eligibility/consent events | Payment/booking events | Admission/provider/timing events | Ticket/reconciliation/incident/rights evidence | Verify completeness, redaction, and traceability |
| React | No UI except migration-compatible safety needs | Registration/eligibility/review | Booking/payment-return/appointment states | Meeting/note-window states | Patient tickets/operator queue | Integrated adult/minor and denial journeys |
| Tests | Migration/RLS/function/audit foundation | Minor/role/consent | Concurrency/idempotency/webhook/return | Admission/time/provider/no-auto-note | Ticket isolation/redaction/runbooks | Full acceptance, restore, rollback, and approval evidence |

## Overall user and system flow after completion

### Adult patient

```text
Register
-> server creates patient role plus pending eligibility
-> approved adult declaration/notices/account prerequisites complete
-> server records eligible
-> booking becomes available
```

No forecast-based registration cap or waitlist is introduced.

### Minor patient and guardian

```text
Minor patient account/path identified
-> eligibility remains pending and booking/join stay unavailable
-> approved guardian account or bounded case submits approved versioned consent
-> submission is recorded but patient remains pending
-> authorised reviewer accepts or rejects
-> accepted evidence atomically changes eligibility to eligible
-> rejected/pending/absent/superseded evidence keeps booking/join denied
```

Guardian status access, if approved, remains limited to the linked case. It does not grant appointment,
payment, meeting, profile, ticket, or note access.

### Payment-authorised booking

```text
Eligible patient selects slot
-> server authenticates and locks slot
-> database derives patient, psychiatrist, and 45-minute times
-> creates reserved slot + payment_pending appointment + payment attempt
-> server creates PayMaya checkout
-> patient returns to informational status page
-> verified unique provider event arrives
-> protected transition changes same appointment to booked
-> patient and assigned psychiatrist see role-safe booked status
```

Duplicate checkouts/events return the original safe result. Failed, late, cancelled, expired, refunded,
charged-back, or manually settled cases follow only the approved policy and otherwise remain unresolved
without granting admission.

### Session and note timing

```text
Related eligible user requests join
-> database checks booked and [start-15m, end)
-> R1.4 applies approved Google Meet admission
-> consultation ends at scheduled end under approved provider/session policy
-> psychiatrist sees note window until end+15m
-> no automatic outcome, lock, or release
-> psychiatrist manually releases note when permitted
-> patient can read only after release
```

Early end, late note, no-show, completion, outcome correction, and rescheduling remain governed by the
recorded clinical decisions and Phase 13.

### Support ticket

```text
Authenticated patient selects approved administrative category
-> sees approved non-clinical/non-emergency warning
-> submits length-limited content without upload
-> server derives patient ownership and writes ticket/message/audit
-> patient reads own status through audited function
-> authorised admin reads queue/detail through audited function
-> approved reply/status/close/reopen/escalation transition occurs
```

A ticket never changes an appointment, payment, meeting, eligibility, or note directly. Staff use the
separate protected operation, evidence, and authority for the relevant domain.

### Operations and release

```text
Operational exception or incident detected
-> privacy-safe alert identifies code/correlation only
-> named owner uses approved reconciliation/kill-switch/runbook
-> action and evidence are audited
-> affected feature stays disabled until safe
-> no data is hard-deleted and no security boundary is downgraded
-> authority owners review evidence
-> company owners approve or defer real-user activation
```

## Completion definition

This phase map is fully realised only when:

- each Phase 15–20 plan is re-grounded from its predecessor's dated as-built audit and current live
  state before implementation;
- every required owner/clinical/DPO/vendor decision is recorded in the owning authority;
- each phase uses forward migrations, deny-first RLS, protected functions, safe audit, and synthetic
  tests from this map;
- each phase produces a dated as-built audit before the next consumes it;
- the integrated adult, minor-consent, payment, admission, note, and ticket flows pass end to end;
- every deferred provider/policy scenario is either approved and tested or still disabled;
- no critical/high finding remains and operational exercises pass; and
- named authorities approve their gates and company owners record the final controlled-pilot go/no-go.

Until all of those conditions are met, the system remains synthetic-only regardless of how many
individual screens or functions have been built.
