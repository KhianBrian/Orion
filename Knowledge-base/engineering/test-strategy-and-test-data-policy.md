# Test Strategy and Test-Data Policy

## Test data

All local, CI, and staging testing uses synthetic client, psychiatrist, appointment, and consent data. Never use production exports, real credentials, client identities, clinical data, or active provider secrets. Playwright authentication state, screenshots, videos, traces, and reports are restricted, ignored by Git, access-controlled, and retained only as long as necessary.

## Required test layers

- Unit: lifecycle, time boundary, validation, idempotency, redaction, and error mapping.
- Database/RLS: every table/action/role has explicit allow and deny coverage.
- Integration: transactions, slot overlap, concurrent booking, server functions, token issue/denial.
- Playwright: routes, accessible clicks/forms, patient/psychiatrist/admin paths, desktop/mobile flows, and authenticated denial paths.
- Manual controlled checks: camera/microphone preflight and approved video-provider flow; CI stubs video rather than making real calls.

## Release rule

A changed critical flow cannot release with a failing test. Do not hide a failure with arbitrary waits, `force` clicks, extra retries, or test disabling. A temporary quarantine needs an audit-trail entry, owner, cause hypothesis, and removal date.
