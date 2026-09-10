# Phase 16 — Identity, Adult Eligibility, and Minor Consent

**R1 mapping:** Implements R1.2 using the Phase 15 data/RLS foundation.

**Status:** Planned — implementation blocked on the decisions below and on a verified Phase 15
as-built gate.

## Outcome

Patients can enter the approved adult or minor onboarding path. Every account receives a server-held
eligibility state independent of role. A minor remains unable to reserve, pay, or join until approved
guardian evidence has been reviewed and accepted. Psychiatrist roles remain
invite/provision-only and cannot be obtained through public registration or recovery.

## Where implementation draws its basis

1. [Clinical safety](../../product/clinical-safety-and-telepsychiatry-policy.md),
   [privacy governance](../../governance/privacy-governance.md), and the
   [data dictionary](../../governance/data-classification-and-data-dictionary.md).
2. Current eligibility/consent authority in the
   [decision register](../../product/pilot-decision-register.md) and
   [product scope](../../product/product-scope.md).
3. [R1.1 eligibility/guardian contract](../launch-readiness/r1.1-data-consent-and-audit-extension.md)
   and [Phase 15](phase-15-data-consent-and-audit-foundation.md).
4. The Phase 15 dated as-built audit for exact schema/functions/RLS; if absent, implementation stops.
5. A fresh read of current Auth configuration, profile trigger, role constants, routes, CASL ability,
   recovery behavior, deployed functions, and RLS tests.

The Phase 3 adults-only plan is historical input only where the 8 September amendment supersedes it.

## Scope

- Public patient registration with role fixed server-side to `patient`.
- Approved adult eligibility capture and pending/eligible state transitions.
- Approved guardian account or bounded submission, versioned evidence, review, and status path.
- Server bookability/admission predicate used by later booking and meeting functions.
- Psychiatrist invite provisioning boundary and reviewer authority where approved.
- Safe recovery, route/ability presentation, rate limiting, and synthetic verification.

## Non-goals

- Choosing minimum age, assurance method, reviewer, guardian portal/data access, suitability,
  refusal/emergency wording, retention, or legal text.
- Payment checkout, meeting provider integration, support tickets, or outcome behavior.
- Guardian access to profile, appointment, payment, meeting, note, or general patient data.
- Treating CASL or route guards as authorization.

## Required decisions

| Authority | Decision |
| --- | --- |
| Company owners | Guardian account versus bounded submission, reviewer/acceptor, visibility, and whether admin holds review authority. |
| Clinical lead | Minimum age, suitability, acceptance requirements, refusal route, and approved emergency/referral content. |
| DPO/legal | Age data representation, identity/relationship assurance, lawful basis, exact notices/consent wording, rights, readers, retention, and disposal. |
| Operations/security | Abuse/rate-limit controls, review ownership, invitation/recovery controls, and kill-switch authority. |

Infrastructure may be tested synthetically without seeded wording only where the approved field model
permits it. No real onboarding completes against placeholder or unapproved text.

## Provisional Tier 2 implementation plan

### P16-0 — Re-ground identity and Phase 15 contracts

- Read the Phase 15 as-built audit and query its exact eligibility/guardian functions and policies.
- Inspect `private.create_patient_profile()`, current Auth settings, `AuthProvider`, route guards,
  roles/routes constants, CASL ability, Login, recovery, and existing Auth/RLS tests.
- Confirm whether Phase 3 provisioning/recovery work or Phase 12 MFA changed the starting state.
- Freeze approved onboarding/eligibility state diagrams and safe copy/version references.

### P16-1 — Safe patient initialization

- Replace the current role-only profile trigger through a new forward migration so a new patient
  cannot exist as bookable without a corresponding safe eligibility state.
- Keep role fixed to `patient` in server code; ignore client metadata/role claims.
- If cross-object initialization fails, roll back or leave a deterministically non-bookable state.
- Audit registration/eligibility creation with safe IDs/codes only.

### P16-2 — Adult eligibility

- Capture only the DPO/clinical-approved age representation and document versions.
- Transition adult eligibility through a protected function after approved account, verification, and
  consent prerequisites are met.
- Keep booking absent for pending/ineligible accounts; do not implement a waitlist or 50-user cap.
- Return generic safe reason codes and approved patient-facing wording.

### P16-3 — Minor and guardian path

- Implement exactly one approved model: guardian Auth account or scoped, expiring, single-case bounded
  capability with replay/rate-limit protection.
- Link the case server-side to one minor patient. Do not accept a trusted patient ID from the submitter.
- Append submitted evidence and keep eligibility pending.
- Implement reviewer accept/reject as a locked atomic transaction that appends evidence, changes
  eligibility, and writes audit.
- Expose only approved own-case status/receipt. Do not expose reviewer or assurance details by default.

### P16-4 — Provisioning, recovery, and route integration

- Ensure public registration can never produce psychiatrist, admin, guardian reviewer, or
  eligibility authority.
- Keep psychiatrist invitation/provision-only and align with the actual three-role schema.
- Ensure recovery changes no role, approval, eligibility, guardian relationship, or reviewer state.
- Build one frontend eligibility feature boundary and shared server-state query.
- Add adult/minor/pending/accepted/ineligible states and reviewer UI only for the appointed authority.
- Clear protected eligibility/guardian cache on sign-out; persist no sensitive data in browser storage.

### P16-5 — Booking/admission interlock

- Publish one protected database predicate/function that later phases call for bookability/admission.
- Test that lower-level functions and direct RPC/table paths cannot bypass it.
- Keep every non-eligible minor state from reserving a slot, creating payment, or obtaining meeting
  admission.

### P16-6 — Verification and handoff

- Add RLS/function allow-deny coverage for all roles and conditional guardian context.
- Test role/eligibility escalation through metadata, URLs, recovery, direct writes, and forged inputs.
- Test absent, pending, submitted, rejected, superseded, accepted, and eligible states.
- Test consent/reviewer audit evidence and redaction across logs/errors/artifacts.
- Run existing Auth/navigation/booking/cancellation/RLS/D5 desktop/mobile regressions.
- Write the Phase 16 as-built audit.

## Expected files changed during implementation

- New forward identity/eligibility/consent function migrations.
- New eligibility/guardian Edge Functions only if the approved model needs them.
- `Orion_React_App/src/features/auth/`, `src/constants/roles.js`, `src/constants/routes.js`,
  `src/lib/ability.js`, `src/routes/routeConfig.jsx`, Login/registration/recovery surfaces, and new
  `src/features/eligibility/` files.
- Database/RLS scripts, Auth/unit tests, and desktop/mobile Playwright journeys.
- Decision register, clinical/privacy/data/RBAC/audit/Supabase/status docs and dated Phase 16 audit.

## Gate

Phase 16 completes only when:

- patient role and eligibility are server-created and cannot diverge into a bookable role-only state;
- public registration/recovery cannot produce or modify a privileged role or eligibility decision;
- every non-accepted minor condition denies reservation/payment/admission;
- accepted evidence changes eligibility only through the authorised reviewer transaction;
- guardian access is limited to the approved linked case and cannot reach other patient domains;
- exact versioned evidence and safe audit are present with no sensitive leakage;
- desktop/mobile and all existing critical regressions pass; and
- the Phase 16 as-built audit records exact contracts for Phase 17/18.

## Phase 17 and 18 implementation input

Both phases consume the exact Phase 16 bookability/admission predicate, eligibility statuses,
relationship model, safe errors, RLS policies, and audit events from the as-built audit.

## Inputs not yet available

- Phase 15 as-built evidence.
- Named reviewer, clinical lead, DPO/privacy owner, and operations/security owner.
- Minimum age, assurance/access/suitability/refusal rules, final wording, and retention/disposal.
