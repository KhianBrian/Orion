# Real Demo Identity Audit

**Date:** 2026-08-30
**Scope:** React D2 implementation against Orion's five synthetic demo accounts.

## Completed ✅

- Added one browser-safe Supabase client configured only with `VITE_SUPABASE_URL` and the project's
  publishable key. No service-role key, demo password, or other secret is browser-accessible.
- Configured sessions in memory (`persistSession: false`); the app no longer persists authentication
  tokens through Redux or browser storage.
- Replaced mock email-derived roles and dummy tokens with Supabase email/password sign-in followed by
  a read of the authenticated user's server-side `profiles` row.
- Added one CASL ability for navigation presentation and shared authentication/ability route guards.
  CASL is not an authorization boundary; Supabase RLS remains authoritative.
- Added patient, psychiatrist, and admin navigation paths that correspond to their server-held role.
  The protected scheduling areas deliberately show placeholders until D3 supplies their database-backed
  workflow; legacy mock pages are no longer routed.
- Verified browser sign-in, role-aware navigation, and sign-out for a synthetic patient, psychiatrist,
  and admin. Lint, Playwright public/auth-denial coverage, and the production build passed.

## Dependency follow-up

The obsolete Redux/Axios mock-auth stack was removed with the active token-persistence path. On
2026-08-31, React Router was upgraded from 7.11.0 to 7.18.3 in a narrowly scoped dependency-maintenance
change. `npm audit --omit=dev --audit-level=high` returned zero vulnerabilities afterward; the protected
route return and authorization-denial behaviours were regression-tested in the browser.

## Remaining work

D3 must implement one database-backed scheduling workflow and replace the current placeholder routes.
Booking/cancellation transactions, video access, complete RLS allow/deny tests, and all real-user
controls remain unimplemented. This record does not authorise real accounts, real appointments, or a
production release.
