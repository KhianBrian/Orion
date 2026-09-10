# Data Classification and Data Dictionary

Amended 27 August 2026. Register question 6 brought session notes into scope, which moves Orion from
holding scheduling metadata to holding clinical content. Everything else in the prohibited list stands.

## Classification

Appointment metadata and the fact that a person is seeing a psychiatrist are sensitive. Apply the
strictest handling to any data that can identify a client, clinician, appointment, or consultation
access.

**Session notes are the most sensitive object in the system.** They are health information and
therefore sensitive personal information. Unlike every other group below, note *read* access is
audited, not only writes — the audit record is the evidence that the default admin exclusion and the
release rule actually held.

| Data group | Allowed at pilot | Purpose | Never place in |
| --- | --- | --- | --- |
| Account | name, email, verified contact method, password handled by Auth | account access and support | browser logs, analytics, screenshots, URLs |
| Client appointment | appointment ID, client ID, psychiatrist ID, time, status, cancelling party, reschedule link | booking and access control | localStorage, Redux persistence, public errors |
| Session note | note ID, appointment ID, author psychiatrist ID, note body, release state, released timestamp | record the session for the patient and clinician; retain protected corrections | logs, analytics, screenshots, URLs, error messages, support tickets, monitoring, test artefacts, any non-clinical surface |
| Psychiatrist profile | approved display name, specialty, photo, active status, approval state | discovery | private verification records/public endpoints |
| Consent | notice/version hash, actor, timestamp, choice | prove approved acknowledgement | editable client-only state |
| Audit | event code, actor/target IDs, outcome, timestamp, correlation ID | security/operations review; admin metadata review | free text, tokens, room names, clinical content |

## R1 data extensions awaiting approval

The 8 September direction introduces three new data groups. They are not yet schema authority: their
exact fields, readers, retention, disposal, and legal/privacy approval must be recorded before R1.1
creates them.

| Data group | Minimum intended purpose | Non-negotiable boundary |
| --- | --- | --- |
| Guardian-consent record | evidence that the approved minor pathway was completed | Do not collect guardian identity/relationship evidence or grant guardian account/note access until clinical and DPO/legal approval defines it. |
| Payment attempt and payment event | reconcile a PayMaya payment with one appointment, patient, and psychiatrist | Store provider references and safe status/amount metadata only; never card, wallet, or credential data. The server derives all Orion IDs. |
| Support ticket and reply | let a patient ask for administrative help and let authorised staff respond | No uploads, clinical notes, diagnosis, or care discussion. Ticket content is still personal data and must not enter logs, analytics, URLs, or test artefacts. |

## Readers

| Data group | Patient | Psychiatrist | Admin |
| --- | --- | --- | --- | --- |
| Own account | yes | yes | contact details of clients | yes |
| Client appointment | own | own assigned | yes | yes |
| **Session note** | **own latest version, after release only** | **own authored, including protected prior versions** | **never** | **not by default** |
| Psychiatrist profile | approved fields | own | approved fields | yes |
| Consent | own | no | no | yes |
| Audit | no | no | no | yes |

The default admin exclusion from session notes is a deny that must be explicitly tested, not merely
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

The rule above requires a retention period for every field. **Session notes, guardian-consent records,
payment records, and support tickets have none yet.** Retention and the meaning of deletion sit with
register question 11, still open, and clinical records may carry a prescribed minimum retention period
rather than a chosen one. Until that decision is recorded:

- No retention period may be invented for these groups.
- No deletion path for them may be implemented.
- R1.1 may plan their schema, but not retention or disposal behaviour.
