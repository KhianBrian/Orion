# Phase 10 — Focused Meeting Experience

## Outcome

The synthetic call uses a focused, responsive meeting shell in which no Orion header or footer covers
the provider surface. Entry, preflight, leave, denial, and unavailable states are clear on desktop and
mobile while the synthetic-demo warning remains unmissable.

## Current State

- The meeting route inherits the full public navigation and fixed footer.
- The JaaS frame uses a minimum height while the page remains scrollable, allowing the footer to cover
  part of the provider surface.
- `Leave call` does not consistently receive the shared button treatment.
- The JaaS SDK is imported eagerly with all other routes.

## Non-Goals

- No real-session provider approval, recording, transcription, chat, file transfer, screen sharing,
  custom video server, or redesign of provider-owned controls.
- No change to token claims, admission relationship checks, or the approved demo window.

## Decisions Needed

- None for synthetic-demo layout. Real-session behavior remains blocked by Phase 5 approvals
  ([video decision record](../../architecture/video-provider-decision-record.md)).

## Architecture Plan

- Give the meeting route a dedicated layout outside the standard marketing/application footer.
- Lazy-load the route and JaaS SDK behind a bounded loading state.
- Size the meeting surface from the dynamic viewport (`dvh`) and the actual compact header/banner,
  avoiding fixed overlays and nested scroll containers.

## Data Model Impact

None.

## API And Server Plan

No contract change. `get-demo-meeting-access` remains the sole token issuance boundary and its response
must not be cached ([database/RBAC](../../architecture/database-and-rbac.md#join-meeting)).

## UI/UX Plan

- Compact meeting header with `Back to appointments` before admission and `Leave call` during/after it.
- Keep `Synthetic demo only — not a real consultation` visible outside the provider iframe.
- Use a full available viewport for preflight/call content; remove the standard footer on this route.
- Provide deliberate loading, denied, provider-unavailable, invalid-token-configuration, and leave states.
- Prevent app-level scrolling from placing navigation/footer over device controls or video.

## Security, Privacy, And Abuse Controls

- Never display or log room names or JWTs.
- Keep recording, transcription, chat, file transfer, streaming, and invite functions disabled.
- A hidden/edited banner never changes server-issued demo mode or admission rights.

## Quotas, Billing, Or Entitlements

Remain within the approved JaaS synthetic-demo allowance; no production entitlement is created.

## Observability And Analytics

Only safe state/reason codes may be captured. No camera images, participant names, room identifiers,
tokens, or consultation content.

## Implementation Slices

1. Add the dedicated meeting route layout and remove standard fixed chrome from the call path.
2. Apply responsive viewport sizing and shared button/status components.
3. Lazy-load the meeting route/JaaS SDK and add a useful loading fallback.
4. Complete desktop/mobile preflight, call, scrolling, leave/re-entry, denial, and unavailable checks.

Likely areas: `src/routes/routeConfig.jsx`, `src/pages/DemoMeeting.jsx`, `src/pages/DemoMeeting.css`,
layout components, and meeting-access Playwright coverage.

## Verification Plan

- At desktop and Pixel 5 sizes, every preflight and in-call control remains visible and unobscured.
- Scrolling or dynamic mobile browser chrome never causes an Orion footer/header overlay.
- Leave returns to appointments; re-entry still requires a fresh server-authorised token.
- Copied-room, unrelated-user, out-of-window, expired-token, and disabled-provider denials still pass.
- Initial non-meeting routes no longer download the JaaS route chunk.

## Rollout And Fallback

The dedicated layout is route-local. If viewport behavior regresses, fall back to a normal-flow compact
meeting page without reintroducing the global fixed footer.

## Documentation And Audit Updates

- Add Phase 10 screenshots and manual two-browser evidence to the audit trail.
- Record bundle output before and after route splitting.

## Open Questions

- Real-provider preflight and session-end controls remain Phase 5 decisions.
