# Privacy Governance

Amended 27 August 2026. Register question 6 brought session notes into scope, so Orion will process
health information. The requirements below apply with materially greater force than when this document
covered scheduling metadata only.

## Required ownership

Before launch, identify the Personal Information Controller model, legal entity, Data Protection
Officer, clinical owner, each processor/vendor, data location, and cross-border transfer position.
Legal/DPO owns the applicable lawful basis, notices, retention, data-subject-rights process, breach
determination, processor contracts, and registration determination.

The owners deferred the entity and DPO appointment on 27 August 2026 (register Q2). That deferral is
compatible with the synthetic demo and with planning. It is not compatible with processing real
personal data, and now less so: a DPO is required for organisations processing personal data, and
Orion will hold health information.

## Engineering requirements

- Capture consent/notice acknowledgement as versioned, timestamped evidence; distinguish mandatory care/privacy notices from optional communications.
- Give clients a documented process for access, correction, deletion/retention questions, and privacy complaints.
- Keep a record of processing activities and vendor data flows.
- Use purpose-limited, privacy-safe logs and prohibit sensitive values in observability, support tickets, and test artifacts.
- Review every vendor for confidentiality, access, subprocessors, security, breach cooperation, deletion/return, audit support, and approved transfer terms.

## Clinical content

Session notes are written by the psychiatrist after each session and become readable by the patient
once the psychiatrist releases them. They are sensitive personal information. The following apply in
addition to everything above.

- **Consent scope.** The informed consent approved under register Q7 must cover that notes are written, that the patient will be able to read them once released, and who else can and cannot see them. The three-consent structure stands; its scope has widened.
- **Access is audited.** Every read of a note is recorded, not only every write. This is what evidences that the secretary exclusion and the release rule held.
- **Least exposure.** Notes must not reach logs, analytics, error messages, monitoring, support tickets, screenshots, URLs, or test artefacts. Admin tooling must not surface them by default.
- **Vendor position changed.** Register Q9 was deferred, but Supabase would now store health information. Data location, subprocessors, breach cooperation, and cross-border transfer terms must be reviewed before production use, not merely before scale.
- **Retention is unresolved.** Register Q11 is open, and clinical records may carry a prescribed minimum retention period. No retention period may be invented and no deletion path built until it is recorded.

## Questions for the DPO or legal adviser

Engineering cannot resolve these and must not proceed on an assumption.

1. **Does a data-subject access request override the release step?** A patient may request all their data while a note is written but unreleased. If access rights override the release step, the release control is not a privacy boundary and Phase 2 must not treat it as one. If they do not, the reasoning needs recording.
2. **What is the lawful basis for the note, and is it the same as for scheduling?** Consent, contract, and vital-interests positions differ, and this affects whether a patient can withdraw the note's processing without closing their account.
3. **What does deletion mean for a note** when appointment, consent, and audit history must be retained under the [delivery plan](../engineering/delivery-plan.md) rollback rule? This is the same tension recorded against register Q11.
4. **Is a cross-border transfer occurring**, given the Supabase region in use, and does it require an approved transfer mechanism?
5. **Does the patient's ability to read notes change the privacy notice's description** of who has access to their information?

## Security incident rule

Document every suspected security incident immediately and route it to the DPO/security owner. The
DPO/legal owner decides notification obligations and affected-party communication; engineering
preserves evidence, limits exposure, and supports containment.

Because Orion now holds health information, any incident touching session notes should be treated as
potentially notifiable until the DPO determines otherwise, rather than the reverse.
