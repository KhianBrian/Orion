# Phase 18 — Google Meet and Server-Authoritative Session Timing

**R1 mapping:** R1.4 — Google Meet admission and appointment-session timing.

**Status:** Complete — implementation verified; activation separately gated.

Phase 18 owns the Google Meet implementation, protected admission, timing boundary, failure
handling, and meeting UI. Payment-authorized booking belongs to Phase 17; Phase 18 consumes a
`booked` appointment and does not implement payment.

Implementation evidence is recorded in the [Phase 18 as-built audit](../../audit-trail/2026-09-20-phase-18-google-meet-test-path-audit.md).
The earlier free-Gmail feasibility result remains recorded in the
[Phase 18 Google Meet POC evidence](../../audit-trail/2026-09-16-phase-18-google-meet-free-gmail-poc.md).

## Completed outcome

An assigned patient or active assigned psychiatrist can request the appointment's Google Meet
entry only when the appointment is `booked` and the server time is inside:

`[starts_at - 15 minutes, ends_at)`

This is a one-hour access window: 15 minutes of early entry plus the scheduled 45-minute session.
The database is authoritative. The browser clock only refreshes the Join action and cannot grant
access.

The implementation creates or reuses one Google Meet space under the connected psychiatrist's
Google account. Patients join as guests. The meeting URL is returned only after Orion verifies the
appointment, user relationship, booking state, feature control, and time window.

When the window closes, Orion rejects new entry requests with a distinct expired-window reason and
the UI shows **Google Meet window closed** without changing the appointment. If a ready page remains
open, its entry action is removed when `ends_at` is reached. Orion controls access to the entry
point; it does not forcibly terminate a Google Meet browser tab that was already opened.

The scheduled end and following 15-minute note display window do not automatically complete an
appointment, record a no-show, lock a note, release a note, or change a clinical outcome.

## Implemented scope

- Per-psychiatrist Gmail OAuth connection with server-held refresh authorization.
- Google Meet space creation and idempotent claim/complete/fail handling.
- Database-authoritative admission for the assigned patient or active assigned psychiatrist.
- `booked` appointment and exact `[starts_at - 15 minutes, ends_at)` enforcement.
- Separate unavailable, denied, and expired-window UI states.
- Automatic client refresh at the early-open and scheduled-end boundaries.
- Admin-controlled, audited Google Meet admission kill switch.
- Safe provider failure logging without secrets, tokens, meeting URLs, or clinical content.
- Psychiatrist host-account guidance and annotated Google sign-in instructions.
- Removal of active JaaS/Jitsi runtime paths from the Phase 18 provider flow.
- No automatic fallback to JaaS, Jitsi, Direct WebRTC, or another provider.
- No automatic appointment outcome, no-show, note lock, release, or publication transition.

Direct WebRTC remains a separate Phase 18.5 synthetic/non-production slice. It is not the Phase 18
Google Meet provider path.

## Recorded decisions

| Decision | Recorded outcome |
| --- | --- |
| Provider | Google Meet is the Phase 18 provider. JaaS and Jitsi are historical/non-active paths. |
| Test lane | A real two-party Google Meet call may be demonstrated with test accounts and test data. |
| Host account | Each psychiatrist connects their own Gmail account; the patient joins as a guest. |
| Timing | Join opens 15 minutes before `starts_at`; access closes at `ends_at`; the session is 45 minutes. |
| Outcomes | No automatic completion, no-show, note lock, release, or clinical transition. |
| Failure behavior | Preserve the appointment, issue no access, and show a safe generic unavailable state. Expired windows have a specific user-facing state. |
| Kill switch | The admin role controls the protected, audited meeting-admission kill switch. |
| Telemetry | Record safe access/provider outcomes and reason codes; never log secrets, tokens, URLs, raw provider payloads, video/audio, or clinical notes. |

## Verification completed

- Real test-account OAuth connection succeeded in the deployed Orion environment.
- A psychiatrist saved the shared Monday–Sunday weekly period and a patient booked a test session.
- Assigned psychiatrist and patient both received the same protected Google Meet entry.
- Two-party Google Meet audio and video were manually verified.
- Host-account behavior was verified: the psychiatrist must open Meet while signed into the connected Gmail account.
- The previous admission RPC ambiguity was fixed and the live function was reverified for both roles.
- The expired-window route was verified through authenticated desktop and mobile E2E tests.
- `RUN_SCHEDULING_E2E=1 npm run test:e2e:authenticated` — 16 tests passed across Chromium and mobile Chrome.
- `npm run test:unit` — 9 tests passed.
- `npm run lint` — passed, including phase-status synchronization/check.
- `npm run build` — passed within the 180 kB initial JavaScript gzip budget.
- `git diff --check` — passed.
- The Supabase migration and Edge Function are deployed to the linked test project.
- The Vercel production deployment and `orioninterface.vercel.app` alias contain the expired-window UI and host guidance.

## Boundaries after completion

Phase 18 implementation is complete. The following are separate activation or downstream concerns,
not unfinished Phase 18 code:

- Phase 17 payment-authorized booking remains owned by Phase 17.
- Production Google project policy, OAuth verification, Workspace account policy, privacy/vendor,
  clinical, security, operations, and integrated release approvals remain real-user launch gates.
- Phase 19 consumes the Phase 18 failure and support states.
- Phase 20 owns integrated launch verification and the final controlled-release decision.

## Handoff

The Phase 18 audit is the as-built handoff for Phase 19 and Phase 20. Future changes to provider
behavior, timing, meeting access, or failure codes require a new decision record and regression
evidence; they should not silently modify the completed Phase 18 contract.
