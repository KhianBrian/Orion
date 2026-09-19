# Phase 18.5 launch-readiness track

**Status:** In progress — current linked database verified; runtime and release evidence required.
**Launch profile:** 30 synthetic users, 10 simultaneous two-party calls (20 active participants),
at least two waves so all 30 identities exercise the boundary.

This track converts the remaining Phase 18.5 gaps into executable evidence. The 30-user profile is
an initial launch profile, not a capacity ceiling. It must run against the configured launch runtime
before any real-user go/no-go.

## Evidence matrix

| Area | Test | Current evidence | Required before launch |
| --- | --- | --- | --- |
| Identity and admission | 30 synthetic identities, assigned-pair access, unrelated/admin denial, kill switch | Local and linked database/browser admission checks pass for the implemented slice | Repeat against the configured current Auth/database with fresh fixtures; add admin, replay, revoked, cancelled, and out-of-window cases |
| Signaling capacity | 10 concurrent sessions across two waves and 30 unique identities; large SDP/answer frames; heartbeat | `npm run test:load:phase185` passes locally: 30 users, 20 peak participants, 2 waves | Run from a separate load host against the configured gateway; record p95 join/forward latency, errors, CPU/memory, and headroom |
| Browser WebRTC | Desktop and mobile two-party call with fake devices | Gated Playwright run passes 2/2 locally | Run with real devices and supported browser matrix; verify remote audio/video, permission denial, device failure, and mobile lifecycle |
| TURN relay | UDP relay, restrictive network, TLS/TCP fallback, credential expiry | Not proven locally; localhost call may use direct candidates | Configured coturn with relay-only ICE policy, blocked UDP test, TLS/TCP test, expiry, allocation quotas, and relay metrics |
| Reconnect and negotiation | ICE restart, gateway reconnect, mobile handoff, duplicate offer collision | Not complete; current client has basic one-shot negotiation | Implement and test bounded reauthorization/reconnect, deterministic negotiation, expiry/revocation UI, and no duplicate session creation |
| Failure and rollback | Signaling outage, TURN outage, kill switch, secret rotation, regional loss | Kill-switch denial is locally verified; outage drills are not | Run controlled current-runtime exercises with recovery times, rollback evidence, and approved outage copy |
| Security and privacy | Replay/forgery, duplicate/third participant, no sensitive logs, dependency/secret scan | Token signing and role boundary have focused coverage | Run current-runtime security review, log inspection, rate-limit/abuse tests, secret rotation, and data-flow review |
| Operations | Health checks, alerts, dashboards, runbooks, on-call ownership | Not configured in this repository | Name owners, configure monitoring, test alert delivery and stop authority, and record incident/recovery evidence |

## Commands

Local synthetic boundary:

```sh
npm run test:unit
npm run test:load:phase185
npm run test:db:phase185
RUN_DIRECT_WEBRTC_E2E=1 npm exec playwright test tests/e2e/direct-webrtc.spec.js
```

Current-runtime commands must receive the service configuration, gateway endpoint, TURN URLs, and
test credentials through the ignored environment or CI secret store. Never put credentials in the
repository or browser variables.

## Launch decision rule

The 30-user launch profile is ready only when the current-runtime evidence matrix is complete, the
measured peak has approved headroom, all failure exercises recover within the agreed targets, and
clinical, privacy/DPO, security, hosting, operations, and owner approvals are recorded. Until then
the Direct WebRTC flag stays disabled by default and real-user activation remains disabled.
