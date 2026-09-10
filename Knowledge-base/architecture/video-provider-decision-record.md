# Video Provider Decision Record

## Decision

The 8 September 2026 owner direction identifies **Google Meet** as the proposed real-launch provider
because the JaaS 25-MAU demo allowance cannot support the expected initial demand. This is a planning
direction, not production approval: the final provider requires DPO/legal, clinical, security, and
operations approval of contract, data flow, data locations, subprocessors, retention, support, and
incident handling.

## Required integration pattern

```text
Authorised participant requests join
-> server verifies session, role, appointment, and join window
-> server creates/retrieves the provider meeting and applies the approved admission configuration
-> server returns only the authorised join entry point; no provider secret reaches the browser
```

Rooms use random provider identifiers with no client, psychiatrist, email, date, or appointment meaning. Disable recording, transcription, chat, files, analytics, and screen sharing unless separately approved. Use a server-side kill switch to stop token issuance.

## Options

| Option | Use | Decision |
| --- | --- | --- |
| Google Meet | Managed meeting spaces and Workspace-controlled participant admission | Proposed real-launch direction; pending Workspace, vendor, and operational approval |
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

Before R1.4 implementation, record the Google Workspace organisation and edition, the authenticated
host identity, invited-participant/admission model, 15-minute early-entry behaviour, scheduled call
end behaviour, participant removal/end-session capability, provider event/reconciliation data,
outage handling, and vendor/privacy approval. The JaaS token pattern is not assumed to transfer to
Google Meet.
