# D5 JaaS synthetic-demo video completion audit — 2 September 2026

## Scope and boundary

This evidence applies only to Orion's five synthetic accounts and the non-production JaaS demo.
No recording, transcription, streaming, chat, file transfer, screen sharing, phone access, paid
add-on, credential, room name, meeting URL, or JaaS JWT was retained in the evidence.

## Completion evidence

- A fresh synthetic patient booking was created inside the 15-minute early-join window.
- The full server access matrix passed: booked patient and assigned psychiatrist allowed; other
  patient, other psychiatrist, admin, unauthenticated, cancelled appointment, disabled demo mode,
  before-window, and after-end requests denied.
- JaaS runtime state confirmed that a copied room name without a JWT did not join a conference.
- Separate authenticated desktop browser contexts completed the Orion click path, entered JaaS
  pre-join, pressed Join meeting, and reached Jitsi's joined-conference runtime state.
- The same two-participant joined-conference check passed in separate Pixel 5 browser contexts.
- When the patient left through Orion, the psychiatrist remained joined. The patient then re-entered
  and joined again before the scheduled end.
- Routes, browser storage, console output, and Playwright artifacts were checked for issued room
  names and JaaS JWTs; no match was found.
- The JaaS access function is active with `verify_jwt: true`. Its denial audit outcomes were corrected
  to the database-supported `denied` value and deployed before this completion run.

## Verification commands

- `npm run lint` — passed.
- `npm run build` — passed, with only the existing bundle-size warning.
- `npm run test:e2e` — 10 passed and 4 credential-gated tests skipped.
- `git diff --check` — passed.

## Result

D5 is complete for its synthetic-demo boundary. This does not approve JaaS, any other provider, or
real users for Phase 5. Phase 5 remains blocked on the recorded provider, privacy, clinical,
security, and operations approvals.
