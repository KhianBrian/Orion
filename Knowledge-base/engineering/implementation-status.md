# Implementation status

**Last verified:** 4 September 2026

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
history: [Supabase integration](supabase.md). Historical evidence: [30 August demo-foundation audit](../audit-trail/2026-08-30-supabase-demo-foundation-audit.md) and [30 August synthetic-account provisioning audit](../audit-trail/2026-08-30-synthetic-demo-account-provisioning-audit.md).

## Delivery phases

| Phase | Status | Completed slice | Next step / blocker |
| --- | --- | --- | --- |
| [Phase 0 — Governance](phases/phase-0-governance.md) | In progress | Owner decisions are recorded, but governance is not closed. | Obtain the remaining owner, clinical-lead, and DPO/legal decisions; record each in the decision register. |
| [Phase 1 — Baseline](phases/phase-1-baseline.md) | Partially completed ✅ | Repository, local-secret pattern, one synthetic non-production Supabase project, and migrations exist. | Add CI, secret scanning, access register, staging/production separation, monitoring, and restore exercise. |
| [Phase 2 — Data/RBAC](phases/phase-2-data-rbac.md) | Foundation completed ✅ | Core three-role schema and baseline read/update RLS are applied. | Add consent, secretary/session-note schema, privileged transaction functions, full RLS matrix/tests, and Q11 retention handling when decided. |
| [Phase 3 — Identity](phases/phase-3-identity.md) | Production phase not started | The demo has a Supabase Auth/CASL slice, but the full four-role identity workflow is not complete. | Re-ground against the applied database, then complete provisioning, approval, recovery, consent, and legacy-path removal. MFA enforcement is Phase 12. |
| [Phase 4 — Scheduling](phases/phase-4-scheduling.md) | Production phase not started | The demo has a synthetic booking/cancellation slice; the full workflow and Tier 2 plan remain incomplete. | Finish the Tier 2 plan from as-built state, ratify Q5, resolve lifecycle values, then build the complete workflow. |
| [Phase 5 — Video](phases/phase-5-video.md) | Blocked | The separate D5 demo work package provides synthetic JaaS admission; no production integration exists. | Owner decision Q8: choose/approve the real-launch video provider, followed by Q9 vendor/data-transfer approval. |
| [Phase 6 — Operations](phases/phase-6-operations.md) | Blocked | No production operations implementation exists. | Resolve Q1, Q10, and Q11, then build the runbooks, access review, monitoring, and recovery controls. |
| [Phase 7 — Frontend state foundation](phases/phase-7-frontend-state-foundation.md) | Completed ✅ | Synthetic refresh-safe sessions, in-memory server-state cache/invalidation, protected-cache clearing, persistent authenticated-shell boundary, and meeting-window refresh are verified. | Keep all data synthetic; production session architecture remains a Phase 3/security decision. |
| [Phase 8–11 — Frontend continuation](phases/README.md#continuation-phases) | Planned | Phase 7 is complete; the responsive UI system, appointment presentation, meeting experience, and frontend acceptance plans are not yet executed. | Implement and verify the remaining planned frontend work using synthetic data. |
| [Phase 12 — MFA and privileged access](phases/phase-12-mfa-and-privileged-access.md) | Planned — owner decision required | No MFA is required for the synthetic demo. | Record the role scope and approver in the decision register, then implement and verify MFA before real-user launch. |

## Immediate next action

Proceed with the planned frontend continuation phases. After each relevant change, run the repeatable
synthetic human checks; after frontend acceptance, schedule the owner walkthrough. Then resolve the
Phase 12 MFA role decision and implement privileged-access enforcement before any real-user launch.
Hosted Auth
leaked-password protection is deferred because this project remains on Supabase Free; revisit it
before broader account use or a paid-plan transition. Do not add a secretary role, real identities,
or production data to this demo.

## Rules that apply to every step

- The [knowledge-base authority order](../README.md#authority-order) overrides prototype code.
- Use only synthetic data in this environment.
- Do not commit secrets or put service-role credentials in browser code.
- Do not change an applied migration; add a new forward migration instead.
- Do not build around an unresolved clinical, legal, privacy, retention, or vendor decision.
