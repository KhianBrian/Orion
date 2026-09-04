# Delivery Plan — Controlled Pilot

## Outcome

Launch a controlled real-market pilot only after clinical, privacy, security, operational, and technical gates are approved. No production feature work bypasses an earlier gate.

## Current position — 4 September 2026

The five-account synthetic demo track (D0–D7) is implemented and verified. It uses synthetic data only
and does not close any controlled-pilot gate. Phases 0–6 remain in their documented states below;
frontend continuation work is planned in Phases 7–11, and privileged-access MFA is a separate Phase 12.
Real users, production data, and real consultations remain prohibited until the owner and clinical,
privacy, vendor, retention, and operations decisions are recorded.

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

Use append-only migrations, feature flags, and independent booking/video kill switches. Never delete appointment, consent, or audit history to roll back a release.
