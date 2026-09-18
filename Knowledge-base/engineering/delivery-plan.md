# Delivery Plan — Controlled Pilot

## Outcome

Launch a controlled real-market pilot only after clinical, privacy, security, operational, and technical gates are approved. No production feature work bypasses an earlier gate.

## Current progress — 13 September 2026

The five-account synthetic demo track (D0–D7) is implemented and verified. The current scoped work for
Phases 0–3 is complete, and the frontend continuation's [Phase 11 — Frontend Acceptance](phases/phase-11-frontend-acceptance.md)
work is complete with evidence in the [12 September Phase 11 audit](../audit-trail/2026-09-12-phase-11-frontend-acceptance-audit.md).
These results use synthetic data and non-production infrastructure only; they do not authorize real
users, production data, real payments, or real consultations.

The repeatable AI implementation, QA, merge, publishing, and cleanup process is documented in the
[AI delivery and verification workflow](ai-delivery-workflow.md). Use it for every approved phase.
When a second-agent review or investigation is useful, use the [Claude/Codex coordination process](ai-agent-coordination.md)
before implementation. Phase 16 and later remain planning-gated until all required decisions and
prerequisites are documented and approved.

### Completed current-scope work

| Phase | Current progress | Evidence / boundary |
| --- | --- | --- |
| Phase 0 — Governance and service design | Deferred to post-development — phase remains open | Remaining owner, clinical, privacy, retention, vendor, and operations decisions are recorded in the [post-development deferral register](phases/deferredpostdevelopment.md). |
| Phase 1 — Secure platform baseline | Deferred to post-development — foundation partly implemented | Remaining production-readiness controls are recorded in the [post-development deferral register](phases/deferredpostdevelopment.md). [Phase 1 audit](../audit-trail/2026-09-10-phase-1-implementation-audit.md) |
| Phase 2 — Data, RBAC, consent, and audit | Completed as-built foundation; consent remains deferred to the recorded post-development scope | [Phase 2 implementation audit](../audit-trail/2026-09-10-phase-2-data-rbac-foundation-audit.md) |
| Phase 3 — Replace prototype identity | Completed and verified | [Phase 3 implementation audit](../audit-trail/2026-09-10-phase-3-identity-implementation-audit.md) |
| Phase 11 — Frontend acceptance | Completed and verified; owner walkthrough remains deferred | [Phase 11 acceptance audit](../audit-trail/2026-09-12-phase-11-frontend-acceptance-audit.md) |

## Start here — current implementation roadmap

**Roadmap updated:** 13 September 2026

Phase 4 and [Phase 14 — Doctor-managed availability](phases/phase-14-doctor-managed-availability.md)
are implemented, verified, merged into local `main`, and pushed to `origin/main`. Their detailed
as-built evidence is recorded in the [Phase 4 audit](../audit-trail/20260913-phase-4-scheduling-audit.md),
[Phase 14 audit](../audit-trail/20260913-phase-14-doctor-managed-availability-audit.md), and [Phase 15
audit](../audit-trail/20260913-phase-15-data-consent-audit.md). Phase 15 is complete. The next
numbered phase is Phase 16, but implementation remains deferred and planning-gated until its required
decisions and prerequisites are documented and approved.

Phase 10's JaaS-specific continuation is superseded now that the synthetic demo is complete. Google
Meet belongs to Phase 18 and must not be implemented from the old JaaS plan. Phase 12 MFA is currently
deferred and is not a current-launch blocker; it remains available as a future security-hardening phase.

Use this section as the starting instruction for a new implementation chat:

1. Read the Phase 3 and Phase 11 audits and inspect the current working tree, applied migrations,
   deployed functions, RLS policies, and tests. The live/as-built system is the source of truth.
2. Treat the completed JaaS demo as historical synthetic evidence. Do not implement the superseded
   [Phase 10](phases/phase-10-meeting-experience.md) plan or promote its JaaS route to real sessions.
3. Use the [AI delivery and verification workflow](ai-delivery-workflow.md) for all new phase work.
   Phase 4 and Phase 14 are complete in synthetic/non-production scope. The remaining Phase 1
   production-readiness evidence—access review, hosted CI/CD, staging deployment, monitoring, and
   restore—is deferred to post-development and must be in place before Phase 20 closes.
   Each feature phase must still produce a dated as-built audit before the next phase consumes it.
4. Keep [Phase 12](phases/phase-12-mfa-and-privileged-access.md) deferred for now. Revisit it if the
   owners make MFA a launch requirement or before a later privileged-access hardening milestone.
5. Phase 4, Phase 14, and Phase 15 are now the verified scheduling and R1 foundation. Phase 13 outcomes
   and rescheduling are merged into Phase 4 and must not be implemented separately. Do not begin Phase
   16 implementation until its required decisions and Phase 15 as-built evidence are confirmed.
6. Implement the R1 continuation in order: [Phase 15](phases/phase-15-data-consent-and-audit-foundation.md)
   → [Phase 16](phases/phase-16-identity-and-minor-eligibility.md) →
   [Phase 17](phases/phase-17-paymaya-payment-authorised-booking.md) →
   [Phase 18](phases/phase-18-google-meet-and-session-timing.md) →
   [Phase 19](phases/phase-19-support-tickets-and-launch-operations.md) →
   [Phase 20](phases/phase-20-integrated-launch-verification-and-controlled-release.md).

Phase 14 has a dated as-built audit and is no longer only a plan. Phase 15 has consumed that evidence
and has its own dated as-built audit. Phase 5's real-provider
work is implemented through Phase 18, and Phase 6's new support/release work is implemented through
Phases 19–20; do not create duplicate provider or operations implementations. Phase 5 and Phase 6
are not skipped: their remaining baseline gate evidence must be produced or explicitly delegated and
verified through those later phases before Phase 20 can close.

If a phase is blocked, stop at that phase, record the missing decision or prerequisite, and keep later
features disabled. A passing demo or frontend test does not close a production phase or authorise real
users.

## Launch Readiness R1 position — 9 September 2026

The 8 September owner amendment is handled as the separate
[Launch Readiness R1 workstream](launch-readiness/README.md); it does not rewrite or close the
baseline phases below. [R1.0](launch-readiness/r1.0-governance-and-change-control.md) reconciled the
authority documents, and [R1.1](launch-readiness/r1.1-data-consent-and-audit-extension.md) defines the
provider-neutral data, consent, payment, ticket, timing, RLS, audit, migration, and verification
contract. Both are planning/documentation results only.

The [R1 implementation phase map](phases/r1-launch-readiness-implementation-map.md) preserves the R1
requirements identifiers while the executable plan continues numerically from Phase 14:

| Phase / R1 mapping | Delivery outcome | Gate |
| --- | --- | --- |
| [Phase 15](phases/phase-15-data-consent-and-audit-foundation.md) / R1.1 | Provider-neutral protected eligibility, consent, payment, ticket, active-state, RLS, function, and audit foundation. | Phase 14 as-built evidence or explicit sequencing amendment; approved data/role/retention decisions; migration/RLS/function/audit evidence. |
| [Phase 16](phases/phase-16-identity-and-minor-eligibility.md) / R1.2 | Adult eligibility plus a gated guardian-consent/review path, with one server-held booking/admission decision. | Phase 15 as-built plus guardian, clinical, DPO/legal, retention, and approved-wording decisions; complete RLS/role/minor-deny evidence. |
| [Phase 17](phases/phase-17-paymaya-payment-authorised-booking.md) / R1.3 | One booking path creates a reserved `payment_pending` appointment and changes it to `booked` only from a verified provider event. | Phase 16 as-built, official PayMaya material, commercial/privacy/expiry/refund/reconciliation decisions, and concurrency/idempotency/webhook/forged-return evidence. |
| [Phase 18](phases/phase-18-google-meet-and-session-timing.md) / R1.4 | Approved Google Meet admission consumes eligibility, `booked`, relationship, and database-authoritative 15/45/15 boundaries. | Phase 17 as-built, Workspace/vendor/privacy and clinical timing approval, and participant/time/outage/no-auto-note evidence. |
| [Phase 19](phases/phase-19-support-tickets-and-launch-operations.md) / R1.5 | Patient tickets, audited operations, approved payment/provider exceptions, retention/data-rights processes, runbooks, and kill switches. | Phase 15–18 as-built inputs plus approved support/retention/operations, privacy, finance, and provider decisions. |
| [Phase 20](phases/phase-20-integrated-launch-verification-and-controlled-release.md) / R1.5 | Integrated feature, security, privacy, clinical, accessibility, performance, restore, rollback, and release evidence. | All prior phase gates, production-baseline controls, named-authority approvals, and company-owner go/no-go. |

Phase 15 has consumed the Phase 14 as-built audit and its migration/RLS/function evidence. Phase 16
is waiting for owner decisions after its meeting and is not a blocker for unrelated work. Phase 17
is waiting on PayMaya API material. Any implementation that depends on their eligibility or payment
contracts remains subject to those gates. All work stays synthetic and disabled until its own gate
and the overall production launch gate close.

## Phase 0 — Governance and service design

Name product, clinical, PIC/DPO, security, and operations owners; approve service boundary, privacy/consent, clinical safety, emergency, clinician-verification, retention, and vendor-review decisions. Track every answer and blocker in the [pilot decision register](../product/pilot-decision-register.md).

**Gate:** Written owner approvals and pilot criteria. No real data, accounts, appointments, or calls.

## Phase 1 — Secure platform baseline

Create separate test/staging/production environments, access register, secret management, CI/CD, migration process, privacy-safe monitoring, backups/restore plan, and synthetic test-data policy.

**Verification:** Secret scan, least-privilege access review, staging deployment, and non-production restore exercise.

## Phase 2 — Data, RBAC, consent, and audit

Build protected profiles, verified clinicians, availability, appointments, consent, and audit schema; RLS/grants; private functions; lifecycle and concurrency controls.

**Gate:** Verified RLS allow/deny matrix, idempotent slot-lock transaction, and audit evidence.

## Phase 3 — Replace prototype identity

Use Supabase Auth, invite/provision-only clinicians, secure recovery, and role-aware routes. Remove fake email roles, mock tokens, persisted sensitive state, duplicate clients, and local mock profile data. MFA enforcement is handled by Phase 12.

**Gate:** Legacy auth never coexists with real accounts.

## Phase 4 — One safe scheduling workflow

Replace duplicate mock pages with server-authoritative booking/cancellation, clinician appointments, error/conflict states, and the approved rebooking/no-show policy.

**Gate:** Concurrent booking, retry/idempotency, cancellation boundary, timezone, and mobile/desktop checks pass.

**As-built:** Implemented and verified. See the [Phase 4 audit](../audit-trail/20260913-phase-4-scheduling-audit.md).

## Phase 14 — Doctor-managed availability

Add psychiatrist-owned weekday schedules, Manila-local overrides, outside-hours approval, server-generated
15-minute starts for 45-minute sessions, the two-week booking horizon, and conflict-safe schedule changes.

**Gate:** Schedule ownership, approval, booked-appointment protection, server availability projection,
RLS, migration lint, database, and desktop/mobile workflow checks pass.

**As-built:** Implemented and verified. See the [Phase 14 audit](../audit-trail/20260913-phase-14-doctor-managed-availability-audit.md).

## Phase 5 — Approved private video

Integrate the approved provider using short-lived participant tokens, a provider abstraction, preflight UI, and booking/video kill switches. Recording, transcription, chat, and files remain off by default.

**Gate:** Participant allow/deny, expiry/revocation, copied-link denial, outage, and manual two-party call checks pass. Public Jitsi is excluded.

## Phase 6 — Operations and controlled release

Add minimal admin tooling, clinician offboarding, support/runbooks, monitoring, security/accessibility/performance review, and restore/video-outage/privacy/clinical-escalation exercises.

**Gate:** No critical/high finding remains; accountable owners approve residual risk and controlled-pilot release.

## Phase 12 — Multi-factor authentication and privileged access

After the frontend continuation work, this future hardening phase may enforce an additional login step
for owner-selected privileged roles, protect recovery and offboarding, and verify the complete
allow/deny matrix. It is not required for the current launch.

**Future gate:** If activated, selected privileged roles cannot sign in without MFA, bypass paths are
closed and audited, and company owners have recorded the role scope and enforcement requirement in the
decision register.

## Synthetic demo track (cross-cutting)

The [five-account synthetic demo](phases/demo-milestone.md) is an implementation track, not a phase.
It borrows non-production slices of Phases 1–4 and includes the [JaaS video work package](phases/demo-milestone-jaas-video.md).
Its D0–D7 work is complete and the JaaS work is historical evidence only; it does not close Phases
0–6 or approve a real-user launch.

## Frontend continuation

Phases 7–11 cover frontend state/session foundations, the UI shell, appointment experience, meeting
experience, and frontend acceptance. Phase 10's JaaS-specific plan is superseded; Google Meet meeting
experience belongs to Phase 18. Any remaining frontend continuation work remains synthetic-data-only
and independent of the controlled-pilot release gate.

## Rollback

Use append-only migrations, feature flags, and independent eligibility/guardian-intake,
booking/payment, payment-webhook, meeting, and ticket kill switches. Never delete appointment,
consent, payment, ticket, note, or audit history to roll back a release, and never fall back to direct
booking, public Jitsi, placeholder consent, or unaudited staff access.
