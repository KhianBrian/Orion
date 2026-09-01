# D5 JaaS synthetic-demo video boundary — 1 September 2026

## Scope implemented

- Added the JWT-protected `get-demo-meeting-access` Supabase Edge Function.
- The function authenticates the Supabase caller, permits only the appointment patient or assigned psychiatrist, requires `booked` status, enforces `DEMO_JAAS_ENABLED=true`, and checks the 15-minute early-join buffer through the exact 45-minute appointment end.
- JaaS tokens use the current 8x8 requirements: RS256, the configured `kid`, `aud: jitsi`, `iss: chat`, AppID `sub`, participant-specific `context.user.id`, literal room scope, `nbf`, and a short expiry bounded by the appointment end. Disabled feature claims cover recording, transcription, streaming, phone access, file upload, visitor listing, chat, and polls.
- Room references are derived from the existing appointment UUID as an opaque `orion-demo-` value. No migration was added.
- Added minimal grant/deny audit events containing only actor/target IDs, event code, outcome, reason code, and timestamp.
- Added the authenticated meeting route and appointment action. The React SDK uses `JaaSMeeting` against `8x8.vc`; room name and token remain in component memory only.
- Added the persistent “Synthetic demo only — not a real consultation.” banner and restricted the Jitsi controls to microphone, camera, hangup, fullscreen, and settings with invite functions disabled.

## Fresh verification evidence

- `npm run lint` passed.
- `npm run build` passed; Vite emitted only the bundle-size warning.
- `npm run test:e2e` passed: 10 tests passed, 4 credential-gated scheduling tests skipped because local synthetic credentials were not configured. The protected meeting route was checked on desktop and mobile.
- `git diff --check` passed.
- Scoped source review found no private key, JWT, or new browser-storage persistence in the D5 implementation.

## Pending owner-run verification

The user must configure `JAAS_APP_ID`, `JAAS_KEY_ID`, `JAAS_PRIVATE_KEY`, and `DEMO_JAAS_ENABLED=true` as Supabase server secrets or ignored local values; values must not be pasted into chat or committed. After configuration, run the allow/deny function matrix, verify copied-room-name denial without a JWT, and complete the desktop/mobile two-browser synthetic call. The implementation tracker remains planned until those checks pass.

Real-launch video approval remains blocked and this demo uses synthetic data only.
