# Video Provider Decision Record

## Decision

Phase 18.5 authorizes Direct WebRTC + project-owned TURN as the implementation direction for a
synthetic, non-production one-to-one vertical slice. That slice is now implemented and verified:
server admission, dedicated signaling, short-lived TURN credential issuance, disabled-by-default
feature control, and local desktop/mobile two-party checks are complete. This does not approve
real-user activation or production infrastructure.

The 8 September 2026 owner direction identified **Google Meet** as the Phase 18 provider because
the JaaS 25-MAU demo allowance cannot support the expected initial demand. The Google Meet
implementation is complete and verified for the test path. Direct WebRTC + TURN remains a separate
Phase 18.5 synthetic/non-production alternative. Neither path is approved for real-user activation
until DPO/legal, clinical, security, and operations approval covers contract, data flow, data
locations, subprocessors, retention, support, and incident handling.

## Required integration pattern

```text
Authorised participant requests join
-> server verifies session, role, appointment, and join window
-> server creates/retrieves the provider meeting and applies the approved admission configuration
-> server returns only the authorised join entry point; no provider secret reaches the browser
```

For a managed provider, rooms use random provider identifiers with no client, psychiatrist, email,
date, or appointment meaning. Disable recording, transcription, chat, files, analytics, and screen
sharing unless separately approved. For the implemented Direct WebRTC slice, the server creates or
retrieves an appointment-scoped control-plane session instead of a provider room, then returns only
short-lived signaling/TURN admission. Use a server-side kill switch to stop token issuance.

## Options

| Option | Use | Decision |
| --- | --- | --- |
| Direct WebRTC + Open Relay showcase path | One-to-one browser media using Supabase Realtime for connection messages and Open Relay's 20 GB free backup route | Planned Phase 18.5 controlled showcase integration; no deployment, no real-user approval, and no permanent-provider decision |
| Direct WebRTC + project-owned TURN | One-to-one browser media with dedicated signaling and project-owned relay boundary | Implemented on `main` for Phase 18.5 synthetic/non-production; remains the real-user Direct WebRTC alternative if separately approved |
| Google Meet | Managed meeting spaces and Workspace-controlled participant admission | Phase 18 implementation complete and verified; production Workspace, vendor, and operational approval remain required for real-user activation |
| Daily | Managed, token-gated browser video; free early allowance | Historical alternative; no longer preferred for R1 |
| LiveKit Cloud | Managed, flexible token-gated video | Historical alternative if Google Meet is not approved |
| Twilio Video | Mature managed option with usage billing | Consider if contract/region requirements fit |
| Private Jitsi | Highest operating control but Orion owns infrastructure/security | Only with dedicated operations capacity |
| Public `meet.jit.si` | Internal fake-data prototype only | Never for real clients or psychiatrists |

Public Jitsi may prove UI wiring internally, but it is not an authorisation boundary and must be behind a non-production-only video mode with synthetic data.

The current no-card D5 demo uses JaaS's free 25-MAU developer allowance and server-issued
participant JWTs. Its scoped implementation plan is
[JaaS video work package](../engineering/phases/demo-milestone-jaas-video.md); this is not a real-launch provider
selection.

## Google Meet validation gate

The R1.4 implementation record covers the tested free-Gmail arrangement, authenticated host
identity, guest admission model, 15-minute early-entry behavior, scheduled call-end boundary,
outage handling, and privacy-safe logging. Before real-user activation, separately record the
production Workspace organisation/edition, production OAuth verification, participant removal or
end-session policy, provider event/reconciliation data, and vendor/privacy approval. The JaaS token
pattern is not assumed to transfer to Google Meet.
