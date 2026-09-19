# Phase 18.5 — Direct WebRTC + TURN

**Packet purpose:** Resume Phase 18.5 without reconstructing implementation and launch context from
conversation history.
**Last updated:** 2026-09-19
**Status:** Implemented on `main` — controlled Open Relay showcase integration planned; runtime and
real-user launch remain gated.
**Recommended next action:** Implement and verify the non-production Open Relay showcase path with
synthetic accounts. The separate partner/owner real-user provider decision remains open. Vercel can
host the frontend, but it does not replace the video fallback service.

## Authority map

- **Phase plan:** [Direct WebRTC + TURN plan](../phases/phase-18.5-direct-webrtc-turn-planning.md)
- **Launch gates:** [production-readiness track](../phases/phase-18.5-production-readiness.md)
- **Historical evidence:** [2026-09-19 audit](../../audit-trail/20260919-phase-18.5-direct-webrtc-turn-audit.md)
- **Canonical status:** [`phase-status.json`](../phase-status.json)

## Current snapshot

- **Repository/branch/worktree:** `Verified` — the complete Phase 18.5 implementation was merged
  from `codex/phase-18.5-launch-readiness` into local `main` as merge commit `3b8fa50`. The feature
  branch remains available as the implementation worktree; `main` is now the website deployment
  source; the Phase 18.5 merge and provider-decision record were first published to
  `origin/main` at `7567d5e`.
- **Environment/database:** `Verified` — the existing ignored `.env` test project was used for the
  gated browser attempt; its temporary synthetic slot/appointment fixtures were created and
  cleaned up by the test. No migration, Edge Function deployment, signaling deployment, TURN
  provisioning, or website deployment was performed by this continuation work.
- **Scope boundary:** `Verified` — code, migrations, protected Edge Functions, UI, signaling
  boundary, TURN credential boundary, and synthetic verification are recorded. Runtime deployment,
  real-user launch, and production readiness remain separate gates.
- **Showcase direction:** `Planned` — use Supabase for Orion sign-in and appointment protection,
  Supabase Realtime for the small browser-to-browser connection messages, and Open Relay Project for
  the video fallback. This removes the need to provision Orion-owned video servers for the
  controlled showcase only. It does not select Open Relay as Orion's real-user provider.

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
- **Showcase constraint:** Open Relay's free plan advertises 20 GB of fallback-video traffic per
  month, but its terms provide no uptime warranty and allow service interruption without notice.
  It is suitable only for the controlled showcase/onboarding evidence described below, not a
  real-user clinical launch.
- **Blocked:** the partner/owner real-user provider decision remains open. Google Meet remains the
  managed-provider alternative; no Direct WebRTC provider is approved for real-user activation.
- **Blocked:** runtime progression still requires the launch-readiness prerequisites and explicit
  authorization recorded in the linked phase plan and launch-readiness track.

## Ordered next actions

1. **Showcase implementation:** replace the showcase-only custom signaling path with private
   Supabase Realtime channels and change the protected server operation to request short-lived Open
   Relay credentials. Keep every provider key and credential request on the server; never put a
   provider secret in the browser.
2. **No-TURN evidence:** run 50 short synthetic two-person attempts over varied real networks and
   devices. Repeating one Wi-Fi pair does not count. Record only safe operational results: whether
   audio/video connected, time to connect, browser/device class, and broad network type. Any failure
   demonstrates that the fallback remains necessary; 50 successes do not prove it can be removed.
3. **Open Relay evidence:** enable the fallback only in the test/showcase environment, repeat the
   same varied-network tests, and record whether each call used the direct path or fallback path.
   Monitor the provider dashboard and stop the controlled path before 15 GB of its 20 GB monthly
   allowance is used.
4. **Showcase stop rule:** if the free provider is unavailable, its allowance is exhausted, or a
   security/privacy condition is not met, disable Direct WebRTC admission. Do not silently route a
   call to another provider; Google Meet remains a separate provider decision and setup path.
5. **After evidence:** partners/owners choose Google Meet or a real-user Direct WebRTC provider,
   then authorize the separately documented runtime, privacy, clinical, and operations work.

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
- **Git publication:** the Phase 18.5 merge and provider-decision record were first pushed to
  `origin/main` at `7567d5e`; this packet completes the publication record.
- **Showcase provider plan:** the next non-production implementation uses Supabase Realtime plus
  Open Relay's free 20 GB fallback allowance. This is not deployed and is not a real-user provider
  approval. Partners/owners must still decide between Google Meet and a real-user Direct WebRTC
  provider before either route is activated for real users.
