# Phase 3 — Replace Prototype Identity

## R1 supersession boundary

The adults-only instructions in this historical Phase 3 plan are superseded for future real-user work
by the 8 September register amendment. R1.2, not a silent edit to this dated Tier 2 plan, will define
the adult and minor/guardian-consent registration paths, the non-bookable pending state, and the
approved consent-document dependency. Until R1.2 exists, this phase does not authorise a minor flow.

## Owner correction — 10 September 2026

Psychiatrists do not require approval or a pending state. Admins provision psychiatrist accounts
through the protected backend path, and developers may use the server-side provisioning tooling. A
newly provisioned psychiatrist is trusted immediately; the existing `is_active` field remains the
operational switch for visibility and bookability. The application must not expose psychiatrist
self-registration, and only admins may provision accounts through the application.

## R1 impact and work ownership — 10 September 2026

The current target includes public adult registration, a non-bookable minor pending state, a
guardian-consent review path, admin-only psychiatrist provisioning, and versioned consents. The
existing Phase 3 plan must not be read as permission to build a minor path before those R1.2
decisions and approved wording exist.

Phase 3 remains responsible for the core identity replacement: Supabase Auth, secure recovery,
server-held roles, admin-only clinician provisioning, removal of mock identity paths, and role-aware
routes. [Phase 16](phase-16-identity-and-minor-eligibility.md) owns the R1 eligibility and
guardian-consent behavior, including the server-held booking/admission predicate. The two phases
must share one profile/role/provisioning boundary; Phase 16 must not create a second identity system.

**Tier 2 status:** Completed — 12 September 2026. The core identity replacement, deployed boundary,
automated verification, and local Mailpit email flow are complete. Hosted SMTP customization and the
full email-consuming hosted Auth suite are intentionally deferred to
[deferredpostdevelopment.md](deferredpostdevelopment.md).

The historical approval workflow described in P3-4 and P3-5 below is superseded by the owner
correction above. Do not add approval columns, approval functions, approval UI, or approval tests.

## Purpose

Replace the prototype's mocked identity with real authentication: Supabase Auth, patient
self-registration, admin-only clinician provisioning, trusted psychiatrist records, secure recovery,
and role-aware routes. Multi-factor authentication is
handled as a separate Phase 12 security hardening phase. Remove every prototype identity mechanism in
the same transition.

## Gate

Legacy authentication never coexists with real accounts. This removal gate is satisfied: the active
application uses Supabase Auth and no mock identity path remains. Deferred hosted email infrastructure
does not reopen this completed implementation gate.

## Verification completed and post-development deferral

The first pass is a code and automated review of the complete identity flow: registration, email
confirmation, sign-in, recovery, route guards, admin-only psychiatrist provisioning, booking's
server-side confirmation check, RLS boundaries, and browser-storage inspection. It must catch missing
handlers, incorrect redirects, unsafe role changes, and misleading error messages without sending
email or creating disposable accounts.

The controlled live smoke pass uses only synthetic accounts in the non-production project. Supabase's
hosted email provider allows two emails per hour across confirmation, recovery, resend, and invitation
messages, so the test operator records the email budget before starting and stops when the budget is
spent. One window can test a patient confirmation and an admin psychiatrist invitation; recovery,
resend, and alternate-link tests must be scheduled in later windows. Repeated cases belong in mocked
or local browser tests. Do not use real patient or clinician data.

The real-user and hosted email-infrastructure work stays separate from this completed phase and is
recorded in [deferredpostdevelopment.md](deferredpostdevelopment.md). It requires custom SMTP,
confirmed hosted templates and redirects, approved operating controls, synthetic test identities, and
owner acceptance of the resulting post-development audit record.

## Consumes

- **Phase 2 as-built:** the profile and clinician-provisioning tables, the three-role model, and the RLS predicates that route guards must align with.
- **Phase 1 as-built:** secret management for auth configuration and any server-side provisioning.

## Owner decisions now available

| Decision | Effect on this phase |
| --- | --- |
| **Q1 — patients self-register, no cap** | Public registration and login at initial launch with no active-patient cap. Sign-up must establish adults-only eligibility itself, since there is no invitation vetting to rely on. The approved geography and operating-review cadence remain to be set. |
| **Q1 and Q3 — clinicians do not self-register** | Psychiatrist accounts are created by admin invitation or backend provisioning only and are trusted immediately. `is_active` controls visibility and bookability. |
| **Q4 — adults only, no emergency care** | Sign-up screens for adult eligibility, refuses ineligible applicants, and routes them to the approved crisis and referral information. |
| **Q7 — three consents** | Sign-up will eventually capture three separate versioned acknowledgements, each independently withdrawable. Consent capture is deferred until the broader feature set is developed. |

## Still open, but not blocking

The psychiatrist approval question is closed by the owner correction: there is no approval workflow.
Only the backend/admin provisioning boundary and the existing operational `is_active` behavior apply.

## Deliverables

- Supabase Auth as the sole authentication mechanism.
- Patient self-registration with the R1.2 eligibility boundary integrated when that phase is ready.
- Clinician accounts created by admin invitation or server-side provisioning only, never by self-sign-up.
- Trusted psychiatrist records created immediately by the protected admin/backend provisioning path; `is_active` controls visibility and bookability.
- Secure account recovery that cannot be used to escalate role or bypass email verification.
- Role-aware routing for all three roles, derived from server-held role facts.
- Multi-factor authentication is handled in Phase 12; this phase integrates with its completed identity and recovery controls.
- **Removals, each verified absent:** fake email-derived roles, mock tokens, Redux-persisted sensitive state, duplicate API clients, and local mock profile data.

## Authoritative documents

- [Database and RBAC](../../architecture/database-and-rbac.md) — role model and provisioning rules.
- [Access control and audit policy](../../architecture/access-control-and-audit-policy.md) — authentication, MFA, and access auditing.
- [Clinical safety and telepsychiatry policy](../../product/clinical-safety-and-telepsychiatry-policy.md) — clinician verification and eligibility.
- [Privacy governance](../../governance/privacy-governance.md) — consent capture at sign-up.
- [Engineering conventions](../engineering-conventions.md) — client consolidation and dependency discipline.
- [QA and Playwright](../qa-and-playwright.md) — route and guard verification.

## Open registration changes the threat picture

The original plan assumed an invitation-only pilot, where a human vetted every account before it
existed. Public patient registration removes that barrier, so controls that were previously backstopped
by vetting now stand alone. The implementation plan should address, at minimum: rate limiting and abuse
of sign-up, email verification before any booking, and the fact that adults-only is a self-declaration
unless the owners require evidence. Flag the last one to the clinical lead rather than deciding it here.

## Known removal targets

The audit trail already records these as deferred, with this phase named as the close condition:

- Mock email-derived roles, Redux-persisted tokens, and duplicate Axios clients — recorded in the [deferred simplifications ledger](../../audit-trail/README.md#deferred-simplifications-ledger).

Verify the current state of each rather than trusting the ledger's description; it was written on
26 August 2026 and the prototype may have changed.

## What this fixes for later phases

How caller identity reaches the server determines Phase 4's authorisation model and Phase 5's
derivation of video participant tokens. The as-built entry should record exactly how a server function
establishes who is calling, how admin provisioning is checked, and how `is_active` is enforced.

## Constraints carried from policy

- Roles are never inferred from email, client state, editable metadata, or URLs.
- Route guards improve navigation only; RLS and protected functions remain authoritative.
- No credential or service key in `VITE_*`, browser code, Git, or fixtures.
- No sensitive data in `localStorage`, Redux persistence, logs, analytics, screenshots, URLs, or test artefacts.

---

# Tier 2 — Implementation Plan

**Written:** 27 August 2026, from the prototype source read directly rather than from the audit
entries' description of it, as the charter requires.

## Verified starting state — the removal inventory

This is a removal gate as much as a build gate, so the inventory comes first. Every item below was
read on 27 August 2026.

### Where a role is currently derived

One place, and it is the login screen. `src/pages/Login.jsx` lowercases the typed email and assigns
`Admin` if it contains "admin", `Doctor` if it contains "doctor", `Patient` if it contains "patient",
and `User` otherwise. It then mints `dummy-access-token-<role>-<timestamp>` and a matching refresh
token, and the screen carries a visible hint inviting the user to try it. There is no server, no
verification, and no password check of any kind — the password field's value is never read.

Two details matter beyond the obvious. The role vocabulary is `Admin`/`Doctor`/`Patient`/`User`, which
matches neither the knowledge base's `patient`/`psychiatrist`/`admin` nor the three-role model Phase 2
introduces — "Doctor" is not "psychiatrist", and "User" is not a role at all. And there is no
separate support-role implementation anywhere in the prototype.

### Persisted state

`src/redux/store.js` wraps the root reducer in `redux-persist` with `storage`, which is
`localStorage`. The persisted slice is `auth`, so the user object, the role, the access token, and the
refresh token are all written to `localStorage` under key `root`. The
[non-negotiable rules](../../../Orion_React_App/CLAUDE.md) prohibit `localStorage` and Redux
persistence for sensitive client data without qualification.

### The API client inventory

Six files, and **the entire layer is dead code** — verified by searching every import across `src/`.
Nothing in `pages/` or `components/` imports any of it; the files import only one another.

| File | What it is |
| --- | --- |
| `src/api/api.js` | An Axios client against `http://localhost:5173/api` with a simulated token refresh that mints `new-access-token-<random>` and logs to the console. |
| `src/api/axiosInterceptor.js` | A **second** Axios client, reading `localStorage.getItem("token")` and calling `localStorage.clear()` — a third auth-state mechanism, independent of both the Redux store and the first client. |
| `src/api/apiConfig.js` | Endpoint constants against `https://api.example.com`, including MFA endpoints that exist nowhere. |
| `src/api/index.js` | Re-exports the second client. |
| `src/services/authService.js` | Ten methods against those endpoints. Imported by nothing. |
| `src/services/userService.js` | Five methods against those endpoints. Imported by nothing. |

Two observations worth recording rather than passing over. `axiosInterceptor.js` contains redirect
logic for `voice/startcall`, `/aiwarmer`, and `/campaign` — endpoints belonging to some other product
entirely, which tells you this layer was copied in rather than written for Orion, and is a reason to
delete it rather than adapt it. And its error handler pushes `error.response?.data?.message` straight
into a toast, which is precisely the pattern [engineering conventions](../engineering-conventions.md#data-and-security-conventions)
prohibits when it says no sensitive data in toast messages.

Because the layer is unreferenced, **deleting all six files is a no-op at runtime**. The ledger entry
describes this as a Phase 3 removal; it is closer to a Phase 3 formality, and it should not be allowed
to consume attention that belongs to the parts that are genuinely load-bearing.

### Route protection

`src/routes/routeConfig.jsx` declares no guard of any kind. `/appointments`, `/sessions`,
`/dashboard`, `/settings`, `/doctor-availability`, `/patient-appointment`, and `/profile` all render
for an unauthenticated visitor. Navigation is a hand-duplicated block of links repeated across four
page components, identical for every visitor, plus an unused `Sidebar.jsx` that no file imports.

### What the demo milestone may already have removed

The [demo milestone](demo-milestone.md) plan removes the email-derived role logic, the dummy tokens,
and the Redux persistence as part of its D2 step, because the demo cannot hold roles in client state
without breaching its own constraint. **If the demo has run, much of the inventory above is already
gone.** Verify against the source before planning removals — this section is a reading of the
prototype on 27 August 2026 and the demo was scheduled to change it.

## What this phase adds beyond the demo

The demo establishes server-held roles, one Supabase client, and route guards. This phase adds
everything about identity that the demo does not need because its accounts arrive by seed:

registration, admin-only invitation and provisioning, account recovery, consent capture, and uncapped public
registration. MFA enforcement is explicitly
handed off to Phase 12.

## Work breakdown

### P3-1 — Supabase Auth as the sole mechanism

One authentication path and one client, per the [architecture](../../architecture/architecture.md#api-direction)
API direction and the *one source of truth per domain* principle. Session handling belongs to Supabase
Auth rather than to a custom token store — the [engineering conventions](../engineering-conventions.md#orion-examples)
table names this explicitly, with custom access-token refresh and Redux token persistence as the
thing not to add.

Create one CASL ability factory from the authenticated user's role in `profiles`, and provide that
ability to route guards, navigation, and action controls. CASL keeps the frontend internally
consistent; it is not an authorisation boundary. RLS and Edge Functions still decide every data read
and privileged state change, and tests must demonstrate that a manipulated browser ability cannot
obtain unauthorised data.

The active email-derived role logic, dummy token minting, and persisted auth slice are removed from
the login flow. The broader deletion of the six unused API-layer files, `Sidebar.jsx`, and any other
prototype-only files is deferred to [deferredpostdevelopment.md](deferredpostdevelopment.md) until
the wider feature set is further developed and each deletion can be rechecked against imports and
routes. The final removal gate still requires that legacy authentication never coexists with real
accounts.

### P3-2 — Patient self-registration

- Public sign-up, per the Q1 decision, creating a profile whose role is fixed server-side at `patient` — never taken from sign-up input. The mechanism is the Phase 2 trigger; this phase supplies the screen.
- **Superseded for real-launch by R1.2.** This baseline plan's adults-only self-declaration and refusal
  path do not authorise the current minor-consent direction. R1.2 defines the pending guardian-consent
  state and the clinical/legal approval conditions before any minor may book; it does not assume ID or
  relationship-verification requirements before they are decided.
- **A refusal path** that shows the approved crisis and referral information to an applicant who is ineligible, per [clinical safety](../../product/clinical-safety-and-telepsychiatry-policy.md#product-safeguards). The content is the clinical lead's to approve; the surface is this phase's to build. Until the content is approved the surface renders nothing rather than placeholder text — a placeholder crisis contact is worse than an absent one.
- **Email verification before any booking.** The charter asks for this, and it is the control that replaces the invitation vetting Q1 removed. A profile may exist unverified; it may not book.
- **Rate limiting and abuse controls on sign-up**, for the same reason. Sign-up is now the only unauthenticated write path in the system.

### P3-3 — Uncapped public registration

No active-patient cap, waitlist, or approval queue is implemented. Public registration requires the
applicable R1 eligibility status, email verification before booking, rate limiting, monitoring, and
the approved geography. The team records activity and plans scaling when demand warrants it; the
operating-review cadence remains an owner decision under Q1.

### P3-4 — Provisioning for psychiatrists

- Created by admin invitation or backend provisioning only, never by self-sign-up, per Q1 and Q3. The provisioning function is a new protected Phase 3 boundary; it must not reuse the synthetic demo-only path. The invited psychiatrist accepts the link and sets a password before using the account.
- **No self-service path may exist to the psychiatrist role.** This is not the same as not offering one on a screen — it means the registration path cannot produce anything but a patient, whatever it is sent.
- Provisioned roles are trusted immediately and prepared for MFA enrollment; enforcement is delivered by [Phase 12](phase-12-mfa-and-privileged-access.md).

### P3-5 — The psychiatrist approval workflow (superseded)

This historical subsection is retained for traceability only. No approval workflow, pending state,
assignable approver, or verification checklist is part of the current Phase 3 implementation.

- Approval gates bookability **and all patient data access**. This requirement is superseded by the owner correction: admin provisioning establishes trust immediately, while `is_active` controls visibility and bookability.
- The approver is an assignable identity, not a hard-coded role. The charter is explicit: do not assume the approver is the admin. Q3 leaves both the approver and the verification criteria open, and both are configuration.
- The criteria checklist is data, so that recording *what was verified* does not require a deploy when the criteria change. Verification evidence itself is not stored in Orion — the [data dictionary](../../governance/data-classification-and-data-dictionary.md#classification) keeps private verification records out of the psychiatrist profile.
- Approval and revocation are audited transitions, per [access control and audit policy](../../architecture/access-control-and-audit-policy.md#audit-events).

### P3-6 — MFA handoff

MFA is deliberately deferred to [Phase 12](phase-12-mfa-and-privileged-access.md). Phase 3 must leave
the identity and recovery interfaces ready for MFA, but does not implement or claim enforcement.

### P3-7 — Account recovery

Recovery must not become the escalation path that the rest of this phase closes. Specifically, it
cannot be used to change a role or bypass email verification.
The role is read from the profile after recovery like at any other sign-in — never re-derived, never
carried in the recovery link. Recovery events are audited.

### P3-8 — Role-aware routing for three roles

- One role-to-routes map and one shared guard, replacing the duplicated per-page navigation and the unused `Sidebar.jsx` — the pattern [engineering conventions](../engineering-conventions.md#orion-examples) names as the default, with per-page role checks as the thing not to build.
- The role comes from the server-held profile, per [access control and audit policy](../../architecture/access-control-and-audit-policy.md#roles).
- Guards align with the Phase 2 RLS predicates but do not restate them, and are never relied upon as the control. Every guarded route has a corresponding RLS deny test; the guard is what makes the application usable, the policy is what makes it safe.

### P3-9 — Consent capture — deferred until post-development

Do not add consent capture during the current feature-build sequence. Resume this work after the
broader product features are developed and the final approved wording and document versions exist.

Sign-up captures three separate versioned acknowledgements — privacy acknowledgement, informed
consent, optional communications — each independently withdrawable, per Q7 and the Phase 2 consent
schema.

**The wording does not exist.** It is drafted by the developer and approved by the owners, with DPO
and clinical review, and the Q6 decision widened its scope to cover that notes are written, that the
patient reads them once released, and who else can and cannot see them. Build the capture mechanism;
seed no version. A consent record pointing at unapproved wording is not evidence of anything, and
would be worse than no record.

This means no real sign-up can complete until the wording is approved. Given that no real user may
exist before the launch gate in any case, that is a correct interlock rather than a gap.

## Gate evidence

The gate is that legacy authentication never coexists with real accounts.

| Clause | Evidence |
| --- | --- |
| Legacy paths absent | The six API files, `Sidebar.jsx`, the email-role logic, and the persisted auth slice are deleted, and `redux-persist` — and Redux, if unused — are uninstalled. Verified by search, not by inspection of a screen. |
| Nothing sensitive persisted | `localStorage` and `sessionStorage` inspected after sign-in, sign-out, and recovery. No token, role, or profile data present. |
| Role never client-derived | A test that a manipulated client cannot obtain a role it was not granted — the authority is the profile row, and the deny is at the data boundary. |
| Three-role routing | Playwright allow and deny per role, per [QA and Playwright](../qa-and-playwright.md#required-coverage), desktop and mobile for patient-facing flows. |
| Provisioning is closed | The registration path cannot produce a psychiatrist or an admin under any input. |
| Provisioning establishes trust | Only the protected admin/backend path can create a psychiatrist role; the new record is trusted immediately, and `is_active` controls visibility and bookability. |
| Recovery cannot escalate | Recovery does not alter role or email-verification state. |

## Policy gaps this plan did not fill

| Gap | Owner | How this plan handles it |
| --- | --- | --- |
| Approved geography and operating-review cadence (Q1) | Company owners | No capacity gate is built. Registration remains public, with monitoring and scaling work triggered by real activity. |
| Minor/guardian pathway, including age and identity/relationship assurance | Clinical lead, company owners, and DPO/legal owner | R1.2 owns the flow. No minor may become bookable until its approval conditions are recorded. |
| Approved crisis and referral content | Clinical lead | The refusal surface is built; it renders nothing until approved content exists. |
| Psychiatrist provisioning authority (Q3) | Company owners with clinical lead | Admin-only app provisioning and server-side developer tooling are defined; no approval queue or pending state is required. |
| MFA role scope and enforcement | Phase 12 | Phase 3 exposes the identity/recovery boundary; Phase 12 enforces the owner-selected roles. |
| Consent wording (Q7) | Company owners, with DPO and clinical review | Mechanism built, no version seeded, sign-up cannot complete without approved wording. |

## Inputs I did not have

1. **The Phase 2 as-built schema.** This plan is written against Phase 2's proposal — the profile trigger, the clinician records, the consent tables, and the role type. Re-ground every reference against what was actually built; the charter is right that this phase's code is written directly against it.
2. **Whether the demo milestone has run**, which determines how much of the removal inventory still exists.
3. **Whether the prototype has changed since 27 August 2026.** The inventory above is a point-in-time reading.
4. **The approved geography and operating-review cadence under Q1.** These define the real-user launch boundary, not registration capacity.
5. **Whether consent wording has been approved**, without which sign-up cannot complete.
6. **Whether Supabase's MFA and rate-limiting capabilities on the chosen plan** cover the interfaces Phase 3 exposes and Phase 12 will enforce. Verify against the platform rather than against this plan.
