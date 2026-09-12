# Phase 14 psychiatrist-managed availability audit — 2026-09-13

## Scope

Implemented on branch `codex/phase-14-availability` in worktree `../Orion-phase-14`, including the completed Phase 4 workflow as its scheduling foundation.

## Evidence

- Migration `20260912185905_phase14_doctor_managed_availability.sql` adds weekday rules, Manila-local one-off overrides, outside-hours approval, derived 15-minute-grid/45-minute candidates, two-week horizon enforcement, booked-appointment conflict blocking, default schedule seeding, and raw availability table protection.
- `manage-schedule` is the server-authorized Edge Function for clinician schedule changes and admin read-only schedule visibility.
- Patient booking uses the server availability projection and retains the Phase 4 booking transaction; no competing booking path was added.
- Clinician schedule and admin overview pages use the existing Orion theme and responsive layout tokens.
- `npm run lint`, `npm run test:unit`, `npm run build`, `npm run check:env-examples`, and the default Playwright suite were run. Frontend checks passed; the Playwright suite had eight existing public-auth failures because Supabase environment variables are unavailable, while the remaining tests passed or were intentionally skipped.

## Release-gate limitations

The remote Supabase project was not accessible to this workspace and local Supabase could not connect to Docker. Applying the migration, executing DB/RLS scripts, deploying Edge Functions, and running credentialed desktop/mobile booking and schedule scenarios remain required before release.
