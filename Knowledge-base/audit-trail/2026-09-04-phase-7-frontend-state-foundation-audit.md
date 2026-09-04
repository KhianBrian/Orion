# Phase 7 frontend state foundation audit — 4 September 2026

## Scope and boundary

This audit records the completed Phase 7 frontend slice for Orion's five-account synthetic demo.
It does not authorise real accounts, real appointments, production session architecture, persistent
browser caches, realtime subscriptions, or any Phase 0–6 controlled-pilot gate.

## Decisions implemented

- The synthetic demo uses Supabase-managed `sessionStorage` for its browser session. It survives an
  ordinary refresh and ends when the browser tab/session closes. Supabase continues to own refresh
  and token handling; Orion does not parse or manually store tokens.
- `@tanstack/react-query` provides the application server-state cache. Query data exists only in
  memory: no persistence plugin, `localStorage`, IndexedDB, service worker, or offline appointment
  cache was added.
- Protected query data is cleared on sign-out, profile-load failure, and authenticated identity
  change. Appointment keys include the authenticated account ID; open availability is invalidated
  after booking or a slot conflict, and appointments are invalidated after booking or cancellation.
- A persistent authenticated-shell route now contains protected child pages. It is a routing/state
  boundary only; Phase 8 remains responsible for responsive navigation design, shared UI primitives,
  and accessibility polish.
- Meeting-window presentation uses a single timeout to the next early-join or session-end boundary.
  The meeting-access function remains the admission authority, and no JaaS token, room name, or
  meeting-access response is cached.

## Implementation evidence

- Supabase session persistence and the deduplicated auth profile lifecycle are implemented in the
  React client. A stale profile request can no longer sign out a newer account during an identity
  switch.
- Appointment and availability reads moved from per-page mount effects to feature-owned React Query
  functions. Background refresh retains current list content.
- Booking and cancellation now invalidate their affected query keys rather than manually refetching
  local page state.
- The authenticated desktop/mobile Playwright regression verifies sign-in, refresh on appointments,
  retained protected navigation, sign-out, and redirect from a subsequently requested protected URL.

## Fresh verification evidence

| Command | Result | What it established |
| --- | --- | --- |
| `npm run test:unit` | 6 passed | Existing appointment rules, exact meeting-window boundaries, next-boundary selection, and in-memory cache clearing. |
| `npm run lint` | Passed | Lint-clean source and tests. |
| `npm run build` | Passed | Production build completed; the existing bundle-size warning remains. |
| `npm run test:e2e` | 10 passed, 6 credential-gated tests skipped | Public navigation and unauthenticated protected-route behaviour on Chromium and Pixel 5. |
| `RUN_SCHEDULING_E2E=1 npm run test:e2e:authenticated` | 6 passed | Synthetic-session refresh/sign-out, protected shell, booking, identity switch, psychiatrist visibility, and cancellation on Chromium and Pixel 5. |
| `git diff --check` | Passed | No whitespace errors in the working patch. |

## Remaining boundary

Production session storage, cookie architecture, MFA, real-user data, and all policy, clinical,
legal, privacy, business, and operational decisions remain outside this completed synthetic-demo
slice. Phase 8 consumes the persistent authenticated-shell boundary; it does not recreate it unless
an as-built defect requires that change.
