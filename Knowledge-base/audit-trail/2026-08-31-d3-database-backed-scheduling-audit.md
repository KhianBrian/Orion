# D3 database-backed scheduling verification — 31 August 2026

## Scope completed

- Removed the duplicate `DoctorAvailability` route and mock UI. The only booking route is the patient-facing database-backed workflow.
- Added and deployed the `book-appointment` Edge Function and forward-only migrations.
- The booking transaction locks the slot, derives times from that slot, enforces idempotency and overlap rules, marks the slot booked, and records an audit event.
- Tightened the transaction boundary after the security advisor identified a callable `SECURITY DEFINER` RPC. The browser can now call only the JWT-protected Edge Function; the service-role transaction RPC is not executable by `anon` or `authenticated`.
- Added patient and assigned-psychiatrist appointment views. RLS, not browser filtering, scopes appointment reads. Times display in `Asia/Manila` and persist as `timestamptz`.

## Fresh verification evidence

- Remote migration history includes `20260831090000_add_server_authoritative_booking` and `20260831093502_restrict_booking_rpc_to_edge_function`.
- The deployed `book-appointment` Edge Function is active with JWT verification enabled.
- Live synthetic-data checks confirmed two active psychiatrists and two initially open slots; booking succeeds, an identical idempotency retry returns one original appointment, a competing request receives the generic `slot_unavailable` code, and concurrent attempts create exactly one appointment for their target slot.
- RLS checks confirmed an assigned psychiatrist can read the assigned appointment, the other psychiatrist cannot read that appointment, and the admin sees no unrestricted appointments.
- `npm run lint`, `npm run build`, and the full baseline Playwright suite passed (8 passed; 2 credential-gated scheduling tests skipped). The real authenticated scheduling journey passed in both Chromium desktop and Pixel 5 mobile runs.
- Supabase performance advisor returned no warnings. The security advisor no longer reports a callable authenticated `SECURITY DEFINER` booking function.

## Remaining operational item

Hosted Auth leaked-password protection remains disabled because this project is intentionally staying on Supabase Free for synthetic testing; the setting is available only on paid plans. Revisit it before broader password-account use or a paid-plan transition. No real-user onboarding or production work is authorised while the outstanding governance decisions remain unresolved.

All exercised records are synthetic and remain within the non-production Orion project.
