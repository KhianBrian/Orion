# Phase 18 — Google Meet and Server-Authoritative Session Timing

**R1 mapping:** Implements R1.4 using Phase 16 eligibility and Phase 17 booked-payment evidence.

**Status:** Test-path implementation authorized and in place; real-user launch remains blocked by
Google Workspace/vendor validation, production OAuth and verification, clinical timing decisions,
and Phase 17 as-built evidence.

Implementation evidence is recorded in the [Phase 18 test-path audit](../../audit-trail/2026-09-20-phase-18-google-meet-test-path-audit.md).

The isolated free-Gmail feasibility result is recorded in the
[Phase 18 Google Meet POC evidence](../../audit-trail/2026-09-16-phase-18-google-meet-free-gmail-poc.md). It is feasibility
evidence only and does not remove the real-user launch gate. The owner has separately authorized a
real Google Meet test path using test accounts and a test project, with payment bypass limited to
test bookings.

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
   timing helpers, Phase 4 status, and tests.

JaaS/D5 is historical synthetic evidence. Its JWT/token claims are not implementation basis for
Google Meet behavior.

## Scope

- One database admission-decision function using database time and prior-phase predicates.
- Approved Google Meet meeting creation/retrieval and participant admission.
- Test-project Web OAuth connection per psychiatrist, with server-held refresh authorization.
- Scheduled session-end and approved host/end-session behavior.
- Derived patient join and psychiatrist note-window states.
- Provider outage/kill switch, safe audit/observability, and synthetic/manual verification.
- Explicit handoff of outcomes/no-show/reschedule/correction to Phase 4.

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
| Orion engineering/operations | Separate test and production Google projects, production Web OAuth client, secure psychiatrist account connection, Google application verification, and the controlled-pilot plan if production review is not yet complete. |
| Clinical lead | Confirmation of 15/45/15, early end, late/no note, no-show, patient visibility, completion authority, and correction interaction. |
| DPO/legal/security | Vendor/transfer/data-flow approval, provider fields, secrets/auth, retention/deletion, features, subprocessors, and breach support. |
| Owners/operations | Host/end responsibility, outage/no-fallback behavior, stop authority, support communication, and service commitments. |

## Provisional Tier 2 implementation plan

### P18-0 — Re-ground provider, appointments, and notes

- Read Phase 16/17 as-built audits and query exact eligibility/booked/admission inputs.
- Inspect current Google Meet session-access/connect functions, `GoogleMeeting`, `video_room_id`, timing helpers,
  appointment projection, note objects/functions if any, and provider feature flags.
- Confirm whether Phase 2/4 session notes and Phase 4 outcomes are implemented. If notes are absent,
  schedule their separately authorised prerequisite with its own migration/RLS/audit gate; do not hide
  it in a Google Meet completion claim.
- Map official Workspace behaviors and approved settings into an explicit provider contract.

### P18-0a — Prepare production Google authorization

- Use the current free-Gmail project for the authorized test path, but add a Web OAuth client for
  the Orion callback; do not treat that test client as the production Orion web client.
- Create a separate production Google Cloud project and production Web OAuth client when the owners
  approve moving forward.
- Have the developer configure the production consent screen, redirect address, support contact,
  Orion homepage, privacy policy, and authorized domain.
- Request only the Meet permission required to create and manage Orion appointment meeting spaces.
- Implement one secure **Connect Google account** flow per psychiatrist. The psychiatrist authorizes
  their account once; they do not repeat the developer's Google Cloud setup.
- Keep patients on the guest-join flow. They do not need to authorize the Meet API.

### P18-0b — Complete Google production review

- Keep the production application in Testing mode while implementation and controlled testing are
  still underway.
- When ready, publish the application to production and complete Google's branding check for the
  app name, logo, website, privacy policy, support email, and verified domain.
- Open Google's Verification Center, declare the `meetings.space.created` permission, and explain
  why Orion needs it and why a narrower permission is not sufficient.
- Provide up to three relevant documentation links and an unlisted demonstration video showing the
  Google account connection, consent screen, and meeting creation flow.
- Submit the production application for Google's review before broad external use because the
  current Meet creation permission is Sensitive.
- Respond to any questions sent to the production project owners or editors and record the final
  review result.
- Track Google's questions through the production project contacts and record the approval status in
  the Phase 18 as-built evidence.
- If the owners approve a limited pilot before review is complete, record the test-user limit,
  warning-screen impact, named pilot users, and the decision owner before enabling it.

### P18-1 — Database admission authority

- Implement one protected database decision using `now()`, authenticated role, patient/psychiatrist
  relationship, clinician approval, Phase 16 eligibility, Phase 17 `booked`, and the exact interval.
- Return safe decision code plus scheduled boundary timestamps for UI refresh.
- Deny patient at `ends_at`; keep psychiatrist note authoring/release authority separate from meeting
  admission and clinical outcomes.
- Audit grant/deny with IDs, codes, correlation, and database time only.

### P18-2 — Provider resource and admission adapter

- Keep `video_room_id` as a legacy appointment field until a later cleanup; the retired
  `get-demo-meeting-access` JaaS path is not supported runtime behavior.
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
- Run Google OAuth/provider-boundary checks plus booking/cancellation/RLS/desktop/mobile regressions.
- Complete approved manual two-party desktop/mobile provider checks without retaining sensitive artifacts.
- Record the production Google project, OAuth client type, requested scopes, verification status,
  and any approved controlled-pilot limits. Do not claim broad production readiness until Google's
  required review is complete or an explicit internal-only exception applies.
- Write the Phase 18 as-built audit.

## Expected files changed during implementation

- New Google Meet admission/provider fields/functions migration and Edge Function adapter.
- New real-session meeting React feature/surface; the retired `DemoMeeting.jsx` and JaaS function
  are removed from the active runtime.
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
- the production Google authorization and verification status is recorded, with any limited-pilot
  exception explicitly approved; and
- the dated Phase 18 as-built audit exists.

## Phase 19 and Phase 20 implementation input

They consume exact provider failure/event states, meeting kill switch, session timing, support triggers,
and audit/observability contracts from the Phase 18 as-built audit.

## Inputs not yet available

- Phase 16/17 as-built evidence and the session-note prerequisite state.
- Approved Workspace organisation/edition/configuration and official API behavior.
- Clinical timing/early-end/late-note/outcome decisions and vendor/privacy/operations approvals.
