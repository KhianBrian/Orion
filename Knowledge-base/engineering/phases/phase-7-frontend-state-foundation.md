# Phase 7 — Frontend State and Session Foundation

## Outcome

Orion keeps a synthetic user signed in across an ordinary browser refresh, refreshes time-sensitive
controls without a page reload, and has one privacy-safe model for server-state caching and mutation
invalidation. This is a continuation of the D0–D7 implementation/verification track; it does not
close the application-wide privacy, clinical, legal, business, or operational decisions, close Phase
0–6 controlled-pilot gates, or authorise real data.

## Current State

- The Supabase client sets `persistSession: false`, so a full page refresh loses the in-memory session.
- Appointment and availability screens fetch independently on mount and manually refetch after writes.
- The meeting-window helper is evaluated only when React happens to render, so the join action can stay
  stale while the page remains open.
- `AuthProvider` can request the same profile through both the sign-in path and the auth-state event.
- D0–D7 implementation and verification are complete for the documented synthetic boundary
  ([implementation status](../implementation-status.md#current-implementation-track-five-account-synthetic-demo)).

## Non-Goals

- No real-user session policy, production cookie architecture, realtime subscriptions, service worker,
  persistent appointment cache, secretary role, or production data.
- No change to server-authoritative meeting or cancellation eligibility.

## Decisions Needed

1. **Synthetic refresh persistence:** use Supabase-managed `sessionStorage` for the demo as the smallest
   reversible solution. It survives refresh but ends when the browser tab/session closes. Record that
   this is a demo decision, not the final production session architecture.
2. **Server-state library:** record an architecture decision before adding `@tanstack/react-query`.
   It is recommended over a custom context cache because Orion now has multiple reads, mutations,
   invalidation rules, retry states, and user-bound cache-clearing requirements. This follows the
   [minimal implementation ladder](../engineering-conventions.md#minimal-implementation-ladder).

## Architecture Plan

- Add an application provider layer for the query client and authentication lifecycle.
- Establish a persistent authenticated shell route: its navigation remains mounted while protected
  child routes change. This is a routing and state boundary only; Phase 8 owns the responsive
  navigation design, shared UI primitives, and accessibility polish.
- Keep query data in memory only. Never add cache persistence, localStorage, IndexedDB, or a service
  worker for profiles, appointments, availability, or meeting access
  ([data dictionary](../../governance/data-classification-and-data-dictionary.md#data-rules)).
- Use stable query keys for open availability and the current account's appointment projection.
- Clear all protected query data before or as part of sign-out and whenever authenticated identity
  changes; never allow one demo role to inherit another role's cached rows.
- Add a shared clock hook that schedules the next meaningful boundary rather than polling constantly.

## Data Model Impact

None.

## API And Server Plan

No endpoint changes. RLS and Edge Functions remain authoritative
([architecture](../../architecture/architecture.md#authority-boundaries)).

## UI/UX Plan

- Show a brief account-restoration state during refresh instead of redirecting to login prematurely.
- Make join visibility update at early-join and session-end boundaries while the appointment page is
  open. Client time controls presentation only; the meeting-access function still decides admission.
- Preserve useful screen content during background refresh rather than replacing the full list with a
  loading message.
- Keep authenticated navigation in place during in-app route changes; a full browser refresh still
  performs normal application startup and session restoration.

## Security, Privacy, And Abuse Controls

- Supabase owns token refresh; no custom token parsing or manual token store.
- No appointment or patient data in persistent browser storage.
- Clear user-bound memory on sign-out and auth failure.
- Do not cache JaaS tokens, room names, or meeting-access responses.

## Quotas, Billing, Or Entitlements

None.

## Observability And Analytics

No sensitive telemetry. Tests may assert cache and refresh behavior with synthetic identifiers only.

## Implementation Slices

1. Refresh stale tracker wording so implementation-slice completion is distinct from application-wide
   policy/business readiness; this is documentation maintenance, not a new gate.
2. Add the provider boundary and record the query-cache dependency decision.
3. Establish the persistent authenticated shell route around protected child pages, without visual
   redesign or public-navigation changes.
4. Implement Supabase-managed synthetic-demo session persistence.
5. Move appointment/availability reads behind feature-owned query functions.
6. Add mutation invalidation and protected-cache clearing.
7. Add the boundary-driven clock hook and join-action refresh.

Likely areas: `src/main.jsx`, `src/routes/routeConfig.jsx`, `src/features/auth/`,
`src/features/appointments/`, `src/lib/supabase.js`, `src/pages/Appointments.jsx`, and
auth/scheduling tests.

## Verification Plan

- Sign in, refresh `/app`, `/appointments`, and `/patient-appointment`, and remain signed in.
- Confirm sign-out clears the session and protected in-memory cache.
- Navigate between protected pages and confirm the authenticated shell remains mounted while only
  page content changes.
- Cross from before to inside the join window without reloading; `Join call` appears.
- Cross session end without reloading; the action disappears.
- Booking invalidates slots and appointments; cancellation invalidates appointments.
- Existing unit, database/RLS, desktop/mobile Playwright, lint, and build checks pass.

## Rollout And Fallback

All changes are client-side and reversible. If the cache layer causes stale or cross-account state,
disable cached reuse, retain feature query functions, and fall back to refetch-on-mount while fixing
the invalidation defect.

## Documentation And Audit Updates

- Record the session-storage and query-cache decisions.
- Refresh stale Phase 3/4 tracker claims without claiming their production gates are closed; retain
  unresolved privacy, clinical, legal, business, and operational decisions as application-wide open
  items.
- Add a Phase 7 as-built audit entry with refresh, identity-switch, and timing-boundary evidence.

## Open Questions

- Production session storage remains a Phase 3/security decision; Phase 7 resolves only the synthetic demo.
