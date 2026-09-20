# Phase 18 — Google Meet and Server-Authoritative Session Timing

**Packet purpose:** As-built record and handoff for the completed Phase 18 Google Meet
implementation.
**Last updated:** 2026-09-20
**Status:** Complete — implementation verified; activation separately gated.
**Next action:** Treat the Google Meet implementation as the Phase 18 baseline. Future work belongs
to Phase 19/20 operations and release gates, or to a new Phase 18 change decision.

## Authority map

- **Phase plan:** [Google Meet and session timing](../phases/phase-18-google-meet-and-session-timing.md)
- **As-built audit:** [Phase 18 Google Meet audit](../../audit-trail/2026-09-20-phase-18-google-meet-test-path-audit.md)
- **Historical feasibility:** [Free-Gmail Google Meet POC](../../audit-trail/2026-09-16-phase-18-google-meet-free-gmail-poc.md)
- **Provider decision:** [Video provider decision record](../../architecture/video-provider-decision-record.md)
- **Canonical status:** [`phase-status.json`](../phase-status.json)

## Current snapshot

- **Repository:** Phase 18 implementation is committed on `main`; the latest implementation is
  commit `4c954e2`.
- **Application:** `https://orioninterface.vercel.app` serves the verified Google Meeting UI.
- **Supabase:** The Google Meet admission migration and `google-meet-session-access` Edge Function
  are deployed to the linked test project.
- **Provider:** Google Meet is the Phase 18 provider. JaaS and Jitsi are not active runtime paths.
- **Test data:** The manual call used test accounts and synthetic booking data. No real clinical
  data was used.
- **Scope:** Phase 18 implementation is complete. Real-user activation remains separately gated by
  production provider, privacy, clinical, security, operations, and integrated-release controls.

## What was completed

1. Each psychiatrist can connect their own Gmail account through server-side OAuth.
2. Orion creates or reuses one Google Meet space for the appointment under that connected account.
3. Only the assigned patient or active assigned psychiatrist can request entry.
4. The appointment must be `booked` and the database time must be inside
   `[starts_at - 15 minutes, ends_at)`.
5. The one-hour window is visible through the Join action and refreshed at its boundaries.
6. A stale page or late request receives a specific expired-window state; the appointment remains
   unchanged and no Google entry is returned.
7. Provider, configuration, token-refresh, claim, and completion failures follow safe unavailable
   handling and privacy-safe logging.
8. The admin role controls the audited Google Meet admission kill switch.
9. The psychiatrist sees host-account instructions, including the annotated Google sign-in guide.
10. No automatic appointment outcome, no-show, note lock, note release, or clinical transition is
    performed by the meeting path.

## Decision record

| ID | Final decision |
| --- | --- |
| D1 | Google Meet is the Phase 18 provider. JaaS/Jitsi are historical and removed from active Phase 18 runtime. |
| D2 | The test lane uses a real two-party Google Meet call with test accounts and synthetic booking data. |
| D3 | Every psychiatrist connects their own Gmail account. Patients join as guests and do not connect Google. |
| D4 | The test uses the free Gmail/test-project arrangement used during the successful proof of concept. |
| D5 | The web flow uses a Web OAuth client, server-held refresh authorization, and only the approved Meet creation permission. |
| D6 | Payment is not implemented by Phase 18. The temporary test booking is auto-confirmed; Phase 17 owns payment-authorized booking. |
| D7 | Join opens 15 minutes early, the session is 45 minutes, and entry closes at the scheduled end. The next 15 minutes are only a note display window. |
| D8 | No-show, completion, note lock, release, or clinical outcomes are automatic. Late/early-end policy remains with the approved appointment workflow. |
| D9 | End-for-everyone/restart is not part of the completed showcase path and requires a separate approved implementation if needed. |
| D10 | Store only the minimum provider identifiers and protected server authorization needed for the integration; retention approval remains a production concern. |
| D11 | Google failures preserve the appointment, issue no access, show a safe unavailable state, and never silently fall back to another provider. |
| D12 | The admin role controls the protected meeting-admission kill switch. |
| D13 | Logs/audits use safe IDs, outcomes, reason codes, and timestamps; they exclude tokens, URLs, raw provider payloads, audio/video, and clinical content. |
| D14 | The owner's instruction authorized the test-path implementation. Real-user activation remains a separate explicit release decision. |

## Verification evidence

- Manual OAuth connection succeeded after the Google client was recreated with the correct web
  redirect configuration.
- The psychiatrist saved the shared Monday–Sunday weekly period.
- A patient booked a test appointment and the assigned psychiatrist saw it.
- Both assigned roles received the same protected Google Meet entry.
- Audio and video were verified in the real Google Meet call.
- The host-account behavior and psychiatrist guidance were verified.
- `RUN_SCHEDULING_E2E=1 npm run test:e2e:authenticated` — 16/16 passed on desktop Chromium and
  mobile Chrome.
- The E2E suite covers invalid-route denial, expired-window UI, booking, cancellation, history,
  authenticated navigation, refresh persistence, and mobile/desktop presentation.
- `npm run test:unit` — 9/9 passed.
- `npm run lint` — passed; phase indexes synchronized and checked.
- `npm run build` — passed; initial JavaScript remained within the 180 kB gzip budget.
- `git diff --check` — passed.
- The deployed production bundle contains the expired-window state and psychiatrist sign-in guide.

## Explicit boundaries

This packet does not claim that Orion is approved for real clinical users. Production Google
verification, Workspace/account policy, privacy/vendor review, clinical policy, security review,
operations ownership, and Phase 20 integrated release approval remain outside the completed Phase 18
implementation. Payment-authorized booking is owned by Phase 17 and is not a Phase 18 blocker or
deliverable.

## Handoff

Phase 19 may consume the documented provider failure, access-denial, expiry, and kill-switch states.
Phase 20 may consume the implementation and test evidence for integrated release verification.
Changes to this contract require a new decision, implementation evidence, and synchronized phase
status documentation.
