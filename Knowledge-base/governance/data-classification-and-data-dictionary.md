# Data Classification and Data Dictionary

Amended 27 August 2026. Register question 6 brought session notes into scope, which moves Orion from
holding scheduling metadata to holding clinical content. Everything else in the prohibited list stands.

## Classification

Appointment metadata and the fact that a person is seeing a psychiatrist are sensitive. Apply the
strictest handling to any data that can identify a client, clinician, appointment, or consultation
access.

**Session notes are the most sensitive object in the system.** They are health information and
therefore sensitive personal information. Unlike every other group below, note *read* access is
audited, not only writes — the audit record is the evidence that the secretary exclusion and the
release rule actually held.

| Data group | Allowed at pilot | Purpose | Never place in |
| --- | --- | --- | --- |
| Account | name, email, verified contact method, password handled by Auth | account access and support | browser logs, analytics, screenshots, URLs |
| Client appointment | appointment ID, client ID, psychiatrist ID, time, status, cancelling party, reschedule link | booking and access control | localStorage, Redux persistence, public errors |
| Session note | note ID, appointment ID, author psychiatrist ID, note body, release state, released timestamp | record the session for the patient and clinician | logs, analytics, screenshots, URLs, error messages, support tickets, monitoring, test artefacts, any secretary-visible surface |
| Psychiatrist profile | approved display name, specialty, photo, active status, approval state | discovery | private verification records/public endpoints |
| Consent | notice/version hash, actor, timestamp, choice | prove approved acknowledgement | editable client-only state |
| Audit | event code, actor/target IDs, outcome, timestamp, correlation ID | security/operations review | free text, tokens, room names, clinical content |

## Readers

| Data group | Patient | Psychiatrist | Secretary | Admin |
| --- | --- | --- | --- | --- |
| Own account | yes | yes | contact details of clients | yes |
| Client appointment | own | own assigned | yes | yes |
| **Session note** | **own, after release only** | **own authored** | **never** | **not by default** |
| Psychiatrist profile | approved fields | own | approved fields | yes |
| Consent | own | no | no | yes |
| Audit | no | no | no | yes |

The secretary exclusion from session notes is a deny that must be explicitly tested, not merely
omitted from a grant. Admin tooling must not expose notes by default.

## Prohibited without a new approved decision

Diagnosis, prescriptions, medication, appointment reasons, recordings, transcripts, attachments, raw
chat, marketing profiles, ad pixels, or session-content analytics.

Clinical notes were removed from this list on 27 August 2026 by register question 6, in the specific
form defined in the Session note row above. No other clinical content is permitted.

## Free text is a limitation, not a control

The note body is free text, so "no diagnoses" cannot be enforced by the system. A psychiatrist can
type a diagnosis into a note regardless of this policy. The control is clinical guidance and field
labelling, not a database constraint. Record this as a known limitation; do not describe the schema as
preventing it.

## Data rules

Every field must have an owner, purpose, reader, retention period, disposal method, and legal/privacy
approval. Collect the least data needed. Test and development use synthetic data only, including
synthetic note bodies.

## Open dependency

The rule above requires a retention period for every field. **Session notes have none yet.** Retention
and the meaning of deletion sit with register question 11, still open, and clinical records may carry a
prescribed minimum retention period rather than a chosen one. Until that decision is recorded:

- No retention period may be invented for notes.
- No deletion path for notes may be implemented.
- Phase 2 may create the note schema, but not its retention or disposal behaviour.
