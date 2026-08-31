# D4 patient cancellation implementation — 31 August 2026

## Scope completed

- Added a forward-only migration with a patient-scoped cancellation idempotency key and a service-role-only `cancel_appointment_for_patient` transaction.
- The transaction locks appointment then slot, enforces patient ownership, booked state, and the strict `starts_at > server_now + 24 hours` rule, records cancellation facts, reopens a slot only when its psychiatrist remains active, and writes an `appointment_cancelled` audit event.
- Added the JWT-authenticated `cancel-appointment` Edge Function with UUID validation and generic safe denial mapping. No service-role credential or direct transaction call is exposed to the browser.
- Added patient-only cancellation confirmation and retry behavior to the appointments page. Psychiatrist appointment views remain read-only.
- Added credential-gated Playwright coverage for the patient cancellation journey.
- Made Playwright load the ignored `.env` automatically and fail loudly when explicitly enabled without required credentials.
- Added a synthetic-fixture database cancellation test command covering ownership, boundary denial, idempotency, concurrency, slot reopening, and audit behavior.

## Fresh verification evidence

- `npm run lint` passed.
- `npm run build` passed; Vite emitted only the existing bundle-size warning.
- `npm run test:e2e` passed with 8 tests and skipped 4 credential-gated tests, including the new cancellation test because demo credentials were not supplied.
- `git diff --check` passed.

## Final verification

- Remote migration `20260831123836` was applied to the Orion synthetic project and the `cancel-appointment` Edge Function was deployed with JWT verification enabled.
- `npm run test:db:cancellation` passed, covering ownership, the 24-hour boundary, success, idempotency, concurrency, slot reopening, and audit behavior.
- `npm run test:e2e:authenticated -- --project=chromium` passed: 2 tests.
- `npm run test:e2e:authenticated -- --project=mobile-chrome` passed: 2 tests.
- `npm run lint`, `npm run build`, and `git diff --check` passed. No real-user data was used.

## Documentation note

The demo milestone labels D4 as the psychiatrist view, while its D3 requirements include patient cancellation. This implementation follows the current tracker/task label D4 and leaves the psychiatrist view read-only.
