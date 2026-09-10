# Phase 15 — Data, Consent, and Audit Foundation

**R1 mapping:** Implements the provider-neutral foundation planned in
[R1.1](../launch-readiness/r1.1-data-consent-and-audit-extension.md).

**Status:** Planned — implementation has not started. The provisional Tier 2 outline below becomes
executable only after P15-0 re-grounds it from Phase 14 evidence, live state, and approved decisions.

## Outcome

Create the forward-only, deny-first database foundation consumed by Phases 16–20: patient eligibility,
guardian-consent evidence, payment attempts/events, support tickets/messages, active appointment
reservation states, typed audit evidence, protected functions, and a complete RLS/grant test matrix.
No patient flow, PayMaya adapter, Google Meet integration, or support UI is activated in this phase.

## Where implementation draws its basis

At implementation start, use this evidence chain in order:

1. Governance/clinical authority: [privacy governance](../../governance/privacy-governance.md),
   [data dictionary](../../governance/data-classification-and-data-dictionary.md), and
   [clinical safety](../../product/clinical-safety-and-telepsychiatry-policy.md).
2. Current product authority: the 8 September amendment in the
   [decision register](../../product/pilot-decision-register.md),
   [product scope](../../product/product-scope.md), and
   [appointment lifecycle](../../product/appointment-lifecycle.md).
3. Technical contract: [R1.1](../launch-readiness/r1.1-data-consent-and-audit-extension.md),
   [database/RBAC](../../architecture/database-and-rbac.md), and
   [access/audit policy](../../architecture/access-control-and-audit-policy.md).
4. Sequencing input: the dated Phase 14 as-built audit. If Phase 14 is still only planned, Phase 15
   implementation waits unless the delivery plan records an explicit sequencing amendment.
5. Ground truth: re-query linked migrations, tables, enums, constraints, grants, RLS policies,
   functions, deployed Edge Functions, and current tests. Plans never override live state.

The current point-in-time baseline is six applied migrations through
`20260905090000_safe_appointment_projection`, three roles, five public tables, direct synthetic
booking to `booked`, and no R1 object. Reverify rather than relying on this sentence.

## Scope

- Finalize the field-by-field dictionary and role/action matrix for every object actually created.
- Add provider-neutral current-state and append-only evidence objects through new migrations.
- Add `payment_pending`, reserved-slot, active-conflict, and booking-authorisation compatibility facts.
- Add the fourth approved `secretary` role value without granting an account or capability.
- Add deny-first RLS/grants and protected function boundaries.
- Add typed, content-free audit codes/fields needed by later phases.
- Add synthetic database/RLS/constraint/idempotency/redaction tests.
- Preserve existing five-account data and D1–D7/Phase 9 behavior.

## Non-goals

- Registration, guardian submission/review screens, PayMaya calls/webhooks, Google Meet, ticket UI,
  email support, retention deletion jobs, or production activation.
- Seeding legal/clinical wording or inventing age, assurance, commercial, support, retention, vendor,
  emergency, or outcome policy.
- Editing any applied migration or backfilling fake payment/consent evidence for synthetic bookings.
- Treating a schema object as proof that a real-user flow is approved.

## Decisions required before the affected schema increment

| Object | Required authority decision |
| --- | --- |
| Patient eligibility | Clinical eligibility model; DPO-approved age representation/readers/retention; product transition ownership. |
| Guardian consent | Account versus bounded subject; relationship/identity assurance; reviewer; case/status visibility; clinical acceptance; DPO/legal fields and rights. |
| Payment | Owner-approved amount/currency and reservation principles; DPO-approved fields/readers/retention; official provider material before provider-specific fields. |
| Support ticket | Owner-approved category/content/lifecycle/responders/secretary scope; DPO-approved fields/readers/retention. |
| Audit/retention | Named audit readers/review owner and Q11 retention/disposal/export/legal-hold decisions before lifecycle behavior. |

Schema work may be split so an approved object proceeds while another remains absent. Do not create a
placeholder column/table merely to make the migration look complete.

## Provisional Tier 2 implementation plan

### P15-0 — Re-ground and freeze the approved contract

- Capture current Git status without modifying unrelated or user-owned files.
- Query local/remote migration parity and live schema/function/policy/grant state.
- Read the newest Phase 14 audit or obtain the recorded sequencing amendment.
- Convert R1.1 logical fields into the final data dictionary, with owner, purpose, readers, retention,
  disposal, and legal/privacy approval for every field.
- Freeze role/action, state-transition, audit-event, and safe-error-code matrices for the approved
  objects only.

**Files:** decision/data/privacy/architecture documents and this phase plan; no migration until the
contract is approved.

### P15-1 — Compatibility and enumerated states

- Add `secretary` to `app_role` without policies or accounts.
- Add `payment_pending` to appointment status and `reserved` to slot status.
- Add an immutable booking-authorisation basis that distinguishes historical `synthetic_demo` booked
  rows from future `verified_payment` bookings.
- Replace booked-only active-slot uniqueness/overlap rules with constraints covering both
  `payment_pending` and `booked`, after validating existing rows.
- Keep current synthetic direct-book functions available only inside the explicitly labelled demo
  boundary until Phase 17 replaces the real booking path.

### P15-2 — Eligibility and guardian evidence

- Create one current `patient_eligibility` row per patient only after the approved age/status model is
  fixed.
- Create guardian cases and append-only consent events only after the guardian subject, assurance,
  reviewer, document-version, and reader model is approved.
- Enforce immutable patient/case relationships, constrained states/codes, database timestamps, and
  correlation IDs.
- Grant no direct application write. Expose only own safe status and approved reviewer functions.
- Do not seed a parental-consent version or store raw identity documents.

### P15-3 — Payment attempt and event foundation

- Create provider-neutral payment attempts and append-only payment events from the approved R1.1
  field dictionary.
- Enforce the immutable appointment/patient/psychiatrist triple through composite database integrity
  plus protected insert/update paths.
- Add request/provider-event uniqueness and indexes for safe reconciliation.
- Create no raw provider-payload, card, wallet, credential, or client-trusted amount/status field.
- Provide only patient-safe, assigned-psychiatrist coarse, and approved admin projections; secretary
  remains denied unless explicitly approved.

### P15-4 — Ticket and message foundation

- Create support ticket metadata and append-only ticket messages only after categories, free-text,
  lifecycle, responders, and secretary scope are approved.
- Derive patient ownership from Auth in later functions; never expose a client-settable patient ID.
- Create no attachment/upload, clinical category, emergency, diagnosis, treatment, provider-secret,
  or note field.
- Require audited protected reads for ticket content because RLS alone cannot audit `select`.

### P15-5 — Audit and protected-function boundary

- Extend audit only with typed IDs/status/reason/correlation facts needed by approved events. Prefer
  typed columns/codes to unconstrained JSON.
- Revoke direct application insert/update/delete for eligibility, consent, payment, ticket, note, and
  audit evidence.
- Use fixed-search-path security-definer functions with explicit execute grants.
- Make domain mutation and audit evidence atomic where possible.
- Keep audit/event content free of consent wording, ticket body, payment payload, notes, room IDs,
  credentials, and secrets.

### P15-6 — Synthetic verification and as-built handoff

- Add migration-from-empty and migration-over-current-state tests.
- Add allow/deny coverage per table/action/function/role, including unauthenticated and service context.
- Test immutable relationships, invalid state rejection, active appointment conflicts, idempotency,
  append-only evidence, and audit-content constraints.
- Run existing booking, cancellation, RLS, unit, authenticated desktop/mobile, D5, lint, and build
  regressions.
- Write a dated Phase 15 as-built audit with exact migration versions, objects, constraints, policies,
  grants, functions, event codes, tests, deviations, and remaining policy gates.

## Expected files changed during implementation

- New timestamped files under `supabase/migrations/`; never the six applied migrations.
- New or extended database test scripts under `Orion_React_App/scripts/`.
- No React user-facing feature is required by Phase 15.
- Data dictionary, privacy governance, database/RBAC, access/audit, Supabase, implementation status,
  decision register when decisions land, and the dated audit entry.

Exact migration/function filenames are chosen from the reverified live state and recorded in the
as-built audit; they are not invented here.

## Gate

Phase 15 completes only when:

- every created field has approved ownership/purpose/readers/retention/disposal status;
- all new objects are forward-applied over both empty and current synthetic state;
- every table has RLS and revoked default grants, with explicit allow/deny evidence;
- payment/guardian/ticket identifiers cannot be rebound across users or appointments;
- pending/reserved constraints prevent duplicate active bookings without altering historical rows;
- application users cannot mutate append-only consent/payment/ticket/audit evidence;
- no prohibited content appears in schema, audit, logs, errors, artifacts, or fixtures;
- existing synthetic regressions pass; and
- the Phase 15 as-built audit exists.

Phase 15 does not close any real-user launch gate.

## Phase 16 implementation input

Phase 16 draws from the Phase 15 as-built audit—not this proposal—for exact eligibility/consent table
names, status codes, RLS predicates, protected function signatures, audit codes, and unresolved gaps.

## Inputs not yet available

- Phase 14 as-built evidence or a sequencing amendment.
- Named clinical, DPO/privacy, support/operations, payment, and audit-review owners.
- Guardian subject/assurance/reviewer/access decisions.
- Final field-level retention/disposal/export decisions.
- Approved support categories/content/lifecycle and PayMaya provider material.
