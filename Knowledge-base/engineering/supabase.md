# Supabase integration

## Status

**Applied and verified ✅ — 30 August 2026.** Orion uses a dedicated, hosted non-production Supabase
project in Sydney (`ap-southeast-2`). It is limited to synthetic demo work and is not a production
environment or an approval to process real health information.

## Scoped connection

The Codex desktop app is connected through a distinct OAuth MCP entry named `supabase-orion`, scoped
only to Orion's project reference `oanmjzynckycvvgnzlwk`. It is separate from the existing company
Supabase MCP connection, so Orion database work does not select, alter, or reuse another local
project.

The connection was added with a project-scoped MCP URL and completed through the browser OAuth flow:

```sh
codex mcp add supabase-orion --url 'https://mcp.supabase.com/mcp?project_ref=oanmjzynckycvvgnzlwk&features=docs%2Caccount%2Cdatabase%2Cdebugging%2Cdevelopment%2Cfunctions%2Cbranching'
```

After authentication and a Codex refresh, database tools run through `supabase-orion`. They are the
normal path for AI-assisted Orion database work; do not replace the company-scoped MCP entry.

The local Supabase CLI profile `orion` is also linked to this repository's project. CLI profiles keep
account sessions separate, while the repository's `supabase/` directory keeps Orion's local migration
configuration separate from other projects. Tokens and credentials are never written to commands,
documentation, source files, or Git.

## Applied migrations

| Remote version | Local migration | Outcome |
| --- | --- | --- |
| `20260830084121` | [`demo_identity_and_scheduling.sql`](../../supabase/migrations/20260830084121_demo_identity_and_scheduling.sql) | Creates the initial three-role schema, RLS, least-privilege grants, 45-minute checks, appointment idempotency, and slot-overlap prevention. |
| `20260830084159` | [`harden_demo_schema.sql`](../../supabase/migrations/20260830084159_harden_demo_schema.sql) | Explicitly denies client audit-log reads and moves `btree_gist` from `public` to `extensions`. |
| `20260831090000` | [`add_server_authoritative_booking.sql`](../../supabase/migrations/20260831090000_add_server_authoritative_booking.sql) | Adds the locked, idempotent booking transaction, an active-appointment overlap constraint, and audit-event write. |
| `20260831093502` | [`restrict_booking_rpc_to_edge_function.sql`](../../supabase/migrations/20260831093502_restrict_booking_rpc_to_edge_function.sql) | Restricts the privileged booking transaction to the Edge Function service role after the security advisor identified the direct authenticated-RPC surface. |
| `20260831123836` | [`patient_appointment_cancellation.sql`](../../supabase/migrations/20260831123836_patient_appointment_cancellation.sql) | Adds the service-role-only patient cancellation transaction, cancellation idempotency, slot reopening, and cancellation audit event. |

The local filenames intentionally match the remote migration history. Never edit either migration after
application; create a new forward migration for every correction.

## Verification performed

- Confirmed the target's public schema and migration history were empty before applying changes.
- Confirmed all five public tables have RLS enabled.
- Confirmed the expected policies, audit-log deny policy, and slot-overlap constraint exist.
- Ran Supabase security and performance advisors after schema application. Security returned no
  findings at that point. After account provisioning, the security advisor reports one hosted-Auth
  configuration warning: leaked-password protection is disabled. This must be enabled before any
  broader use of password authentication.
- Performance reports only unused-index informational notices, which are expected while the new
  database has no demo records.

## Security and operating rules

- Only project URL and a publishable key may reach browser configuration. A service-role key, database
  password, access token, or demo password must never be committed, pasted into chat, or exposed as a
  `VITE_*` variable.
- Store local-only provisioning credentials in the ignored `.env`; use the committed `.env.example` as
  the variable-name template.
- Before any future schema change, inspect the live tables and migration history, use a new timestamped
  local migration, apply it only to the Orion-scoped project, and rerun security advisors.
- Keep the demo synthetic and disposable. Production provisioning, real data, retention, vendor
  approval, and operational controls remain blocked by the relevant governance decisions.

## Current boundary

The database has exactly five synthetic confirmed Auth identities and matching server-side profiles:
two patients, two active psychiatrists, and one admin. The React client uses a single browser-safe
Supabase client for in-memory email/password sessions and retrieves roles from `profiles`; it does
not persist tokens in Redux or browser storage. D3 is deployed: the patient booking page reads RLS-
scoped availability, displays Manila time, and invokes a JWT-protected Edge Function. That function
validates the caller, then invokes a service-role-only database transaction that locks the slot,
derives timestamps server-side, writes the appointment and audit event, and marks the slot booked.
Patient and assigned-psychiatrist appointment reads are RLS-scoped. Patient cancellation is now
deployed through the JWT-protected `cancel-appointment` Edge Function and verified with synthetic
database and browser tests. Video admission and production configuration remain future work. Hosted Auth leaked-password protection is still
disabled because this project remains on Supabase Free; revisit it before broader password-account
use or a paid-plan transition.
