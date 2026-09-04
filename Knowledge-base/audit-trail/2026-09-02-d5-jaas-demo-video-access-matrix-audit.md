# D5 JaaS synthetic-demo access-matrix audit — 2 September 2026

## Scope

Synthetic-only verification against the Orion demo Supabase project. No room name, meeting URL,
JaaS JWT, credential, recording, or screenshot was retained as evidence.

## Corrective deployment

- The live access-matrix run found that denied events used `failure`, while `audit_events.outcome`
  accepts `success` or `denied`.
- Updated `get-demo-meeting-access` to record denied requests as `denied` and redeployed the active,
  JWT-verified function as version 3.

## Fresh passing evidence

- A patient booked the synthetic slot before the access checks.
- The booked patient and assigned psychiatrist were granted short-lived synthetic-demo access.
- Other patient, other psychiatrist, admin, unauthenticated, cancelled appointment, disabled demo
  mode, before-early-join, and after-session-end requests were denied.
- Grant and deny audit facts are now persisted with only actor/appointment/event/outcome/reason
  fields; no provider room, URL, or token field is present.
- `DEMO_JAAS_ENABLED` was temporarily set to `false` for its denial check and restored to `true`.
- The Playwright artifact directories contained no match for an issued room name or JaaS JWT.
- `npm run lint`, `npm run build`, `npm run test:e2e` (10 passed; 4 credential-gated skipped), and
  `git diff --check` passed. The build emitted only the existing bundle-size warning.

## Remaining closure evidence

D5 remains open. The first local browser check used a shorter wait than the app's successful Auth and
two profile-lookups require; a repeat reached the authenticated Orion route. Its booked test
appointment had expired before the JaaS route could be mounted, so a desktop/mobile two-browser JaaS
call, copied-room-name-without-JWT admission check, and leave/re-entry observation are not recorded as
passing. Do not update the implementation tracker or infer any real-launch approval from this audit.
