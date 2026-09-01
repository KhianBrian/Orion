# D5 JaaS synthetic-demo video deployment and early-join update — 1 September 2026

## Work completed

- Configured the JaaS AppID, API key ID, private signing key, and `DEMO_JAAS_ENABLED` as Supabase server secrets. Secret values were not committed or exposed in browser code.
- Deployed `get-demo-meeting-access` to the linked Supabase project. The function is active with JWT verification enabled.
- Corrected the synthetic admission boundary: the join action and server grant are available from 15 minutes before the appointment start through the scheduled end of the 45-minute session.
- Kept the distinction between session duration and admission timing: leaving the call does not end the appointment or prevent re-entry before the scheduled end.
- Recorded the future psychiatrist-only “End session for everyone” requirement in Phase 5. It remains a separate follow-on because it needs server-side room termination, persisted early-end/revocation state, and its own audit event.

## Verification evidence

- `npm run lint` passed after the early-join update.
- `npm run build` passed after the early-join update; Vite emitted only the existing bundle-size warning.
- `npm run test:e2e` passed previously with 10 tests passing and 4 credential-gated tests skipped; the protected meeting route passed on desktop and mobile.
- Supabase function listing confirmed `get-demo-meeting-access` is `ACTIVE` with `verify_jwt: true`.
- The requested synthetic Psychiatrist 1 open slot was created for 10:19 PM–11:04 PM Philippine time on 1 September 2026.
- `git diff --check` passed before the early-join documentation update.

## Remaining D5 closure evidence

D5 is not marked officially complete yet. The remaining evidence is the full authorized/denied access matrix, copied-room-name denial without a valid JWT, final browser storage/log/test-artifact inspection, and recorded desktop/mobile two-browser call evidence. Real-launch video approval remains blocked and this work remains synthetic-demo only.
