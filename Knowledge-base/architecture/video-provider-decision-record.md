# Video Provider Decision Record

## Decision

**Google Meet is the chosen video provider for Orion.** The 8 September 2026 owner direction
identified Google Meet as the Phase 18 provider because the JaaS 25-MAU demo allowance cannot
support the expected initial demand, and on 16 October 2026 the owner confirmed that Direct
WebRTC + TURN will not be pursued. The Google Meet implementation is complete and verified for the
test path. Choosing the provider does not approve real-user activation: that still requires
DPO/legal, clinical, security, and operations approval covering contract, data flow, data
locations, subprocessors, retention, support, and incident handling.

Phase 18.5 Direct WebRTC + project-owned TURN was implemented and verified as a synthetic,
non-production vertical slice (server admission, dedicated signaling, short-lived TURN credential
issuance, disabled-by-default feature control, and local desktop/mobile two-party checks). It is
now **shelved**: the code remains merged in `main` but is disabled and not linked from the UI, and
no launch-readiness, Open Relay showcase, or real-user work will follow. It is not an approved
alternative.

## Required integration pattern

```text
Authorised participant requests join
-> server verifies session, role, appointment, and join window
-> server creates/retrieves the provider meeting and applies the approved admission configuration
-> server returns only the authorised join entry point; no provider secret reaches the browser
```

For a managed provider, rooms use random provider identifiers with no client, psychiatrist, email,
date, or appointment meaning. Disable recording, transcription, chat, files, analytics, and screen
sharing unless separately approved. Use a server-side kill switch to stop token issuance. (The shelved Direct WebRTC slice used an
appointment-scoped control-plane session and short-lived signaling/TURN admission instead of a
provider room.)

## Options

| Option | Use | Decision |
| --- | --- | --- |
| Direct WebRTC + Open Relay showcase path | One-to-one browser media using Supabase Realtime for connection messages and Open Relay's 20 GB free backup route | Shelved (16 October 2026); never built or deployed, and will not be pursued |
| Direct WebRTC + project-owned TURN | One-to-one browser media with dedicated signaling and project-owned relay boundary | Shelved (16 October 2026); synthetic code remains on `main`, disabled and unlinked from the UI, and is not a real-user alternative |
| Google Meet | Managed meeting spaces and Workspace-controlled participant admission | **Chosen provider.** Phase 18 implementation complete and verified; production Workspace, vendor, and operational approval remain required for real-user activation |
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
