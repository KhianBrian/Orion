# Implementation status

**Last verified:** 31 August 2026

This is Orion's practical, phase-by-phase implementation tracker. It says what is actually built,
what happens next, and what is blocked. It does not replace the phase charters or Tier 2 plans;
those documents remain the detailed requirements and authority for each change.

## How to use this tracker

Work moves in dependency order:

```text
Governance decisions → secure baseline → data/RBAC → identity → scheduling → video → operations
                         \→ five-account synthetic demo (current implementation track)
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
| D4 — Cancellation boundary | Not started | D3 deployed the server-authoritative booking transaction; cancellation is deliberately not implemented. | Implement and test only the approved cancellation transitions after confirming the applicable lifecycle decisions. |
| D5 — Demo video boundary | Not started | No private participant-admission path exists. | Build only the owner-approved synthetic-demo video path; real-launch video remains blocked. |
| D6/D7 — Verification and owner demo | Not started | Lint/build and database schema checks have passed; no end-to-end or RLS allow/deny suite exists yet. | Add role-isolated tests, run the five-account walkthrough, then prepare the owner demonstration. |

Detailed requirements: [demo milestone](phases/demo-milestone.md). Database connection and migration
history: [Supabase integration](supabase.md). Historical evidence: [30 August demo-foundation audit](../audit-trail/2026-08-30-supabase-demo-foundation-audit.md) and [30 August synthetic-account provisioning audit](../audit-trail/2026-08-30-synthetic-demo-account-provisioning-audit.md).

## Delivery phases

| Phase | Status | Completed slice | Next step / blocker |
| --- | --- | --- | --- |
| [Phase 0 — Governance](phases/phase-0-governance.md) | In progress | Owner decisions are recorded, but governance is not closed. | Obtain the remaining owner, clinical-lead, and DPO/legal decisions; record each in the decision register. |
| [Phase 1 — Baseline](phases/phase-1-baseline.md) | Partially completed ✅ | Repository, local-secret pattern, one synthetic non-production Supabase project, and migrations exist. | Add CI, secret scanning, access register, staging/production separation, monitoring, and restore exercise. |
| [Phase 2 — Data/RBAC](phases/phase-2-data-rbac.md) | Foundation completed ✅ | Core three-role schema and baseline read/update RLS are applied. | Add consent, complete privileged transaction functions, full RLS matrix/tests, and the ratified session-note model. No secretary role yet. |
| [Phase 3 — Identity](phases/phase-3-identity.md) | Not started | No Supabase Auth client integration or CASL ability exists in the React app. | Re-ground the plan against the applied database, then replace mock identity, persisted tokens, and email-derived roles; add CASL as a UI-only permission mirror. |
| [Phase 4 — Scheduling](phases/phase-4-scheduling.md) | Not started | No scheduling implementation exists. Its Tier 2 plan body is still missing despite the status header. | Finish the Tier 2 plan from the actual Phase 2 as-built state and unresolved lifecycle decisions before coding. |
| [Phase 5 — Video](phases/phase-5-video.md) | Blocked | Nothing beyond the prototype exists. | Owner decision Q8: choose/approve the real-launch video provider and terms. |
| [Phase 6 — Operations](phases/phase-6-operations.md) | Blocked | No production operations implementation exists. | Resolve Q1, Q10, and Q11, then build the runbooks, access review, monitoring, and recovery controls. |

## Immediate next action

Keep the synthetic-only D3 workflow under verification. Hosted Auth leaked-password protection is
deferred because this project remains on Supabase Free; revisit it before broader account use or a
paid-plan transition. The legacy duplicate booking route remains unavailable; do not add a secretary
role, real identities, or production data.

## Rules that apply to every step

- The [knowledge-base authority order](../README.md#authority-order) overrides prototype code.
- Use only synthetic data in this environment.
- Do not commit secrets or put service-role credentials in browser code.
- Do not change an applied migration; add a new forward migration instead.
- Do not build around an unresolved clinical, legal, privacy, retention, or vendor decision.
