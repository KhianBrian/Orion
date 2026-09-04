# Phase 0 — Governance and Service Design

**Tier 2 status:** Planned 27 August 2026. The implementation plan is below the charter. The phase itself remains open and cannot be closed by the developer.

## Purpose

Name the accountable owners and obtain written approval for the service boundary and for privacy,
consent, clinical safety, emergency, clinician-verification, retention, and vendor decisions. Every
answer and blocker is tracked in the
[pilot decision register](../../product/pilot-decision-register.md).

This phase is administrative rather than technical, and it is the reason the later phases cannot all be
fully planned yet. Its outputs are the policy inputs that later schemas, workflows, and vendor
integrations are built to satisfy.

## Gate

Written owner approvals and agreed pilot criteria. No real data, accounts, appointments, or calls
until this gate closes.

## Progress as of 27 August 2026

| Status | Questions |
| --- | --- |
| Answered | Q4 eligibility and crisis path, Q6 data boundary including session notes, Q7 consent structure, Q12 approval authority |
| Answered for the demo only | Q8 video provider |
| Answered — pending ratification | Q5 appointment transitions |
| Partially answered | Q1 registration model, Q3 psychiatrist approval, Q10 support and secretary role, Q11 retention |
| Deferred by the owners | Q2 entity and DPO, Q9 vendor terms |

Two decisions changed the project's shape rather than merely filling a gap, and the implementation
plan should treat them as scope changes: **session notes are now in scope** (Q6), moving Orion from
scheduling-only to holding clinical content, and **patient registration is now public** (Q1), removing
the invitation vetting the original plan relied on.

## Remaining work in this phase

- Obtain the outstanding answers listed in the register's *Outstanding for the next owner meeting* section: Q3 approver and criteria, Q5 ratification and referred items, Q10 stop authority and escalation, Q11 retention and deletion, and Q1 geography/operating review.
- Obtain a clinical ruling on the two items in the register's *Referred to the clinical lead* section: the clinical-emergency position, and the governance of patient-visible session notes.
- Confirm the two *New decisions arising*: secretary role detail, and whether the demo account set expands to six.
- Draft for owner approval: privacy notice, telepsychiatry consent wording now covering session notes, retention schedule, and emergency/referral routing.
- Confirm the four knowledge-base documents recorded by the register as reconciled, and complete the two additional architecture-document corrections identified in P0-4 before Phase 2 implementation begins.

## Consumes

Nothing. This is the first phase.

## Blocked by

Nothing — but the phase cannot be *closed* by the developer. Closure depends on company owners
answering the remaining register questions and formally appointing a DPO and a licensed clinical lead.
The developer may draft, recommend, and prepare; only owners may decide.

## Deliverables

- A named working owner and decision authority for each responsibility in the register's ownership table.
- A formally appointed DPO using a role email rather than a personal address, per [NPC guidance](https://privacy.gov.ph/appointing-a-data-protection-officer/). *Deferred by the owners; still required before real data.*
- A named licensed clinical lead accountable for safety, clinician verification, eligibility, and referrals. *Outstanding.*
- A recorded owner decision against each of register questions 1–12, with status moved off *Open*. *Six answered in some form; four partial and two deferred.*
- Written pilot criteria defining who may participate, how many, and under what operational review. *Partially complete.*
- Drafts prepared by the developer for owner approval: privacy notice, telepsychiatry consent wording, retention schedule, vendor comparison, and emergency/referral routing.

## Authoritative documents

- [Pilot decision register](../../product/pilot-decision-register.md) — the agenda, the ownership table, and the twelve questions.
- [Production service charter](../../product/production-service-charter.md) — the service boundary being approved.
- [Clinical safety and telepsychiatry policy](../../product/clinical-safety-and-telepsychiatry-policy.md) — clinical decisions requiring the clinical lead.
- [Privacy governance](../../governance/privacy-governance.md) — DPO, lawful basis, notices, and vendor review.
- [Data classification and data dictionary](../../governance/data-classification-and-data-dictionary.md) — the data boundary decided in Q6, now requiring a session-notes classification.

## Downstream effect of each answer

| Register question | Phase it unblocks | State |
| --- | --- | --- |
| Q1 pilot bounds, Q12 go/no-go | Phase 6 release | Q12 answered; Q1 partial |
| Q2 legal entity and DPO | Phase 1 production vendor accounts, Phase 6 launch | Deferred |
| Q3 psychiatrist approval, Q4 eligibility and emergency path | Phase 3 provisioning, Phase 4 booking eligibility | Q4 answered; Q3 partial |
| Q5 cancellation, reschedule, no-show, slot reopening | Phase 4 state machine, Phase 2 status model | Answered — pending ratification and referred items |
| Q6 permitted data categories | Phase 2 schema and forms | Answered, scope widened |
| Q7 privacy, consent, and communications | Phase 2 consent tables, Phase 3 sign-up | Answered for structure |
| Q8 approved video provider | Phase 5 in its entirety | Demo only; real launch deferred |
| Q9 vendor and data-transfer terms | Phase 1 production vendor use, Phase 5 | Deferred |
| Q10 support and escalation authority | Phase 6 runbooks and kill-switch authority | Partial |
| Q11 retention and data-subject requests | Phase 2 retention fields, Phase 6 processes | Partial |

## Constraint

Nothing in this phase authorises processing real personal data. Preparation, drafting, and the
five-account synthetic demo may proceed in parallel, per the register's *What may continue before
answers* section.

---

# Tier 2 — Implementation Plan

**Written:** 27 August 2026, from the register as it actually reads rather than from any summary of
it. This phase produces no code. Its deliverable is a set of decisions the developer may not make, so
the plan is about packaging those decisions so they can be made — and about identifying which of them
currently have nowhere to go.

## Verified starting state

Counted directly from the [register's question table](../../product/pilot-decision-register.md#questions-for-the-company-owners)
on 27 August 2026.

| Status in the register | Questions | Count |
| --- | --- | ---: |
| Answered, in some form | Q4, Q5 (pending ratification), Q6 (scope widened), Q7 (structure only), Q8 (demo only), Q12 | 6 |
| Partially answered | Q1, Q3, Q10, Q11 | 4 |
| Deferred by the owners | Q2, Q9 | 2 |

Three appointments named in the register's ownership table are still unfilled: the **DPO**, the
**licensed clinical lead**, and the **legal entity acting as Personal Information Controller**.

The register is the single source of truth for decision status. It currently records six questions
answered in some form (including Q5 pending ratification), four partially answered, and two deferred.
The four policy documents affected by Q6 are reconciled; P0-4 separately records the two architecture
documents that still need their technical statements aligned.

## The finding that should shape the next meeting

The outstanding list reads as fifteen loose ends. It is not. **Nine of them cannot be answered by
anyone currently appointed**, and they are waiting on two appointments rather than on fifteen separate
conversations.

| Waiting on | Items held up |
| --- | --- |
| **A DPO or legal adviser** (register Q2, deferred) | All five [questions referred to the DPO](../../governance/privacy-governance.md#questions-for-the-dpo-or-legal-adviser), including whether a data-subject access request overrides the note release step — which Phase 2 needs before it can decide whether the release step is a privacy boundary. Also the legal half of Q11 retention, the privacy-notice half of Q7, and the Q9 vendor and transfer review. |
| **A licensed clinical lead** (register Q3, unfilled) | The no-show mechanism, which the [production service charter](../../product/production-service-charter.md#outstanding-against-this-clause) assigns to clinical leadership rather than to the owners; the grace-period value; the early join window and session-end treatment; whether a psychiatrist no-show is distinguishable from a patient one, which Phase 2's status model needs; the governance of patient-visible notes; and the clinical-emergency position that currently contradicts the approved Q4 crisis path. |

The register already notices half of this — it observes that the DPO questions "currently have nowhere
to go" and that this "is itself a reason to close Q2 sooner than *anytime*". This plan's position is
that the observation should be promoted to the first item of the next meeting rather than left as a
remark at the foot of a list.

The remaining items are genuinely owner decisions that a single well-prepared meeting can close.

## Sequencing

Ordered by what each answer releases, not by register number.

| Order | Item | Releases |
| --- | --- | --- |
| 1 | Appoint the DPO or engage a legal adviser; identify the operating entity (Q2) | Five referred questions, the legal half of Q11, Q7 privacy-notice approval, the Q9 review — and with it Phase 1 production provisioning and Phase 2's note access design |
| 2 | Appoint the clinical lead (Q3) | Six clinical items, including the Phase 2 status-model field and three Phase 4 values |
| 3 | Ratify Q5 | Phase 4 may be built. Ratification before the build, not after, because a change would alter the status model and the booking path |
| 4 | Q11 retention — the half the owners can choose | Phase 2 retention fields; the clinical-records category stays open pending item 1 |
| 5 | Q1 approved geography and operating-review cadence | Real-user launch scope and Phase 6 release scoping |
| 6 | Q10 stop authority, support hours, incident communication, escalation contact | Phase 6 runbooks |
| 7 | Secretary detail and the demo account-set questions | Phase 2's fourth role, and the demo's two separable increments |
| 8 | Q3 approver identity and verification criteria | Phase 3 provisioning |
| 9 | Q8 real-launch provider, Q9 vendor terms | Phase 5, and Phase 1 production vendor use |

Items 3 and 5 through 8 are answerable in one meeting given the briefs described below. Items 1, 2, 4,
and 9 depend on an appointment or an external adviser and should be treated as commitments with dates
rather than as agenda items to be discussed again.

## Work breakdown

### P0-1 — The appointment escalation

A single short paper, first on the agenda, covering both unfilled appointments together: what each
role is accountable for, what is currently blocked without it, what it plausibly costs, and what the
consequence is of leaving it open for another cycle. It states plainly that engineering can continue
planning and can build the synthetic demo without either appointment, and that neither real personal
data nor a real session may be processed without both — a boundary already set by the
[launch gate](../../product/production-service-charter.md#launch-gate).

The paper asks for a named person and a date, not a discussion. The DPO is appointed to a role email
rather than a personal address, per the [NPC guidance](https://privacy.gov.ph/appointing-a-data-protection-officer/)
the register cites.

### P0-2 — Decision briefs for the owner-answerable items

One page per question, so that each can be answered in the meeting rather than deferred again for want
of context. Every brief carries the same five parts: the question, the options, what each option costs
to build and to operate, a recommendation with its reasoning, and what the answer unblocks.

The recommendation exists so the owners have something to react to. It is not a decision, and where a
brief covers ground the [production service charter](../../product/production-service-charter.md#decisions-engineering-cannot-make)
assigns elsewhere, the brief says so on its face.

Briefs required:

- **Q5 ratification.** Not a fresh decision. The brief presents the recorded transitions for confirmation and flags that the no-show mechanism additionally needs a clinical ratification, which the owners cannot supply.
- **Q1 — the cap.** Its value, its mechanism, the approved geography, and the review cadence. Options are a hard limit, an approval queue, and a waitlist; the brief sets out what each costs at the registration boundary and how each behaves when the cap is reached, since that moment is a patient-facing experience and not only a counter.
- **Q10 — stop authority.** Who may halt bookings, who may halt video, whether those are the same person, support hours, what a client is told during an incident, and the clinical escalation contact. The [incident flow](../../operations/operations-and-incident-response.md#incident-flow) requires containment and simultaneous escalation, both of which need a name attached.
- **Late-cancellation executor.** Whether the secretary, the admin, or either may execute a late cancellation on a psychiatrist's behalf. The brief notes that the path itself is not optional — the [lifecycle](../../product/appointment-lifecycle.md#psychiatrist-cancellation) states that without it a phoned-in cancellation leaves an appointment booked while it is off in reality.
- **No-show consequences.** Forfeiture, fee treatment, and whether a no-show counts against a patient. The brief notes that Phase 4 records the state regardless, and that consequences are a separate build.
- **Secretary detail.** Per-psychiatrist or clinic-wide; whether they may book or cancel on a client's behalf; whether they may see that a note exists without opening it. The brief should treat the last as a privacy question rather than a convenience one, since the [reader matrix](../../governance/data-classification-and-data-dictionary.md#readers) currently reads *never* without qualification.
- **Demo account set.** Whether it expands to six with a secretary, and whether session notes appear in the demo. The brief carries the two separable increments already scoped in the [demo milestone](demo-milestone.md) plan, so the cost of each is a known quantity.
- **Q3 — approver and criteria.** Who approves a psychiatrist and against what verification. The brief notes that the approval mechanism can be built now with the approver left assignable, so this answer is not on Phase 3's critical path — only on its completion.

### P0-3 — Drafts for owner approval

The charter lists five. Each is drafted by the developer and approved by an owner; two cannot be
completed by drafting alone, and the plan says which.

| Draft | Status this phase can reach | Blocked on |
| --- | --- | --- |
| Privacy notice | Full draft | Approval is not meaningful without the DPO or legal adviser. Q2. |
| Telepsychiatry informed consent | Full draft, now covering that notes are written, that the patient reads them once released, and who else can and cannot see them — the widened scope [privacy governance](../../governance/privacy-governance.md#clinical-content) records | Clinical lead review of the clinical content; DPO review of the privacy content |
| Optional communications wording | Full draft, independently withdrawable from the other two, per the Q7 structure | Owner approval only |
| Retention schedule | Draft covering every category **except clinical records** | See below |
| Emergency and referral routing | Draft mechanism and a shortlist of candidate contacts | Clinical lead approval of the content |
| Vendor comparison | Full draft against Daily, LiveKit Cloud, Twilio Video, and private Jitsi, following the [decision record](../../architecture/video-provider-decision-record.md#options) | DPO or legal review of terms; owner decision on Q8 |

**On the retention schedule.** The owners asked for a schedule benchmarked against comparable
clinics. A benchmark produces comparators; it does not produce a legal answer. The register itself
records that clinical records "may carry a **prescribed** minimum retention period rather than a chosen
one", and a prescribed minimum is a legal determination that engineering must not supply. The draft
therefore proposes periods for account, appointment, consent, and audit categories, and leaves the
clinical-records row explicitly unfilled with the reason named. A draft with a stated hole is
honest; a draft with a plausible number in that row would be an invented policy.

**On the emergency and referral content.** Engineering assembles publicly published national crisis
contacts as candidates and builds the surface that displays them. It does not select, verify, or
publish them unverified — [clinical safety](../../product/clinical-safety-and-telepsychiatry-policy.md#before-pilot-approval)
assigns crisis and suicide-risk routing to the clinical lead. The draft also carries the standing
conflict: the owners' position that a clinical emergency will not occur contradicts the approved Q4
path, engineering is proceeding with Q4, and the clinical lead rules.

### P0-4 — Document reconciliation

Four documents were reconciled on 27 August 2026 and the register records which. Planning the demo
milestone surfaced two more that were missed, both in the architecture tier and both now contradicting
answered register questions:

- [Database and RBAC](../../architecture/database-and-rbac.md) — names three roles as the sole application roles with no secretary, lists no session-notes table, and describes cancellation as the 24-hour patient rule only, with no 48-hour psychiatrist boundary and no coordinator-executed path.
- [Access control and audit policy](../../architecture/access-control-and-audit-policy.md) — states that a support role is not created until a separate policy approves a minimum-data support model. Register Q10 is that approval.

Under the [authority order](../../README.md#authority-order) these govern until deliberately updated,
so **Phase 2 must not build the four-role model or the notes table ahead of them**. Phase 2's charter
names the prerequisite as three documents, all now complete; the list is incomplete and these two
belong on it. Reconciling them is a Phase 0 task because it is a knowledge-base decision, not a code
change, and it needs no owner input beyond the Q6 and Q10 answers already recorded.

### P0-5 — Register hygiene

After the meeting, move each answered question off its current status, record the decision text in the
register rather than only in the minutes, and update the derived counts in this charter and in the
[phases index](README.md). The three-way count discrepancy found above is what happens when derived
summaries are maintained by hand; the register is the single place a status changes.

## Gate evidence

The charter's gate is written owner approvals and agreed pilot criteria. That gate closes when:

| Clause | Evidence |
| --- | --- |
| Named owner and decision authority per responsibility | The register's ownership table with no unfilled row |
| DPO formally appointed to a role email | The appointment recorded against Q2 |
| Named licensed clinical lead | The appointment recorded against Q3 |
| A recorded decision against each of Q1–Q12, none *Open* | The register's question table |
| Written pilot criteria — who, how many, under what review | The Q1 answer, and the cap present in the [launch gate](../../product/production-service-charter.md#launch-gate) |
| Developer drafts prepared for approval | The six drafts in P0-3, each with its approval state recorded |

Two clauses will remain open after any meeting that does not fill the appointments, which is why P0-1
comes first.

## What this phase must not do

The [production service charter](../../product/production-service-charter.md#decisions-engineering-cannot-make)
draws the line, and it is worth restating because this phase is where the line is under most pressure:
a deferred decision is a delay, and a decision made by the wrong party is a defect that surfaces
later. Product decides pilot scope, commercial terms, and launch size. Clinical leadership decides
eligibility, no-show, crisis, referral, and session policy. Legal and the DPO decide lawful basis,
notices, retention, vendor terms, cross-border transfers, and registration. Operations and security
decide access owners, recovery objectives, on-call, and risk acceptance.

The Q5 transitions are the one place where this line was crossed deliberately, by the developer, to
unblock planning — and the register, the lifecycle document, and the service charter each record that
it was, along with what must be ratified to correct it. That is the pattern to follow if it ever
happens again: record the exception where it will be found, not where it is convenient.

## Inputs I did not have

1. **Whether an owner meeting is scheduled, and when.** The sequencing above assumes one meeting can close items 3 and 5 through 8. Two shorter meetings would change what each brief must carry.
2. **Whether a legal adviser is already engaged** for the operating businesses, which would let the five referred questions proceed ahead of a formal DPO appointment.
3. **Whether a candidate clinical lead has been approached.** The plan treats this as an open appointment because the register does; a candidate in progress changes item 2 from a decision into a date.
4. **What the owners meant by "comparable clinics"** for the Q11 benchmark — Philippine private psychiatric practice, telehealth providers generally, or something else. The comparator set changes the draft.
5. **Whether any register answer has moved since 27 August 2026.** Verify the register itself; three separate summaries of it already disagree.
