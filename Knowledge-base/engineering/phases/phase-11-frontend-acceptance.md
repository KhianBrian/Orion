# Phase 11 — Frontend Performance and Acceptance

## Outcome

Phase 11 is complete for automated implementation and acceptance. The frontend passes functional,
accessibility, responsive, privacy-safe-demo, performance, Playwright, RLS, and database verification.
The five-account owner walkthrough and real two-party video check are intentionally deferred. This does
not resolve the application-wide privacy, clinical, legal, business, or operational decisions required
for a controlled pilot.

## Current State

- Functional lint/build/unit/public Playwright checks pass. The initial non-meeting JavaScript bundle is
  guarded at 180 kB gzipped; the current build is approximately 166 kB gzipped.
- Public images are compressed, fonts are self-hosted, and below-the-fold images use lazy loading.
- Public accessibility, initial-chunk, third-party-request, and horizontal-overflow checks are automated.
  Authenticated browser acceptance passes against the configured synthetic Supabase environment;
  direct RLS/database checks also pass, including booking, cancellation, and the Phase 2 authorization
  matrix. Automated meeting-route and denied-admission checks pass; the real two-party provider check is
  deferred.
- Page title, theme color, and favicon use Orion metadata.

## Non-Goals

- No production release, real-user pilot approval, new feature scope, analytics, SEO campaign, or
  production video decision.

## Decisions Needed

- Approve the final synthetic-demo navigation, brand assets, and owner-walkthrough script. **Resolved
  10 September 2026:** the existing implemented routes, branding, and five-account test suite serve as
  the approved demo; no new design work was commissioned.
- Set pragmatic budgets for initial JavaScript, route chunks, and critical images after Phase 8–10 output
  is measured. **Resolved 10 September 2026:** budget is expressed as gzipped transfer size, not the
  raw Vite chunk-size warning. Measured non-meeting initial bundle is ~166 kB gzipped; the `Jitsi`
  meeting route and the admin route are excluded from it via `React.lazy`. Video/admin routes may load
  independently. Shrinking the shared vendor bundle further would mean removing or replacing a core
  dependency (React Router, Supabase client, React Query, CASL, or react-toastify) and needs its own
  architecture decision — not part of this budget.
- **Recorded 10 September 2026:** added `@axe-core/playwright` as a devDependency (test-only, no
  production/runtime impact) to satisfy this phase's own "no critical/high accessibility issue"
  verification requirement with an automated WCAG scan, per the minimal-implementation-ladder — no
  existing installed dependency or plain-platform approach provides this.

## Architecture Plan

- Route-level code splitting for substantial screens, especially meeting/video.
- Responsive, modern image variants and lazy loading below the fold.
- Prefer a system/self-hosted font stack unless Google Fonts is explicitly approved as a vendor request.
- Add automated checks only where they protect a named regression; avoid snapshot noise.

## Data Model Impact

None beyond the Phase 9 safe appointment projection already verified.

## API And Server Plan

No new APIs. Relevant Edge Function and RLS checks passed against synthetic fixtures.

## UI/UX Plan

- Verify every active surface at desktop and Pixel 5 sizes: login, account, booking, appointments,
  cancellation confirmation/denial, meeting loading/preflight/call/denial, admin placeholder, and 404.
- Check loading, empty, error, retry, disabled, success, keyboard, and reduced-motion behavior.
- Replace starter metadata and ensure only approved public copy and destinations remain.

## Security, Privacy, And Abuse Controls

- Synthetic data only in screenshots, traces, videos, and reports.
- No persistent protected query cache, tokens in logs, or third-party analytics/fonts without approval.
- Automated cross-role cache, RLS, and meeting-admission denial checks pass; the real two-party provider
  check is deferred.

## Quotas, Billing, Or Entitlements

None.

## Observability And Analytics

Use build output, test results, and local accessibility/performance reports. Do not introduce product
analytics during frontend acceptance.

## Implementation Slices

1. Optimize images, fonts, metadata, and route chunks.
2. Add focused accessibility and layout-regression checks for the defects fixed in Phase 7–10.
3. Add cache isolation, refresh persistence, clock-boundary, dialog, and meeting-overlay test coverage.
4. Run the full synthetic verification matrix and fix regressions.
5. Defer the owner walkthrough and real two-party provider check to
   [deferred post-development work](deferredpostdevelopment.md).

Likely areas: `index.html`, assets, route configuration, Playwright suites/configuration, unit tests,
QA documentation, implementation status, and audit trail.

## Verification Plan

- `npm run lint`, `npm run build`, `npm run test:unit`, public/authenticated Playwright, booking,
  cancellation, RLS, and database authorization checks all pass.
- No critical/high accessibility issue in active routes.
- No header/footer/modal overlap at required viewports and zoom levels.
- Non-meeting initial bundle excludes JaaS; measured budgets pass.
- Manual five-account walkthrough is deferred to [deferred post-development work](deferredpostdevelopment.md).

The browser session is intentionally retained in `sessionStorage` by Supabase Auth, so a refresh keeps
the user on the current route without persisting appointment or query data. Cross-browser and
post-browser-close session policy remains a separate production security decision.

## Rollout And Fallback

Keep each Phase 7–10 slice independently revertible. The walkthrough is a showcase, not permission for real
users; a failed acceptance check returns work to the owning D-phase without weakening tests.

## Documentation And Audit Updates

- Update the phase index and implementation tracker to distinguish completed demo implementation
  slices from application-wide policy/business readiness and pilot gates.
- Add a Phase 11 frontend acceptance audit with exact commands, results, remaining limitations, and owner
  walkthrough disposition.
- Update QA documentation with the final route/state matrix.

## Open Questions

- Production accessibility review ownership, brand approval, and real-launch performance targets remain
  part of the controlled-pilot program.
