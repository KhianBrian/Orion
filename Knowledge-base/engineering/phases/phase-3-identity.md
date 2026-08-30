# Phase 3 — Replace Prototype Identity

**Tier 2 status:** Planned 27 August 2026. The implementation plan is below the charter and is written against the prototype as it stands; it must be re-grounded against the Phase 2 as-built schema before work starts.

## Purpose

Replace the prototype's mocked identity with real authentication: Supabase Auth, patient
self-registration, invitation-only clinician and secretary provisioning, an approval period before a
psychiatrist becomes bookable, secure recovery, role-aware routes, and multi-factor authentication for
privileged accounts. Remove every prototype identity mechanism in the same transition.

## Gate

Legacy authentication never coexists with real accounts. This is a removal gate as much as a build
gate — the phase is not closed while a mock path still functions.

## Consumes

- **Phase 2 as-built:** the profile, clinician-approval, and secretary tables, the four-role model, and the RLS predicates that route guards must align with.
- **Phase 1 as-built:** secret management for auth configuration and any server-side provisioning.

## Owner decisions now available

| Decision | Effect on this phase |
| --- | --- |
| **Q1 — patients self-register, capped** | Public registration and login at initial launch, but the first launch remains a controlled pilot with the number of active patients capped. Sign-up must establish adults-only eligibility itself, since there is no invitation vetting to rely on, and must enforce the cap. The cap value and mechanism — waitlist, approval queue, or hard limit — are still to be set, so build the gate with the mechanism configurable. |
| **Q1 and Q3 — clinicians do not self-register** | Psychiatrist accounts are created by invitation or provisioning only, then pass an approval period before becoming bookable or seeing any patient data. |
| **Q4 — adults only, no emergency care** | Sign-up screens for adult eligibility, refuses ineligible applicants, and routes them to the approved crisis and referral information. |
| **Q10 — secretary role** | Secretary accounts are provisioned, never self-registered. |
| **Q7 — three consents** | Sign-up captures three separate versioned acknowledgements, each independently withdrawable. |

## Still open, but not blocking

**Q3** — who performs psychiatrist approval, and against what verification criteria. The approval
*mechanism* is confirmed, so the state model and the workflow can be built. Only the identity of the
approver and the criteria checklist remain, and both can be configured rather than hard-coded. Do not
assume the approver is the admin role; leave it assignable.

## Deliverables

- Supabase Auth as the sole authentication mechanism.
- Patient self-registration with adults-only eligibility established at sign-up and a refusal path that shows approved crisis and referral information.
- An active-patient cap enforced at registration, with the mechanism configurable pending the Q1 value.
- Clinician and secretary accounts created by invitation or provisioning only, never by self-sign-up.
- A psychiatrist approval workflow gating bookability and all patient data access, with an assignable approver.
- Secure account recovery that cannot be used to escalate role, bypass approval, or bypass verification.
- Role-aware routing for all four roles, derived from server-held role facts.
- Multi-factor authentication enforced for privileged accounts.
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
establishes who is calling, and how the clinician approval state is checked.

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
matches neither the knowledge base's `patient`/`psychiatrist`/`admin` nor the four-role model Phase 2
introduces — "Doctor" is not "psychiatrist", and "User" is not a role at all. And there is no
`secretary` anywhere in the prototype.

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

registration, invitation and provisioning, the psychiatrist approval workflow, account recovery,
multi-factor authentication, consent capture, the fourth role, and the active-patient cap.

## Work breakdown

### P3-1 — Supabase Auth as the sole mechanism

One authentication path and one client, per the [architecture](../../architecture/architecture.md#api-direction)
API direction and the *one source of truth per domain* principle. Session handling belongs to Supabase
Auth rather than to a custom token store — the [engineering conventions](../engineering-conventions.md#orion-examples)
table names this explicitly, with custom access-token refresh and Redux token persistence as the
thing not to add.

**Removals completed in this phase, each verified absent afterwards:** the email-derived role logic
and its on-screen hint; the dummy token minting; `redux-persist` and the persisted auth slice;
Redux itself once nothing else uses it; all six API-layer files; and `Sidebar.jsx`. The gate is that
legacy authentication never coexists with real accounts, so "removed" means the file is gone and the
dependency is uninstalled, not that the path is unreachable.

### P3-2 — Patient self-registration

- Public sign-up, per the Q1 decision, creating a profile whose role is fixed server-side at `patient` — never taken from sign-up input. The mechanism is the Phase 2 trigger; this phase supplies the screen.
- **Adults-only eligibility established at sign-up**, per Q4 and the charter. As things stand this can only be a self-declaration, since Orion collects no identity document and the [data dictionary](../../governance/data-classification-and-data-dictionary.md#classification) admits none. Whether a self-declaration is sufficient is a clinical and legal judgement, and the charter is right that it goes to the clinical lead rather than being decided here. Build the declaration; record that it is one.
- **A refusal path** that shows the approved crisis and referral information to an applicant who is ineligible, per [clinical safety](../../product/clinical-safety-and-telepsychiatry-policy.md#product-safeguards). The content is the clinical lead's to approve; the surface is this phase's to build. Until the content is approved the surface renders nothing rather than placeholder text — a placeholder crisis contact is worse than an absent one.
- **Email verification before any booking.** The charter asks for this, and it is the control that replaces the invitation vetting Q1 removed. A profile may exist unverified; it may not book.
- **Rate limiting and abuse controls on sign-up**, for the same reason. Sign-up is now the only unauthenticated write path in the system.

### P3-3 — The active-patient cap

The cap's existence is decided; its value, its mechanism, and the approved geography are
[open under Q1](../../product/pilot-decision-register.md#outstanding-for-the-next-owner-meeting). The
charter's instruction is to build the gate with the mechanism configurable, which needs a design that
makes all three candidate mechanisms values rather than rewrites.

The mechanism that achieves this is a patient registration status — `active`, `pending`, `waitlisted`
— checked at registration against a configured cap:

| Mechanism | Behaviour when the cap is reached |
| --- | --- |
| Hard limit | Registration is refused before an account is created |
| Approval queue | The account is created `pending` and is not bookable |
| Waitlist | The account is created `waitlisted` and is notified when capacity frees |

All three then differ in one branch and one status value rather than in the shape of the system.
**Build the hard-limit branch first**, since it is the only one that needs no notification path, and
leave the other two as unreached branches until Q1 lands.

Two notes. This status column is a **Phase 2 schema dependency that the Phase 2 plan did not
anticipate**; if Phase 2 has closed by the time this is built, it is a forward migration, which the
append-only process supports. And whether an unverified account counts against the cap is a real
question the owners have not been asked — the recommendation is that it should not, since the cap
exists to bound operational and clinical load and an unverified account generates neither. Add it to
the Q1 brief rather than deciding it in code.

### P3-4 — Provisioning for psychiatrists and secretaries

- Created by invitation or provisioning only, never by self-sign-up, per Q1, Q3, and Q10. The provisioning function is the Phase 2 one; this phase supplies the invitation flow and the admin surface.
- **No self-service path may exist to either role.** This is not the same as not offering one on a screen — it means the registration path cannot produce anything but a patient, whatever it is sent.
- Both roles enrol in multi-factor authentication as part of provisioning. See P3-6.

### P3-5 — The psychiatrist approval workflow

- Approval gates bookability **and all patient data access**. An unapproved psychiatrist is not a psychiatrist with fewer permissions; they read nothing.
- The approver is an assignable identity, not a hard-coded role. The charter is explicit: do not assume the approver is the admin. Q3 leaves both the approver and the verification criteria open, and both are configuration.
- The criteria checklist is data, so that recording *what was verified* does not require a deploy when the criteria change. Verification evidence itself is not stored in Orion — the [data dictionary](../../governance/data-classification-and-data-dictionary.md#classification) keeps private verification records out of the psychiatrist profile.
- Approval and revocation are audited transitions, per [access control and audit policy](../../architecture/access-control-and-audit-policy.md#audit-events).

### P3-6 — Multi-factor authentication

[Access control and audit policy](../../architecture/access-control-and-audit-policy.md#roles) requires
MFA for privileged users before pilot launch, and [product scope](../../product/product-scope.md#out-of-scope)
repeats it. Neither enumerates which roles are privileged.

**Recommendation: all three provisioned roles — admin, secretary, and psychiatrist.** The argument is
practical rather than doctrinal: all three are provisioned rather than self-registered, so onboarding
already contains a human step where enrolment fits, and all three reach data belonging to people other
than themselves. The admin and the secretary reach many patients' details; the psychiatrist authors
and reads clinical content. Patients are not included.

If the owners prefer a narrower boundary, that is theirs to set. It should be set deliberately, and
the narrowing recorded, rather than arrived at by leaving a role out.

### P3-7 — Account recovery

Recovery must not become the escalation path that the rest of this phase closes. Specifically, it
cannot be used to change a role, to bypass the psychiatrist approval state, or to bypass verification.
The role is read from the profile after recovery like at any other sign-in — never re-derived, never
carried in the recovery link. Recovery events are audited.

### P3-8 — Role-aware routing for four roles

- One role-to-routes map and one shared guard, replacing the duplicated per-page navigation and the unused `Sidebar.jsx` — the pattern [engineering conventions](../engineering-conventions.md#orion-examples) names as the default, with per-page role checks as the thing not to build.
- The role comes from the server-held profile, per [access control and audit policy](../../architecture/access-control-and-audit-policy.md#roles).
- Guards align with the Phase 2 RLS predicates but do not restate them, and are never relied upon as the control. Every guarded route has a corresponding RLS deny test; the guard is what makes the application usable, the policy is what makes it safe.

### P3-9 — Consent capture

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
| Four-role routing | Playwright allow and deny per role, per [QA and Playwright](../qa-and-playwright.md#required-coverage), desktop and mobile for patient-facing flows. |
| Provisioning is closed | The registration path cannot produce a psychiatrist, a secretary, or an admin under any input. |
| Approval gates access | An unapproved psychiatrist reads no patient data and does not appear bookable. |
| MFA enforced | A provisioned account cannot complete privileged sign-in without a second factor. |
| Recovery cannot escalate | Recovery does not alter role, approval state, or verification state. |

## Policy gaps this plan did not fill

| Gap | Owner | How this plan handles it |
| --- | --- | --- |
| Cap value, mechanism, geography (Q1) | Company owners | The gate is built with the mechanism as a status value and a configured limit. The hard-limit branch is built; the other two are unreached branches. |
| Whether unverified accounts count against the cap | Company owners | Not decided. Raised for the Q1 brief, with a recommendation and its reasoning. |
| Whether adults-only may be a self-declaration | Clinical lead | The declaration is built and recorded as a declaration. Not represented as verification anywhere. |
| Approved crisis and referral content | Clinical lead | The refusal surface is built; it renders nothing until approved content exists. |
| Psychiatrist approver and verification criteria (Q3) | Company owners with clinical lead | Approver assignable, criteria stored as data. |
| Which roles are privileged for MFA | Company owners | Recommendation stated with its reasoning. A narrowing must be deliberate and recorded. |
| Consent wording (Q7) | Company owners, with DPO and clinical review | Mechanism built, no version seeded, sign-up cannot complete without approved wording. |
| Secretary scope — clinic-wide or per psychiatrist, acting on a client's behalf | Company owners | Provisioning is built for the narrowest reading Phase 2 implements. |

## Inputs I did not have

1. **The Phase 2 as-built schema.** This plan is written against Phase 2's proposal — the profile trigger, the approval state, the consent tables, the role type. Re-ground every reference against what was actually built; the charter is right that this phase's code is written directly against it.
2. **Whether the demo milestone has run**, which determines how much of the removal inventory still exists.
3. **Whether the prototype has changed since 27 August 2026.** The inventory above is a point-in-time reading.
4. **Whether Q1's cap mechanism has landed**, which decides whether the two unreached branches are built now or later.
5. **Whether consent wording has been approved**, without which sign-up cannot complete.
6. **Whether Supabase's MFA and rate-limiting capabilities on the chosen plan** cover what P3-2 and P3-6 assume. Verify against the platform rather than against this plan.
