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

The obsolete Redux/Axios mock-auth stack was removed with the active token-persistence path. The final
production dependency audit has no critical findings, but still reports two high-severity findings in
the pre-existing `react-router-dom` dependency chain. Upgrade and regression-test React Router in a
separate dependency-maintenance change before any release.

## Remaining work

D3 must implement one database-backed scheduling workflow and replace the current placeholder routes.
Booking/cancellation transactions, video access, complete RLS allow/deny tests, and all real-user
controls remain unimplemented. This record does not authorise real accounts, real appointments, or a
production release.
