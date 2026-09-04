# Video Provider Decision Record

## Decision

For early secure integration, evaluate **Daily** first and **LiveKit Cloud** second. The final provider requires DPO/legal, clinical, security, and operations approval of contract, data flow, data locations, subprocessors, retention, support, and incident handling.

Daily currently advertises 10,000 free participant-minutes monthly, so it can support early secure integration without an immediate usage bill. Pricing and vendor terms must be rechecked before commitment. [Daily pricing](https://www.daily.co/pricing/video-sdk/)

## Required integration pattern

```text
Authorised participant requests join
-> server verifies session, role, appointment, and join window
-> server creates/retrieves private provider room
-> server issues short-lived, room- and participant-scoped token
-> browser joins using token; no provider secret reaches browser
```

Rooms use random provider identifiers with no client, psychiatrist, email, date, or appointment meaning. Disable recording, transcription, chat, files, analytics, and screen sharing unless separately approved. Use a server-side kill switch to stop token issuance.

## Options

| Option | Use | Decision |
| --- | --- | --- |
| Daily | Managed, token-gated browser video; free early allowance | Preferred evaluation path |
| LiveKit Cloud | Managed, flexible token-gated video | Evaluate alongside Daily |
| Twilio Video | Mature managed option with usage billing | Consider if contract/region requirements fit |
| Private Jitsi | Highest operating control but Orion owns infrastructure/security | Only with dedicated operations capacity |
| Public `meet.jit.si` | Internal fake-data prototype only | Never for real clients or psychiatrists |

Public Jitsi may prove UI wiring internally, but it is not an authorisation boundary and must be behind a non-production-only video mode with synthetic data.

The current no-card D5 demo uses JaaS's free 25-MAU developer allowance and server-issued
participant JWTs. Its scoped implementation plan is
[JaaS video work package](../engineering/phases/demo-milestone-jaas-video.md); this is not a real-launch provider
selection.
