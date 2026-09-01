# Supabase Demo Foundation Audit

**Date:** 2026-08-28
**Scope:** Non-production, synthetic-data-only foundation for Orion's five-account owner demo.

## Completed ✅

- Created and linked the dedicated Orion Supabase project; the Codex MCP connection is scoped only to
  that project and remains separate from other local Supabase projects.
- Added local Supabase configuration, an ignored local-secret pattern, and a value-free `.env.example`.
- Applied the following forward migrations and aligned their local filenames with remote history:
  - `20260830084121_demo_identity_and_scheduling`
  - `20260830084159_harden_demo_schema`
- Created the non-production foundation: `profiles`, `psychiatrists`, `availability_slots`,
  `appointments`, and `audit_events`; the application roles are `patient`, `psychiatrist`, and
  `admin` only.
- Added 45-minute checks, slot-overlap prevention, appointment idempotency, foreign keys, RLS,
  least-privilege grants, and protected role assignment.
- Verified the remote migration history, table/RLS state, policies, overlap constraint, and extension
  placement. Supabase's security advisor returned no findings.

## Frontend authorisation direction

CASL is approved for the future React identity slice as a single, in-memory UI permission mirror. It
will be derived from the role held in `profiles` after Supabase authentication. It must not be used as
a security boundary: RLS remains authoritative for reads and server-side functions remain
authoritative for privileged writes. CASL is documented, but no package, client integration, or CASL
ability has been implemented yet.

## Not completed

- The five synthetic Supabase Auth accounts and their seed slots have not been provisioned.
- The React app still has mock email-derived roles, dummy tokens, and prototype route behaviour.
- No Supabase client, CASL ability, route guards, booking/cancellation function, video boundary, or
  end-to-end/RLS allow-and-deny test suite exists yet.
- No secretary role, real identity, real clinical data, or production configuration was created.

## Follow-up

The next implementation action is secure provisioning of the five synthetic accounts, followed by
the demo's real-auth and role-aware-navigation slice. Use the live status tracker rather than this
historical entry to choose the next task: [implementation status](../engineering/implementation-status.md).

## Authority and limitations

This audit records evidence; it does not close the demo milestone, Phase 1, Phase 2, or any production
gate. Current requirements remain in the [knowledge base](../README.md), and Supabase connection
details remain in [Supabase integration](../engineering/supabase.md).
