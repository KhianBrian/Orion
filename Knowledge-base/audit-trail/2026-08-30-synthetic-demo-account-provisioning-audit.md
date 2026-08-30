# Synthetic Demo-Account Provisioning Audit

**Date:** 2026-08-30
**Scope:** Orion's dedicated non-production Supabase project; synthetic data only.

## Verified result ✅

- Remote migration history remains exactly:
  - `20260830084121_demo_identity_and_scheduling`
  - `20260830084159_harden_demo_schema`
- The Supabase security advisor returned no findings before provisioning.
- Exactly five confirmed email/password Auth identities and matching `profiles` rows exist:
  - 1 admin
  - 2 patients
  - 2 psychiatrists
- Server-side role counts are exactly `admin: 1`, `patient: 2`, and `psychiatrist: 2`.
- Both psychiatrist records are active. Each has one synthetic `open` availability slot, and both
  slots satisfy the required 45-minute duration.
- All five accounts completed an email/password sign-in verification.
- No secretary profile, real identity, clinical data, appointment, or production configuration was
  created.

## Security-advisor follow-up

The final security-advisor run reported one Auth configuration warning: leaked-password protection is
disabled. It does not affect the verified synthetic-account counts, roles, or slot constraints, and
the generated demo passwords are high-entropy. Enable the hosted Auth setting before broader password
authentication use; this setting is not available through the Orion-scoped MCP tools.

## Credential handling and provisioning method

Generated demo passwords and the project URL were retained only in `Orion_React_App/.env`, which is
ignored by Git. No secret was placed in a `VITE_*` variable, source file, migration, or this record.

The normal service-role provisioner could not be used because the local Orion CLI profile could not
retrieve its service credential. The reserved `.invalid` demo domain was also correctly rejected by
the public self-sign-up endpoint. Provisioning therefore used the existing Orion-scoped MCP database
connection to create confirmed synthetic Auth identities, then populated the existing server-side
profile, psychiatrist, availability, and audit structures. No schema change or migration was made.
The local service-role key remains intentionally absent until it is supplied through the ignored local
environment; when available, the existing idempotent provisioner remains the preferred repeatable
seed path.

## Remaining work

The React prototype still derives roles from email and uses dummy tokens. D2 must replace that mock
identity with Supabase Auth and read role facts from `profiles`. This record does not close the demo
milestone, any delivery phase, or any real-user gate.
