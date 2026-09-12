# Implementation status

**Last verified:** 10 September 2026

**R1 update:** 8 September owner direction is tracked separately in
[Launch Readiness R1](launch-readiness/README.md). It changes future real-launch planning only and
does not alter the completed synthetic-demo evidence below.

This is Orion's practical, phase-by-phase implementation tracker. It says what is actually built,
what happens next, and what is blocked. It does not replace the phase charters or Tier 2 plans;
those documents remain the detailed requirements and authority for each change.

## How to use this tracker

Work moves in dependency order:

```text
Governance decisions → secure baseline → data/RBAC → identity → scheduling → video → operations
                         \→ five-account synthetic demo (D0–D7 complete)
                                                    \→ frontend continuation (Phases 7–11)
                                                    \→ privileged access (Phase 12)
```

Before starting an item, re-check its linked phase plan and the live project. A green check here means
only the stated slice is complete, not that the whole phase is closed.

## Current implementation track: five-account synthetic demo

| Step | Status | What is complete | Next concrete action |
| --- | --- | --- | --- |
| D0 — Repository and non-production setup | Completed ✅ | Git repository, ignored-secret pattern, `.env.example`, Orion-scoped Supabase project, and local Supabase configuration exist. | Keep credentials local; do not commit secrets. |
| D1 — Database foundation and synthetic seed | Completed ✅ | Three roles only: `patient`, `psychiatrist`, `admin`. Five core tables, RLS, grants, and integrity constraints are applied. Exactly five synthetic confirmed Auth identities and server-side profiles now exist (2 patients, 2 psychiatrists, 1 admin); both psychiatrists are active and each has one open 45-minute slot. | Keep passwords only in the ignored local `.env`; hosted leaked-password protection is deferred while this demo remains on Supabase Free. |
| D2 — Real identity and role-aware navigation | Completed ✅ | The React app now signs in through one browser-safe Supabase client, reads the role from the authenticated user's `profiles` row, and uses one in-memory CASL ability for navigation and shared route guards. Mock email-derived roles, dummy tokens, Redux persistence, and token storage have been removed from the active path. | Build D3's one database-backed scheduling workflow; do not restore or expose the legacy mock booking pages. |
| D3 — Database-backed scheduling UI | Completed ✅ | One patient booking route reads real active psychiatrist slots in Manila time; the Edge Function and service-role-only transaction enforce locking, derived times, idempotency, conflicts, overlap prevention, slot updates, and audit events. Patient and assigned-psychiatrist appointment views are RLS-scoped. The duplicate mock availability route is removed. | Keep all data synthetic and do not begin production work; revisit leaked-password protection if the project moves to a paid plan or broader account use. |
| D4 — Cancellation boundary | Completed ✅ | Patient cancellation migration, service-role-only transaction, JWT-protected Edge Function, patient confirmation UI, retry idempotency, database checks, and credentialed desktop/mobile Playwright coverage are verified against synthetic data. | Keep psychiatrist/coordinator cancellation, rescheduling, no-show, and video work out of this slice. |
| D5 — Demo video boundary | Completed ✅ | JaaS token admission is deployed for booked synthetic participants only. The complete access matrix, copied-room denial, desktop/mobile two-browser calls, leave/re-entry, and leak inspection passed. | Keep the JaaS demo synthetic-only; real-launch video remains blocked pending Phase 5 approvals. |
| D6 — Synthetic seed | Completed ✅ | The fixed five synthetic accounts and repeatable human-check fixture seed are available; each rerun refreshes only its recorded synthetic fixtures. | Keep credentials local and use the repeatable human checks after relevant frontend changes. |
| D7 — Verification | Completed ✅ | Unit timing, booking/concurrency, cancellation, RLS, authenticated desktop/mobile, and public-route checks passed. Human normal-cancellation and within-24-hour denial checks also passed. | Run the owner walkthrough after final frontend acceptance; it is a showcase, not a D7 completion dependency. |

Detailed requirements: [demo milestone](phases/demo-milestone.md). Database connection and migration
history: [Supabase integration](supabase.md). Historical evidence: [28 August demo-foundation audit](../audit-trail/2026-08-28-supabase-demo-foundation-audit.md) and [29 August synthetic-account provisioning audit](../audit-trail/2026-08-29-synthetic-demo-account-provisioning-audit.md).

## Delivery phases

| Phase | Status | Completed slice | Next step / blocker |
| --- | --- | --- | --- |
| [Phase 0 — Governance](phases/phase-0-governance.md) | In progress | Owner decisions and the R1 direction are recorded, but governance is not closed. | Resolve the remaining owner, clinical-lead, DPO/legal, vendor, support, and retention decisions; R1.0 records the amendment. |
| [Phase 1 — Baseline](phases/phase-1-baseline.md) | Foundation slice implemented; gate deferred | Repository, local-secret pattern, one synthetic non-production Supabase project, migrations, environment-example validation, dependency remediation, and evidence templates exist. | Prioritise Phase 2 feature work in synthetic/non-production scope. Complete the access register, hosted CI/CD, staging deployment, monitoring, and restore exercise after feature work and before Phase 20 closes. |
| [Phase 2 — Data/RBAC](phases/phase-2-data-rbac.md) | Closed with deferred post-development work ✅ | Backend-provisioned psychiatrist records, `is_active` discovery/bookability gating, appointment facts, protected session notes, latest-note-only patient access, admin audit-metadata visibility, and the complete three-role RLS CRUD matrix are applied to linked non-production Supabase; append-only audit mutation tests pass. Consent capture remains deferred in [deferredpostdevelopment.md](phases/deferredpostdevelopment.md). | Phase 2 is complete. The shared deferral register records Phase 2 consent alongside the Phase 0 and Phase 1 deferred work; those phases remain independently open. |
| [Phase 3 — Identity](phases/phase-3-identity.md) | Completed ✅ | Supabase Auth registration/recovery surfaces, code/link confirmation, local Mailpit email flow, admin-only psychiatrist provisioning, role-aware routes, email-confirmation booking enforcement, and the Phase 3 database/function boundary are implemented and verified. | Hosted SMTP customization and full email-consuming hosted Auth testing are deferred in [deferredpostdevelopment.md](phases/deferredpostdevelopment.md). No psychiatrist approval workflow is required. Phase 16 owns R1 eligibility/guardian behavior; MFA enforcement is Phase 12. |
| [Phase 4 — Scheduling](phases/phase-4-scheduling.md) | Production phase not started | The demo has a synthetic booking/cancellation slice; the complete workflow and Tier 2 plan remain incomplete. | Re-ground and ratify Q5; keep baseline lifecycle/notes work here, while Phase 17 owns payment-authorised booking and Phase 18 owns real timing/admission. |
| [Phase 5 — Video](phases/phase-5-video.md) | Blocked | The separate D5 work package provides synthetic JaaS admission; no production integration exists. | Approve and validate Google Meet plus Q9 vendor/data-transfer terms; Phase 18 owns the real-launch provider implementation. |
| [Phase 6 — Operations](phases/phase-6-operations.md) | Blocked | No production operations implementation exists. | Keep baseline access, monitoring, restore, incident, and release controls here; Phase 19 owns new support/exception operations and Phase 20 owns integrated release verification. |
| [Phase 7 — Frontend state foundation](phases/phase-7-frontend-state-foundation.md) | Completed ✅ | Synthetic refresh-safe sessions, in-memory server-state cache/invalidation, protected-cache clearing, persistent authenticated-shell boundary, and meeting-window refresh are verified. | Keep all data synthetic; production session architecture remains a Phase 3/security decision. |
| [Phase 8 — UI system and application shell](phases/phase-8-ui-system-and-app-shell.md) | Implemented — review pending | Responsive public/authenticated shells, accessible UI primitives, a scoped navigation inventory, and a rebuilt login surface are implemented. Public desktop/mobile checks pass; direct authenticated dialog/shell verification remains credential-gated. | Review with the synthetic demo credentials, then keep legal/support destinations absent until owner-approved pages exist. |
| [Phase 9–11 — Frontend continuation](phases/README.md#continuation-phases) | Phase 9 completed; Phase 10 superseded; Phase 11 deferred | Appointment presentation is audited; the JaaS-specific meeting polish is no longer the active path. | Proceed with Phase 1 for real-launch preparation. Carry reusable meeting UX into Phase 18 after its gates are satisfied. |
| [Phase 12 — MFA and privileged access](phases/phase-12-mfa-and-privileged-access.md) | Planned — owner decision required | No MFA is required for the synthetic demo. | Record the role scope and approver in the decision register, then implement and verify MFA before real-user launch. |

## Launch Readiness R1

| Work item | Status | Next step / blocker |
| --- | --- | --- |
| [R1.0 — Governance and change control](launch-readiness/r1.0-governance-and-change-control.md) | Completed ✅ | Product, lifecycle, privacy, data, video, RBAC, operations, and phase authorities are reconciled against the 8 September amendment; R1.1 has consumed this authority. |
| [R1.1 — Data, consent, and audit extension](launch-readiness/r1.1-data-consent-and-audit-extension.md) | Planning and numbered phase synthesis completed ✅ — no implementation | Use its contract and the [R1 implementation phase map](phases/r1-launch-readiness-implementation-map.md); retain every named policy/provider blocker. |
| [Phase 15 / R1.1 — Data, consent, and audit foundation](phases/phase-15-data-consent-and-audit-foundation.md) | Planned — not implemented | First obtain Phase 14 as-built evidence or record an explicit sequencing amendment, then re-query live state and resolve its named data/role/retention decisions. |
| [Phase 16 / R1.2 — Identity and minor eligibility](phases/phase-16-identity-and-minor-eligibility.md) | Planned — implementation blocked | Consume Phase 15 as-built. Guardian account/assurance/access/reviewer, clinical eligibility/refusal, DPO/legal, abuse control, retention, and approved wording remain required. |
| [Phase 17 / R1.3 — PayMaya payment-authorised booking](phases/phase-17-paymaya-payment-authorised-booking.md) | Planned — implementation blocked | Consume Phase 16 as-built; obtain official PayMaya material and approve amount/currency, expiry, failure, refund, chargeback, receipt, late-success, and reconciliation policy. |
| [Phase 18 / R1.4 — Google Meet and timing](phases/phase-18-google-meet-and-session-timing.md) | Planned — implementation blocked | Consume Phase 17 as-built; validate Workspace/API/admission/end-session/outage behavior and obtain vendor/privacy plus clinical timing approval. |
| [Phase 19 / R1.5 — Support and launch operations](phases/phase-19-support-tickets-and-launch-operations.md) | Planned — implementation blocked | Consume Phase 15–18 as-built, then finalize ticket roles/lifecycle, admin-support scope, retention/data rights, support hours, exception handling, kill switches, and runbooks. |
| [Phase 20 / R1.5 — Integrated verification and controlled release](phases/phase-20-integrated-launch-verification-and-controlled-release.md) | Planned — blocked on all prior gates | Assemble the immutable candidate and evidence only after Phase 15–19 audits, production-baseline controls, named approvals, and release ownership exist. |

## Immediate next action

Keep synthetic frontend continuation work independent. For the numbered real-launch sequence, finish
and verify Phase 14 or record an explicit sequencing amendment, then start Phase 15 from its cited
authority, the predecessor audit, and fresh deployed-state checks. Do not use the old Phase 3–6
next-step wording as authority for minors, payments, Google Meet, support tickets, or the 15/45/15
note timeline. After relevant frontend changes, run the repeatable synthetic human checks; after
frontend acceptance, schedule the owner walkthrough.
Then resolve the Phase 12 MFA role decision and implement privileged-access enforcement before any
real-user launch.
Hosted Auth
leaked-password protection is deferred because this project remains on Supabase Free; revisit it
before broader account use or a paid-plan transition. Do not add a separate support role, real identities,
or production data to this demo.

## Rules that apply to every step

- The [knowledge-base authority order](../README.md#authority-order) overrides prototype code.
- Use only synthetic data in this environment.
- Do not commit secrets or put service-role credentials in browser code.
- Do not change an applied migration; add a new forward migration instead.
- Do not build around an unresolved clinical, legal, privacy, retention, or vendor decision.
