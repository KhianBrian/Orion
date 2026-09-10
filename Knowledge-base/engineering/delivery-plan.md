# Delivery Plan — Controlled Pilot

## Outcome

Launch a controlled real-market pilot only after clinical, privacy, security, operational, and technical gates are approved. No production feature work bypasses an earlier gate.

## Baseline position — 4 September 2026

The five-account synthetic demo track (D0–D7) is implemented and verified. It uses synthetic data only
and does not close any controlled-pilot gate. Phases 0–6 remain in their documented states below;
frontend continuation work is planned in Phases 7–11, and privileged-access MFA is a separate Phase 12.
Real users, production data, and real consultations remain prohibited until the owner and clinical,
privacy, vendor, retention, and operations decisions are recorded.

## Start here — current implementation roadmap from Phase 9

**Roadmap updated:** 10 September 2026

The last formally implemented and audited phase is [Phase 9 — Appointment Experience](phases/phase-9-appointment-experience.md),
with evidence in the [5 September Phase 9 audit](../audit-trail/2026-09-05-phase-9-appointment-experience-audit.md).
The next implementation target is Phase 10. The latest scheduling commit only refined the Phase 9
appointment surface; it did not implement Phase 14 or any R1 launch feature.

Use this section as the starting instruction for a new implementation chat:

1. Read the Phase 9 audit and inspect the current working tree, applied migrations, deployed
   functions, RLS policies, and tests. The live/as-built system is the source of truth.
2. Complete the safe synthetic continuation: [Phase 10](phases/phase-10-meeting-experience.md),
   then [Phase 11](phases/phase-11-frontend-acceptance.md). Keep JaaS, accounts, calls, and all
   verification data synthetic.
   If the immediate priority is real-launch preparation, this demo work may be paused after its
   current regression checks; the next real-launch step is Phase 1, not Phase 15.
3. Finish the missing baseline foundation in dependency order: [Phase 1](phases/phase-1-baseline.md)
   → [Phase 2](phases/phase-2-data-rbac.md) → [Phase 3](phases/phase-3-identity.md) →
   [Phase 4](phases/phase-4-scheduling.md). Each phase must produce a dated as-built audit before
   the next phase consumes it.
4. After Phase 3 and the owner MFA decision, implement [Phase 12](phases/phase-12-mfa-and-privileged-access.md).
   It may run alongside later scheduling work, but it must be complete before Phase 20 can approve
   release.
5. After the Phase 4 schema and lifecycle are verified, implement [Phase 13](phases/phase-13-appointment-outcomes-and-rescheduling.md),
   then [Phase 14](phases/phase-14-doctor-managed-availability.md). Resolve the required clinical and
   owner decisions before coding either phase.
6. Implement the R1 continuation in order: [Phase 15](phases/phase-15-data-consent-and-audit-foundation.md)
   → [Phase 16](phases/phase-16-identity-and-minor-eligibility.md) →
   [Phase 17](phases/phase-17-paymaya-payment-authorised-booking.md) →
   [Phase 18](phases/phase-18-google-meet-and-session-timing.md) →
   [Phase 19](phases/phase-19-support-tickets-and-launch-operations.md) →
   [Phase 20](phases/phase-20-integrated-launch-verification-and-controlled-release.md).

Do not start Phase 15 while Phase 14 is only a plan. Phase 14 must first have a dated as-built audit,
unless the owners record a sequencing amendment with compatibility checks. Phase 5's real-provider
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
| [Phase 19](phases/phase-19-support-tickets-and-launch-operations.md) / R1.5 | Patient tickets, audited operations, approved payment/provider exceptions, retention/data-rights processes, runbooks, and kill switches. | Phase 15–18 as-built inputs plus approved support/secretary/retention/operations, privacy, finance, and provider decisions. |
| [Phase 20](phases/phase-20-integrated-launch-verification-and-controlled-release.md) / R1.5 | Integrated feature, security, privacy, clinical, accessibility, performance, restore, rollback, and release evidence. | All prior phase gates, production-baseline controls, named-authority approvals, and company-owner go/no-go. |

The first implementation action is not automatically Phase 15: Phase 14 is still planned rather than
verified. Complete Phase 14 and write its dated as-built audit, or record an explicit sequencing
amendment explaining why Phase 15 may safely proceed without it. Each numbered phase then consumes
the preceding phase's dated as-built output. All work stays synthetic and disabled until its own gate
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

## Phase 5 — Approved private video

Integrate the approved provider using short-lived participant tokens, a provider abstraction, preflight UI, and booking/video kill switches. Recording, transcription, chat, and files remain off by default.

**Gate:** Participant allow/deny, expiry/revocation, copied-link denial, outage, and manual two-party call checks pass. Public Jitsi is excluded.

## Phase 6 — Operations and controlled release

Add minimal admin tooling, clinician offboarding, support/runbooks, monitoring, security/accessibility/performance review, and restore/video-outage/privacy/clinical-escalation exercises.

**Gate:** No critical/high finding remains; accountable owners approve residual risk and controlled-pilot release.

## Phase 12 — Multi-factor authentication and privileged access

After the frontend continuation work, enforce an additional login step for the owner-selected
privileged roles, protect recovery and offboarding, and verify the complete allow/deny matrix.

**Gate:** Selected privileged roles cannot sign in without MFA, bypass paths are closed and audited, and
company owners have recorded the role scope and launch requirement in the decision register.

## Synthetic demo track (cross-cutting)

The [five-account synthetic demo](phases/demo-milestone.md) is an implementation track, not a phase.
It borrows non-production slices of Phases 1–4 and includes the [JaaS video work package](phases/demo-milestone-jaas-video.md).
Its D0–D7 work is complete, but it does not close Phases 0–6 or approve a real-user launch.

## Frontend continuation

Phases 7–11 cover frontend state/session foundations, the UI shell, appointment experience, meeting
experience, and frontend acceptance. They remain synthetic-data-only and are independent of the
controlled-pilot release gate.

## Rollback

Use append-only migrations, feature flags, and independent eligibility/guardian-intake,
booking/payment, payment-webhook, meeting, and ticket kill switches. Never delete appointment,
consent, payment, ticket, note, or audit history to roll back a release, and never fall back to direct
booking, public Jitsi, placeholder consent, or unaudited staff access.
