# Phase 3 identity implementation and closure audit — 12 September 2026

## Scope

This audit closes the Phase 3 identity replacement against the linked synthetic non-production
Supabase project. It covers patient Auth registration and recovery, email confirmation routes,
admin-only psychiatrist provisioning, role-aware routing, and the server-side email-confirmation
booking boundary. Consent capture, R1.2 eligibility/guardian behavior, and MFA remain deferred to
their owning phases. Prototype cleanup is recorded in
  [deferredpostdevelopment.md](../engineering/phases/deferredpostdevelopment.md). Hosted SMTP
  customization and full email-consuming hosted Auth testing are intentionally post-development work.

## Code-review findings and corrections

- The booking Edge Function authenticated the caller but did not independently check
  `email_confirmed_at`. It now rejects unconfirmed users before the service-role booking transaction.
- The admin invitation path would have accepted the invitation and sent the user directly into the
  app without a password setup step. Invitations now return to the confirmation route and then to the
  authenticated password-update screen.
- The first no-email provisioning run found that a request-GUC role check rejected a legitimate
  service-role RPC call. The check was removed in a forward migration; execute permission remains
  restricted to `service_role` and the admin actor check remains mandatory.
- The next run found that the RPC's returned `profile_id` name made `ON CONFLICT (profile_id)`
  ambiguous. The upsert now targets the table's unique constraint explicitly.
- The shared `Button` component spread props after its computed `disabled` value, so `busy` did not
  reliably disable submit actions. The ordering is corrected.
- The browser Supabase client now keeps sessions in memory by default. Session storage is available
  only when the explicitly named synthetic-demo persistence flag is enabled.
- Patient Auth-created profiles are fixed to the `patient` role by the database trigger. The
  psychiatrist provisioning function is service-role-only and requires an admin actor profile.
- No psychiatrist approval, pending state, approval UI, or approval tests were added. New psychiatrist
  records are trusted immediately; `is_active` remains the visibility/bookability switch.

## Implemented

- Added migration `20260910142221_phase3_identity_auth_boundaries.sql`.
- Added forward-only provisioning fixes `20260910145812_phase3_provisioning_service_role_fix.sql`
  and `20260910145906_phase3_provisioning_conflict_fix.sql`.
- Deployed `provision-psychiatrist` and the updated `book-appointment` Edge Functions.
- Added registration, confirmation, password recovery, and password reset routes.
- Added the protected admin psychiatrist-provisioning screen and safe error messages.
- Added public route checks for registration, recovery, confirmation, reset, and unauthenticated
  access to the admin route.
- Added the Orion-themed local confirmation email with a one-time code and link fallback, plus
  polished auth-page controls including password visibility toggles.
- Updated Phase 3 and Supabase engineering documentation with the as-built boundary and quota-aware
  live-testing plan.

## Verification passed

- ESLint.
- Unit tests: 6 passed.
- Environment-example checks.
- Vite production build; only the existing large-chunk warning remains.
- Public Playwright checks: 9 passed.
- Phase 2 database/RLS matrix: passed.
- Database booking checks: idempotent retry and concurrent single-winner booking passed.
- Phase 3 no-email Auth checks: generated signup/invite/recovery links, fixed patient role, confirmed
  fixture sign-in, and immediate admin psychiatrist provisioning passed.
- Local Auth email capture was started and verified through Mailpit with signup enabled, redirect
  wildcards, a local-only high email limit, and the Orion confirmation template. Manual local testing
  confirmed account creation, email receipt, code/link confirmation, session creation, and the
  same-tab code flow.
- Linked migration history is synchronized through `20260910145906`.
- Supabase security advisor: no new finding from the Phase 3 function; existing warnings remain for
  the intentional appointment projection, OTP expiry configuration, and disabled leaked-password
  protection.
- No-credential requests to both deployed identity functions return HTTP 401.
- An authenticated synthetic patient attempting psychiatrist provisioning returns HTTP 403, without
  sending an email.

## Mailpit QA procedure and evidence

The local email test was performed as follows:

1. Install and start Docker Desktop because the Supabase CLI local stack requires a Docker-compatible
   runtime.
2. Run `supabase start` from the repository root and confirm the local API, Auth, database, and
   Mailpit services start successfully.
3. Confirm Mailpit is reachable at `http://localhost:54324` and use the local project values for the
   Orion app URL and publishable key. The local service key stayed server-side and was not placed in
   the browser environment.
4. Start the Orion app locally, create a synthetic patient account, and leave the Orion confirmation
   page open.
5. Open Mailpit, locate the confirmation message, and verify that the message is captured locally
   rather than sent to an external inbox.
6. Verify the confirmation content: Orion branding, six-digit `{{ .Token }}` code, expiration
   guidance, and the `{{ .ConfirmationURL }}` link fallback.
7. Verify the link path reaches Orion's confirmation callback and establishes the session. The first
   link check showed that Mailpit/browser link handling may open a new tab; this is expected client
   behavior and is why the code path is the recommended same-tab experience.
8. Verify the code path by returning to the original Orion tab, entering the captured code, and
   confirming that the account is authenticated and redirected to `/app` in that same tab.

This procedure uses only local synthetic data. Mailpit does not deliver messages externally and does
not consume the hosted Supabase project's two-email-per-hour allowance. The local stack was restarted
after the template configuration changed, and the final UI/build checks passed. Hosted SMTP setup and
the full email-consuming hosted Auth repetition remain intentionally deferred in
[deferredpostdevelopment.md](../engineering/phases/deferredpostdevelopment.md).

## Closure decision and post-development scope

Phase 3 is closed for the current synthetic implementation scope. The hosted project's default email
provider does not permit custom templates, so custom SMTP and branded hosted email templates are
deferred. The complete email-consuming hosted Auth suite is also deferred until that infrastructure
is available. See the official [password Auth documentation](https://supabase.com/docs/guides/auth/passwords)
and [rate-limit documentation](https://supabase.com/docs/guides/auth/rate-limits).

Post-development testing must use only synthetic accounts, an owner-controlled test inbox, and
allowlisted redirect URLs. It must cover registration, code/link confirmation, sign-in, recovery,
resend, route guards, admin-only provisioning, role boundaries, unconfirmed booking rejection, and
browser-storage inspection. The deferred scope is recorded in
[deferredpostdevelopment.md](../engineering/phases/deferredpostdevelopment.md).
