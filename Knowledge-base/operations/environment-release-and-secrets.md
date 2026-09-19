# Environments, Release, and Secrets

## Current workstream environment

For the current Phase 18.5 workstream, the existing linked Supabase project is the only database
target. This is an explicit project constraint, not a claim that the project has completed launch
readiness. The website is deployed from verified `main`; the signaling gateway and TURN relay are
separate runtime services. Their endpoints may be public configuration, but their shared secrets
must remain only in server-side secret stores and Supabase Edge Function secrets.

## Environment separation

Use distinct local, test, staging, and production projects/accounts. Production never receives fixtures, test accounts, copied authentication state, or debug configuration. A named owner controls each environment and production access is least-privilege. MFA is deferred for the current launch and tracked as future Phase 12 hardening.

## Secrets

Secrets live in an approved secret manager or provider server configuration—not Git, `.env` committed files, browser variables, Redux, logs, screenshots, or test fixtures. `VITE_*` values are public configuration only. Maintain a committed `.env.example` with variable names but no values. Rotate a potentially exposed secret and record the incident.

## Delivery

- Use reviewed, append-only database migrations with explicit non-destructive rollout/rollback behavior.
- CI runs lint, build, relevant unit/RLS/Playwright tests, dependency and secret scanning.
- Deploy staging before production; perform required migration and smoke checks; approve production release through a named operator.
- A feature flag/kill switch must disable booking or video admission without deleting history.

## Recovery

Define backups, recovery objectives, restoration owner, and a tested restore procedure. A backup that has not been restored in a non-production exercise is not accepted as verified recovery.

Phase 1 evidence templates: [access register](access-register.md) and [non-production restore exercise runbook](restore-exercise-runbook.md).
