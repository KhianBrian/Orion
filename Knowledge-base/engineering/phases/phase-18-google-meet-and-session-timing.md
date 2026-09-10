# Phase 18 — Google Meet and Server-Authoritative Session Timing

**R1 mapping:** Implements R1.4 using Phase 16 eligibility and Phase 17 booked-payment evidence.

**Status:** Blocked — Google Workspace/vendor validation, clinical timing decisions, and Phase 17
as-built evidence are required before implementation.

## Outcome

An eligible assigned patient or approved assigned psychiatrist can enter the approved Google Meet
session only for a `booked` appointment and only during the database-authoritative
`[starts_at - 15 minutes, ends_at)` interval. The scheduled 45-minute end and following 15-minute
note-writing display window never create an automatic appointment outcome, note lock, or note release.

## Where implementation draws its basis

1. [Clinical safety](../../product/clinical-safety-and-telepsychiatry-policy.md),
   [appointment lifecycle](../../product/appointment-lifecycle.md), and
   [product scope](../../product/product-scope.md).
2. Google Meet direction and gate in the
   [video provider record](../../architecture/video-provider-decision-record.md) plus DPO/legal vendor
   authority in [privacy governance](../../governance/privacy-governance.md).
3. [R1.1 timing/admission contract](../launch-readiness/r1.1-data-consent-and-audit-extension.md).
4. Exact Phase 16 eligibility/admission predicate and Phase 17 booked/payment state from their dated
   as-built audits. If absent, implementation stops.
5. Official Google Workspace/API material and the approved organisation configuration.
6. Fresh inspection of current appointment/note schema, meeting route/function, provider settings,
   timing helpers, Phase 13 status, and tests.

JaaS/D5 is historical synthetic evidence. Its JWT/token claims are not implementation basis for
Google Meet behavior.

## Scope

- One database admission-decision function using database time and prior-phase predicates.
- Approved Google Meet meeting creation/retrieval and participant admission.
- Scheduled session-end and approved host/end-session behavior.
- Derived patient join and psychiatrist note-window states.
- Provider outage/kill switch, safe audit/observability, and synthetic/manual verification.
- Explicit handoff of outcomes/no-show/reschedule/correction to Phase 13.

## Non-goals

- Promoting or repurposing the JaaS demo as production video.
- Persisting duplicate derived join/note timestamps.
- Automatic completion, no-show, note lock, release, publication, or treatment decision.
- Inventing early-end, late-note, outage fallback, host/admission, or provider-retention policy.
- Recording, transcription, chat, file transfer, screen sharing, or public meeting links unless a new
  approved decision explicitly changes the existing prohibition.

## Required decisions and material

| Authority | Decision/input |
| --- | --- |
| Google Workspace/vendor | Organisation/domain, edition, host identity, meeting creation, participant invitation/admission, early entry, removal/end-session, events, quotas, reconciliation, outage behavior, and API details. |
| Clinical lead | Confirmation of 15/45/15, early end, late/no note, no-show, patient visibility, completion authority, and correction interaction. |
| DPO/legal/security | Vendor/transfer/data-flow approval, provider fields, secrets/auth, retention/deletion, features, subprocessors, and breach support. |
| Owners/operations | Host/end responsibility, outage/no-fallback behavior, stop authority, support communication, and service commitments. |

## Provisional Tier 2 implementation plan

### P18-0 — Re-ground provider, appointments, and notes

- Read Phase 16/17 as-built audits and query exact eligibility/booked/admission inputs.
- Inspect current `get-demo-meeting-access`, `DemoMeeting`, `video_room_id`, timing helpers,
  appointment projection, note objects/functions if any, and provider feature flags.
- Confirm whether Phase 2/4 session notes and Phase 13 outcomes are implemented. If notes are absent,
  schedule their separately authorised prerequisite with its own migration/RLS/audit gate; do not hide
  it in a Google Meet completion claim.
- Map official Workspace behaviors and approved settings into an explicit provider contract.

### P18-1 — Database admission authority

- Implement one protected database decision using `now()`, authenticated role, patient/psychiatrist
  relationship, clinician approval, Phase 16 eligibility, Phase 17 `booked`, and the exact interval.
- Return safe decision code plus scheduled boundary timestamps for UI refresh.
- Deny patient at `ends_at`; keep psychiatrist note authoring/release authority separate from meeting
  admission and clinical outcomes.
- Audit grant/deny with IDs, codes, correlation, and database time only.

### P18-2 — Provider resource and admission adapter

- Keep `video_room_id` and `get-demo-meeting-access` demo-only.
- Create/retrieve one opaque Google Meet resource only after booked state and under the approved host.
- Apply the approved invited-participant/admission configuration; copied provider data alone must not
  bypass Orion/Workspace controls.
- Return only the minimum approved entry point. Expose no provider secret or unrestricted reusable
  link.
- Disable prohibited provider features and implement the independent meeting kill switch.

### P18-3 — Scheduled end and early-end evidence

- Implement scheduled session-end behavior only as official capability and policy allow.
- Add `meeting_ended_at` only when a trustworthy provider fact and approved business/clinical use
  require it; it records observed history and does not move scheduled note/outcome rules by default.
- Keep ordinary participant leave local unless the approved provider/session policy says otherwise.
- Persist provider events only when the approved data dictionary defines their necessity/readers/
  retention.

### P18-4 — Note-window and UI integration

- Derive join open, join close, note window open, and note display end from appointment timestamps;
  do not store duplicates.
- Render Join from server decision on `booked` only. Client clock only schedules refresh.
- Add approved preflight, waiting/denied, provider-unavailable, session-ended, and return states.
- Show psychiatrist note-window guidance from server boundaries while keeping manual authoring/release
  independent before, during, and after `ends_at + 15 minutes` as approved.
- Preserve function-only note reads, patient-after-release, and default-admin denial.

### P18-5 — Outage and operational controls

- Implement the approved no-downgrade outage behavior and meeting kill switch.
- Emit privacy-safe metrics/logs with coarse code/correlation only.
- Provide Phase 19 with exact provider failure/event/reconciliation states and runbook triggers.
- Never fall back to public Jitsi or create client-side rooms.

### P18-6 — Verification and as-built handoff

- Test all role/relationship/status/eligibility allow-deny combinations.
- Test one millisecond before/at early-open and before/at scheduled end using database-controlled time.
- Test copied-link/admission denial, provider outage, kill switch, feature disablement, and audit/redaction.
- Test that scheduled end and `end + 15 minutes` cause no automatic outcome/note transition.
- Run D5 synthetic JaaS matrix unchanged plus booking/cancellation/RLS/desktop/mobile regressions.
- Complete approved manual two-party desktop/mobile provider checks without retaining sensitive artifacts.
- Write the Phase 18 as-built audit.

## Expected files changed during implementation

- New forward admission/provider/note fields/functions migrations only as required.
- New Google Meet server/Edge Function adapter; no silent rewrite of
  `supabase/functions/get-demo-meeting-access/index.ts`.
- New real-session meeting React feature/surface; `DemoMeeting.jsx` remains demo-specific.
- Appointment Join components, route constants/configuration, note surfaces, timing display helpers.
- Admission/RLS/provider/unit/redaction/desktop/mobile tests and operations runbook inputs.
- Video/privacy/clinical/lifecycle/RBAC/Supabase/status and dated Phase 18 audit documents.

## Gate

Phase 18 completes only when:

- approved related users are admitted only for eligible `booked` appointments in the exact window;
- every unrelated/privileged-by-role-only/non-booked/out-of-window caller is denied;
- copied entry data cannot bypass controls and prohibited provider features remain disabled;
- scheduled end/outage/kill-switch behavior matches recorded policy without privacy downgrade;
- no automatic outcome, note lock, or release exists;
- provider, RLS, audit, redaction, desktop/mobile, manual-call, and existing regression checks pass;
- Google/DPO/clinical/security/operations approvals are recorded; and
- the dated Phase 18 as-built audit exists.

## Phase 19 and Phase 20 implementation input

They consume exact provider failure/event states, meeting kill switch, session timing, support triggers,
and audit/observability contracts from the Phase 18 as-built audit.

## Inputs not yet available

- Phase 16/17 as-built evidence and the session-note prerequisite state.
- Approved Workspace organisation/edition/configuration and official API behavior.
- Clinical timing/early-end/late-note/outcome decisions and vendor/privacy/operations approvals.
