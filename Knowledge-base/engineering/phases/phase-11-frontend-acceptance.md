# Phase 11 — Frontend Performance and Acceptance

## Outcome

The consolidated frontend passes functional, accessibility, responsive, privacy-safe-demo, and
performance acceptance and is ready for the deferred five-account owner walkthrough. This does not
resolve the application-wide privacy, clinical, legal, business, or operational decisions required
for a controlled pilot.

## Current State

- Functional lint/build/unit/public Playwright checks pass, but the build emits a 500 kB chunk warning.
- Public images include individual 0.5–2 MB assets and the global stylesheet requests Google Fonts.
- Tests do not enforce visual layout, accessibility semantics, cache isolation, or a bundle budget.
- Page metadata still uses the Vite starter title and favicon.

## Non-Goals

- No production release, real-user pilot approval, new feature scope, analytics, SEO campaign, or
  production video decision.

## Decisions Needed

- Approve the final synthetic-demo navigation, brand assets, and owner-walkthrough script.
- Set pragmatic budgets for initial JavaScript, route chunks, and critical images after Phase 8–10 output
  is measured.

## Architecture Plan

- Route-level code splitting for substantial screens, especially meeting/video.
- Responsive, modern image variants and lazy loading below the fold.
- Prefer a system/self-hosted font stack unless Google Fonts is explicitly approved as a vendor request.
- Add automated checks only where they protect a named regression; avoid snapshot noise.

## Data Model Impact

None beyond the Phase 9 safe appointment projection already verified.

## API And Server Plan

No new APIs. Re-run all relevant Edge Function and RLS checks against synthetic fixtures.

## UI/UX Plan

- Verify every active surface at desktop and Pixel 5 sizes: login, account, booking, appointments,
  cancellation confirmation/denial, meeting loading/preflight/call/denial, admin placeholder, and 404.
- Check loading, empty, error, retry, disabled, success, keyboard, and reduced-motion behavior.
- Replace starter metadata and ensure only approved public copy and destinations remain.

## Security, Privacy, And Abuse Controls

- Synthetic data only in screenshots, traces, videos, and reports.
- No persistent protected query cache, tokens in logs, or third-party analytics/fonts without approval.
- Re-run cross-role cache, RLS, and meeting admission denials.

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
5. Conduct the owner walkthrough only after frontend acceptance passes.

Likely areas: `index.html`, assets, route configuration, Playwright suites/configuration, unit tests,
QA documentation, implementation status, and audit trail.

## Verification Plan

- `npm run lint`, `npm run build`, `npm run test:unit`, public/authenticated Playwright, booking,
  cancellation, RLS, and meeting-access checks all pass.
- No critical/high accessibility issue in active routes.
- No header/footer/modal overlap at required viewports and zoom levels.
- Non-meeting initial bundle excludes JaaS; measured budgets pass.
- Manual five-account walkthrough covers patient booking/cancellation, psychiatrist patient identity,
  automatic join availability, two-party call, leave/re-entry, and deny paths.

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
