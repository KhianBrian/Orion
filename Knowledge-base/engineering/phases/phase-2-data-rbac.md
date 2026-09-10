# Phase 2 — Data, RBAC, Consent, and Audit

**Status: Closed with deferred post-development work — 10 September 2026.**

**Tier 2 status:** Planned 27 August 2026. The implementation plan is below the charter, and it carries one unmet prerequisite — see *The prerequisite is larger than the charter states*.

## R1 supersession boundary

This is the pre-R1 data/RBAC plan. Its original role-expansion notes, consent design, and session-note
controls remain inputs, but its schema is not sufficient for the 8 September change set. R1.1 owns the
guardian-consent, payment attempt/event, support-ticket, and 15/45/15 timing extensions. Do not add
them opportunistically to this phase's old Tier 2 plan; draft R1.1 from the applied schema and the
reconciled [data dictionary](../../governance/data-classification-and-data-dictionary.md).

## R1 impact and work ownership — 10 September 2026

The decisions about session notes, three consent categories, backend-provisioned psychiatrists,
public patient registration, and the appointment state machine are now part of the current target.
They do not mean this phase was completed: the current database still has only the original three
roles and core tables.

Phase 2 remains responsible for its original data/RBAC foundation: protected profiles and clinician
backend provisioning, session notes and their release/read rules, appointment lifecycle facts, slot locking, and
the complete allow/deny matrix. Consent persistence and capture remain planned product work, but are
sequenced after the broader feature set is developed.

[Phase 15](phase-15-data-consent-and-audit-foundation.md) is the implementation owner for the new R1
extensions: eligibility and guardian-consent evidence, `payment_pending`/reserved compatibility,
payment attempts/events, support tickets/messages, and shared R1 audit/RLS additions. Support-ticket
access must use the existing least-privilege roles; no new application role or duplicate migration is
needed. [Phase 16](phase-16-identity-and-minor-eligibility.md) then consumes the exact result.

## Purpose

Build the protected data foundation: profiles, verified clinicians, availability, appointments,
consent, session notes, and audit schema, with row-level security and grants, private functions for
privileged operations, and the lifecycle and concurrency controls that make booking safe under
contention.

This is the most consequential phase for everything after it. Its as-built shape — function
signatures, RLS predicates, audit columns — is what Phase 3 routes read and what Phase 4 booking code
is written directly against.

## Plain-English scope

The database already knows three roles: patient, psychiatrist, and admin. Phase 2 does not add a
fourth role. It adds the protected records and rules those three roles need:

- **Profiles and clinicians:** keep each person's role on the server, prevent anyone from changing
  their own role, and allow only the backend/admin provisioning path to create psychiatrists. The
  operational `is_active` flag controls bookability and patient-facing discovery.
- **Appointments:** store the lifecycle facts the system must trust, including who cancelled, linked
  records for rescheduling, no-show information, and the one-slot/one-booking rule. Booking and
  cancellation remain server-side transactions so two people cannot successfully take the same slot.
- **Session notes:** add a note linked to an appointment, written and released only by the assigned
  psychiatrist. The patient can read it only after release. Admin has no note-read path by default.
- **Consent (deferred):** eventually store three separate, versioned consent histories—privacy
  acknowledgement, informed consent, and optional communications. This migration and its capture flow
  are deliberately deferred until the broader feature set is developed. A withdrawal will add a new
  history record rather than erase old evidence.
- **Audit:** record who did what, to which record, when, and whether it succeeded. Note reads are
  audited as well as note writes, without copying note content into the audit log.

In plain English, the RLS work means:

- A patient sees only their own profile, appointments, consents, and released notes, and can use only
  server-approved booking/cancellation functions.
- A psychiatrist sees only their own availability and assigned appointments, and can write or release
  only their own appointment notes.
- Admin can perform approved operational and provisioning actions, but does not automatically gain
  access to clinical-note content or every patient's data.
- Anonymous users get no protected data. A signed-in Supabase user is not automatically trusted; the
  application role and the person's relationship to the row are checked separately.
- Direct table permissions stay narrow. Sensitive note reads, writes, releases, role changes, and
  other privileged actions go through protected server functions that also write the required audit
  event.

## Gate

A verified RLS allow and deny matrix, an idempotent slot-lock transaction, and audit evidence.

The allow and deny matrix must now cover the three application roles and the session notes table, which is the most
sensitive object in the schema.

## Consumes

- **Phase 1 as-built:** the migration authoring and application process, the environment promotion path, and the synthetic seed mechanism. The implementation plan is written against the process that actually exists, not the one Phase 1 proposed.
- **Phase 0:** the approved data boundary and consent model, recorded in the [pilot decision register](../../product/pilot-decision-register.md).

## Owner decisions now available

| Decision | Effect on this phase |
| --- | --- |
| **Q6 — session notes in scope** | A notes table is required: written by the psychiatrist, released by the psychiatrist, then readable by the patient. Prescriptions, diagnoses, recordings, transcripts, reason-for-visit, chat, and files remain excluded. |
| **Q6 — note release step** | A note has an unreleased and a released state. The patient may read it only once released. Release is an auditable event. |
| **Q7 — consent structure** | Three separate versioned consent records — privacy acknowledgement, informed consent, optional communications — each independently withdrawable. Consent scope now extends to session notes. |
| **Q3 — psychiatrist provisioning** | Admins/developers add psychiatrists through the backend. A created psychiatrist is trusted; `is_active` controls whether patients can discover or book them. |
| **Q1 — patient self-registration** | Patient rows may be created by self-registration; psychiatrist and admin rows may not. |
| **Q5 — appointment transitions** | The status model can now be built. See the [appointment lifecycle](../../product/appointment-lifecycle.md) *Approved transitions* section, which is authoritative. Three schema consequences: a cancellation must store **which party cancelled**, since slot reopening depends on it and it must not be inferred from who called the endpoint; a reschedule links two appointment records created in the same transaction; and no new `rescheduled` state is added. |

## Still blocked

| Register question | What cannot be finalised |
| --- | --- |
| **Q11** — retention and deletion | Retention fields and deletion semantics, now including session notes as clinical records. The tension between a deletion request and append-only appointment, consent, and audit history is unresolved. Do not implement a deletion path yet. |
| **Q5 referral** — no-show party | Whether a psychiatrist no-show is distinguishable from a patient no-show is referred to the clinical lead. The recommendation is a single `no_show` state with the absent party as a field, which is the extension-safe option — build it that way and the clinical ruling changes a value, not the schema. |

## Deliverables

- Protected profile tables with no role inference from email, client state, editable metadata, or URLs.
- A three-role model: patient, psychiatrist, admin. There is no separate support role.
- A backend-provisioned clinician model with server-held role and activation facts.
- Availability and appointment schema supporting the approved lifecycle, with a provisional status model.
- A session notes table with an explicit release state, psychiatrist authorship, patient read-after-release, and default admin denial.
- Versioned consent records capturing what was acknowledged, in which version, and when — independently withdrawable; implementation deferred until post-development.
- An audit schema sufficient to evidence access and change, covering note creation, release, and every read of a note.
- Row-level security and grants on every table, with a documented allow and deny matrix verified by test across all three roles.
- Private or protected functions for every privileged operation, callable only by an authorised server context.
- An idempotent slot-lock transaction that holds correctly under concurrent booking attempts.

## Authoritative documents

- [Database and RBAC](../../architecture/database-and-rbac.md) — the primary authority for this phase.
- [Access control and audit policy](../../architecture/access-control-and-audit-policy.md) — audit and access requirements.
- [Appointment lifecycle](../../product/appointment-lifecycle.md) — states, transitions, and timing rules.
- [Data classification and data dictionary](../../governance/data-classification-and-data-dictionary.md) — reconciled for session notes; Q11 retention remains open.
- [Privacy governance](../../governance/privacy-governance.md) — reconciled for clinical content; DPO/legal questions and Q11 remain open.
- [Test strategy and test data policy](../test-strategy-and-test-data-policy.md) — RLS test expectations.

## Prerequisite outside this folder

The Q6 decision moved Orion from scheduling-only to holding clinical content. The register records
the product scope, data classification, privacy governance, and service charter as reconciled. Per the
[authority order](../../README.md#authority-order), those documents govern until deliberately updated,
the remaining open policy questions still govern the schema: do not invent retention or deletion
behaviour, and do not treat the note-release rule as a legal privacy boundary.

## Notes are the highest-risk object in this schema

Session notes are sensitive personal information under the Data Privacy Act, and they are free text.
Two consequences the implementation plan must address rather than assume away:

1. **"No diagnoses" is unenforceable by the system.** A free-text field can contain anything. The control is clinical guidance and note-field labelling, not a database constraint. Record this as a known limitation rather than implying the schema prevents it.
2. **Read access must be audited, not just write access.** Who opened a note and when is the evidence that the default admin denial and the release rule actually held.

## What this fixes for later phases

Phase 3 role-aware routes read this schema, now including the three application roles and the note release
state. Phase 4 booking calls this phase's slot-lock function by its actual signature. Phase 5 derives
video participant entitlement from the appointment record defined here. Phase 6 retention and
data-subject processes operate on these tables. The as-built entry for this phase should therefore
document exact function signatures and table shapes, not just outcomes.

## Constraints carried from policy

- RLS and protected server functions are authoritative. Route guards only improve navigation and are never a security control.
- Append-only migrations; appointment, consent, and audit history is never deleted.
- Roles are never inferred from anything the client can edit.
- Synthetic data only in every non-production environment — including synthetic session notes.

---

# Tier 2 — Implementation Plan

**Written:** 27 August 2026. This phase's as-built shape is what Phase 3 routes read and what Phase 4
booking code is written directly against, so the plan specifies function signatures and predicates
rather than outcomes.

## Verified starting state

| Checked | Finding |
| --- | --- |
| `find` for `supabase/` across the workspace | Absent on 27 August 2026. No project directory, no migrations, no applied history, no live database to query. |
| `grep -ri supabase src/` | Zero matches. `@supabase/supabase-js` is declared in `package.json` and imported nowhere. |
| Prototype data | Entirely hardcoded in page components. No table exists, so no prototype table holds data. |

The charter's *Inputs I did not have* asks for the live schema, the existing policies, and the applied
migration history to be queried rather than inferred. On 27 August 2026 there was nothing to query.
**If the [demo milestone](demo-milestone.md) has run since, that is no longer true** — it creates
`profiles`, `psychiatrists`, `availability_slots`, `appointments`, and a minimal `audit_events`, and
this phase then extends that schema through forward migrations rather than authoring it fresh. Query
the live project before writing the first migration.

## The prerequisite is larger than the charter states

The charter names three documents to update before implementation: data classification, privacy
governance, and product scope. **All three were reconciled on 27 August 2026.** Two others were not,
and both are in the architecture tier, which under the [authority order](../../README.md#authority-order)
governs technical boundaries until deliberately updated:

| Document | What it still says | What it blocks |
| --- | --- | --- |
| [Database and RBAC](../../architecture/database-and-rbac.md) | The three application roles are now current. The session-notes table and full lifecycle function remain to be built. | The notes table, cancellation function, and complete RLS matrix. |
| [Access control and audit policy](../../architecture/access-control-and-audit-policy.md) | No separate support role is created. Operational support is an admin responsibility unless a future decision creates a distinct role. | No role expansion; the document now matches the three-role model. |

**Do not build a separate support role.** The reconciliation is a
knowledge-base task, not a code task, and needs no owner input beyond the Q6 and Q10 answers already
recorded — it is scheduled as P0-4 in the [Phase 0 plan](phase-0-governance.md). Everything else in
this phase can proceed in parallel.

## Execution update — 30 August 2026

**Foundation completed ✅** The approved three-role, non-production database foundation is applied:
`profiles`, `psychiatrists`, `availability_slots`, `appointments`, and `audit_events`; supporting
enums, foreign keys, indexes, 45-minute checks, and a slot-overlap exclusion constraint are present.
RLS is enabled on every public table, direct client grants are limited, and the security advisor is
clean. This as-built state is documented in [Database and RBAC](../../architecture/database-and-rbac.md)
and [Supabase integration](../supabase.md).

Historical note: at this point the phase was still open because consent was deferred and the new
migration and automated allow/deny tests still required database application and execution. No
separate support role was created.

## Implementation update — 10 September 2026

The first Phase 2 feature slice is applied through a forward-only migration sequence beginning with
`20260910102250_phase2_data_rbac_foundation.sql`, followed by two small qualification fixes found by
the live test. A subsequent forward migration removes the unnecessary clinician approval state after
the provisioning decision was clarified. The current schema uses backend-created psychiatrist rows
and `is_active` for patient discovery/bookability, alongside provider-neutral no-show/reschedule facts,
protected versioned session notes, audited note creation, release, and reads. The synthetic provisioner
continues to create active demo psychiatrists.

Consent persistence and capture remain deferred until post-development, and Google Meet remains a
Phase 18 concern. The migration sequence is applied to the linked non-production Supabase project,
and `npm run test:db:phase2` passes against it. The local environment still has no Docker/Postgres
runtime, so local Supabase lint/catalog checks remain unavailable.

### Official closure — 10 September 2026

Phase 2 is officially closed as an as-built foundation. Its gate evidence includes the complete
[complete three-role RLS matrix](#complete-three-role-rls-allowdeny-matrix), direct CRUD denial checks, protected-function checks,
latest-note-only patient access, admin audit-metadata visibility, and append-only audit mutation tests,
all passing against the linked synthetic non-production database.

Consent persistence and capture is the deferred Phase 2 work item. It is recorded with the other
post-development deferrals in [deferredpostdevelopment.md](deferredpostdevelopment.md). Phase 2 does
not include a patient note-history/list surface: patients may read only the latest released note, while
superseded versions remain protected and are evidenced through admin-visible audit metadata.

## Two design decisions that carry the phase

Both concern session notes, which the [data classification](../../governance/data-classification-and-data-dictionary.md#classification)
document calls the most sensitive object in the system.

### Reads of a note go through a function, never through a select

The requirement that note **reads** are audited, not only writes, is not satisfiable with row-level
security alone. A `select` writes nothing, and Postgres has no read trigger. The design that follows
from the requirement is therefore:

- **No application role holds `select` on the notes table.** Patient, psychiatrist, and admin reads all go through audited functions with explicit checks.
- The only read path is a `security definer` function that checks the caller's entitlement, writes the audit event, and returns the note in one transaction. No audit row, no note.

This inverts the usual shape and is worth the inversion. The [data classification](../../governance/data-classification-and-data-dictionary.md#readers)
document states that the default admin exclusion "is a deny that must be explicitly tested, not merely
omitted from a grant" — and a table nobody may select from turns that deny into the default rather
than into a policy someone might later write around. It also makes the audit record structurally
inseparable from the access, which is what [privacy governance](../../governance/privacy-governance.md#clinical-content)
means when it says the audit is the evidence that the exclusion and the release rule held.

Writes and the release transition go through functions on the same basis, so that authorship, release,
and every read produce audit events of the same shape.

### The release step is built as a product rule, not a privacy boundary

Whether a data-subject access request overrides the note release step is
[referred to the DPO](../../governance/privacy-governance.md#questions-for-the-dpo-or-legal-adviser)
and unanswered, and the charter is explicit that Phase 2 must not treat the release step as a privacy
boundary if access rights override it. That reads like a blocker. It is not, provided the distinction
is kept:

- **What this phase builds** is the application read rule: the patient-facing read function returns a note only when it has been released. That is the Q6 decision — the psychiatrist controls the timing — and it is a product rule about a product surface.
- **What this phase does not build** is any export or subject-access path. That belongs to Phase 6, and it is the path the DPO's answer actually governs.
- **What this phase must not write down** is any claim that an unreleased note is inaccessible to the patient as a matter of privacy. It is unavailable through the application. Whether it is withholdable from a formal request is not engineering's to assert, and must not appear in the data dictionary, the privacy notice, or the audit design.

Recorded this way, the DPO's answer changes Phase 6's export path and one sentence of the privacy
notice. It does not change this phase's schema in either direction.

## Work breakdown

Authored as append-only migrations following the process established in
[Phase 1](phase-1-baseline.md), each carrying its RLS, grants, policies, indexes, and tests in the
same change, per [engineering conventions](../engineering-conventions.md#data-and-security-conventions).

### P2-1 — Roles and profiles

- The role type remains limited to `patient`, `psychiatrist`, and `admin`. No support-role enum value, account, or navigation surface is added.
- `profiles` links one-to-one to `auth.users` and holds `role`. No update policy grants any role the ability to write `profiles.role`, for anyone including itself. Role changes happen only inside a `security definer` function that records an audit event, per [database and RBAC](../../architecture/database-and-rbac.md#security-design).
- A patient row is created by a trigger on user creation with the role fixed at `patient` in the function body — not taken from sign-up input, user metadata, or anything else the client supplies. This is how Q1 self-registration and the prohibition on role inference coexist.
- Psychiatrist and admin rows are created only by protected provisioning flows. There is no self-service path to either.

### P2-2 — Clinicians, verification, and backend provisioning

`psychiatrists` carries the operational server-held fact that matters to the product:

- **Active flag** — the operational toggle from [database and RBAC](../../architecture/database-and-rbac.md#core-model), used for patient discovery, availability, bookability, and offboarding. Backend/admin provisioning creates the row as active; deactivation removes it from patient-facing availability without changing the person's role.

There is no pending or approval transition. The backend provisioning path is the trust boundary and is
restricted to developers/service operations and authorized admins.

Verification evidence itself is not stored here. [Data classification](../../governance/data-classification-and-data-dictionary.md#classification)
places private verification records outside the public psychiatrist profile, and nothing in the
approved data boundary admits a credential document.

### P2-3 — Availability and appointments

- `availability_slots` and `appointments` per the [core model](../../architecture/database-and-rbac.md#core-model), with a check constraint fixing `ends_at = starts_at + interval '45 minutes'` on both. The 45-minute rule is a [product scope](../../product/product-scope.md#hard-rules) hard rule and belongs in the schema.
- Overlap prevention for a psychiatrist's active slots and appointments is a Postgres exclusion constraint over a time range, not application logic — the [minimal implementation ladder](../engineering-conventions.md#minimal-implementation-ladder) prefers a database constraint, and a constraint holds under concurrency where a check-then-insert does not.
- A partial unique constraint permits at most one active appointment per slot.
- Status values are enumerated: `booked`, `completed`, `cancelled`, `no_show`, matching the [canonical states](../../product/appointment-lifecycle.md#canonical-states). No `rescheduled` value is added — the lifecycle document models a reschedule as linked cancel-and-rebook precisely so the immutable-history rule holds.
- **The cancelling party is a stored column**, populated at cancellation, never inferred from who called the endpoint. Slot reopening depends on it, and the [integrity rules](../../product/appointment-lifecycle.md#integrity-rules) require it as a stored fact.
- **The absent party is a nullable column beside a single `no_show` status.** This is the extension-safe option the charter names: if the clinical lead later rules that a psychiatrist no-show is distinguishable, the ruling changes a value rather than the status model. Populated only when the status is `no_show`.
- A self-reference links a reschedule's two appointment records, written in the same transaction that creates them so a partial link cannot exist.
- **Transition ownership:** Phase 2 stores `no_show_party` and `rescheduled_from_id`; Phase 13 owns the
  authorized outcome, psychiatrist-cancellation, no-show, and reschedule functions after its named
  clinical decisions are ratified. Phase 2 does not expose incomplete transition endpoints.
- Indexes on `(psychiatrist_id, starts_at)` and `(patient_id, starts_at)` and on open-slot lookup, per [database and RBAC](../../architecture/database-and-rbac.md#indexes-and-integrity).
- Appointments are never hard-deleted.
- **Provider boundary:** Phase 2 does not create Google Meet rooms, store Google credentials, or make
  meeting creation a prerequisite for a valid appointment. The existing synthetic room reference is
  compatibility data for the demo. Phase 18 owns the production Google Meet reference, admission,
  outage handling, and any provider-specific fields. A booked appointment may exist before meeting
  access is available; the Join action remains unavailable until Phase 18 supplies it.

### P2-4 — The slot-lock transaction

One function, called by the Phase 4 booking path, and the phase gate depends on it:

1. Confirm the caller is a patient and that the appointment would not violate eligibility.
2. Lock the requested slot row.
3. Re-check the slot's status **after** taking the lock, not before.
4. Derive `starts_at` and `ends_at` from the locked slot, never from the request body — the [integrity rules](../../product/appointment-lifecycle.md#integrity-rules) require derivation from the slot.
5. Insert the appointment, mark the slot booked, write the audit event.
6. Return the appointment, or a stable generic `slot_unavailable` that discloses nothing about the other booking.

Idempotency is a unique constraint on the caller and their idempotency key, recording the resulting
appointment, so a retry returns the original result rather than creating a second appointment. A
constraint rather than a lookup, because the lookup has a race and the constraint does not.

The function's exact signature goes into the as-built entry. Phase 4 is written against it directly.

### P2-5 — Session notes

Subject to the prerequisite above.

- One note per appointment, authored by the assigned psychiatrist, holding the note body, a release state, and a released timestamp — the field set in the [data dictionary](../../governance/data-classification-and-data-dictionary.md#classification).
- **No `select` grant to any application role.** Authorship, release, and every read go through functions, per the design decision above.
- The patient read function returns only the latest released note for the patient's own appointment. The author's read function returns their own note at any state, including protected prior versions. Admin has no note-read path — [data classification](../../governance/data-classification-and-data-dictionary.md#readers) marks admin access to notes as *not by default*, while admins may review audit metadata about note access.
- A released note is never overwritten or withdrawn. A correction creates an immutable, versioned amendment that retains the original and records the author and timestamp. Patients may read only the latest released version; superseded note bodies remain protected. Admin-visible audit metadata proves the access history without exposing clinical content.
- **No retention column, no disposal behaviour, no deletion path.** [Data classification](../../governance/data-classification-and-data-dictionary.md#open-dependency) is unambiguous: no retention period may be invented and no deletion path implemented until register Q11 is recorded. The schema is created; the lifecycle is not.
- The field label and any surrounding guidance say what the note is for. They do not claim to constrain it. "No diagnoses" is unenforceable in a free-text column and the [data dictionary](../../governance/data-classification-and-data-dictionary.md#free-text-is-a-limitation-not-a-control) requires this to be recorded as a known limitation rather than described as a schema control. The as-built entry should say so in those terms.

### P2-6 — Consent — deferred until post-development

Do not add the consent tables, consent capture UI, or withdrawal flow during the current feature-build
sequence. Keep the approved three-consent design and implement it after the broader product features
are complete, with final wording and version identifiers supplied by the owners/DPO/clinical reviewers.

When resumed, the following remains the required design:

Three versioned records — privacy acknowledgement, informed consent, optional communications — per
the Q7 structure, each independently withdrawable.

- Append-only. A withdrawal is a new event, not an update to an old one, because the record is evidence of what was acknowledged and when, and evidence that can be overwritten is not evidence. [Privacy governance](../../governance/privacy-governance.md#engineering-requirements) requires versioned, timestamped acknowledgement; [database and RBAC](../../architecture/database-and-rbac.md#core-model) records the document version, actor, choice, and timestamp.
- The current state of any consent is derived from the latest event for that actor and document, not stored as a mutable flag.
- Version identifiers reference approved wording. The wording is [undrafted and unapproved](../../product/pilot-decision-register.md#outstanding-for-the-next-owner-meeting), so the schema stores a version reference and this phase seeds none. Phase 3 captures consent against approved text; a consent record pointing at unapproved wording would be worse than no record.

### P2-7 — Audit

- Event code, actor and target identifiers, outcome, reason code, timestamp, correlation identifier — and nothing else. [Access control and audit policy](../../architecture/access-control-and-audit-policy.md#audit-events) prohibits free text, credentials, room identifiers, and clinical content in audit storage. A note's audit row records that a note was read, by whom, and when. It never records what the note said.
- Append-only for application users: insert only, no update, no delete, and writes originate from the privileged functions rather than from clients.
- Coverage per the same document: login and denial, role and provisioning change, clinician activation and deactivation, availability and appointment mutation, cancellation, consent change, video-token issue and deny, break-glass, and admin action — plus note creation, release, and **every read**.
- Retention, readers, export, and periodic review are owned by operations and the DPO, and none is set. Audit rows accumulate; that is a decision pending under Q11, and the as-built entry should record it as pending rather than as settled.

### P2-8 — Policies, grants, and the matrix

- RLS enabled on every exposed table; default `anon` and `authenticated` grants revoked; separate `select`, `insert`, `update`, and `delete` policies, each carrying an ownership or assignment predicate, per [database and RBAC](../../architecture/database-and-rbac.md#security-design).
- The complete three-role allow-and-deny matrix is included below. It derives from the [reader matrix](../../governance/data-classification-and-data-dictionary.md#readers) in the data dictionary, which governs where the two differ.
- Supabase Auth's `authenticated` role means signed in and nothing more. It is never treated as authorisation, per the same section.

### Complete three-role RLS allow/deny matrix

The application roles are `patient`, `psychiatrist`, and `admin`. Anonymous requests have no protected
table or function access. Direct table access is intentionally narrower than the product capability:
booking, cancellation, note writes/releases/reads, and provisioning use protected server functions.

| Table/action | Patient | Psychiatrist | Admin |
| --- | --- | --- | --- |
| `profiles` SELECT | Own row | Own row | Own row |
| `profiles` INSERT | Deny direct | Deny direct | Deny direct |
| `profiles` UPDATE | Own `full_name`/`phone`; role denied | Own `full_name`/`phone`; role denied | Own `full_name`/`phone`; role denied |
| `profiles` DELETE | Deny direct | Deny direct | Deny direct |
| `psychiatrists` SELECT | Active rows only | Own row | All rows |
| `psychiatrists` INSERT/UPDATE/DELETE | Deny direct | Deny direct | Deny direct; backend provisioning only |
| `availability_slots` SELECT | Open slots for active psychiatrists | Own psychiatrist's slots | All slots |
| `availability_slots` INSERT/UPDATE/DELETE | Deny direct | Deny direct | Deny direct; approved administration only |
| `appointments` SELECT | Own appointments | Assigned appointments | Deny by default |
| `appointments` INSERT/UPDATE/DELETE | Deny direct; booking/cancellation functions only | Deny direct | Deny direct; exceptional operations require a later approved function |
| `session_notes` SELECT | Deny direct; latest released own note only through audited read function | Deny direct; assigned notes through audited read function | Deny note content |
| `session_notes` INSERT/UPDATE/DELETE | Deny direct; protected note functions only | Deny direct; protected note functions only | Deny direct |
| `audit_events` SELECT | No rows | No rows | Audit metadata only |
| `audit_events` INSERT/UPDATE/DELETE | Deny direct; privileged functions write events | Deny direct; privileged functions write events | Deny direct; privileged functions write events |

The `service_role` is an infrastructure trust boundary, not an application role. It can perform
synthetic-fixture maintenance and execute the protected functions. Production operational code must
keep that key server-side.

Patients never receive superseded note bodies. Corrections remain separate protected rows for
clinical and audit history. Admins can review the audit metadata proving successful and denied note
reads, but cannot read the note content itself.

## Gate evidence

The gate is a verified RLS allow and deny matrix, an idempotent slot-lock transaction, and audit
evidence — now across three roles and including the notes table.

| Clause | Evidence |
| --- | --- |
| Allow and deny matrix | `npm run test:db:phase2` exercises every table/action row for all three roles, including cross-user and cross-clinician denies; the expected result is recorded in the complete matrix above. |
| Admin clinical-note exclusion | The direct table select is denied and no admin note-read function is exposed. The exclusion must fail closed at both layers. |
| Release rule | The patient read function returns nothing for an unreleased note and the note once released. The author's function returns it at both states. |
| Read auditing | For every successful and every refused note read, a matching audit row exists — and it contains no note content. |
| Idempotent slot lock | Concurrent bookings against one slot leave exactly one appointment. A repeated call with the same idempotency key returns the original appointment rather than creating a second. |
| Audit evidence | The same database test attempts audit insert, update, and delete as patient, psychiatrist, and admin; all are refused. |

## Policy gaps this plan did not fill

| Gap | Owner | How this plan handles it |
| --- | --- | --- |
| Retention and deletion, including notes as clinical records (Q11) | Company owners with DPO advice | Note and consent schemas are created. No retention column, no disposal behaviour, no deletion path. Audit accumulation recorded as a pending decision rather than a settled one. |
| Whether a subject access request overrides the release step | DPO or legal adviser | The release step is built as a product rule governing the application surface, and is not recorded anywhere as a privacy control. No export path is built. |
| Whether a psychiatrist no-show is distinguishable from a patient one | Clinical lead | A single `no_show` status with a nullable absent-party column. A ruling changes a value, not the schema. |
| Released-note correction | Decided | No retraction or overwrite. Corrections are immutable versioned amendments; patients can read only the latest released version, while superseded versions remain protected and are evidenced through admin-visible audit metadata. |
| Separate support role scope — per-psychiatrist or clinic-wide, whether they may act on a client's behalf, whether they may see that a note exists | Company owners | Policies are written for the narrowest reading: appointments and contact details, clinic-wide, no note visibility of any kind including existence. Widening later is a policy change; narrowing later would mean access already granted. |
| Consent wording | Company owners, with DPO and clinical review | Version references are stored; no version is seeded. |

## What the as-built entry must record

Phase 3 and Phase 4 are written against this phase's actual shape, so the entry is specific or it is
useless: every function name and full signature, the exact RLS predicate per table and role, the audit
event codes and their payload shape, the enumerated status values, the idempotency key's uniqueness
scope, and every place where the implementation departed from this plan.

## Inputs I did not have

1. **Whether the two architecture documents have been reconciled.** The notes table and lifecycle functions are blocked until the documents and schema contract agree. Check the documents, not this plan.
2. **Whether the demo milestone has run**, which determines whether this phase authors the base schema or extends one that exists. Query the live project.
3. **The Phase 1 as-built migration process** — authoring convention, review, application order, and rollback stance. This plan assumes it exists; it is written against the process that actually does.
4. **Whether Q11 has been answered.** If it has, retention becomes part of this phase rather than a hole in it, and the note lifecycle can be built at the same time as the note schema.
5. **Whether Q5 has been ratified.** The status model here implements transitions that await ratification.
6. **Whether owners later want a separate support role.** It is explicitly out of the current Phase 2 scope; adding one later requires a new policy decision, enum migration, UI, and RLS review.
