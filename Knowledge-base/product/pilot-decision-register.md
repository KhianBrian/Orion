# Pilot Decision Register

## Amendment — 8 September 2026: Initial-launch change set

This amendment records the owners' latest meeting direction. It is the current authority where it
conflicts with the 27 and 31 August decisions below. It does **not** expand or replace the five-account
synthetic demo: JaaS remains approved only for that demo and its existing synthetic-data safeguards
remain in force.

The 27 and 31 August brief, question table, and outstanding lists below are retained as historical
meeting evidence. Where one of them says "adults-only", "future minors", "Daily", or that timing is
unset, this amendment governs instead. Those sections are reconciled further through Launch Readiness
R1; they must not be read as a second current decision.

| Area | Direction now recorded | Engineering consequence | Still requiring an owner, clinical, legal, or vendor decision |
| --- | --- | --- | --- |
| Initial demand | Initial launch is expected to have approximately 50 users. This is a forecast, not a new active-patient cap. | Capacity, monitoring, and provider planning use the forecast; no registration-cap feature is added. | Launch geography and operating-review cadence (Q1). |
| Video | The JaaS 25-MAU allowance cannot support the expected real-launch demand. Google Meet is the proposed real-launch direction. | Keep JaaS isolated to the synthetic demo. Plan a Google Meet integration separately, behind the production-provider boundary. | Google Workspace edition/domain, meeting access and host policy, provider technical validation, and Q8/Q9 privacy, security, operations, and vendor approval. |
| Eligibility | Patients aged 18 or over may self-register. A patient under 18 requires a parent/guardian consent form to be completed and submitted. | Replace the adults-only-only launch assumption with a minor-consent pathway; a submitted form must not by itself make a minor bookable. | Minimum age, guardian relationship/identity assurance, reviewer and acceptance rule, guardian account/access, and clinical suitability. These require clinical and DPO/legal approval. |
| Payments | Each session is to be paid through PayMaya. The patient begins booking, is redirected to the PayMaya payment gateway, and Orion tracks the result against the appointment, patient, and psychiatrist. | Plan a server-created payment attempt and provider-webhook-confirmed payment state. The browser return is informational only. | PayMaya API documentation, merchant credentials, provider terms, amount/currency, reservation expiry, cancellation/refund/no-show treatment, chargebacks, receipts, and manual reconciliation. |
| Support | Add in-app support tickets for patients and an administrative ticket queue. A support email address is deferred until all implementation is complete. | Tickets become a new, access-controlled data category; no email notification or external-support channel is implied yet. | Ticket roles, response and closure rules, escalation contacts/hours, permitted free-text content, retention, and the future support email owner. |
| Session timing and notes | A patient may join 15 minutes early; the consultation lasts 45 minutes; after the call ends, the psychiatrist has a further 15-minute note window. Patients continue to see a note only after manual psychiatrist release. | The appointment, meeting, and note plans need one server-authoritative timeline. No automatic completion, note lock, or note release is implied. | Clinical confirmation of the note-window rule, early-end behaviour, late/no-show handling, and whether a note may be completed after the 15-minute window. |
| Public content and legal text | Blogs are coming soon. Terms and conditions, privacy notice, and the support email are deferred until the implementation is otherwise complete. | A coming-soon surface may be planned; no CMS is implied. Consent and legal-document infrastructure may be built without seeding unapproved wording. | Approved privacy, telepsychiatry, parent-consent, payment, and terms wording remains a hard launch gate; real registration, payment, or sessions cannot be enabled without it. |

### New and revised launch blockers

- **Minor consent.** Orion must not activate a minor's account or allow booking until the clinical and
  legal/DPO-approved guardian-consent process is defined and the required consent has been accepted.
- **Payments.** Orion must not treat a redirect back from PayMaya as paid. A server-verified provider
  result, reconciliation procedure, and approved cancellation/refund policy are required before real
  payment collection.
- **Google Meet.** A proposed provider direction is not production approval. Q8 and Q9 remain open
  until the chosen Google Workspace configuration and vendor terms have passed the required review.
- **Terms and privacy.** Deferring final drafting changes the delivery sequence, not the launch gate.
  No real person may complete legal/clinical onboarding against placeholder or unapproved wording.

### Workstream boundary

These changes are tracked as **Launch Readiness R1**, beginning with
[R1.0 — Governance and change control](../engineering/launch-readiness/r1.0-governance-and-change-control.md).
R1 is distinct from the Phase 0–7 and D0–D7 baseline/synthetic-demo record. An R1 work item must cite
the baseline artefacts it consumes, but cannot retrospectively mark an earlier phase gate complete.

## This afternoon's meeting — plain-English decision brief

### What is already agreed

- The next milestone is a **safe demo with fake data**, not a real launch. It has exactly five accounts: two patients, two psychiatrists, and one admin. No real people, appointments, sessions, or public video calls are involved.
- For the demo, Orion will use Jitsi as a Service with short-lived access tokens. That approval is for the demo only, not for real patient sessions.
- Patients may create their own accounts at launch, but only adults may use the service at first. They will confirm their age themselves; Orion will not collect ID.
- Orion is an appointment-booking service, not an emergency or urgent-care service. Patient-facing crisis and referral wording still needs clinical approval.
- Appointments are 45 minutes. Patients can cancel or reschedule more than 24 hours before the appointment. Psychiatrists need 48 hours' notice to cancel themselves; after that, admin handles it and records why. A psychiatrist, not the system, marks a no-show after a grace period.
- Orion may keep session notes written by psychiatrists. Patients see only the latest note version after the psychiatrist releases it. Corrections create protected prior versions that patients cannot read; admin audit metadata provides proof of the access history without exposing note content.
- Orion will not collect prescriptions, diagnoses, recordings, transcripts, chat messages, file uploads, or reasons for visit.
- Patients will see three separate, versioned agreements: privacy notice, telepsychiatry consent, and optional communications.
- **Sequencing decision:** Consent implementation is deferred until the broader feature set is developed. The three-consent design remains the target, but no consent migration or capture flow should be added during the current feature-build sequence.
- No separate support role will be created. Booking and operational support remain admin responsibilities, with no default session-note access.
- Company owners make the final decision on whether Orion can move from the fake-data demo to a real-user pilot.

### Decisions needed today

1. **Who is the named clinical lead, and who can approve psychiatrists?**
   - **What this is about:** deciding who is clinically responsible for safety, referrals, and deciding whether a psychiatrist is fit to use Orion.
   - **This decision answers:** which qualifications must be checked, who checks them, how often they are renewed, and who may approve, suspend, or reactivate a psychiatrist.
   - **Why it matters:** Orion cannot safely offer real sessions until a qualified person owns these decisions.
2. **What are the rules for no-shows and joining sessions?**
   - **What this is about:** agreeing what happens when a patient or psychiatrist is late, absent, or joins close to the session time.
   - **This decision answers:** the no-show grace period (15 minutes is recommended), the early-join window, what happens at session end, and whether Orion records who missed the session.
   - **Why it matters:** these rules determine the booking system behaviour and prevent staff from making inconsistent decisions case by case.
3. **How long should Orion keep each type of information, and what can be deleted?**
   - **What this is about:** setting a clear record-keeping and deletion policy for patient and operational information.
   - **This decision answers:** how long to keep account details, appointments, consents, audit logs, session notes, backups, and security logs, and what happens after account closure or a deletion request.
   - **Why it matters:** session notes may have special clinical retention requirements, so Orion must know what it is allowed to delete and what it must keep.
4. **Which legal entity operates Orion, and who is the DPO/privacy owner?**
   - **What this is about:** identifying the organisation legally responsible for patient information and the person responsible for privacy governance.
   - **This decision answers:** the legal operator of Orion and the formally appointed DPO/privacy owner.
   - **Why it matters:** this is required before Orion processes real patient data or enters production vendor agreements.
5. **What exact patient-facing wording should Orion use?**
   - **What this is about:** making sure patients receive clear, approved information before they sign up or attend a session.
   - **This decision answers:** the final privacy notice, telepsychiatry consent, optional communications wording, and crisis/referral wording, including how session notes work and who can access them.
   - **Why it matters:** patients need an understandable explanation of the service boundary and how their information is used.
6. **Who owns support and incident decisions?**
   - **What this is about:** defining who helps clients and who takes charge if Orion has a technical, security, or clinical problem.
   - **This decision answers:** support hours, clinical and security escalation contacts, client communication during an incident, and who can stop bookings or video.
   - **Why it matters:** a real-user service needs clear ownership and fast action when something goes wrong.
7. **Where may Orion launch, and how will the team monitor demand?**
   - **What this is about:** setting the first launch area and agreeing how the team will watch usage as the service grows.
   - **This decision answers:** the approved geography, review cadence, and the trigger for scaling work. There will be no patient cap.
   - **Why it matters:** the team needs a shared boundary for launch and a way to respond before demand affects quality or reliability.
8. **Which video provider and vendor terms are approved for real sessions?**
   - **What this is about:** choosing the technology companies Orion may trust with real patient information and video sessions.
   - **This decision answers:** the real-session video provider and whether Supabase and that provider have acceptable data location, subcontractor, breach-support, and retention/deletion terms.
   - **Why it matters:** the demo approval does not cover real patients; vendor approval is required before real video sessions begin.
9. **Is a separate support role needed?**
   - **What this is about:** defining what administrative staff may do and see while protecting clinical information.
   - **This decision is superseded:** no separate support role is needed for the current product scope. Admin handles operational support under least privilege, and admin has no default session-note access.
10. **What should the demo include?**
   - **What this is about:** agreeing the exact scope of the fake-data demonstration for company owners.
   - **This decision answers:** whether to expand the demo account set or show the session-note feature.
   - **Why it matters:** a fixed scope keeps the demo focused and prevents it from being mistaken for approval to launch with real users.

### Non-negotiable launch gates

Orion must not accept real patient data or run real sessions until a legal entity and DPO are appointed, vendor terms are approved, a clinical lead is named, real-session video is approved, patient wording is approved, retention rules are set, and incident/support ownership is clear.

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
| 1 | Who may participate in the first real-market pilot, where are they located, and how many people may join? | Small invitation-only Philippines pilot with named psychiatrists and clients; daily operational review. | Public registration and login at initial launch. Patients aged 18 or over self-register; minors use the gated Q4 guardian-consent pathway. Psychiatrist accounts are invitation/provision-only, with an approval period before a psychiatrist takes bookings. Initial demand is estimated at roughly 50 users, not a cap. The approved launch geography and operating-review cadence remain to be decided. | Partially answered | Real-user launch |
| 2 | Which legal entity operates Orion and will act as the Personal Information Controller, and who is formally appointed as DPO? | Company owners identify the entity and appoint a DPO using a role email, not a personal address. | Deferred by the owners; not required for the demo or for planning. Remains a hard blocker before any real personal data is processed, and now more so because Orion will hold session notes. | Deferred | Privacy setup and launch |
| 3 | Who is the licensed clinical lead responsible for safety, clinician verification, eligibility, and referrals? | Contract/designate a licensed psychiatrist or clinical lead. | A psychiatrist approval/gating period is confirmed, and psychiatrist accounts are invitation/provision-only. The named approver, the verification criteria, and the clinical lead appointment remain to be decided. | Partially answered | Real sessions |
| 4 | Which patients are eligible, and what booking-service boundary applies when Orion is not appropriate? | Adults only initially; no emergency care; provide approved local urgent-help and referral route. | **Superseded in part on 8 September.** Patients aged 18 or over self-register. Patients under 18 require parent/guardian consent to be completed and submitted; a minor remains unable to book until the clinical and legal/DPO-approved acceptance process is defined. Orion remains a psychiatry-appointment booking service, not emergency or urgent care. | Partially answered — minor pathway gated | Sign-up and consultation |
| 5 | What are the final policies for psychiatrist cancellation, rescheduling, no-shows, and reopening a cancelled slot? | Keep 45-minute sessions and patient cancellation only more than 24 hours ahead; define the remaining transitions. | 45-minute sessions and patient cancellation beyond 24 hours confirmed. Psychiatrist self-service cancellation requires 48 hours' notice; later cancellation is executed by admin on their behalf with a recorded reason. Rescheduling is patient-initiated within the 24-hour boundary, modelled as linked cancel-and-rebook with no new state. No-show is set by the psychiatrist after a grace period, never automatically. Patient-cancelled slots reopen; psychiatrist-cancelled slots do not. Full detail in the [appointment lifecycle](appointment-lifecycle.md). Awaiting owner ratification, with four items referred onward. | Answered — pending ratification | Booking implementation |
| 6 | Which data may Orion collect in the first real pilot? | Account, contact, appointment, consent, and audit metadata only; no notes, diagnosis, prescriptions, reason-for-visit, recording, transcription, chat, or files. | Adopted as suggested, **plus session notes** and the R1 payment, guardian-consent, and support-ticket categories subject to the data dictionary's approval gates. Prescriptions, diagnoses, recordings, transcripts, reason-for-visit, chat, files, and support-ticket clinical content remain excluded. The separate support role has no note access. | Partially answered — R1 data extensions gated | Schema and forms |
| 7 | Which privacy notice, telepsychiatry consent, and optional communications wording must clients see and acknowledge? | Separate versioned privacy acknowledgement, informed consent, and optional communications choices. | The three-version structure stands. Final privacy, terms, telepsychiatry, parent-consent, payment, and support wording will be supplied for owner approval after implementation planning; no version may be seeded or used for real onboarding before then. | Partially answered — wording deferred | Sign-up and first session |
| 8 | Which private video provider is approved after privacy, clinical, legal/DPO, security, and operations review? | Evaluate Daily first using its free tier; private rooms and short-lived server tokens only. | **Demo:** JaaS using its free 25-MAU developer allowance and server-issued participant JWTs. **Real launch:** Google Meet is the proposed provider direction because the JaaS allowance cannot support the expected initial demand. It is not approved until the Workspace configuration and Q8/Q9 review are complete. | Answered for demo; proposed for launch — pending approval | Real video sessions |
| 9 | Which vendor/data-transfer terms are acceptable for Supabase and the chosen video provider? | DPO/legal reviews contracts, data locations, subprocessors, breach support, and retention/deletion terms. | Deferred by the owners. Retained on this register as a launch blocker, not discarded, because Orion will hold session notes as health information. | Deferred | Production vendor use |
| 10 | Who provides support and clinical escalation, who can stop bookings/video, and what will clients be told during an incident? | Define support hours, clinical/DPO/security contacts, stop authority, and approved patient communication. | Admin handles operational support through an in-app patient ticket queue; the support email remains deferred. Ticket roles, response/closure rules, support hours, stop authority, incident communication, and clinical escalation remain to be decided. | Partially answered | Real-user launch |
| 11 | How long is each data category retained, and how do account closure, access/correction, and deletion requests work? | Approve a retention schedule and data-subject request process before launch. | Retention must cover account/contact, appointment, consent, audit, session-note, guardian-consent, payment, support-ticket, backup, and security-log data. The operational meaning of deletion remains to be decided, especially where clinical, payment, consent, and audit history must be retained. | Partially answered | Launch |
| 12 | Who gives final go/no-go approval for the controlled pilot after technical, clinical, privacy, and operational evidence is ready? | Company owners formally approve or defer launch. | Adopted as suggested. Company owners give final go/no-go. The five-account synthetic demo is showcased to the owners first. | Answered | Launch |

## Outstanding for the next owner meeting

Carried forward from the 27 August 2026 review. Each item blocks the work named against it.

- **Q3 — psychiatrist approval.** Who performs the approval, against what verification criteria, and who is appointed clinical lead. *Blocks: Phase 3 provisioning, real sessions.*
- **Q5 — ratification and one referred item.** The transitions were decided on 27 August 2026 and recorded in the [appointment lifecycle](appointment-lifecycle.md), which unblocks Phase 2 and Phase 4 planning. Owners to ratify, and to decide the consequences of a no-show (forfeiture, fee treatment, whether it counts against a patient). Admin executes late psychiatrist cancellations. Note that the [production service charter](production-service-charter.md) assigns no-show policy to **clinical leadership**, so the no-show mechanism needs a clinical ratification as well as an owner one. *Blocks: Phase 4 post-session handling and cancellation path; ratify before Phase 4 is built, since a change would alter the status model.*
- **Q7 — consent and notice wording.** The three-consent structure is approved, but final privacy, terms, telepsychiatry, optional-communications, parent-consent, payment, and support wording is deferred for owner supply and approval after implementation planning. It must cover notes, payments, minors, support, and provider data flows as applicable. *Blocks: real onboarding, payment, and first session.*
- **R1 documents awaiting owner/clinical/DPO input.** Retention, emergency/referral routing, Google Meet/vendor review, guardian-consent rules, and payment/refund policy remain gated. Engineering may prepare structured decision briefs, but does not write or approve final legal/clinical text. *Blocks: R1.2–R1.5 and launch.*
- **Q10 — support and stop authority.** Support hours, who may halt bookings or video, what clients are told during an incident, and the clinical escalation contact. *Blocks: Phase 6 runbooks.*
- **Q11 — retention and deletion.** Retention period per data category including session notes, and what deletion means operationally when appointment, consent, and audit history must be retained. *Blocks: Phase 2 retention fields, Phase 6 processes.*
- **Q1 — launch geography and operating review.** No active-patient cap will be implemented. Decide the approved geography and how the team reviews activity and records when scaling work is needed. *Blocks: real-user launch scope and Phase 6 release scoping.*
- **Q4 — minor eligibility and guardian consent.** The new launch direction allows minors only through a parent/guardian-consent pathway. Decide the minimum age, guardian relationship/identity assurance, acceptance/review owner, guardian access boundaries, and clinical suitability/refusal path. *Blocks: R1.2 and any minor sign-up or booking.*
- **Q8 — Google Meet real-launch provider.** Google Meet is proposed, not approved. Confirm the Google Workspace organisation/edition, participant admission and host policy, technical validation, and the Q9 vendor review. *Blocks: R1.4 and Phase 5 production integration.*
- **Q2 and Q9 — entity, DPO, and vendor terms.** Deferred by the owners; both required before real personal data is processed. *Blocks: launch.*

### Referred to the clinical lead

- **Clinical emergency position.** The owners' view that a clinical emergency will not occur conflicts with the approved Q4 crisis and referral path. Engineering is proceeding with the Q4 answer — the crisis path stays in — pending a clinical ruling. Psychiatric consultations carry a foreseeable risk of acute distress or a safety disclosure during a session, and this is not a determination engineering may make.
- **Patient-visible session notes.** A note written knowing the patient will read it differs clinically from a private record. The release step agreed on 27 August 2026 gives the psychiatrist control of timing, but the clinical governance of patient-visible notes warrants a clinical lead's view.
- **Late grace period before a no-show may be set.** Assigned to the clinical lead by the [appointment lifecycle](appointment-lifecycle.md) timing rules. Fifteen minutes of a 45-minute session is recommended for their consideration. *Blocks: Phase 4 no-show behaviour.*
- **Early join, session end, and notes.** The meeting direction is 15 minutes early join, a 45-minute consultation, then a 15-minute psychiatrist note window. The clinical lead still confirms early-end, late-note, no-show, and patient-visibility edges. *Blocks: R1.1/R1.4 timing contracts.*
- **Whether a psychiatrist no-show is distinguishable from a patient no-show.** The canonical state list has a single `no_show` and does not say whose. Recommendation: keep the one state and record the absent party as a field rather than adding a canonical state. *Blocks: Phase 2 status model.*
- **Minor patient eligibility.** The clinical lead must define the minimum age, guardian-consent and suitability requirements, and refusal path; legal/DPO review defines the collection and access boundaries. The former adults-only assumption is superseded.

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
notes which patients can read only after release while admin has no default access.

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

- **Separate support role.** Superseded: no separate support account, booking surface, or note-access path is planned.
- **Demo account set.** The milestone above fixes the current synthetic accounts. Confirm only whether session notes appear in the demo.

- **MFA role scope.** Before real-user launch, confirm which roles must use an additional login step (recommended: psychiatrist and admin), who approves exceptions, and when enforcement is required. Implementation is tracked in [Phase 12](../engineering/phases/phase-12-mfa-and-privileged-access.md); the synthetic demo remains MFA-free.

## Knowledge-base documents reconciled

The Q6 decision moved Orion from scheduling-only to holding clinical content, which contradicted four documents. All four were updated on 27 August 2026, so Phase 2 implementation is no longer blocked on them.

- [Product scope](product-scope.md) — session notes added; notes carved out of the *Out of scope* clinical-records line; public registration recorded. The separate support-role proposal is superseded. The previous cap decision was replaced on 30 August 2026.
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

1. Choose a small invitation-only Philippine pilot with adults only. *Historical recommendation; superseded by public patient registration and, on 8 September, by the gated minor-consent direction.*
2. Designate a DPO/privacy contact and a licensed clinical lead before any real session. *Outstanding.*
3. Approve a narrow data boundary: scheduling only, without clinical records or free-text patient information. *Superseded by the Q6 decision to include session notes.*
4. Select Daily for an initial private-video proof of integration because it currently includes 10,000 free participant-minutes monthly; recheck pricing and vendor terms before commitment. [Daily pricing](https://www.daily.co/pricing/video-sdk/) *Adopted for the demo.*
5. Keep public Jitsi only in a clearly labelled internal fake-data mode; it is never a fallback for real client calls. *Adopted, and relied on by the Q8 demo decision.*
6. Require company-owner approval before the pilot moves from staging to real users. *Adopted.*
