# Phase 11 frontend acceptance audit — 12 September 2026

## Scope and decision

This audit covers the Phase 11 frontend changes on `dev/phase11work`. Refresh persistence is a
required application behavior: Supabase Auth retains the signed-in session in `sessionStorage`, so a
browser refresh keeps the user on the route they were viewing. Appointment and React Query data remain
memory-only. The existing repository rule against `localStorage` is unchanged.

The frontend implementation slice and automated acceptance are complete. Authenticated browser and
database/RLS acceptance are verified against the configured synthetic Supabase project; only the owner
walkthrough and real two-party video check remain, intentionally deferred.

## Implemented changes

- Removed the optional `VITE_DEMO_AUTH_PERSISTENCE` switch and made refresh-safe Auth persistence
  unconditional for the supported browser session.
- Moved the meeting route outside the standard authenticated header/footer shell.
- Added a 180 kB gzipped initial JavaScript budget. The current non-meeting entry bundle is about
  166 kB gzipped, while meeting and admin code remain in lazy chunks.
- Added public-route checks for third-party font requests, initial meeting/admin chunks, and horizontal
  overflow on desktop and Pixel 5 viewports.
- Added lazy loading for below-the-fold public images and retained compressed brand/founder assets.
- Kept axe coverage for public routes and authenticated booking/cancellation surfaces.

## Verification

| Command | Result | Evidence |
| --- | --- | --- |
| `npm run lint` | Passed | ESLint completed without errors. |
| `npm run test:unit` | Passed | Six timing/cache tests passed. |
| `npm run build` | Passed | Vite build passed and the 180 kB gzipped budget check passed. |
| `npm run check:env-examples` | Passed | Three environment examples passed validation. |
| `npm run test:e2e` | 56 passed, 14 credential-gated tests skipped | Public navigation, axe, initial-chunk, font-request, and overflow checks passed for desktop and Pixel 5. |
| `CI=1 npm run test:e2e:authenticated` | 14 passed | Authenticated booking, refresh/current-route behavior, cancellation, history, cancellation-window denial, focused meeting layout, and denied meeting admission passed on Chromium and Pixel 5. |
| `npm run test:db:rls` | Passed | Appointment relationship/projection allow-deny checks and protected role denial passed. |
| `npm run test:db:booking` | Passed | Idempotent retry and concurrent single-winner booking checks passed. |
| `npm run test:db:cancellation` | Passed | Ownership, 24-hour denial, successful cancellation, idempotency, slot reopening, and audit checks passed. |
| `npm run test:db:phase2` | Passed | Full three-role RLS CRUD matrix, activation gating, protected notes, audited reads, and append-only audit denial passed. |

## Remaining acceptance evidence

- The five-account owner walkthrough is intentionally deferred to
  [deferred post-development work](../engineering/phases/deferredpostdevelopment.md).

No production release, real-user pilot, analytics, or policy approval is implied by this audit.
