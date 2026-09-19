# Phase 18.5 — Direct WebRTC + TURN

**Packet purpose:** Resume Phase 18.5 without reconstructing implementation and launch context from
conversation history.
**Last updated:** 2026-09-19
**Status:** Implemented on `main` — provider decision pending; runtime and real-user launch remain
gated.
**Recommended next action:** Partners/owners decide between Google Meet and Direct WebRTC + TURN.
If Direct WebRTC is selected, choose and authorize the signaling/coturn runtime before deployment.
Vercel can host the frontend, but it does not replace the signaling gateway or TURN relay.

## Authority map

- **Phase plan:** [Direct WebRTC + TURN plan](../phases/phase-18.5-direct-webrtc-turn-planning.md)
- **Launch gates:** [production-readiness track](../phases/phase-18.5-production-readiness.md)
- **Historical evidence:** [2026-09-19 audit](../../audit-trail/20260919-phase-18.5-direct-webrtc-turn-audit.md)
- **Canonical status:** [`phase-status.json`](../phase-status.json)

## Current snapshot

- **Repository/branch/worktree:** `Verified` — the complete Phase 18.5 implementation was merged
  from `codex/phase-18.5-launch-readiness` into local `main` as merge commit `3b8fa50`. The feature
  branch remains available as the implementation worktree; `main` is now the website deployment
  source.
- **Environment/database:** `Verified` — the existing ignored `.env` test project was used for the
  gated browser attempt; its temporary synthetic slot/appointment fixtures were created and
  cleaned up by the test. No migration, Edge Function deployment, signaling deployment, TURN
  provisioning, or website deployment was performed by this continuation work.
- **Scope boundary:** `Verified` — code, migrations, protected Edge Functions, UI, signaling
  boundary, TURN credential boundary, and synthetic verification are recorded. Runtime deployment,
  real-user launch, and production readiness remain separate gates.

## Evidence and blockers

- **Verified:** unit tests (9 passed), lint and phase-status synchronization, build (170.08 kB
  initial JavaScript gzip against a 180 kB budget), signaling load (30 users, 20 peak
  participants, two waves), and the full browser suite (58 passed, 22 intentionally skipped) are
  recorded in the [2026-09-19 audit](../../audit-trail/20260919-phase-18.5-direct-webrtc-turn-audit.md).
- **Verified on `main`:** environment-example validation, 9 unit tests, the 30-user/two-wave
  signaling load profile, lint and phase-status synchronization, production build (170.07 kB initial
  JavaScript gzip against the 180 kB budget), the browser suite (58 passed, 22 intentionally
  skipped), local schema lint, and the signaling Docker image build all passed after merge.
- **Verified:** the signaling gateway now supports same-participant lease replacement for bounded
  reconnect, while rejecting a different participant for the occupied role; the client now uses
  deterministic offer-collision handling, ICE candidate queuing, bounded access refresh, and ICE
  restart attempts.
- **Verified:** the signaling gateway now exposes a dependency-free `/healthz` endpoint, accepts a
  configurable bind host, and closes active sockets during SIGTERM/SIGINT shutdown for deployment
  and process-manager restarts.
- **Verified:** `video-session-access` now derives coturn REST credentials with HMAC-SHA1 and
  standard base64 encoding, matching the project-owned TURN contract.
- **Observed:** gated two-party WebRTC browser setup authenticated and created its synthetic
  appointment on the configured test project, but both desktop and mobile stopped before preflight
  because the configured `video-session-access` runtime returned the safe
  `video_session_unavailable` response. The test project therefore still needs its Phase 18.5
  Edge Function runtime configuration and reachable signaling/TURN services.
- **Observed:** Phase 18.5 Edge Functions, signaling gateway, TURN relay, and website runtime have
  not been deployed from this workflow refinement task.
- **Deferred:** linked database behavior checks remain deferred for a separately authorized run;
  gated two-party browser evidence remains deferred until the configured test runtime has its
  signaling/TURN boundary; runtime deployment and real-user launch evidence remain intentionally
  deferred.
- **Blocked:** partners/owners have not selected the provider. Google Meet remains available as the
  managed-provider alternative; Direct WebRTC requires a signaling/coturn host decision before its
  four runtime values can be populated or deployed.
- **Blocked:** runtime progression still requires the launch-readiness prerequisites and explicit
  authorization recorded in the linked phase plan and launch-readiness track.

## Ordered next actions

1. **Recommended:** partners/owners select Google Meet or Direct WebRTC + TURN using the owner
   decision brief and recorded cost/operational trade-offs.
2. If Direct WebRTC is selected and deployment is explicitly authorized, provision the approved
   runtime, configure the four server-side values, and add fresh relay-path evidence.
3. If Google Meet is selected, continue its Workspace/OAuth and provider-validation path; do not
   deploy unused Direct WebRTC infrastructure.

## Handoff

- **Changed surfaces:** `Orion_React_App/src/pages/DirectMeeting.jsx`,
  `Orion_React_App/src/lib/directWebRtcSession.js`, the signaling gateway and unit coverage, plus
  the Direct WebRTC Playwright fixture signature, and
  `supabase/functions/video-session-access/index.ts` TURN credential derivation. The signaling
  gateway now also has a non-root `Orion_React_App/Dockerfile.signaling` deployment artifact. The
  protected server admission contract and database schema were intentionally untouched.
- **Commands and results:** `npm run test:unit`, `npm run lint`, `npm run build`,
  `npm run test:load:phase185`, and `npm run test:e2e` passed; phase-status synchronization and
  check passed as part of lint.
- **Remote runtime actions:** no website, Edge Function, signaling, or TURN deployment and no
  runtime secret change were performed. The gated browser test did use the existing test project
  and cleaned its temporary synthetic data.
- **Provider decision:** Direct WebRTC + TURN is implemented on `main`, but partners/owners must
  decide whether to use it or the Google Meet path before either provider is activated for use.
