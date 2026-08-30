# QA and Playwright

## Purpose

Playwright is Orion's end-to-end QA tool. It verifies real browser behavior: routes render, controls can be used, links lead to the right place, role boundaries hold, and critical patient and psychiatrist journeys work from start to finish.

It reduces regressions; it cannot honestly guarantee that software is bug-free. Reliability comes from combining Playwright browser tests with linting, builds, database/RLS tests, review, and controlled-pilot verification. Read [test strategy and test-data policy](test-strategy-and-test-data-policy.md) before creating fixtures or storing artifacts.

## Test layers

| Layer | Tool | Protects |
| --- | --- | --- |
| Static quality | ESLint and Vite build | Syntax, imports, common React problems, production build viability |
| Unit tests | Add with pure domain helpers | Time calculations, validation, formatting, permission-display helpers |
| Database authorization | Supabase RLS tests | Allow and deny access at the actual data boundary |
| End-to-end QA | Playwright | Routes, clicks, forms, navigation, role journeys, booking, cancellation, meeting access |

No one layer replaces another. A passing browser test does not prove RLS is secure; a passing RLS test does not prove a patient can use the screen.

## Playwright baseline

The app uses `@playwright/test` with Chromium and a Pixel 5 mobile viewport. Playwright starts Vite automatically for local tests, captures a trace, screenshot, and video only when a test fails, and creates an HTML report. The current public-navigation suite is prototype smoke coverage only; it is not real authentication or production-release evidence.

```text
npm run test:e2e
npm run test:e2e:ui
npm run test:e2e:report
```

Run `npx playwright install chromium` after a fresh dependency install when the browser binary is absent.

## Test ownership and structure

```text
tests/e2e/
  public-navigation.spec.js
  auth.spec.js
  patient-booking.spec.js
  psychiatrist-sessions.spec.js
  authorization.spec.js
  cancellation.spec.js
  meeting-access.spec.js
playwright/
  fixtures/          reusable role-aware browser fixtures
  .auth/             ignored authenticated states; never commit
```

Keep tests organized by user journey, not implementation file. Use accessible locators such as `getByRole`, `getByLabel`, and `getByText`; do not rely on CSS layout selectors, generated class names, or arbitrary timeouts.

## Required coverage

Every new or changed route requires:

- A direct-route render test.
- Its visible primary actions and failure/empty/loading state where applicable.
- At least one real user click path entering or leaving the route.
- Desktop and mobile coverage when the flow is patient-facing.

Every sensitive feature requires an end-to-end allow and deny path:

| Feature | Allow path | Deny path |
| --- | --- | --- |
| Authentication | Patient can sign in | Invalid credentials show a safe message |
| Patient routes | Patient can reach own appointments | Unauthenticated visitor is redirected; psychiatrist cannot use patient booking |
| Psychiatrist routes | Psychiatrist sees assigned sessions | Patient cannot access psychiatrist calendar |
| Booking | Patient books an open slot | A second simultaneous booking loses cleanly |
| Cancellation | Patient cancels more than 24 hours ahead | Cancellation inside 24 hours is blocked |
| Meeting access | Assigned patient/psychiatrist joins in window | Unrelated user and out-of-window request are blocked |
| Admin | Admin provisions approved data | Non-admin cannot invoke admin action |

## Test data and authentication

Do not share one mutable account between parallel booking tests. Supabase integration must provide isolated, non-production test users and deterministic appointment/slot seed data for each worker or test run.

Authenticated Playwright state belongs in `playwright/.auth/`, is ignored by Git, and may contain credentials. Never commit it. Use separate patient, psychiatrist, and admin fixtures when tests need roles to interact in one scenario.

## Failure handling

- A failed test is a release blocker for its changed or critical flow.
- Inspect the HTML report and Playwright trace before retrying or changing selectors.
- Fix the product or test only after identifying the cause; do not mask a failure with arbitrary waits, retries, or `force` clicks.
- Quarantine a flaky test only with a dated audit-trail entry, named owner, root-cause hypothesis, and removal deadline.

## Delivery gates

- Before handoff: run relevant Playwright tests, `npm run lint`, and `npm run build`.
- Before merging/deploying: run the critical desktop Chromium suite.
- Before controlled pilot: run the full desktop and mobile suite, database/RLS tests, and a two-role booking scenario in separate browser contexts.
