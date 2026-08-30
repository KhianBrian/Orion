# Phase 2 — Data, RBAC, Consent, and Audit

**Tier 2 status:** Planned 27 August 2026. The implementation plan is below the charter, and it carries one unmet prerequisite — see *The prerequisite is larger than the charter states*.

## Purpose

Build the protected data foundation: profiles, verified clinicians, availability, appointments,
consent, session notes, and audit schema, with row-level security and grants, private functions for
privileged operations, and the lifecycle and concurrency controls that make booking safe under
contention.

This is the most consequential phase for everything after it. Its as-built shape — function
signatures, RLS predicates, audit columns — is what Phase 3 routes read and what Phase 4 booking code
is written directly against.

## Gate

A verified RLS allow and deny matrix, an idempotent slot-lock transaction, and audit evidence.

The allow and deny matrix must now cover four roles and the session notes table, which is the most
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
| **Q10 — secretary role** | A fourth role. Access to appointments and contact details only. **Never** session notes. This is an RLS deny that must be explicitly tested, not merely omitted. |
| **Q3 — psychiatrist approval** | Clinician records carry an approval state. A psychiatrist may not appear bookable or read any patient data until approved. |
| **Q1 — patient self-registration** | Patient rows may be created by self-registration; clinician and secretary rows may not. |
| **Q5 — appointment transitions** | The status model can now be built. See the [appointment lifecycle](../../product/appointment-lifecycle.md) *Approved transitions* section, which is authoritative. Three schema consequences: a cancellation must store **which party cancelled**, since slot reopening depends on it and it must not be inferred from who called the endpoint; a reschedule links two appointment records created in the same transaction; and no new `rescheduled` state is added. |

## Still blocked

| Register question | What cannot be finalised |
| --- | --- |
| **Q11** — retention and deletion | Retention fields and deletion semantics, now including session notes as clinical records. The tension between a deletion request and append-only appointment, consent, and audit history is unresolved. Do not implement a deletion path yet. |
| **Q5 referral** — no-show party | Whether a psychiatrist no-show is distinguishable from a patient no-show is referred to the clinical lead. The recommendation is a single `no_show` state with the absent party as a field, which is the extension-safe option — build it that way and the clinical ruling changes a value, not the schema. |

## Deliverables

- Protected profile tables with no role inference from email, client state, editable metadata, or URLs.
- A four-role model: patient, psychiatrist, secretary, admin.
- A verified-clinician model with an approval state, where both verification and approval are server-held facts.
- Availability and appointment schema supporting the approved lifecycle, with a provisional status model.
- A session notes table with an explicit release state, psychiatrist authorship, patient read-after-release, and secretary denial.
- Versioned consent records capturing what was acknowledged, in which version, and when — independently withdrawable.
- An audit schema sufficient to evidence access and change, covering note creation, release, and every read of a note.
- Row-level security and grants on every table, with a documented allow and deny matrix verified by test across all four roles.
- Private or protected functions for every privileged operation, callable only by an authorised server context.
- An idempotent slot-lock transaction that holds correctly under concurrent booking attempts.

## Authoritative documents

- [Database and RBAC](../../architecture/database-and-rbac.md) — the primary authority for this phase.
- [Access control and audit policy](../../architecture/access-control-and-audit-policy.md) — audit and access requirements.
- [Appointment lifecycle](../../product/appointment-lifecycle.md) — states, transitions, and timing rules.
- [Data classification and data dictionary](../../governance/data-classification-and-data-dictionary.md) — **needs updating before implementation**; session notes are not yet classified.
- [Privacy governance](../../governance/privacy-governance.md) — **needs updating before implementation**; consent and retention do not yet cover clinical content.
- [Test strategy and test data policy](../test-strategy-and-test-data-policy.md) — RLS test expectations.

## Prerequisite outside this folder

The Q6 decision moves Orion from scheduling-only to holding clinical content. Three knowledge-base
documents still state that Orion holds no clinical notes. Per the
[authority order](../../README.md#authority-order), those documents govern until deliberately updated,
so **the schema must not be built ahead of them**. Update data classification, privacy governance, and
product scope first.

## Notes are the highest-risk object in this schema

Session notes are sensitive personal information under the Data Privacy Act, and they are free text.
Two consequences the implementation plan must address rather than assume away:

1. **"No diagnoses" is unenforceable by the system.** A free-text field can contain anything. The control is clinical guidance and note-field labelling, not a database constraint. Record this as a known limitation rather than implying the schema prevents it.
2. **Read access must be audited, not just write access.** Who opened a note and when is the evidence that the secretary denial and the release rule actually held.

## What this fixes for later phases

Phase 3 role-aware routes read this schema, now including the secretary role and the note release
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
| [Database and RBAC](../../architecture/database-and-rbac.md) | `patient`, `psychiatrist`, and `admin` are "the sole application roles". No secretary in the capability matrix. No session-notes table in the core model. `cancel-appointment` described as enforcing the 24-hour patient rule only, with no 48-hour psychiatrist boundary and no coordinator-executed path. | The four-role model, the notes table, and the cancellation function — that is, most of this phase. |
| [Access control and audit policy](../../architecture/access-control-and-audit-policy.md) | A support role is "not created until a separate policy approves a minimum-data support model". | The secretary role. Register Q10 is that approval; the document has not caught up. |

**Do not build the fourth role or the notes table ahead of these updates.** The reconciliation is a
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

The phase remains open: its complete booking/cancellation transaction functions, consent model,
session-note model, full role/action RLS coverage, and automated allow/deny tests are not yet built.
No fourth/secretary role has been created.

## Two design decisions that carry the phase

Both concern session notes, which the [data classification](../../governance/data-classification-and-data-dictionary.md#classification)
document calls the most sensitive object in the system.

### Reads of a note go through a function, never through a select

The requirement that note **reads** are audited, not only writes, is not satisfiable with row-level
security alone. A `select` writes nothing, and Postgres has no read trigger. The design that follows
from the requirement is therefore:

- **No application role holds `select` on the notes table.** Not the patient, not the author, not the admin, and — structurally rather than by omission — not the secretary.
- The only read path is a `security definer` function that checks the caller's entitlement, writes the audit event, and returns the note in one transaction. No audit row, no note.

This inverts the usual shape and is worth the inversion. The [data classification](../../governance/data-classification-and-data-dictionary.md#readers)
document states that the secretary exclusion "is a deny that must be explicitly tested, not merely
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

- The role type gains `secretary`, becoming the four-role model the charter requires — **after** the architecture documents are reconciled.
- `profiles` links one-to-one to `auth.users` and holds `role`. No update policy grants any role the ability to write `profiles.role`, for anyone including itself. Role changes happen only inside a `security definer` function that records an audit event, per [database and RBAC](../../architecture/database-and-rbac.md#security-design).
- A patient row is created by a trigger on user creation with the role fixed at `patient` in the function body — not taken from sign-up input, user metadata, or anything else the client supplies. This is how Q1 self-registration and the prohibition on role inference coexist.
- Psychiatrist and secretary rows are created only by the provisioning function. There is no self-service path to either, per Q1 and Q10.

### P2-2 — Clinicians, verification, and approval

`psychiatrists` carries two distinct server-held facts, and conflating them would be a mistake:

- **Approval state** — the Q3 gate. A psychiatrist may not appear bookable and may not read any patient data until approved. Approval transitions are function-mediated and audited, and the approver is a recorded identity rather than an assumed role, since who approves is [still open](../../product/pilot-decision-register.md#outstanding-for-the-next-owner-meeting).
- **Active flag** — the operational toggle from [database and RBAC](../../architecture/database-and-rbac.md#core-model), used for availability and offboarding. An approved clinician can be inactive; an unapproved one is never bookable regardless.

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
- Indexes on `(psychiatrist_id, starts_at)` and `(patient_id, starts_at)` and on open-slot lookup, per [database and RBAC](../../architecture/database-and-rbac.md#indexes-and-integrity).
- Appointments are never hard-deleted.

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
- The patient read function returns a note only when released. The author's read function returns their own note at any state. There is no secretary path at all, and no admin path by default — [data classification](../../governance/data-classification-and-data-dictionary.md#readers) marks admin access to notes as *not by default*, which means a function that does not exist rather than a permission that is switched off.
- A released note is never overwritten or withdrawn. A correction creates an immutable, versioned amendment that retains the original, records the author and timestamp, and is visible to the patient as note history. This is an audit and transparency requirement, not a claim that free-text clinical content is otherwise constrained.
- **No retention column, no disposal behaviour, no deletion path.** [Data classification](../../governance/data-classification-and-data-dictionary.md#open-dependency) is unambiguous: no retention period may be invented and no deletion path implemented until register Q11 is recorded. The schema is created; the lifecycle is not.
- The field label and any surrounding guidance say what the note is for. They do not claim to constrain it. "No diagnoses" is unenforceable in a free-text column and the [data dictionary](../../governance/data-classification-and-data-dictionary.md#free-text-is-a-limitation-not-a-control) requires this to be recorded as a known limitation rather than described as a schema control. The as-built entry should say so in those terms.

### P2-6 — Consent

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
- The allow-and-deny matrix is written down as a document, four roles across every table and action, and it is the artefact the gate is assessed against. It derives from the [reader matrix](../../governance/data-classification-and-data-dictionary.md#readers) in the data dictionary, which governs where the two differ.
- Supabase Auth's `authenticated` role means signed in and nothing more. It is never treated as authorisation, per the same section.

## Gate evidence

The gate is a verified RLS allow and deny matrix, an idempotent slot-lock transaction, and audit
evidence — now across four roles and including the notes table.

| Clause | Evidence |
| --- | --- |
| Allow and deny matrix | A test per table, per action, per role, in both directions. Named for the behaviour they protect, as [engineering conventions](../engineering-conventions.md#testing-and-verification) requires — `patient_cannot_read_another_patients_appointment`, `secretary_cannot_read_any_session_note`, `no_role_can_write_its_own_profile_role`. |
| Secretary exclusion | Two tests, not one: the direct table select is denied, and the read function refuses a secretary caller. The exclusion must fail closed at both layers. |
| Release rule | The patient read function returns nothing for an unreleased note and the note once released. The author's function returns it at both states. |
| Read auditing | For every successful and every refused note read, a matching audit row exists — and it contains no note content. |
| Idempotent slot lock | Concurrent bookings against one slot leave exactly one appointment. A repeated call with the same idempotency key returns the original appointment rather than creating a second. |
| Audit evidence | Append-only enforcement verified by attempting an update and a delete as each role, and having both refused. |

## Policy gaps this plan did not fill

| Gap | Owner | How this plan handles it |
| --- | --- | --- |
| Retention and deletion, including notes as clinical records (Q11) | Company owners with DPO advice | Note and consent schemas are created. No retention column, no disposal behaviour, no deletion path. Audit accumulation recorded as a pending decision rather than a settled one. |
| Whether a subject access request overrides the release step | DPO or legal adviser | The release step is built as a product rule governing the application surface, and is not recorded anywhere as a privacy control. No export path is built. |
| Whether a psychiatrist no-show is distinguishable from a patient one | Clinical lead | A single `no_show` status with a nullable absent-party column. A ruling changes a value, not the schema. |
| Released-note correction | Decided | No retraction or overwrite. Corrections are immutable versioned amendments with patient-visible history. |
| Secretary scope — per-psychiatrist or clinic-wide, whether they may act on a client's behalf, whether they may see that a note exists | Company owners | Policies are written for the narrowest reading: appointments and contact details, clinic-wide, no note visibility of any kind including existence. Widening later is a policy change; narrowing later would mean access already granted. |
| Consent wording | Company owners, with DPO and clinical review | Version references are stored; no version is seeded. |

## What the as-built entry must record

Phase 3 and Phase 4 are written against this phase's actual shape, so the entry is specific or it is
useless: every function name and full signature, the exact RLS predicate per table and role, the audit
event codes and their payload shape, the enumerated status values, the idempotency key's uniqueness
scope, and every place where the implementation departed from this plan.

## Inputs I did not have

1. **Whether the two architecture documents have been reconciled.** The fourth role and the notes table are blocked until they are. Check the documents, not this plan.
2. **Whether the demo milestone has run**, which determines whether this phase authors the base schema or extends one that exists. Query the live project.
3. **The Phase 1 as-built migration process** — authoring convention, review, application order, and rollback stance. This plan assumes it exists; it is written against the process that actually does.
4. **Whether Q11 has been answered.** If it has, retention becomes part of this phase rather than a hole in it, and the note lifecycle can be built at the same time as the note schema.
5. **Whether Q5 has been ratified.** The status model here implements transitions that await ratification.
6. **Whether the owners have settled the secretary's scope**, which determines whether the narrowest-reading policies above need widening before Phase 3 provisions the role.
