# Pilot Decision Register

## Purpose

This is the single meeting agenda and decision log for policies that engineering must not invent. It lets Phase 0 progress through preparation while keeping unanswered matters as explicit launch blockers.

## Immediate demo milestone

The immediate milestone is a **synthetic-data demo**, not a real-market release. It uses exactly five fixed accounts:

| Account type | Count | Rule |
| --- | ---: | --- |
| Patient | 2 | Synthetic names, emails, appointments, and profile details only. |
| Psychiatrist | 2 | Synthetic clinician profiles and availability only. |
| Admin | 1 | Demo provisioning/visibility only; no consultation admission by default. |

There is no public sign-up, no real client/doctor information, no real clinical session, and no public Jitsi meeting in this milestone. The demo proves login, RBAC navigation, booking flow, scheduling rules, and the future video-admission integration boundary. A company-owner decision remains required before replacing these accounts with real users.

**Amendment, 31 August 2026.** D5 uses Jitsi as a Service (JaaS) under its free 25-MAU developer allowance. Orion issues short-lived participant JWTs server-side, so a copied room URL alone does not allow entry. This change applies only to the synthetic demo and does not approve JaaS for real sessions. The 27 August decision allowing Daily or public Jitsi as a demo fallback is superseded for D5.

## Ownership

| Responsibility | Working owner | Decision authority |
| --- | --- | --- |
| Technical architecture, implementation, security controls, QA, and operations setup | Developer | Developer, within approved policy and budget |
| Product scope, pilot size, commercial terms, budget, and residual business risk | Company owners | Company owners |
| Clinical safety, psychiatrist eligibility, emergency/referral policy, and clinical workflow | To be named by company owners | Named licensed clinical lead and company owners |
| Privacy/DPO designation, privacy notices, lawful basis, retention, and vendor agreements | To be formally designated by company owners | Company owners with DPO/legal advice |

The developer may draft, implement, and recommend controls, but a company owner must formally appoint the DPO and approve business, clinical, and privacy policy. The National Privacy Commission states that a DPO is required for organisations processing personal data. [NPC DPO guidance](https://privacy.gov.ph/appointing-a-data-protection-officer/)

## Questions for the company owners

Owner decisions recorded 27 August 2026. The suggested position was a starting point, not a decision already made.

| # | Question | Suggested starting position | Owner decision | Status | Blocks |
| --- | --- | --- | --- | --- | --- |
| 1 | Who may participate in the first real-market pilot, where are they located, and how many people may join? | Small invitation-only Philippines pilot with named psychiatrists and clients; daily operational review. | Public registration and login at initial launch. Patients self-register and are screened adults-only at sign-up. Psychiatrist and secretary accounts are invitation/provision-only, with an approval period before a psychiatrist takes bookings. **No active-patient cap will be used for the pilot.** The team will monitor real activity and plan scaling when demand justifies it. The approved launch geography and operating-review cadence remain to be decided. | Partially answered | Real-user launch |
| 2 | Which legal entity operates Orion and will act as the Personal Information Controller, and who is formally appointed as DPO? | Company owners identify the entity and appoint a DPO using a role email, not a personal address. | Deferred by the owners; not required for the demo or for planning. Remains a hard blocker before any real personal data is processed, and now more so because Orion will hold session notes. | Deferred | Privacy setup and launch |
| 3 | Who is the licensed clinical lead responsible for safety, clinician verification, eligibility, and referrals? | Contract/designate a licensed psychiatrist or clinical lead. | A psychiatrist approval/gating period is confirmed, and psychiatrist accounts are invitation/provision-only. The named approver, the verification criteria, and the clinical lead appointment remain to be decided. | Partially answered | Real sessions |
| 4 | Which patients are eligible, and what booking-service boundary applies when Orion is not appropriate? | Adults only initially; no emergency care; provide approved local urgent-help and referral route. | **Initial launch:** adults only, with an age self-declaration; no ID verification is collected. Orion is a psychiatry-appointment booking service, not an emergency or urgent-care service. It has no emergency workflow or triage. The patient-facing boundary and referral wording require clinical approval. A future decision on minors, guardians, and any ID/age-verification requirement is recorded below. | Answered for initial launch; future expansion open | Sign-up and consultation |
| 5 | What are the final policies for psychiatrist cancellation, rescheduling, no-shows, and reopening a cancelled slot? | Keep 45-minute sessions and patient cancellation only more than 24 hours ahead; define the remaining transitions. | 45-minute sessions and patient cancellation beyond 24 hours confirmed. Psychiatrist self-service cancellation requires 48 hours' notice; later cancellation is executed by a secretary or admin on their behalf with a recorded reason. Rescheduling is patient-initiated within the 24-hour boundary, modelled as linked cancel-and-rebook with no new state. No-show is set by the psychiatrist after a grace period, never automatically. Patient-cancelled slots reopen; psychiatrist-cancelled slots do not. Full detail in the [appointment lifecycle](appointment-lifecycle.md). Awaiting owner ratification, with four items referred onward. | Answered — pending ratification | Booking implementation |
| 6 | Which data may Orion collect in the first real pilot? | Account, contact, appointment, consent, and audit metadata only; no notes, diagnosis, prescriptions, reason-for-visit, recording, transcription, chat, or files. | Adopted as suggested, **plus session notes**: written by the psychiatrist after each session and visible to the patient once the psychiatrist releases them. A released note is never overwritten; any correction is a versioned amendment that retains the original, records who changed it and when, and is visible to the patient as note history. Prescriptions, diagnoses, session recordings, and transcripts are not permitted. Reason-for-visit, chat, and file transfer remain excluded. The secretary role has no access to notes. | Answered — scope widened | Schema and forms |
| 7 | Which privacy notice, telepsychiatry consent, and optional communications wording must clients see and acknowledge? | Separate versioned privacy acknowledgement, informed consent, and optional communications choices. | Adopted as suggested. Three separate versioned items. Consent scope must now also cover session notes, following the Q6 decision. Wording still to be drafted for owner approval. | Answered — structure | Sign-up and first session |
| 8 | Which private video provider is approved after privacy, clinical, legal/DPO, security, and operations review? | Evaluate Daily first using its free tier; private rooms and short-lived server tokens only. | **Demo:** JaaS using its free 25-MAU developer allowance and server-issued participant JWTs. **Real launch:** provider decision deferred to a future owner decision. | Answered for demo; open for launch | Real video sessions |
| 9 | Which vendor/data-transfer terms are acceptable for Supabase and the chosen video provider? | DPO/legal reviews contracts, data locations, subprocessors, breach support, and retention/deletion terms. | Deferred by the owners. Retained on this register as a launch blocker, not discarded, because Orion will hold session notes as health information. | Deferred | Production vendor use |
| 10 | Who provides support and clinical escalation, who can stop bookings/video, and what will clients be told during an incident? | Define support hours, clinical/DPO/security contacts, stop authority, and approved patient communication. | A **secretary role** will be added to handle bookings and client questions, with access to appointments and contact details only and no access to session notes. Support hours, stop authority, incident communication, and clinical escalation remain to be decided. The owners' position that clinical emergencies will not occur conflicts with the approved Q4 crisis path and is referred to the clinical lead. | Partially answered | Real-user launch |
| 11 | How long is each data category retained, and how do account closure, access/correction, and deletion requests work? | Approve a retention schedule and data-subject request process before launch. | Retention to follow the suggested schedule, benchmarked against comparable clinics. Must now account for session notes as clinical records, which may carry a prescribed minimum retention period. The operational meaning of deletion, given that appointment, consent, and audit history must be retained, remains to be decided. | Partially answered | Launch |
| 12 | Who gives final go/no-go approval for the controlled pilot after technical, clinical, privacy, and operational evidence is ready? | Company owners formally approve or defer launch. | Adopted as suggested. Company owners give final go/no-go. The five-account synthetic demo is showcased to the owners first. | Answered | Launch |

## Outstanding for the next owner meeting

Carried forward from the 27 August 2026 review. Each item blocks the work named against it.

- **Q3 — psychiatrist approval.** Who performs the approval, against what verification criteria, and who is appointed clinical lead. *Blocks: Phase 3 provisioning, real sessions.*
- **Q5 — ratification and two referred items.** The transitions were decided on 27 August 2026 and recorded in the [appointment lifecycle](appointment-lifecycle.md), which unblocks Phase 2 and Phase 4 planning. Owners to ratify, and to decide: the consequences of a no-show (forfeiture, fee treatment, whether it counts against a patient), and whether the secretary, the admin, or either may execute a late cancellation on a psychiatrist's behalf. Note that the [production service charter](production-service-charter.md) assigns no-show policy to **clinical leadership**, so the no-show mechanism needs a clinical ratification as well as an owner one. *Blocks: Phase 4 post-session handling and cancellation path; ratify before Phase 4 is built, since a change would alter the status model.*
- **Q7 — consent and notice wording.** The three-consent structure is approved, but the privacy notice text, the telepsychiatry informed-consent text, and the optional-communications wording are still to be drafted by the developer and approved by the owners. The Q6 decision widened the scope: the consent must now cover that session notes are written, that the patient can read them once released, and who else can and cannot see them. *Blocks: Phase 3 sign-up, first session.*
- **Phase 0 drafts awaiting owner approval.** Beyond the consent wording above: the retention schedule, the emergency and referral routing content, and the vendor comparison. The developer prepares each; owners approve. *Blocks: Phase 3 refusal path, Phase 6 retention process.*
- **Q10 — support and stop authority.** Support hours, who may halt bookings or video, what clients are told during an incident, and the clinical escalation contact. *Blocks: Phase 6 runbooks.*
- **Q11 — retention and deletion.** Retention period per data category including session notes, and what deletion means operationally when appointment, consent, and audit history must be retained. *Blocks: Phase 2 retention fields, Phase 6 processes.*
- **Q1 — launch geography and operating review.** No active-patient cap will be implemented. Decide the approved geography and how the team reviews activity and records when scaling work is needed. *Blocks: real-user launch scope and Phase 6 release scoping.*
- **Q4 — future eligibility expansion.** The initial launch is adults-only with self-declaration and no ID verification. Decide whether Orion may later accept minors, what guardian involvement is required, and whether age/identity verification is then necessary. *Does not block the adults-only launch.*
- **Q8 — real-launch video provider.** Deferred by the owners; must be decided before real video sessions. *Blocks: Phase 5 production integration.*
- **Q2 and Q9 — entity, DPO, and vendor terms.** Deferred by the owners; both required before real personal data is processed. *Blocks: launch.*

### Referred to the clinical lead

- **Clinical emergency position.** The owners' view that a clinical emergency will not occur conflicts with the approved Q4 crisis and referral path. Engineering is proceeding with the Q4 answer — the crisis path stays in — pending a clinical ruling. Psychiatric consultations carry a foreseeable risk of acute distress or a safety disclosure during a session, and this is not a determination engineering may make.
- **Patient-visible session notes.** A note written knowing the patient will read it differs clinically from a private record. The release step agreed on 27 August 2026 gives the psychiatrist control of timing, but the clinical governance of patient-visible notes warrants a clinical lead's view.
- **Late grace period before a no-show may be set.** Assigned to the clinical lead by the [appointment lifecycle](appointment-lifecycle.md) timing rules. Fifteen minutes of a 45-minute session is recommended for their consideration. *Blocks: Phase 4 no-show behaviour.*
- **Early join window and session-end treatment.** Also assigned to the clinical lead by the lifecycle timing rules, and still unset. *Blocks: Phase 4 join behaviour.*
- **Whether a psychiatrist no-show is distinguishable from a patient no-show.** The canonical state list has a single `no_show` and does not say whose. Recommendation: keep the one state and record the absent party as a field rather than adding a canonical state. *Blocks: Phase 2 status model.*
- **Future patient eligibility.** If Orion considers serving minors later, the clinical lead must define minimum age, guardian/consent requirements, suitability, and any age or identity verification. The current adults-only self-declaration remains unchanged until then.

## Meeting questions to resolve

These are the concrete questions to take to the next meeting. They refine existing register items;
they do not create new product policy by themselves.

### Psychiatrist approval — Q3

1. Who is the named licensed clinical lead, and who may approve a psychiatrist when that person is unavailable?
2. Which credentials and licence details must be verified, against which official source, before approval?
3. Who performs each check, where is the verification evidence recorded, and who may mark the psychiatrist active?
4. Does approval expire or require periodic re-verification? If so, at what interval and what happens while it is overdue?
5. Who may suspend or reactivate a psychiatrist, and what audit record is required?

### Retention and deletion — Q11

1. How long are account/contact details, appointments, consent events, audit events, session notes, backups, and security logs retained?
2. What event starts each retention clock: account closure, appointment date, last activity, or another event?
3. Which records are deleted, anonymised, or retained after an account-closure or deletion request, and what legal/clinical basis requires that outcome?
4. How are legal holds, active incidents, and clinical-record minimums handled?
5. Who approves the schedule, reviews it, and authorises exceptions?

### Ownership, privacy, consent, and contracts — Q2, Q7, Q9, Q10

1. Which legal entity is Orion's Personal Information Controller, and who is formally appointed DPO/privacy owner?
2. What lawful basis applies to scheduling, session notes, and optional communications?
3. Who approves the final privacy notice, telepsychiatry consent, and optional-communications wording, including the explanation of session-note access?
4. Are Supabase's data location, subprocessors, breach support, deletion/retention terms, and cross-border transfer position acceptable for real-user use?
5. Who owns support, clinical escalation, security escalation, and the authority to stop bookings or video during an incident?

### Plain-English owner prompts — Q7 and Q9

**Q7 — what should patients agree to?** Approve the exact patient-facing words for the privacy notice,
telepsychiatry consent, and optional communications. They must clearly explain what Orion collects,
what an online session involves, the emergency/referral boundary, and that psychiatrists write session
notes which patients can read only after release while secretaries cannot read them.

**Q9 — may Orion use these technology companies with real patient data?** Approve or reject Supabase
and the future video provider after reviewing where data is stored, whether it crosses borders, their
subprocessors, breach/outage support, and retention/deletion terms. This is not needed for the
synthetic demo; it is required before real patients use Orion.

**MFA — deferred for later discussion.** No MFA decision or implementation is required for the current
synthetic demo. Before real-user launch, owners must decide which roles require MFA and the launch
requirements must be updated accordingly.

### Referred to the DPO or legal adviser

No DPO is appointed — Q2 was deferred — so these currently have nowhere to go. That is itself a reason
to close Q2 sooner than "anytime". Full text in
[privacy governance](../governance/privacy-governance.md) § Questions for the DPO or legal adviser.

1. **Does a data-subject access request override the note release step?** If access rights win, the release step is not a privacy boundary and Phase 2 must not treat it as one. *Blocks: Phase 2 note access design.*
2. **What is the lawful basis for a session note, and is it the same as for scheduling?** Affects whether a patient can withdraw the note's processing without closing their account.
3. **What does deletion mean for a note** when appointment, consent, and audit history must be retained? Same tension as Q11.
4. **Is a cross-border transfer occurring** given the Supabase region in use, and does it need an approved transfer mechanism?
5. **Does the patient's ability to read notes change the privacy notice's description** of who has access to their information? Feeds the Q7 wording.

### New decisions arising

- **Secretary role scope.** Confirmed in principle: appointments and contact details only, never session notes. Still to confirm: whether a secretary is assigned per psychiatrist or works clinic-wide, whether they may book or cancel on a client's behalf, and whether they may see that a note exists without opening it.
- **Demo account set.** The milestone above fixes exactly five accounts. Confirm whether it expands to six to include a secretary, and whether session notes appear in the demo at all.

## Knowledge-base documents reconciled

The Q6 decision moved Orion from scheduling-only to holding clinical content, which contradicted four documents. All four were updated on 27 August 2026, so Phase 2 implementation is no longer blocked on them.

- [Product scope](product-scope.md) — session notes and the secretary role added; notes carved out of the *Out of scope* clinical-records line; public registration recorded. The previous cap decision was replaced on 30 August 2026.
- [Data classification and data dictionary](../governance/data-classification-and-data-dictionary.md) — session notes moved out of *Prohibited* into the dictionary as the highest-sensitivity group, with a per-role reader matrix and audited read access. Diagnosis, prescriptions, recordings, transcripts, and attachments remain prohibited.
- [Privacy governance](../governance/privacy-governance.md) — a clinical-content section added, plus five questions referred to the DPO or legal adviser.
- [Production service charter](production-service-charter.md) — service boundary amended for notes, demo mode amended for the labelled Jitsi fallback, and pilot constraints amended for uncapped public registration with monitoring.
- [Appointment lifecycle](appointment-lifecycle.md) — the Q5 transitions recorded as *Approved transitions*.

Two dependencies were surfaced rather than resolved, and both are recorded in the documents themselves:

- **Session notes have no retention period**, because Q11 is open and clinical records may carry a prescribed minimum. The data dictionary requires one for every field, so this rule is currently unsatisfiable for notes. No retention value may be invented and no note deletion path built until Q11 is recorded.
- **Whether a data-subject access request overrides the note release step** is unanswered. If it does, the release control is not a privacy boundary and Phase 2 must not treat it as one.

## What may continue before answers

The developer may implement the five-account synthetic demo, organise documentation, establish non-production environments, write synthetic-data tests, create migration drafts, set up CI/CD, and prepare vendor comparisons. Do not enable real sign-up, real appointments, real psychiatrist access, production data, or real sessions until the relevant decision is recorded as approved.

## Recommended decisions for the company owners

Recorded before the 27 August 2026 review. Retained for history; where an owner decision above supersedes one of these, the owner decision governs.

1. Choose a small invitation-only Philippine pilot with adults only. *Superseded in part by the Q1 decision to open patient registration; adults-only stands.*
2. Designate a DPO/privacy contact and a licensed clinical lead before any real session. *Outstanding.*
3. Approve a narrow data boundary: scheduling only, without clinical records or free-text patient information. *Superseded by the Q6 decision to include session notes.*
4. Select Daily for an initial private-video proof of integration because it currently includes 10,000 free participant-minutes monthly; recheck pricing and vendor terms before commitment. [Daily pricing](https://www.daily.co/pricing/video-sdk/) *Adopted for the demo.*
5. Keep public Jitsi only in a clearly labelled internal fake-data mode; it is never a fallback for real client calls. *Adopted, and relied on by the Q8 demo decision.*
6. Require company-owner approval before the pilot moves from staging to real users. *Adopted.*
