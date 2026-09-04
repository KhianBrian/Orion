# Demo Milestone — JaaS Video Work Package

**Type:** Companion work package under [Demo Milestone — Five-Account Synthetic Demo](demo-milestone.md), not a delivery-plan phase.

This document contains the detailed implementation and verification plan for the demo's JaaS video
slice. It must not be interpreted as Phase 5 production video approval.

## Outcome

Allow the booked synthetic patient and assigned synthetic psychiatrist to join a labelled internal JaaS call from Orion. This proves server-authorized video admission without a paid provider plan or real data.

## Current State

- Booking, appointment reads, and patient cancellation are implemented.
- `appointments.video_room_id` is a random unique UUID and is suitable as an opaque room reference.
- `@jitsi/react-sdk` is already installed.
- The project has a free JaaS developer account: 25 MAUs/month and no payment card.
- No JaaS signing-key configuration, meeting-access function, meeting route, or video kill switch exists.

## Non-Goals

- Public `meet.jit.si`, anonymous access, browser-created rooms, real consultations, recording, transcription, chat, files, screen sharing, phone access, or production launch.
- Solving real clinical join-window policy; this remains a clinical-lead decision.
- A claim that an authorized participant cannot deliberately share an active token or call content.

## Decisions Needed

D5 uses a 15-minute early-join buffer before the booked appointment's exact 45-minute range, ending at the scheduled session end. It does not set Orion's future clinical early-join or session-end policy.

Before implementation, keep paid JaaS add-ons disabled. The free allowance is sufficient for the 10–20 synthetic-user demo; monitor MAUs by device in the JaaS Activity dashboard.

## Architecture Plan

```text
Booked patient or assigned psychiatrist
  -> authenticated get-demo-meeting-access request
  -> Edge Function validates relationship, booked state, demo mode, and time window
  -> Edge Function signs a short-lived JaaS JWT for that user and room
  -> Orion embeds JaaS at 8x8.vc with the room name and JWT
```

JaaS verifies the JWT before a participant can join. A copied room URL/name alone is insufficient.

## Data Model Impact

No first-slice migration. Derive a room name from the existing random `video_room_id`, prefixed `orion-demo-`, with no patient, psychiatrist, date, or other meaningful content.

If stronger revocation is needed later, add a server-only meeting-session/token-version table. The initial D5 boundary uses short-lived tokens and stops reissue after cancellation.

## API And Server Plan

Add a JWT-protected `get-demo-meeting-access` Supabase Edge Function.

- Input: `appointmentId` UUID.
- Allow only the appointment's patient or assigned psychiatrist when the appointment is `booked`.
- Enforce the server-only `DEMO_JAAS_ENABLED` kill switch.
- Enforce the synthetic demo's 15-minute early-join buffer through the 45-minute appointment end.
- Sign a short-lived JWT using server-only `JAAS_APP_ID`, `JAAS_KEY_ID`, and `JAAS_PRIVATE_KEY`.
- Scope the token to one room and authenticated profile ID; return only `{ roomName, token, expiresAt, mode: "synthetic-demo" }`.
- Return one generic denial response and write minimal grant/deny audit events.
- Never log a room name, JaaS URL, JWT, name, or appointment detail.

## UI/UX Plan

- Add a protected meeting route and a “Join synthetic demo call” action only on an eligible booked appointment during the 15-minute early-join buffer through the session end.
- Show a persistent “Synthetic demo only — not a real consultation” banner.
- Use the existing Jitsi React SDK against `8x8.vc`, loading it only after the Edge Function grants access.
- Hide recording, transcription, chat, screen sharing, file sharing, invitation, and copy-link controls.
- Provide loading, denied, unavailable, and leave-call states.
- Keep room name and JWT in component memory only; never put them in routes, local storage, or a copy UI.

## Security, Privacy, And Abuse Controls

| Risk | D5 control | Residual limitation |
| --- | --- | --- |
| Unrelated Orion user | Appointment relationship checked server-side. | None at Orion's boundary. |
| Copied room link/name | JaaS requires a valid room- and participant-scoped JWT. | Link alone cannot join. |
| Copied active JWT | Short expiry, participant-specific identity, no storage or URL exposure, no reissue after cancellation. | An authorized person can deliberately share a still-valid token. |
| Emergency stop | `DEMO_JAAS_ENABLED` blocks new token grants. | An already joined participant needs a separate removal operation. |
| Data leakage | Synthetic identities only; no content features; redacted audit facts; no credentials in logs/test artifacts. | An authorized person can still share visible call content. |

## Quotas, Billing, Or Entitlements

The JaaS Developer plan includes 25 MAUs/month. A MAU is a participant device that joins at least one call with another participant in the billing month; minutes are not the pricing unit. D5 uses no paid add-ons and adds no patient billing or entitlement tier.

## Observability And Analytics

Record only actor ID, appointment ID, event code, outcome, and timestamp. Do not record room names, JWTs, URLs, media, device data, or call content. Review the JaaS Activity dashboard before each owner demo.

## Implementation Slices

1. **JaaS credentials and authorization** — store the AppID, key ID, and private key as Supabase secrets; implement and test the server access function.
2. **Token-enforced meeting UI** — add the protected route, appointment action, persistent label, and JaaS embed.
3. **Containment and controls** — verify no credential leakage, cancellation denial, kill-switch behavior, and disabled content features.
4. **Verification** — test allow/deny requests, copied-room-name denial without a JWT, desktop/mobile two-browser call, and leave flow.

## Verification Plan

- Patient and assigned psychiatrist receive valid short-lived tokens.
- Other patient, other psychiatrist, admin, unauthenticated visitor, cancelled appointment, disabled mode, and out-of-window request are denied.
- A copied room name without a JWT fails to join JaaS.
- Browser storage, routes, logs, and test artifacts contain no room names or JWTs.
- Desktop and mobile authenticated browser contexts complete a synthetic two-party call.

## Rollout And Fallback

Enable only in the synthetic demo environment. Disabling `DEMO_JAAS_ENABLED` stops new token issuance. If JaaS is unavailable, show an unavailable state and reschedule the demo; never fall back to public Jitsi or a personal meeting link.

## Documentation And Audit Updates

- Keep JaaS as the selected D5 demo provider.
- Keep real-launch provider approval blocked.
- Add a dated D5 audit after the implementation and manual call.
- Update the implementation tracker once all slices pass.

## Open Questions

- Who operates and records use of the demo kill switch?
- After the demo, should the used synthetic appointment be cancelled or replaced through reseeding?
- Before real users, can JaaS pass the required privacy, vendor, clinical, security, and operations review?
