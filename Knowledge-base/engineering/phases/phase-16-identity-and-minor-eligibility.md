# Phase 16 — Identity and minor eligibility

**Status:** Waiting for owner decisions after meeting — planning only

**Scope:** Define the account, consent, age-eligibility, and administrative approval process for
users under 18. This phase is not a blocker for unrelated phases. It becomes a prerequisite only
for work that depends on an approved eligibility or guardian-consent decision.

## Owner questions

The owners identified two decisions that must be answered before implementation planning can close:

1. **What consent flow is required?**
2. **How should Orion handle users who misstate their age, and what credentials or evidence are
   required?**

## Current owner direction

The proposed consent flow is:

1. A user under 18 creates an account.
2. The user submits parent/guardian consent.
3. The account remains pending while the consent is reviewed.
4. An admin reviews and approves or rejects the request.
5. If approved, Orion sends the user an email confirming that the account was approved.

This is recorded as the current owner proposal, not as an implementation authorization or a final
legal/clinical policy decision.

## Decisions still required after the meeting

### Age and identity verification

The owners must decide:

- whether age is self-declared, document-verified, or verified through another approved method;
- whether the service needs proof of identity for the minor, the parent/guardian, or both;
- which credentials or documents are acceptable;
- who reviews the evidence and what happens when it is unclear or unavailable;
- how the system handles suspected false age declarations;
- whether the user is denied, paused for review, or asked to resubmit;
- what minimum information is retained as evidence of the decision.

No credential or document requirement is assumed until this decision is recorded by the owners and
reviewed by the appropriate privacy/legal and clinical owners.

### Consent details

The meeting must also confirm:

- whether consent is completed through an Orion form, an uploaded signed form, or both;
- how the parent/guardian is verified;
- whether the minor must also acknowledge the consent;
- the approved consent wording and versioning process;
- the admin review standard and rejection reasons;
- the email and account states before and after approval.

## Proposed account-state model for review

```text
account request
  -> pending guardian consent
  -> pending admin review
  -> approved; confirmation email sent
  -> email confirmed; account active
```

The exact state names, transitions, permissions, and booking gate remain implementation-plan
decisions after the owner questions are answered.

## Provisional implementation planning (not authorised)

The following technical outline remains provisional and must be re-grounded against the approved
owner decisions and the current Phase 15 as-built evidence before implementation begins.

### P16-0 — Re-ground identity and Phase 15 contracts

- Read the Phase 15 as-built audit and query its exact eligibility/guardian functions and policies.
- Inspect current Auth settings, profile initialization, role constants, routes, recovery behavior,
  deployed functions, and RLS tests.
- Freeze the approved onboarding, eligibility, and consent state diagrams and safe copy/version
  references.

### P16-1 — Safe patient initialization

- Create the patient role and non-bookable eligibility state server-side.
- Ensure registration cannot create a bookable account without the required eligibility state.
- Keep role and eligibility independent; never trust client metadata or role claims.
- Audit registration and eligibility creation with safe IDs and reason codes only.

### P16-2 — Adult eligibility

- Capture only the age/identity information approved by privacy and clinical owners.
- Transition adult eligibility through a protected server function after account and verification
  prerequisites are satisfied.
- Keep booking unavailable for pending or ineligible accounts.

### P16-3 — Minor and guardian path

- Implement the owner-approved consent method: Orion form, signed upload, or both.
- Link the consent case server-side to exactly one minor account.
- Keep the account pending until consent and admin review are complete.
- Make approval/rejection atomic, append-only in audit history, and safe to retry.
- Expose only the user’s own status and approved receipt; do not expose internal review notes.

### P16-4 — Provisioning, recovery, and route integration

- Ensure public registration and recovery cannot create or modify privileged roles or eligibility.
- Keep psychiatrist provisioning invite-only.
- Ensure recovery changes no role, consent, approval, eligibility, or reviewer state.
- Build one frontend eligibility boundary backed by server state.
- Persist no sensitive consent or identity data in browser storage.

### P16-5 — Booking/admission interlock

- Publish one protected database predicate/function for later booking and session-admission phases.
- Test that lower-level RPC and table paths cannot bypass it.
- Deny reservation, payment initiation, and session admission for every non-eligible minor state.

### P16-6 — Verification and handoff

- Add RLS and protected-function allow/deny coverage for all roles.
- Test forged inputs, URLs, metadata, recovery, direct writes, duplicate submissions, and replayed
  consent links.
- Test absent, pending, submitted, rejected, superseded, accepted, and eligible states.
- Test consent audit evidence and redaction across logs, errors, and test artifacts.
- Run affected Auth, navigation, booking, RLS, desktop, and mobile regressions.
- Write the dated Phase 16 as-built audit.

## Non-blocking boundary

Phase 16 does not block unrelated work such as synthetic demo improvements, support work, or other
features that do not depend on minor eligibility or guardian consent. It does block implementation
of the minor-consent workflow itself and any later workflow that relies on a finalized Phase 16
eligibility predicate.

## Exit criteria for planning

Phase 16 planning can close when the repository records:

- the owner-approved consent flow;
- the owner-approved age/identity verification method;
- acceptable evidence or credential types;
- the admin review and rejection process;
- account and email state transitions;
- privacy, clinical, retention, and operational owners;
- the implementation and QA plan derived from those decisions.

Until then, the phase remains **Waiting for owner decisions after meeting**.
