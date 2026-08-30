# Demo Milestone — Five-Account Synthetic Demo

**Type:** Cross-cutting track, not a delivery-plan phase.
**Tier 2 status:** Planned 27 August 2026. The implementation plan is below the charter.

## Purpose

Prove login, RBAC navigation, the booking flow, scheduling rules, and the boundary where video
admission will later integrate — using exactly five fixed synthetic accounts and no real data. This
is the immediate milestone defined in the
[pilot decision register](../../product/pilot-decision-register.md#immediate-demo-milestone).

This track is recorded separately because it does not map to a single phase. It borrows a thin,
synthetic-only slice of Phase 2, 3, and 4 capability to produce a demonstrable system while the
register questions remain open. It is explicitly permitted by the register's *What may continue
before answers* section.

Treating it as a phase would be a mistake in both directions: it must not be read as closing the
Phase 2–4 gates, and the phases must not be read as blocked on it.

## Account boundary

| Account type | Count | Rule |
| --- | ---: | --- |
| Patient | 2 | Synthetic names, emails, appointments, and profile details only. |
| Psychiatrist | 2 | Synthetic clinician profiles and availability only. |
| Admin | 1 | Demo provisioning and visibility only; no consultation admission by default. |

No public sign-up. No real client or clinician information. No real clinical session. Replacing these
accounts with real users requires a company-owner decision that has not been made.

**Outstanding:** the 27 August 2026 review introduced a secretary role and session notes. Whether the
demo expands to a sixth secretary account, and whether notes appear in the demo at all, are open
questions on the register. Plan the demo at five accounts without notes unless the owners direct
otherwise, and keep both as clearly separable increments.

## Video for the demo

The owners decided on 27 August 2026 that the demo uses Daily, with public Jitsi permitted as a
fallback **for the demo only**, in a clearly labelled internal fake-data mode with these synthetic
accounts. This is consistent with the register's standing position that public Jitsi is acceptable in a
labelled fake-data mode and never a fallback for a real client call.

Two things the implementation plan must hold:

1. **The fake-data label must be unmissable and impossible to disable from the client.** It is the only thing distinguishing a permitted demo call from a prohibited real one.
2. **Demo video success is not Phase 5 progress.** A working call between two synthetic accounts proves the integration boundary. It does not prove participant entitlement, token revocation, copied-link denial, or outage handling — which is what the Phase 5 gate tests. The real-launch provider decision (Q8) is deferred and remains open.

## Gate

The demo is complete when a reviewer can, against synthetic data only, log in as each of the five
accounts, see role-correct navigation, complete a booking as a patient, see it as the assigned
psychiatrist, and reach the point where video admission occurs — with a labelled fake-data call
placed between two synthetic accounts.

This gate does not authorise real users, and closing it does not close any phase gate.

## Consumes

Nothing. This track is unblocked and may begin immediately.

## Blocked by

Nothing for the demo itself. The register questions block only the transition from this demo to real
users — principally Q1 (pilot bounds), Q3 (clinical lead and psychiatrist approval), Q5 (remaining
appointment transitions), Q8 (real-launch provider), and Q12 (final go/no-go).

## Deliverables

- Five provisioned synthetic accounts with fixed, documented credentials held per the secrets policy.
- Role-correct navigation for patient, psychiatrist, and admin.
- A booking flow demonstrable end to end on synthetic appointments, honouring the confirmed rules: 45-minute sessions, patient cancellation only more than 24 hours ahead.
- A labelled internal fake-data video mode using Daily, with public Jitsi as the demo fallback.
- A synthetic seed dataset that can be recreated from scratch, and is the only data the demo uses.

## Authoritative documents

- [Pilot decision register](../../product/pilot-decision-register.md) — the milestone definition, the account boundary, and the 27 August 2026 owner decisions.
- [Product scope](../../product/product-scope.md) — the approved service boundary.
- [Test strategy and test data policy](../test-strategy-and-test-data-policy.md) — synthetic data requirements.
- [Database and RBAC](../../architecture/database-and-rbac.md) — role model the demo must not contradict.
- [QA and Playwright](../qa-and-playwright.md) — route and click verification.

## Constraints carried from policy

- Roles are never inferred from email, client state, editable metadata, or URLs — including in the demo. A demo shortcut here would be re-implemented as a real vulnerability later.
- Public Jitsi is permitted only in this clearly labelled internal fake-data mode, and is never a fallback for a real call.
- No sensitive data in `localStorage`, Redux persistence, logs, analytics, screenshots, URLs, or test artefacts, even when synthetic.

## Relationship to the phases

Work done here is a demonstration slice, not a production implementation. Where it takes a shortcut
that Phase 2, 3, or 4 will have to replace — mock provisioning, seeded roles, a labelled placeholder
video surface — record it in the
[deferred simplifications ledger](../../audit-trail/README.md#deferred-simplifications-ledger) with a
close condition naming the phase that resolves it.

---

# Tier 2 — Implementation Plan

**Written:** 27 August 2026. **Grounded in:** the live workspace as inspected on that date, recorded
under *Verified starting state* below. Every requirement cites the knowledge-base document it comes
from; anything without a citation has been removed or escalated rather than invented.

## Verified starting state

Read directly rather than recalled. Each row was checked on 27 August 2026 and is the basis for the
work breakdown; re-verify before starting, because a plan is a proposal and the live system is ground
truth.

| Checked | Finding | Consequence |
| --- | --- | --- |
| `git status` at the workspace root and in `Orion_React_App/` | **Not a git repository.** No version control exists anywhere in the workspace. | Append-only migrations, reviewable change, and secret scanning all presuppose version control. This is step D0. |
| `find` for `supabase/` | Absent. No project directory, no `config.toml`, no migrations. | Everything server-side is greenfield. Nothing to reconcile against. |
| `find` for `.github/` | Absent. No CI. | CI is Phase 1's deliverable; the demo runs its checks locally and does not need it. |
| `grep -ri supabase src/` | Zero matches. `@supabase/supabase-js` 2.112.4 is a declared dependency that is never imported. | The client exists in `package.json` only. No integration to extend. |
| Local toolchain | node 22.23.2, npm 12.0.2, git 2.50.1, Supabase CLI 2.109.1. **Docker absent.** Deno absent. | `supabase start` needs a container runtime. This decides the environment choice in D0. |
| `src/pages/Login.jsx` | Derives the role from an email substring (`admin`/`doctor`/`patient`), assigns `Admin`/`Doctor`/`Patient`/`User`, and mints `dummy-access-token-…`. On-screen hint invites the user to try it. | Directly contrary to the charter constraint that roles are never inferred from email *including in the demo*. Must be removed by this track, not deferred. |
| `src/redux/store.js` | `redux-persist` persists the whole `auth` slice — user, role, both tokens — to `localStorage` under key `root`. | Contrary to *Constraints carried from policy*: no sensitive data in `localStorage` or Redux persistence, even when synthetic. |
| `src/routes/routeConfig.jsx` | No guard of any kind. `/appointments`, `/dashboard`, `/settings`, `/sessions` all render for an unauthenticated visitor. | The demo's gate requires role-correct navigation, so guards are in scope here. |
| `src/pages/Appointments.jsx` | Hardcodes two public Jitsi URLs — `meet.jit.si/OrionCareerCounselingSession` and `.../OrionPracticeJobInterview` — as static, guessable, meaningful room names, rendered in an iframe with camera and microphone permissions. | Contrary to the [video provider decision record](../../architecture/video-provider-decision-record.md) requirement that rooms use random identifiers with no meaning. Replaced in D5. |
| `src/pages/DoctorAvailability.jsx` and `src/pages/PatientAppointment.jsx` | Two parallel mock booking pages, 309 and 313 lines. Neither persists; both end in `alert()`. Content is out of scope — cardiologists, neurologists, paediatricians, career counselling, consultation fees in `$` and `₱`. Neither enforces a 45-minute session. | The duplicate-booking-route entry already open in the [deferred simplifications ledger](../../audit-trail/README.md#deferred-simplifications-ledger). Consolidated in D3. |
| `src/pages/Sessions.jsx` | Two hardcoded completed "Career Counseling" sessions. No note surface. | Out of scope content; rewritten or removed in D3. |
| `src/components/Sidebar.jsx` | Defined and exported, imported nowhere. Dead code. The visible in-page sidebar is hand-duplicated across four pages and shows every link to every visitor. | Role-correct navigation cannot be built on a duplicated, role-blind menu. Consolidated in D2. |
| `tests/e2e/public-navigation.spec.js` | Three tests. One asserts that the mock login lands on `/home` — it encodes the behaviour D2 removes. | That test is rewritten, not deleted, so public navigation stays covered. |
| `package.json` scripts | `dev`, `build`, `lint`, `preview`, `test:e2e*`. No unit-test runner is installed. | The unit layer named in [QA and Playwright](../qa-and-playwright.md) does not exist yet; D7 adds the smallest one that covers the time-boundary helpers. |
| `Orion_React_App/.env` and `.gitignore` | `.env` holds `VITE_API_BASE_URL` only — no secret present. `.env` is **not** ignored, and no `.env.example` exists. | [Environment, release and secrets](../../operations/environment-release-and-secrets.md) requires a committed `.env.example` with names and no values. Fixed in D0. |

## Two corrections to the charter above

Both follow from the verified state, and both are recorded here rather than edited into the Tier 1
charter, which is meant to stay stable.

**"Consumes: Nothing" is true of decisions and false of mechanics.** No register answer blocks this
track — that part stands. But five provisioned accounts, a synthetic seed that can be recreated from
scratch, and credentials held per the secrets policy cannot exist without an environment, a migration
path, and somewhere to keep a key. The demo therefore consumes a deliberately small, non-production
subset of Phase 1. It does not close Phase 1's gate, which additionally requires environment
separation, an access register, CI/CD, monitoring, and a proven restore exercise.

**A purely client-side demo is not available.** It would be the fastest route to the gate, and it is
ruled out by the charter's own constraint that roles are never inferred from client state *including
in the demo*, on the stated grounds that a demo shortcut here becomes a real vulnerability later. A
role held in the browser is client state by definition. The role must therefore be a server-held fact
from the first commit, which is what the charter means by borrowing a thin slice of Phase 2 and 3
capability.

## Environment choice

The register's [*What may continue before answers*](../../product/pilot-decision-register.md#what-may-continue-before-answers)
permits establishing non-production environments now, and [Phase 1](phase-1-baseline.md#blocked-by)
confirms that Q2 and Q9 block **production** vendor accounts only. Two options satisfy that; this is a
technical decision, which the register's ownership table assigns to the developer.

| Option | Cost | Recommendation |
| --- | --- | --- |
| Hosted free Supabase project, non-production, synthetic data only | A vendor account, no Docker | **Recommended.** Docker is absent, and the owners can open a URL rather than watch a screen share. |
| Local stack via `supabase start` | Requires installing a container runtime | Fallback if a zero-vendor footprint is preferred. |

Three conditions apply to the recommended option and belong in the as-built entry: the project is
created under a role email rather than a personal one; it holds synthetic data only, so no personal
data is processed and neither Q2 nor Q9 is engaged; and it is treated as disposable, because the
operating entity is not yet identified and the eventual production project cannot inherit this one.

## Work breakdown

Each step names the authority behind it. Steps are ordered by dependency, not by size.

## Execution update — 30 August 2026

**Partially completed ✅** D0 and the database-only part of D1 are now in place for Orion's hosted,
non-production project. The workspace has Git, a root `.gitignore`, a value-free `.env.example`, local
Supabase configuration, and two applied append-only migrations. The applied foundation contains the
three approved roles (`patient`, `psychiatrist`, `admin`), the five core tables, 45-minute and overlap
constraints, RLS, least-privilege grants, and a clean Supabase security-advisor result.

This does **not** close the demo milestone: synthetic account provisioning, real Supabase Auth in the
client, booking/cancellation functions, database-backed UI, video boundary, and end-to-end/RLS tests
remain. No secretary role, real data, or production configuration was added. The scoped connection and
migration record are documented in [Supabase integration](../supabase.md).

### D0 — Preconditions

1. Initialise version control at the workspace root and make the first commit before any other change, so every step below is reviewable and reversible. Required by the append-only migration and rollback stance in [environment, release and secrets](../../operations/environment-release-and-secrets.md#delivery).
2. Extend `.gitignore` to cover `.env`, `.env.*.local`, `playwright/.auth/`, and Supabase CLI scratch directories. Add a committed `.env.example` naming every variable with no values, per the same document's *Secrets* section.
3. Create the non-production Supabase project per *Environment choice* above, and record who holds access to it. This is the seed of the access register that Phase 1 completes.
4. Confirm no secret reaches the browser: only the project URL and the anon key may appear as `VITE_*`. The service role key and any video-provider key are server-side only, per [engineering conventions](../engineering-conventions.md#data-and-security-conventions).

### D1 — Server-held identity, roles, and the booking tables

Authored as timestamped, append-only migrations. The shape follows [database and RBAC](../../architecture/database-and-rbac.md#core-model) exactly, so Phase 2 extends this rather than replacing it.

- `profiles`, `psychiatrists`, `availability_slots`, `appointments`, and a minimal `audit_events`, with the field sets that document names.
- `timestamptz` throughout; `Asia/Manila` for display only, per the [appointment lifecycle](../../product/appointment-lifecycle.md#timing-rules).
- A database check constraint enforcing `ends_at = starts_at + interval '45 minutes'` on both slots and appointments — the 45-minute rule is a [product scope](../../product/product-scope.md#hard-rules) hard rule and belongs in the schema, not in a client calculation.
- A constraint permitting at most one active appointment per slot, and preventing overlapping active slots for one psychiatrist, per the same document's integrity rules.
- `appointments` stores the cancelling party as a column. The lifecycle document requires this as *a stored fact, not inferred from who called the endpoint*, because slot reopening depends on it. The demo only exercises patient cancellation, and the column is still populated.
- RLS enabled on every table, default `anon` and `authenticated` grants revoked, then separate `select` / `insert` / `update` / `delete` policies each carrying an ownership or assignment predicate, per [database and RBAC](../../architecture/database-and-rbac.md#security-design).

**The role type carries three values — `patient`, `psychiatrist`, `admin` — and not `secretary`.**
This is deliberate. [Database and RBAC](../../architecture/database-and-rbac.md#roles) still states that
those three are the sole application roles, and under the [authority order](../../README.md#authority-order)
that document governs until it is deliberately updated. See *Knowledge-base conflict* below; the
fourth role is Phase 2's to add, after the architecture documents are reconciled.

### D2 — Authentication and role-correct navigation

- Supabase Auth with email and password as the only authentication path. One configured client in `src/lib/`, per the [architecture](../../architecture/architecture.md#frontend-structure) frontend structure and the *one source of truth per domain* principle in [engineering conventions](../engineering-conventions.md#core-principles).
- The signed-in user's role is read from `profiles`. Never from the email address, user metadata, a URL, or anything the browser can edit — [access control and audit policy](../../architecture/access-control-and-audit-policy.md#roles).
- Create one CASL ability from that server-held role and use it for route presentation, navigation, and hiding unavailable actions. CASL is a frontend consistency layer only: every data read remains subject to RLS and every privileged write remains server-authorised.
- One role-to-routes map in `src/constants/` and one shared route guard, rather than a role check repeated per page — the pattern named in the [engineering conventions](../engineering-conventions.md#orion-examples) table.
- Navigation renders from that same map, replacing the hand-duplicated sidebar in four pages and deleting the unused `Sidebar.jsx`.
- **Removed in this same step, each verified absent afterwards:** the email-substring role logic and its on-screen hint in `Login.jsx`, the dummy token minting, `redux-persist` of the auth slice, and — once nothing else uses the store — Redux and the placeholder Axios client and `authService`, since Supabase Auth owns the session. [Engineering conventions](../engineering-conventions.md#code-organization) require deleting a replaced abstraction in the same change when it is safe to do so.

Route guards improve navigation and are not a security control; RLS remains authoritative. That
distinction is stated in [engineering conventions](../engineering-conventions.md#react-conventions)
and the [threat model](../../architecture/threat-model-and-security-architecture.md#security-rules),
and the D7 deny tests are written against the data boundary rather than the route.

### D3 — One booking workflow

- A single booking route. `DoctorAvailability.jsx`, its stylesheet, and its route entry are deleted; the surviving page is rewritten against real slot data. This is the close condition already recorded against the duplicate-booking entry in the [deferred simplifications ledger](../../audit-trail/README.md#deferred-simplifications-ledger). A second booking path is a correctness hazard, not a convenience.
- `book-appointment` as an Edge Function: confirm the caller is a patient, lock the requested slot, derive `starts_at` and `ends_at` from the locked slot rather than from the browser, insert the appointment, mark the slot booked, and write the audit event — in one transaction, keyed by an idempotency key so a double-click or a retry returns the original result. Specified in [database and RBAC](../../architecture/database-and-rbac.md#book-appointment) and the lifecycle [integrity rules](../../product/appointment-lifecycle.md#integrity-rules).
- `cancel-appointment` as an Edge Function: confirm ownership, verify `starts_at > now() + interval '24 hours'`, set the status, record the timestamp and the cancelling party, return the slot to availability because the patient cancelled, and write the audit event. The denial is plain language and the decision is the server's — [product scope](../../product/product-scope.md#hard-rules) states that only the server or database may decide whether a cancellation is allowed.
- Conflict responses use a stable generic code such as `slot_unavailable` and never disclose another person's booking, per the lifecycle integrity rules.
- The 24-hour boundary is displayed to the patient before they act, but eligibility is never decided in the browser.

**Out of scope for the demo, and each a named Phase 4 deliverable:** psychiatrist self-service
cancellation at 48 hours, the coordinator-executed late cancellation, rescheduling as a linked
cancel-and-rebook, and the no-show transition. The demo exercises the two transitions the charter's
gate names and no others.

### D4 — The psychiatrist's view

The assigned psychiatrist sees their own upcoming sessions and no one else's, scoped by an RLS
assignment predicate rather than by filtering in the client. [Data classification](../../governance/data-classification-and-data-dictionary.md#readers)
sets the reader matrix: a psychiatrist reads their own assigned appointments only. The corresponding
deny test in D7 is what evidences it.

### D5 — Labelled fake-data video mode

- `get-meeting-access` as an Edge Function: confirm the caller is either the patient or the assigned psychiatrist on that appointment and that the appointment is in a state that admits a participant, then return the room reference. Specified in [database and RBAC](../../architecture/database-and-rbac.md#join-meeting).
- With Daily, the function mints a short-lived, room-scoped and participant-scoped token server-side; no provider secret reaches the browser. With the Jitsi fallback it returns a random room identifier and no token.
- Room identifiers are random and carry no client, psychiatrist, email, date, or appointment meaning, per the [video provider decision record](../../architecture/video-provider-decision-record.md#required-integration-pattern). A fixed `demo-synthetic-` prefix is permitted because it encodes nothing about a person; it also makes the demo status visible inside the provider's own interface.
- Recording, transcription, chat, file transfer, and screen sharing are off, per the same record and [clinical safety](../../product/clinical-safety-and-telepsychiatry-policy.md#product-safeguards).
- The two hardcoded `meet.jit.si` URLs are removed from `Appointments.jsx` in this step.

**On the unmissable label.** The charter requires a label that is unmissable and not disableable from
the client, on the grounds that it is the only thing distinguishing a permitted demo call from a
prohibited real one. Three mechanisms, and one honest limitation:

1. The demo mode is a server-issued fact returned by `get-meeting-access`. The call surface refuses to render without it, so the client cannot obtain a call with the mode switched off — there is no client-side toggle to find.
2. The room name itself carries the prefix, so the label appears inside the provider's interface, where the application does not control the pixels and a client-side edit cannot reach.
3. A persistent page banner states plainly that this is a synthetic-data demonstration and not a real consultation.

The limitation: a viewer with developer tools open can hide the banner **on their own screen**. What
they cannot do is obtain a room without the demo mode, or change what the provider displays. This is
recorded the way the knowledge base records the equivalent limit on free-text notes — as a known
limitation, not as an enforcement claim. The [threat model](../../architecture/threat-model-and-security-architecture.md#security-rules)
requires exactly this: no security claim resting on a UI guard.

**With Jitsi specifically, anyone holding the room URL can join.** Jitsi is not an authorisation
boundary — the [video provider decision record](../../architecture/video-provider-decision-record.md)
says so directly. Orion performs the entitlement check; the room does not enforce it. That is
tolerable only because every participant and every appointment in this milestone is synthetic, and it
is the reason the fallback is never available for a real call.

### D6 — The synthetic seed

- Exactly five accounts: two patients, two psychiatrists, one admin, per the charter's account boundary.
- Names are obviously synthetic, so that no screenshot of the demo can be mistaken for a real client record. This extends the same reasoning as the video label.
- Two active psychiatrist profiles and a set of open 45-minute slots, generated relative to the moment the seed runs so that some sit beyond the 24-hour cancellation boundary and some inside it. Without both, the boundary cannot be demonstrated in either direction.
- Zero appointments are seeded. The demo books one live, which is what the gate asks a reviewer to watch.
- The seed is deterministic and re-runnable from an empty database, per the charter deliverable. Synthetic data only, in every environment, per the [test-data policy](../test-strategy-and-test-data-policy.md#test-data).
- The five passwords are synthetic but are still credentials: they live in an ignored local file and in `.env.example` by name only, never in Git, fixtures, or the seed migration.

### D7 — Verification

Four layers, because [QA and Playwright](../qa-and-playwright.md#test-layers) states plainly that no
one layer substitutes for another — a passing browser test does not prove RLS holds, and a passing RLS
test does not prove a patient can use the screen.

| Layer | Coverage for this milestone |
| --- | --- |
| Database / RLS | Allow and deny per table and per role. At minimum: a patient cannot read another patient's appointment; a psychiatrist cannot read an appointment they are not assigned to; no role can write its own `profiles.role`; the admin has no unrestricted appointment read. |
| Integration | Two simultaneous bookings against one slot leave exactly one appointment and return `slot_unavailable` to the other. A repeated booking call with the same idempotency key returns the original result rather than a second appointment. |
| Unit | The 24-hour boundary helper and the 45-minute derivation, as pure functions — the layer [QA and Playwright](../qa-and-playwright.md#test-layers) assigns to domain helpers, and which does not exist in the prototype yet. |
| Playwright | Named per that document's structure: `auth.spec.js`, `patient-booking.spec.js`, `psychiatrist-sessions.spec.js`, `authorization.spec.js`, `cancellation.spec.js`, `meeting-access.spec.js`. Accessible locators only. Desktop and Pixel 5, both already configured. `public-navigation.spec.js` has its mock-login test rewritten. |
| Manual | One two-party call between two synthetic accounts in separate browser contexts, with camera and microphone preflight — the check [test strategy](../test-strategy-and-test-data-policy.md#required-test-layers) reserves for a human because CI stubs video. |

Each Playwright fixture uses its own account. [QA and Playwright](../qa-and-playwright.md#test-data-and-authentication)
prohibits sharing one mutable account across parallel booking tests, and the two-patient account set
exists partly to make that possible.

## Gate evidence

The charter's gate is met when a reviewer can, against synthetic data only, log in as each of the five
accounts, see role-correct navigation, complete a booking as a patient, see it as the assigned
psychiatrist, and reach video admission with a labelled fake-data call placed between two synthetic
accounts.

| Gate clause | Evidence |
| --- | --- |
| Log in as each of five accounts | `auth.spec.js` across all five, plus a demonstrated sign-in during the showcase |
| Role-correct navigation | `authorization.spec.js` allow and deny paths, backed by the RLS deny tests — the routes are the visible half, the policies are the real one |
| Complete a booking as a patient | `patient-booking.spec.js`, plus the concurrency and idempotency integration tests |
| See it as the assigned psychiatrist | `psychiatrist-sessions.spec.js`, plus the cross-psychiatrist RLS deny test |
| Reach video admission | `meeting-access.spec.js` allow and deny, plus the manual two-party call |
| Cancellation behaves | `cancellation.spec.js` in both directions across the 24-hour boundary |

Closing this gate authorises nothing about real users, and closes no phase gate. That is stated in the
charter and repeated here because the showcase is the moment it is most likely to be misread.

## Policy gaps this plan did not fill

Each is a decision belonging to a named owner. The plan states the gap and stops.

| Gap | Owner | How this plan handles it |
| --- | --- | --- |
| Whether the demo expands to six accounts with a secretary | Company owners — *New decisions arising* on the register | Planned at five. The secretary is a separable increment: one seeded account, one role value, one navigation entry, and the notes denial it exists to be excluded from. |
| Whether session notes appear in the demo at all | Company owners — same section | Excluded. If added, the increment is a notes table with a release state, patient read-after-release, audited reads, and an explicit secretary deny — and it should not be built before the retention dependency below is understood. |
| Retention period for any data category | Register Q11, open | No retention or disposal behaviour is built. The demo database is disposable and recreated from the seed, which is not a retention policy and must not be recorded as one. |
| Real-launch video provider | Register Q8, deferred | The demo integration is a proof of the integration boundary. It is not an approved production choice and must not be promoted without a recorded Q8 decision. |
| No-show, grace period, join window, session-end treatment | Clinical lead, unappointed | Not built. The demo has no no-show transition and admits a participant only for a `booked` appointment. |
| Launch geography and operating-review cadence | Register Q1, partial | Not applicable. The demo has no registration path at all — the account set is fixed at five and provisioned by seed. |
| Consent wording | Register Q7, structure approved, text undrafted | No consent capture in the demo. Phase 3 owns it, and it cannot be built against undrafted wording. |

## Knowledge-base conflict found while planning

Recorded here rather than resolved, because the [authority order](../../README.md#authority-order)
requires stopping and updating the knowledge base deliberately rather than coding around a conflict.

Two architecture documents were not reconciled in the 27 August 2026 pass, and both now contradict
answered register questions:

- [Database and RBAC](../../architecture/database-and-rbac.md) states that `patient`, `psychiatrist`, and `admin` are the sole application roles, has no secretary column in its capability matrix, lists no session-notes table in its core model, and describes `cancel-appointment` as enforcing the 24-hour patient rule only — with no 48-hour psychiatrist boundary and no coordinator-executed late cancellation.
- [Access control and audit policy](../../architecture/access-control-and-audit-policy.md) states that a support role is "not created until a separate policy approves a minimum-data support model". Register Q10 is that approval, and the document has not caught up.

This does not block the demo, which builds only the three roles both documents already sanction. It
does block Phase 2, whose charter names data classification, privacy governance, and product scope as
the prerequisite updates — all three of which are now complete — but does not name these two. The
prerequisite list is incomplete. Phase 2's Tier 2 plan carries this forward.

## Deferred simplifications to record on closure

To be added to the [deferred simplifications ledger](../../audit-trail/README.md#deferred-simplifications-ledger)
with the phase that resolves each, per the charter's *Relationship to the phases*.

| Area | Deferred | Close when |
| --- | --- | --- |
| Identity | No registration, no invitation or provisioning workflow, no psychiatrist approval state, no MFA, no account recovery | Phase 3 |
| Roles | Three roles rather than four; no secretary | Phase 2, after the architecture documents are reconciled |
| Clinical content | No session notes table, no release state, no audited reads | Phase 2, and only once register Q11 is answered |
| Consent | No consent records captured | Phase 3, against owner-approved wording |
| Lifecycle | No psychiatrist cancellation, coordinator late cancellation, reschedule, or no-show | Phase 4 |
| Video | Demo-mode provider integration only; no token revocation, copied-link denial, outage handling, or preflight | Phase 5 |
| Platform | One environment rather than three; no CI, no monitoring, no backup or restore exercise, no access register beyond a note of who holds the demo project | Phase 1 |
| Audit | Audit events written for booking and cancellation only; no read auditing, no append-only enforcement, no retention or review process | Phase 2 and Phase 6 |

## Inputs I did not have

The rewrite checklist for whoever implements this. Verify each before starting rather than trusting
this plan.

1. **Whether the owners have since answered the secretary and session-notes demo questions.** Both were open on 27 August 2026. An answer either way changes D1, D6, and the account boundary.
2. **Whether a Supabase project, Daily account, or role email already exists** that this milestone should use rather than create. Nothing in the workspace indicated one, but the workspace is not the whole picture.
3. **Whether Q5 has been ratified.** The transitions the demo relies on — 45 minutes, the 24-hour patient boundary, patient-cancelled slots reopening — were recorded by the developer and await owner ratification. A change on ratification changes D1 and D3.
4. **Whether the prototype has changed since 27 August 2026.** Every row of *Verified starting state* is a point-in-time reading of an uncommitted working directory with no version control, which is precisely the condition under which a file changes without a trace.
5. **Which container runtime, if any, is acceptable on the developer's machine**, should the local Supabase option be preferred over the hosted one.
6. **Whether the showcase is a screen share or self-service for the owners.** The environment recommendation assumes the owners will want to click through it themselves; a screen share makes the local option viable at no loss.

## Constraint restated

Nothing in this milestone authorises real users, real clinicians, real appointments, or real
sessions. Synthetic data only, in every environment, without exception — including the demonstration
shown to the owners.
