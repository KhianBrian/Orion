# Delivery Plan — Controlled Pilot

## Outcome

Launch a controlled real-market pilot only after clinical, privacy, security, operational, and technical gates are approved. No production feature work bypasses an earlier gate.

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

Use Supabase Auth, invite/provision-only clinicians, secure recovery, role-aware routes, and privileged MFA. Remove fake email roles, mock tokens, persisted sensitive state, duplicate clients, and local mock profile data.

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

## Rollback

Use append-only migrations, feature flags, and independent booking/video kill switches. Never delete appointment, consent, or audit history to roll back a release.
