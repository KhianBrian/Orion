# Phase 15 data, consent, and audit foundation audit — 2026-09-13

**Disposition: COMPLETE — 13 September 2026**

The approved Phase 15 engineering scope is implemented, verified, merged to `main`, and deployed
to the linked synthetic non-production Supabase project. This audit is the final as-built record for
the phase; it does not authorize real-user activation or close production launch gates.

## Scope and delivery record

Phase 15 implemented the provider-neutral data foundation from R1.1 and the approved first
administrative support-ticket slice. Development was performed on branch
`codex/phase-15-data-consent-audit` in worktree `../Orion-phase-15`, created from the clean Phase 14
`main` state. The implementation was fast-forwarded to `main` at commit `25b9db8` and pushed to
`origin/main`. The four Phase 15 migrations were subsequently applied to the linked synthetic
non-production `Orion-demo` project, and the JWT-protected `support-tickets` Edge Function was
deployed there.

All test data remained synthetic; verification was performed locally and against the linked
non-production project only.

## User-visible support flow

1. A patient or psychiatrist opens Support and sees a warning not to submit emergency information,
   diagnoses, treatment details, session notes, payment credentials, or attachments.
2. The requester submits an administrative-help or software-issue request of up to 2,000 characters.
3. The requester can list and open only their own submitted tickets.
4. An administrator can open the Support queue, read submitted ticket details, and reply.
5. The requester receives the reply in the conversation and sees a `New reply` indicator until the
   ticket is opened.

Closing/reopening, escalation, attachments, email notifications, clinical categories, and emergency
handling are intentionally disabled pending separate policy approval.

## Database implementation

Migration `20260913121934_phase15_data_consent_audit_support.sql` adds:

- `payment_pending` and `reserved` compatibility enum values;
- `booking_authorisation_basis` for historical `synthetic_demo` versus future `verified_payment`;
- current `patient_eligibility` state;
- `guardian_consent_cases` and append-only `guardian_consent_events`;
- provider-neutral `payment_attempts` and append-only `payment_events`;
- `support_tickets`, `support_ticket_messages`, and per-user `support_ticket_reads` with the
  administrative-help-only category;
- deny-first RLS and revoked `anon`/`authenticated` table grants for all new objects;
- service-role-only protected functions for ticket creation, listing, and audited reads.

Migration `20260913124101_phase15_active_reservation_constraints.sql` adds the active-slot unique
constraint and active-session exclusion constraint after the enum migration commits. This separation
is required by PostgreSQL enum transaction safety.

Ticket creation is idempotent per requester/request key. Patient and psychiatrist requesters can
read/reply to their own tickets; admins can review/reply to all tickets. Protected functions enforce
the server-resolved profile role and relationship. Each reply is idempotent and audited. The unread
indicator compares the latest message with that actor's server-side read timestamp. Ticket body
content is returned only through an audited protected read and is not copied into audit metadata.

## Verification performed

- `supabase db reset --local --no-seed --yes` — passed; all local migrations applied from empty.
- `supabase migration list --local` and `supabase migration list --linked` — passed; the linked
  `Orion-demo` project matches all local migrations through the four Phase 15 migrations.
- `supabase db lint --local --fail-on error` — passed; no schema errors.
- `supabase db lint --linked --fail-on error` — passed; no remote schema errors.
- Synthetic demo-user provisioning against local Supabase — passed.
- `npm run test:db:phase15` — passed; patient/psychiatrist participation, cross-role replies, unread
  state, ownership, audited reads, redaction, and idempotent creation verified.
- Focused support Playwright flow — 6 passed across Chromium and mobile Chromium, covering patient
  submission/read, psychiatrist submission/read, admin reply, requester receipt, and unread indication.
- `npm run lint` — passed.
- `npm run test:unit` — 6 passed.
- `npm run build` — passed; 169.57 kB initial JavaScript gzip, under the 180 kB budget.
- Public/accessibility/navigation Playwright checks — 56 passed.
- Existing authenticated scheduling Playwright checks — 14 passed across Chromium and mobile
  Chromium.
- Remote support Playwright checks — 6 passed across Chromium and mobile Chromium against the
  deployed Edge Function.
- `git diff --check` — passed.

## Remaining boundaries and gates

- Remote application and deployment are complete for the linked synthetic non-production project;
  production remains untouched.
- Field-level ownership, retention, disposal, export, legal-hold, and named reader decisions remain
  governance gates for real-user activation.
- Guardian decision/review behavior remains Phase 16; provider-specific payment behavior remains
  Phase 17; production meeting behavior remains Phase 18; full support operations remain Phase 19.
- The Phase 15 migrations have been verified locally and on the linked synthetic project over
  synthetic state. The deployed function remains JWT-protected and service-role-backed.
- This audit does not close any real-user launch gate.
