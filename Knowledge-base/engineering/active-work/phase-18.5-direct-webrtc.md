# Active Work — Phase 18.5 Direct WebRTC + TURN

**Last updated:** 19 September 2026
**Status:** Implementation complete; main integration and launch-runtime work remain in progress.
**Governing plan:** [Phase 18.5 plan](../phases/phase-18.5-direct-webrtc-turn-planning.md)
**Launch evidence:** [Phase 18.5 readiness track](../phases/phase-18.5-production-readiness.md)
**Historical evidence:** [Phase 18.5 audit](../../audit-trail/20260919-phase-18.5-direct-webrtc-turn-audit.md)

## Current state

- **Observed:** The implementation work is in worktree `/Users/khiansismundo/.codex/worktrees/a5ef/Orion`
  on branch `codex/phase-18.5-direct-webrtc-turn`.
- **Observed:** The feature code, migrations, Edge Functions, gateway, UI, and tests are present
  in this worktree. The website deployment target is `main`; do not deploy the website from this
  feature worktree.
- **Verified:** The three Phase 18.5 migrations were applied to the existing linked Supabase
  database after explicit user authorization. The migration list matched local and remote state.
- **Verified:** The linked database checks passed for shared-session access, relationship denial,
  and the kill switch.
- **Verified:** Local schema lint passed. Remote schema lint passed. Security and performance
  advisors completed; warnings/info findings are recorded below and are not silently treated as
  launch clearance.
- **Observed:** The Phase 18.5 Edge Functions are not deployed to the linked project.
- **Observed:** No signaling gateway, TURN relay, or Vercel website has been deployed from this
  worktree.
- **Constraint:** This work uses the existing linked Supabase database as the only database target.
  It does not create a second database environment. That constraint is current project context,
  not evidence that launch requirements are complete.

## Implemented surfaces

- Forward-only control-plane migrations under `supabase/migrations/`.
- Protected `video-session-access` and `video-control` Edge Functions.
- Direct WebRTC appointment route and disabled-by-default UI flag.
- Dedicated in-memory signaling gateway with bounded frames, heartbeats, expiry, and two-party
  role enforcement.
- Unit, database, load, and gated desktop/mobile browser tests.
- Environment-name templates that contain no real secret values.

## Fresh verification matrix

| Area | Evidence | Result |
| --- | --- | --- |
| Unit boundary | `npm run test:unit` | **Verified:** 7 passed |
| Signaling load | `npm run test:load:phase185` | **Verified:** 30 identities, 10 sessions per wave, 20 peak participants, 2 waves |
| Code quality | `npm run lint` | **Verified:** passed |
| Build | `npm run build` | **Verified:** passed; 170.02 kB initial JS gzipped against 180 kB budget |
| Local schema | `supabase db lint --local` | **Verified:** no schema errors |
| Linked schema | `supabase db lint --linked` | **Verified:** no schema errors |
| Linked database behavior | `npm run test:db:phase185` | **Verified:** shared session, denial, and kill switch |
| Browser flow | `RUN_DIRECT_WEBRTC_E2E=1 npm exec playwright test tests/e2e/direct-webrtc.spec.js` | **Verified:** desktop and mobile two-party calls, 2 passed |
| Existing public/authenticated suite | local Playwright run | **Verified:** 58 passed; 20 skipped because the database scheduling suite was disabled |
| Remote security advisor | `supabase db advisors --linked --type security --level info --fail-on error` | **Verified:** completed with existing warnings for RLS-without-policy tables, callable security-definer functions, OTP expiry, and leaked-password protection |
| Remote performance advisor | `supabase db advisors --linked --type performance --level info --fail-on error` | **Verified:** completed with informational index findings |

## Decisions and deferrals

- **Decision:** Website deployment is from verified `main`, never directly from this feature
  worktree.
- **Decision:** The current linked Supabase database is the database used for this workstream.
- **Deferred:** Edge Function deployment until signaling and TURN runtime endpoints and secrets
  exist.
- **Deferred:** Signaling/TURN provisioning, website deployment, and real-user activation.
- **Risk:** The current TURN credential implementation must be checked for coturn protocol
  compatibility before real relay testing.
- **Risk:** The gateway stores sessions in process memory; multi-instance deployment requires an
  explicit session-affinity or shared-state design.
- **Not launch-cleared:** The local 30-user load result proves gateway behavior only, not TURN
  relay capacity, real-device behavior, outage recovery, observability, or approvals.

## Ordered next actions

1. Commit this worktree's code and documentation, merge it into local `main`, and push `main` only
   after final verification on `main`.
2. Link/configure the Vercel website project from `main` and keep `VITE_DIRECT_WEBRTC_UI=false`
   until the runtime boundary is deployed and verified.
3. Correct and independently test TURN REST credential compatibility.
4. Provision the signaling gateway and TURN relay, then set the four Edge Function secrets without
   placing any secret in browser or Vercel public variables.
5. Deploy and smoke-test the two Edge Functions against the current linked database.
6. Run the current-runtime 30-user, forced-TURN, reconnect, expiry, kill-switch, outage, and
   security evidence matrix; update this record and the dated audit after every material result.
