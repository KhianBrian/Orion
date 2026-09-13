# Phase 12 — Multi-Factor Authentication and Privileged Access

**Status:** Deferred — not required for the current launch. Retained as a future security-hardening phase.

## Outcome

After entering a password, every role that the owners classify as privileged must prove one more
thing — normally a code from an authenticator app — before Orion lets them use protected features.
This must be enforced by Supabase Auth and the server/database boundary, not just by hiding screens in
the browser.

In plain English: a stolen password alone must not be enough to open a psychiatrist or admin account.
If a privileged user loses their device, the recovery path must be controlled, logged, and must not
silently turn MFA off.

This phase is not a current launch gate. It does not change the five-account synthetic demo or approve
real users, real appointments, payments, or production video. Revisit it before a later security
hardening milestone or if the owners change the launch policy.

## Current State

- Phase 3 provides email/password sign-in, email confirmation, password recovery, invitation-password
  setup, role-aware routes, and admin-only psychiatrist provisioning.
- `AuthProvider` signs in with `supabase.auth.signInWithPassword()`, loads the role from
  `public.profiles`, and marks the user signed in after the profile loads.
- `RequireAuth` and CASL ability checks currently verify login and application role, but do not check
  Supabase's authenticator assurance level (`aal1` versus `aal2`).
- Password recovery and invitation links currently lead into the normal authenticated shell after the
  password is changed; Phase 12 must ensure they cannot become a privileged bypass.
- `ProfileSettings.jsx` contains a non-functional local-state “Two-Factor Authentication” toggle. It
  does not call Supabase and must be replaced with a real security surface or removed.
- The browser Supabase client uses `sessionStorage`, refresh-token rotation, and a one-hour JWT expiry
  in local configuration. Phase 12 must preserve those protections and verify the hosted settings.
- `public.audit_events` already records actor, event code, target, outcome, reason code, correlation ID,
  and timestamp. No MFA-specific event contract exists yet.
- Supabase JS `2.112.4` is already installed. Supabase Auth exposes TOTP enrollment, challenge,
  verification, factor listing, and unenrollment; recovery codes are not currently supported by the
  platform, so device-loss handling must be designed explicitly.

## Non-Goals

- Do not add MFA to patients unless the owners explicitly select that role.
- Do not build passkeys, social login, SMS MFA, custom recovery codes, or a custom authenticator service
  in this phase unless a separate decision expands the scope.
- Do not store TOTP secrets, QR-code payloads, verification codes, challenge IDs, or recovery secrets in
  Orion tables, browser storage, analytics, logs, screenshots, or support tickets.
- Do not let admins read MFA secrets or impersonate a user.
- Do not treat a frontend route guard, a copied link check, or a “MFA enabled” profile flag as the
  security boundary.
- Do not change the appointment, payment, video, consent, retention, or clinical-note policies.

## Decisions Needed Before Coding

These are the only product and operational decisions that should be supplied before implementation.
The recommendations are intended to keep the flow secure and avoid a recovery path that depends on
engineering intervention.

| # | Decision | Recommended default | Why it matters |
| --- | --- | --- | --- |
| 1 | Which roles must use MFA? | Psychiatrist and admin. Patients remain outside MFA for now. | Defines who is blocked at sign-in and which accounts need enrollment. |
| 2 | Which second factor? | Authenticator-app TOTP. Do not make SMS the default. | TOTP does not depend on phone delivery and is supported by Supabase Auth. |
| 3 | When must enrollment happen? | On the first privileged sign-in, before access to the app. Existing privileged accounts enroll at their next sign-in. | Prevents an account from being privileged while still using password-only access. |
| 4 | Should users be able to remember a trusted browser? | No trusted-browser bypass for the pilot; require MFA on each new sign-in. | A remembered browser would weaken the protection if the device is shared or stolen. |
| 5 | Who handles a lost device? | Admin resets a psychiatrist after an identity check; a named owner or second admin handles an admin account. The old factor is removed, sessions are revoked, and enrollment is required again. | Supabase does not provide recovery codes, so the recovery authority must be explicit. |
| 6 | Can users disable or remove MFA themselves? | Only after a current MFA check; privileged-account disablement also requires owner-approved policy and an audit event. | Prevents password-only recovery from becoming a permanent bypass. |
| 7 | What happens after password recovery, invitation acceptance, or role elevation? | Revoke or re-evaluate the session and require MFA before privileged access. No link may skip enrollment or challenge. | These are common bypass paths. |
| 8 | Who may see MFA history? | Admins may see operational metadata only: enrolled, challenged, succeeded, failed, reset, or disabled. Never secrets or codes. | Supports support and audit work while protecting the authentication factor. |

The decisions should be copied into the [pilot decision register](../../product/pilot-decision-register.md)
if this phase is activated. The current launch decision is that MFA remains deferred.

## Architecture Plan

### Authority boundaries

- **Supabase Auth** owns the factor secret, factor status, challenge, and verification result.
- **Browser** starts enrollment and challenge flows, displays safe states, and reads the current AAL.
  It never decides that a role is exempt or that a user has passed MFA.
- **AuthProvider and route guards** keep a password-authenticated privileged user in a pending-MFA
  state until the session reaches the required assurance level.
- **Edge Functions** authenticate the bearer token, identify the role from the server-side profile,
  and reject privileged commands unless the token/session satisfies the MFA policy.
- **Database policies and protected functions** enforce AAL2 for sensitive privileged operations as a
  second line of defence. A browser cannot call a direct table mutation to get around the check.
- **Admin operations** use controlled reset/disable commands, never direct writes to Auth internals or
  direct edits to audit rows.

### Sign-in flow

1. The user submits the existing email and password form.
2. Supabase returns the normal password-authenticated session.
3. Orion loads the server-authoritative profile role and the session's current and next AAL.
4. A patient, or another role explicitly exempted by the decision register, enters the normal app.
5. A privileged user with a verified factor sees the MFA challenge and cannot enter the protected app
   until the code is verified.
6. A privileged user with no verified factor sees enrollment: scan the QR code, enter a one-time code,
   and complete verification before continuing.
7. Wrong, expired, repeated, or unavailable challenges show safe retry/recovery states without exposing
   whether another account exists.

### Recovery and offboarding flow

- A user cannot recover a lost factor by clicking a password-reset link alone.
- The approved support actor starts a reset only after the required identity check and records the
  reason, actor, target, and result in the audit trail.
- Reset removes the old factor through the supported Auth operation, revokes active sessions where
  possible, and marks the target for fresh enrollment.
- A suspended, offboarded, or role-demoted account loses privileged access and has its sessions
  invalidated according to the approved policy.
- If the only admin is locked out, the plan must use the named owner/second-admin route. There is no
  hidden developer backdoor or unlogged database edit.

## Data Model Impact

- Use Supabase Auth's managed MFA factor records. Do not mirror factor secrets into `public` tables.
- Extend the existing audit event vocabulary, not the clinical data model. Candidate event codes are:
  `mfa_enrollment_started`, `mfa_enrollment_succeeded`, `mfa_enrollment_failed`,
  `mfa_challenge_started`, `mfa_challenge_succeeded`, `mfa_challenge_failed`, `mfa_factor_removed`,
  `mfa_reset_requested`, `mfa_reset_completed`, `mfa_disabled`, and `mfa_access_denied`.
- Store only metadata in `audit_events`: actor, target user identifier where permitted, event code,
  success/denied outcome, controlled reason code, correlation ID, and timestamp.
- Never store the TOTP secret, QR image, one-time code, full Auth error, or recovery evidence in the
  audit row.
- Add indexes only if the approved admin audit view needs them. Keep audit rows append-only to
  application roles and preserve the existing admin-only read policy.
- If a dedicated recovery-request record is required, make it minimal, time-limited, access-controlled,
  and free of identity documents or sensitive clinical content. Prefer the existing audit event plus a
  server-side workflow if that is sufficient.

## API And Server Plan

### Client/Auth API surface

Use the supported Supabase Auth MFA methods through the existing client:

- `mfa.listFactors()` to determine whether a verified factor exists.
- `mfa.enroll({ factorType: "totp", friendlyName })` to begin enrollment.
- `mfa.challenge({ factorId })` and `mfa.verify({ factorId, challengeId, code })` to complete
  enrollment or sign-in.
- `mfa.getAuthenticatorAssuranceLevel()` to determine whether the session is still at `aal1` or has
  reached `aal2`.
- `mfa.unenroll({ factorId })` only through the approved removal flow.

All calls must map provider errors to stable, user-safe messages. Do not pass provider error text into
the UI, logs, audit reason fields, or URLs.

### Server enforcement

- Add a shared server-side MFA policy helper for Edge Functions: derive the user from the verified
  bearer token, load the role from `profiles`, determine whether the role requires MFA, and verify the
  token/session assurance before privileged work.
- Apply the policy to provisioning, admin appointment operations, future support operations, and every
  other privileged command that exists by the time this phase is implemented.
- Add restrictive database conditions for privileged paths so an `aal1` token cannot invoke a sensitive
  RPC or use a direct exposed-table route. Keep `service_role` grants narrow and do not use them as a
  reason to skip the caller's MFA check.
- Re-check the role and AAL at command time. Do not trust a browser role, cached profile, local flag,
  or stale JWT claim without refreshing/revalidating where required.
- Keep password recovery and invitation links scoped to the intended password operation; they do not
  grant privileged application access until the normal MFA gate passes.

## UI/UX Plan

### Surfaces

- Replace the placeholder two-factor toggle in `ProfileSettings.jsx` with a real Security/MFA area, or
  remove the settings route if the final navigation does not expose it.
- Add a first-login enrollment screen for selected privileged roles.
- Add a sign-in challenge screen for users who already have a verified factor.
- Add factor-management actions showing friendly factor name and last-known operational status, with
  safe remove/disable confirmation.
- Add a controlled lost-device/recovery request state that tells the user what to do without revealing
  internal support rules or promising an unsafe bypass.
- Add clear signed-out, expired-session, wrong-code, rate-limited, unavailable, and retry states.

### Current Orion visual theme

- Every Phase 12 frontend feature must match the current Orion theme and existing visual language.
- Reuse the existing shared `Button`, `StatusMessage`, `AuthCard`, input, dialog, spacing, color,
  typography, border, radius, focus, busy, disabled, and responsive patterns before creating a new
  component or style.
- Do not introduce a new font, palette, icon style, toggle style, or one-off MFA layout. If MFA needs a
  new pattern, add it to the shared UI layer so it can be reused elsewhere.
- Review login, enrollment, challenge, recovery, and settings surfaces at desktop and mobile widths.
  They must preserve readable contrast, keyboard focus, touch target size, and no horizontal overflow.
- QR display must be treated as sensitive temporary UI: do not place it in URLs, screenshots, analytics,
  or persistent browser storage, and clear it when the enrollment flow ends.

## Security, Privacy, And Abuse Controls

- Require MFA for the selected privileged roles at the server/database boundary, not only in React.
- Never use `user_metadata` or a browser-controlled profile field to decide role or MFA requirement.
- Use server-derived role data and Supabase Auth assurance information; account for stale JWT claims by
  refreshing/revalidating before sensitive operations.
- Rate-limit challenge and recovery attempts using Supabase Auth settings and any needed application
  boundary. Do not create an unlimited code-guessing loop.
- Use generic denial messages that do not reveal whether an email, factor, or privileged account exists.
- On factor removal, role demotion, offboarding, or approved recovery, invalidate sessions as required
  and force fresh MFA enrollment.
- Never log codes, secrets, QR payloads, recovery evidence, clinical content, or full provider errors.
- Keep recovery authority least-privilege and audit every reset, removal, disablement, and failed attempt.
- Review Supabase dashboard MFA settings, Auth email templates, redirect allow-list, JWT expiry, refresh
  rotation, and hosted/local differences before enabling the pilot policy.

## Quotas, Billing, Or Entitlements

Phase 12 adds no subscription, payment, quota, or entitlement model. MFA is an access-control
requirement. Supabase Auth usage limits, challenge rate limits, and any plan-specific MFA settings must
be verified as platform configuration, not invented as application entitlements.

## Observability And Analytics

- Provide an admin-only operational view or report of MFA status and recent event categories, without
  factor secrets or authentication codes.
- Track counts and outcomes for enrollment, challenge, failure, reset, removal, and access denial.
- Redact email addresses, tokens, QR payloads, codes, provider error bodies, and recovery evidence from
  logs and analytics.
- Include a correlation ID across a user-visible operation, the Auth call where available, the server
  enforcement decision, and the audit event.
- Define alerts or review thresholds for repeated failed challenges, repeated recovery requests, and
  privileged access denials before pilot enablement.

## Implementation Slices

### P12-0 — Freeze policy and platform configuration

**Purpose:** Convert the owner answers into an enforceable contract and verify that the selected
Supabase project supports it.

**Likely areas:** this plan, pilot decision register, Supabase Auth dashboard/config, environment
examples, and test-account documentation.

**Verification:** role matrix, recovery authority matrix, MFA dashboard settings, redirect URLs, token
expiry/rotation, and a written statement that synthetic demo accounts remain exempt or are separately
configured.

### P12-1 — Add the shared MFA policy boundary

**Purpose:** Make role plus AAL a single reusable decision used by AuthProvider, route guards, Edge
Functions, and protected database operations.

**Likely areas:** `AuthProvider.jsx`, `RouteGuards.jsx`, auth helpers, Edge Function shared helpers, and
new forward-only SQL migration(s) if restrictive policies or audit grants are needed.

**Verification:** an `aal1` psychiatrist/admin session cannot reach protected app routes or privileged
commands; an `aal2` session can; patients follow the selected policy.

### P12-2 — Build enrollment and sign-in challenge UX

**Purpose:** Let a selected privileged user enroll a TOTP factor and complete the second step after a
password sign-in.

**Likely areas:** `Login.jsx`, `AuthCard.jsx`, `ProfileSettings.jsx`, new MFA components/hooks, routes,
shared UI styles, and AuthProvider state handling.

**Verification:** new enrollment, successful code, wrong code, expired challenge, refresh, reload,
copied-link, back-button, mobile, keyboard, focus, and theme checks.

### P12-3 — Build factor management and controlled recovery

**Purpose:** Manage verified factors and provide the approved lost-device path without a bypass.

**Likely areas:** security settings, protected admin/recovery Edge Function(s), audit event writes,
admin operational view, and runbook documentation.

**Verification:** current-MFA removal, multiple-factor policy if selected, lost-device reset, admin
account recovery, session revocation, re-enrollment requirement, authorization denial, and audit-only
metadata checks.

### P12-4 — Close bypasses and integrate every privileged path

**Purpose:** Ensure password recovery, invitations, role changes, direct routes, stale sessions, and
existing admin/psychiatrist commands all use the same MFA requirement.

**Likely areas:** `ResetPassword.jsx`, invitation handling, route configuration, every privileged Edge
Function, database grants/policies, and role/provisioning code.

**Verification:** role-by-role bypass matrix, copied links, expired sessions, role changes, disabled
accounts, direct RPC/table attempts, and service-role misuse checks.

### P12-5 — Documentation, test evidence, and pilot gate

**Purpose:** Make the control supportable and prove it is ready for owner review.

**Likely areas:** audit trail, implementation status, Supabase notes, QA/Playwright plan, access
register, incident/recovery runbook, and pilot decision register.

**Verification:** all required automated and manual evidence is attached to a dated Phase 12 audit; the
owner-approved role and recovery policies are traceable from the register to the code and tests.

## Verification Plan

### Unit and pure helpers

- Role-to-MFA policy mapping.
- AAL1/AAL2 and missing/stale session handling.
- Enrollment/challenge state transitions.
- Stable error mapping and redaction.
- Recovery eligibility and reason validation.
- Route/action visibility that never replaces server authorization.

### Database, RLS, and Edge Functions

- Selected privileged roles cannot execute protected work at `aal1`.
- `aal2` is accepted only after a real factor verification.
- Patient and exempt-role behaviour matches the recorded decision.
- Password recovery and invitation sessions cannot bypass the policy.
- Wrong role, wrong user, unauthenticated, stale session, demoted, suspended, and offboarded attempts
  are denied safely.
- Factor reset/removal and recovery commands are authorized, idempotent where retried, and audited.
- Audit readers cannot access secrets, codes, QR payloads, or clinical content.
- Direct table/RPC attempts cannot bypass the protected command boundary.

### Playwright

For Chromium desktop and Pixel 5 mobile:

- Privileged user signs in, is sent to enrollment, completes TOTP setup, and reaches the app.
- Enrolled privileged user signs in and completes the challenge.
- Wrong, expired, repeated, and unavailable codes show safe recoverable states.
- Patient or exempt role follows the approved non-MFA path.
- Password recovery, invitation acceptance, copied links, reloads, back navigation, and expired
  sessions cannot bypass MFA.
- Security settings use real controls, not the placeholder local toggle.
- Lost-device and re-enrollment messaging is clear and does not expose internal details.
- Every new surface matches the current theme and passes keyboard, focus, contrast, accessible-name,
  touch-target, mobile, and overflow checks.

### Manual owner/security checks

- Confirm a real authenticator app can scan the QR code and verify a code.
- Confirm factor secrets and codes never appear in browser storage, URLs, logs, analytics, screenshots,
  or audit rows.
- Confirm the approved recovery actor can complete the documented reset and cannot read the secret.
- Confirm an admin cannot silently disable another admin without the required owner/second-admin path.
- Confirm sign-out/session invalidation behaviour after enrollment, factor removal, role demotion, and
  offboarding.

## Rollout And Fallback

- Keep the synthetic demo working in its explicitly documented MFA mode while the pilot policy is being
  tested. Do not silently weaken the real-user gate to make demo fixtures convenient.
- Roll out database/server enforcement and audit events before enabling the privileged UI path.
- Enable enforcement first for synthetic test accounts in a non-production project, then run the full
  role matrix and recovery rehearsal.
- Keep a clearly documented feature/configuration boundary for staged rollout, but do not provide a
  runtime bypass that lets a selected privileged role use production without MFA.
- If a failure blocks access, use the approved recovery process or disable the pilot gate before real
  users are enabled. Do not delete Auth factors, edit audit history, or bypass the server check manually.
- Phase 12 completion does not authorize a real-user pilot; the broader legal, clinical, vendor,
  payment, consent, support, and release gates remain required.

## Documentation And Audit Updates

On completion, update:

- The dated Phase 12 as-built audit under `Knowledge-base/audit-trail/`.
- `Knowledge-base/product/pilot-decision-register.md` with the selected roles, factor, enrollment,
  recovery, disablement, and launch-enforcement decisions.
- `Knowledge-base/engineering/implementation-status.md` with the exact enforcement boundary.
- `Knowledge-base/engineering/supabase.md` with Auth settings, migration parity, grants/policies, and
  Edge Function details.
- `Knowledge-base/engineering/qa-and-playwright.md` with MFA commands, fixtures, and coverage.
- `Knowledge-base/operations/access-register.md` with privileged account and recovery ownership.
- `Knowledge-base/operations/environment-release-and-secrets.md` with the verified Auth configuration
  and secret-handling rules.
- The incident/support recovery runbook with the approved lost-device and offboarding process.
- This phase file with the final decisions, implementation slices, test evidence, and handoff notes.

## Open Questions For Future Activation

1. Which roles require MFA: psychiatrist and admin only, or patients too?
2. Is authenticator-app TOTP the approved factor, with SMS and passkeys excluded for this phase?
3. Must privileged users enroll on their first sign-in before seeing any protected app screen?
4. Should every new sign-in require a code, with no trusted-browser option?
5. Who is the named recovery authority for psychiatrist accounts, admin accounts, and the last-admin
   lockout case?
6. What approval and audit rule applies when a privileged user disables or removes MFA?
7. What exact hosted Supabase Auth settings and pilot enforcement date should be recorded?
