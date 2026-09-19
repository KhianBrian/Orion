# Phase 18.5 — Direct WebRTC + TURN

**Packet purpose:** Resume Phase 18.5 without reconstructing implementation and launch context from
conversation history.
**Last updated:** 2026-09-19
**Status:** Reconnect/negotiation and TURN credential implementation verified — synthetic/non-production;
runtime launch remains gated.
**Recommended next action:** Choose an approved production-capable host/provider for signaling and
coturn, then configure the test Supabase project; keep runtime deployment and real-user activation
separately gated. Vercel can host the frontend, but it does not replace the signaling gateway or
TURN relay.

## Authority map

- **Phase plan:** [Direct WebRTC + TURN plan](../phases/phase-18.5-direct-webrtc-turn-planning.md)
- **Launch gates:** [production-readiness track](../phases/phase-18.5-production-readiness.md)
- **Historical evidence:** [2026-09-19 audit](../../audit-trail/20260919-phase-18.5-direct-webrtc-turn-audit.md)
- **Canonical status:** [`phase-status.json`](../phase-status.json)

## Current snapshot

- **Repository/branch/worktree:** `Verified` — continuation work is isolated in
  `codex/phase-18.5-launch-readiness` at `/Users/khiansismundo/Downloads/Orion-phase-18.5-launch-readiness`;
  local `main` remains the deployment source and was not changed by this worktree.
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
- **Blocked:** the repository has no selected or provisioned staging host for the signaling gateway
  or coturn relay, so the four runtime values cannot be populated or deployed yet.
- **Blocked:** runtime progression still requires the launch-readiness prerequisites and explicit
  authorization recorded in the linked phase plan and launch-readiness track.

## Ordered next actions

1. **Recommended:** confirm the runtime deployment decision and prerequisites against the launch-readiness track; do not deploy until explicitly authorized.
2. If authorized, update this packet at each material runtime checkpoint and append fresh dated audit
   evidence after each completed milestone.
3. Re-run the phase-status synchronizer and relevant verification after any status change.

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
- **Remote runtime actions:** no deployment, migration, secret change, or push was performed. The
  gated browser test did use the existing test project and cleaned its temporary synthetic data.
- **Untouched scope:** the three pre-existing untracked documentation items in the main worktree are
  preserved and remain outside this task.
