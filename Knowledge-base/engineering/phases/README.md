# Delivery Phases — Plan Index

This folder holds one file per phase of the [delivery plan](../delivery-plan.md). It is the working
surface between planning and implementation. The delivery plan defines *what* each phase must achieve
and which gate closes it; these files define *how* the phase will be executed, and record what was
still unknown at the time of writing.

Nothing here overrides the parent knowledge base. The [authority order](../../README.md#authority-order)
stands: governance and clinical policy first, then product scope, then architecture, then engineering
and operations. A phase plan that conflicts with a parent document is wrong, and the parent document
wins until the knowledge base is deliberately updated.

## Two-tier planning

Each file has two tiers, written at different times and for a reason.

**Tier 1 — Charter.** Scope boundary, the gate copied from the delivery plan, deliverables, the
prior-phase outputs it consumes, and the register questions that block it. This is derived from the
delivery plan and the decision register, so it is stable and all charters exist up front.

**Tier 2 — Implementation plan.** Concrete steps, file-level changes, migration sequence, test
matrix, and verification evidence. This is written for one phase at a time, and only once the
preceding phase's gate has closed — because it must be grounded in what was actually built, not in
what the previous plan intended to build.

Writing every implementation plan up front does not work here. The coupling between phases is real:

Phases 15–20 include **provisional Tier 2 outlines** so the complete launch flow, decisions, expected
changes, and test gates can be reviewed now. They do not override this rule: the first task in each
phase re-grounds and revises the outline from the predecessor's dated as-built audit and current
deployed state before any implementation begins.

| Phase | What it fixes for later phases |
| --- | --- |
| 0 | Register answers define Phase 2's schema and consent tables, Phase 4's cancellation state machine, Phase 5's provider, and Phase 6's retention and escalation runbooks. |
| 1 | The migration and secrets process determines mechanically how every Phase 2–5 change is authored, reviewed, and applied. |
| 2 | The as-built slot-lock function signature, RLS predicates, and audit columns are what Phase 3 routes read and Phase 4 booking code is written against. This is the tightest coupling in the plan. |
| 3 | How caller identity reaches the server determines Phase 4 authorisation and Phase 5 participant-token derivation. |
| 4 | The as-built appointment record is the input to Phase 5's decision about who may join which room, and when. |
| 5 | The approved provider determines Phase 6's outage exercise, kill-switch design, and vendor incident procedure. |
| 14 | The exact availability/slot schema, conflict rules, and patient time-selection behavior determine Phase 15's active-state compatibility work. |
| 15 | The as-built eligibility, consent, payment, ticket, RLS/function, and audit contracts determine every Phase 16–19 integration. |
| 16 | The exact server-held bookability/admission predicate determines Phase 17 reservation and Phase 18 admission behavior. |
| 17 | The exact `booked` transition and payment failure/event states determine Phase 18 admission and Phase 19 exception operations. |
| 18 | The exact Google Meet admission, failure, timing, and kill-switch states determine Phase 19 provider operations. |
| 19 | The exact operations/runbook/retention controls and unresolved risks determine Phase 20's integrated release evidence. |
| 20 | The immutable candidate, evidence, approvals, and owner decision determine what—if anything—is activated for real users. |

## Feedback loop

When a phase gate closes, add a dated as-built entry to [`audit-trail/`](../../audit-trail/README.md)
recording what was actually implemented, what deviated from the plan, and what remains open. The next
phase's implementation plan is written from that entry, not from the previous phase's plan. Without
this, each plan inherits the last plan's assumptions instead of reality.

Any intentional shortcut taken to close a gate goes in the audit trail's deferred simplifications
ledger with a stated close condition.

## Baseline versus Launch Readiness R1

The Phase 0–6 charters, D0–D7 synthetic-demo slices, and Phase 7–14 continuation work are the
**baseline record**. Their dated plans and audit evidence are retained as history; they are not
rewritten to make a later owner decision look as though it was known or completed earlier.

The 8 September owner direction begins a separately named **Launch Readiness R1** change-control
workstream. R1 keeps `R1.x` identifiers for the governing amendment and requirements, while the
executable delivery continuation is numbered **Phase 15 onward**. It starts with
[R1.0 — Governance and change control](../launch-readiness/r1.0-governance-and-change-control.md), then
maps R1.1–R1.5 into Phases 15–20. It may revise an old assumption only by recording the superseding
authority in the decision register. An R1 or Phase 15–20 completion never closes a Phase 0–6 gate by
implication, and historical completion never authorises R1 real-user scope.

## Prompt contract for planning

Whoever drafts a Tier 2 implementation plan must observe the following. These are not style
preferences; each one prevents a specific failure this project cannot absorb.

1. **Cite the authority.** Every requirement in the plan names the knowledge-base document it comes
   from. A requirement with no citation is an invention and must be removed or escalated.
2. **Never fill a policy gap.** Clinical, privacy, legal, retention, vendor, and emergency policy are
   owner decisions. Where an answer is missing, the plan states the gap and stops — it does not pick
   a plausible default and proceed.
3. **Declare assumptions explicitly.** Every plan carries an *Inputs I did not have* section listing
   the register questions and prior-phase artefacts it had to assume. That section is the rewrite
   checklist when the phase actually begins.
4. **Verify, do not remember.** Implementation confirms current state directly — read the file, query
   the database, check the deployed configuration. The plan is a proposal; the live system is ground
   truth. A plan may not be treated as evidence that something exists.
5. **Respect the gate order.** No plan schedules work that depends on an unclosed gate. Preparation
   permitted by the register's *What may continue before answers* is the exception, and must be
   labelled as such.
6. **Synthetic data only.** All test, demo, and non-production work uses synthetic data, per the
   [test data policy](../test-strategy-and-test-data-policy.md).

## Files

| File | Covers | Tier 2 status |
| --- | --- | --- |
| [Demo milestone](demo-milestone.md) | The five-account synthetic demo — a cross-cutting track, not a phase. | **Ready to plan — immediate priority** |
| [Demo milestone — JaaS video work package](demo-milestone-jaas-video.md) | Detailed D5 implementation and verification under the synthetic demo; not production Phase 5. | Companion work package |
| [Phase 0 — Governance and service design](phase-0-governance.md) | Owner appointments, policy decisions, pilot criteria. | In progress — 6 answered in some form; 4 partial; 2 deferred |
| [Phase 1 — Secure platform baseline](phase-1-baseline.md) | Environments, secrets, CI/CD, migrations, backups, monitoring. | Foundation slice implemented; production-readiness gate deferred |
| [Phase 2 — Data, RBAC, consent, and audit](phase-2-data-rbac.md) | Baseline schema, RLS, private functions, session notes, lifecycle and concurrency. | **Plannable** — R1 extensions are delegated to Phase 15; Q11 retention remains provisional |
| [Phase 3 — Replace prototype identity](phase-3-identity.md) | Supabase Auth, provisioning, and role-aware routes. | Plannable once Phase 2 as-built exists; Phase 16 owns R1 eligibility/guardian behavior |
| [Phase 4 — One safe scheduling workflow](phase-4-scheduling.md) | Baseline server-authoritative booking, cancellation, notes, and conflict states. | **Plannable** — Phase 17 owns payment booking and Phase 18 owns real timing/admission |
| [Phase 5 — Approved private video](phase-5-video.md) | Approved-provider abstraction, admission controls, kill switches. | Blocked — synthetic JaaS is separate; Phase 18 owns real Google Meet after Q8/Q9 approval |
| [Phase 6 — Operations and controlled release](phase-6-operations.md) | Baseline admin tooling, runbooks, reviews, and release approval. | Blocked — Phase 19/20 extend support and release work; Q1, Q10, Q11 and provider decisions remain open |

## Launch Readiness R1

| Work item | Covers | Status |
| --- | --- | --- |
| [R1.0 — Governance and change control](../launch-readiness/r1.0-governance-and-change-control.md) | Reconciles the 8 September owner direction, preserves the baseline record, and produces the controlled backlog for minors, PayMaya, Google Meet, support tickets, notes timing, and deferred public/legal content. | Completed ✅ — detailed R1 planning may begin |
| [R1.1 — Data, consent, and audit extension](../launch-readiness/r1.1-data-consent-and-audit-extension.md) | Defines the provider-neutral eligibility, guardian-consent, payment-attempt/event, support-ticket, timing, RLS, audit, migration, and verification contract from the current as-built state. | Planning completed ✅ — implementation not started; policy/provider gates retained |

### R1 implementation sequence

The [R1 implementation phase map](r1-launch-readiness-implementation-map.md) is the detailed planning
synthesis. The R1 identifiers retain requirements/change-control traceability; the numbered phase
files below are the canonical plan locations and continue directly after Phase 14. Their current
Tier 2 content is provisional: each becomes executable only after its first re-grounding task checks
the predecessor's dated as-built audit, current deployed state, and approved decisions.

| R1 requirement | Numbered implementation phase | Next implementation gate |
| --- | --- | --- |
| R1.1 — Shared data/consent/audit contract | [Phase 15 — Data, consent, and audit foundation](phase-15-data-consent-and-audit-foundation.md) | Phase 14 as-built evidence or an explicit sequencing amendment; then approved field/role/retention decisions and a fresh live-state audit. |
| R1.2 — Identity and eligibility | [Phase 16 — Identity and minor eligibility](phase-16-identity-and-minor-eligibility.md) | Phase 15 as-built contract plus guardian, clinical, DPO/legal, abuse-control, and approved-wording decisions. |
| R1.3 — Payment-authorised booking | [Phase 17 — PayMaya payment-authorised booking](phase-17-paymaya-payment-authorised-booking.md) | Phase 16 as-built predicate, official PayMaya material, and commercial/privacy/expiry/refund/reconciliation decisions. |
| R1.4 — Google Meet and timing | [Phase 18 — Google Meet and session timing](phase-18-google-meet-and-session-timing.md) | Phase 17 as-built booked/payment state, Workspace/vendor validation, and clinical timing decisions. |
| R1.5 — Support and launch operations | [Phase 19 — Support tickets and launch operations](phase-19-support-tickets-and-launch-operations.md) | Phase 15–18 as-built contracts plus support, role, retention, DPO/legal, finance/provider, and operations decisions. |
| R1.5 — Integrated acceptance/release | [Phase 20 — Integrated launch verification and controlled release](phase-20-integrated-launch-verification-and-controlled-release.md) | All prior gates/evidence, production-baseline controls, named approvals, and company-owner go/no-go. |

## Continuation phases

D0–D7 implementation and verification slices are complete for the five-account synthetic demo. The
overall application remains subject to open privacy, clinical, legal, business, and operational
decisions. The following plans continue the demo/frontend track without implying that the controlled-
pilot Phase 0–6 gates are closed:

| Step | Covers | Status |
| --- | --- | --- |
| [Phase 7 — Frontend state and session foundation](phase-7-frontend-state-foundation.md) | Refresh-safe synthetic sessions, server-state cache boundaries, invalidation, persistent authenticated-shell boundary, and clock-driven join visibility. | Completed ✅ |
| [Phase 8 — UI system and application shell](phase-8-ui-system-and-app-shell.md) | Responsive public/authenticated shells, accessible shared primitives, scoped navigation, and a dedicated sign-in surface. | Implemented — review pending |
| [Phase 8 — UI system and application shell](phase-8-ui-system-and-app-shell.md) | Responsive shell, approved navigation, shared buttons/dialogs/statuses, and accessibility foundations. | Planned |
| [Phase 9 — Appointment experience](phase-9-appointment-experience.md) | Safe patient display name for assigned psychiatrists, appointment presentation, and centered cancellation confirmation/denial. | Completed ✅ — audit dated 5 September 2026 |
| [Phase 10 — Focused meeting experience](phase-10-meeting-experience.md) | JaaS-specific synthetic-demo meeting shell and responsive call layout. | Superseded — Google Meet real-launch work belongs to Phase 18 |
| [Phase 11 — Frontend performance and acceptance](phase-11-frontend-acceptance.md) | Performance, privacy, accessibility, regression matrix, and deferred owner walkthrough. | Automated acceptance verified — owner walkthrough deferred |
| [Phase 12 — Multi-factor authentication and privileged access](phase-12-mfa-and-privileged-access.md) | Second-factor enforcement, recovery/offboarding protection, and privileged-access verification. | Planned — owner role decision required |
| [Phase 13 — Appointment outcomes and rescheduling](phase-13-appointment-outcomes-and-rescheduling.md) | Clinician-recorded outcomes, no-show handling, server-authoritative rescheduling, and status-aware history. | Planned — clinical and owner decisions required |
| [Phase 14 — Doctor-managed availability and patient time selection](phase-14-doctor-managed-availability.md) | Clinician-owned weekday availability, 15-minute patient time choices, a two-week horizon, and server-authoritative conflict protection. | Planned — implementation must re-ground against the scheduling schema and RLS |
| [Phase 15 — Data, consent, and audit foundation](phase-15-data-consent-and-audit-foundation.md) | Provider-neutral protected objects, active-state compatibility, RLS/functions, typed audit, and tests required by R1. | Planned — begins only from Phase 14 as-built evidence or an explicit sequencing amendment plus approved data decisions |
| [Phase 16 — Identity and minor eligibility](phase-16-identity-and-minor-eligibility.md) | Adult eligibility, approved guardian consent/review, one booking/admission predicate, and safe status UI. | Planned — blocked on Phase 15 as-built and guardian/clinical/DPO/legal decisions |
| [Phase 17 — PayMaya payment-authorised booking](phase-17-paymaya-payment-authorised-booking.md) | Reserved slots, `payment_pending`, provider attempts/events, verified webhook confirmation, and pending-payment UI. | Planned — blocked on Phase 16 as-built, official PayMaya material, and commercial/privacy policy |
| [Phase 18 — Google Meet and session timing](phase-18-google-meet-and-session-timing.md) | Database-authoritative booked/eligible admission, approved Google Meet integration, scheduled end, and independent note timing. | Planned — blocked on Phase 17 as-built, Workspace/vendor validation, and clinical decisions |
| [Phase 19 — Support tickets and launch operations](phase-19-support-tickets-and-launch-operations.md) | Patient-owned administrative support, audited operations, exception handling, retention controls, kill switches, and runbooks. | Planned — blocked on Phase 15–18 as-built and support/operations/privacy decisions |
| [Phase 20 — Integrated launch verification and controlled release](phase-20-integrated-launch-verification-and-controlled-release.md) | Full synthetic acceptance, security/privacy/clinical/accessibility/performance evidence, restore/rollback exercises, approvals, and controlled activation. | Planned — blocked on all prior gates and company-owner go/no-go |

Each step requires its own dated as-built audit before the next step is treated as complete. These
steps remain synthetic-data-only until the applicable gates close and authorise no real accounts,
payments, appointments, consultations, or personal data merely by existing as plans.

## Historical current position — 27 August baseline

Updated 27 August 2026, following the first owner review. This snapshot is retained for the baseline
record; [Launch Readiness R1](../launch-readiness/README.md) governs the 8 September changes.

Six of the twelve register questions are answered in some form, four are partially answered, and two are deferred. The
[pilot decision register](../../product/pilot-decision-register.md) records each decision along with
the items carried to the next meeting. **The demo milestone is the immediate priority** — the owners
confirmed the synthetic demo is showcased to them before any real-user decision.

Two answers changed the project's shape rather than filling a gap, and every phase file reflects them:

- **Session notes are in scope.** Written by the psychiatrist, released by the psychiatrist, then readable by the patient. Orion now holds clinical content, which reaches Phase 2 schema, Phase 4 surfaces, and Phase 6 retention. Prescriptions, diagnoses, recordings, and transcripts remain excluded.
- **The separate support-role proposal was removed.** Orion remains a three-role application: patient, psychiatrist, and admin. Operational support is handled through least-privilege admin tooling.

Also changed: patient registration is public at initial launch, while psychiatrist
accounts stay invitation-only with an approval period before a psychiatrist becomes bookable.

**Q5 was settled the same day.** The appointment transitions are recorded in the
[appointment lifecycle](../../product/appointment-lifecycle.md) *Approved transitions* section, which is
authoritative: psychiatrist self-service cancellation at 48 hours with coordinator-executed late
cancellation, rescheduling as linked cancel-and-rebook, psychiatrist-set no-shows, and patient-cancelled
slots reopening while psychiatrist-cancelled slots do not. This unblocked the Phase 2 status model and
the Phase 4 state machine. Four values were referred onward — the grace period and join window to the
clinical lead, no-show consequences and the late-cancellation executor to the owners — and Q5 awaits
owner ratification, which should happen before Phase 4 is built rather than after.

**Blocking planning still:** Q11 retention and deletion, which holds back Phase 2 retention fields and
Phase 6 processes, then Q10 stop authority for Phase 6 runbooks.

**Policy prerequisite cleared.** The four knowledge-base documents that contradicted the session-notes
decision were reconciled on 27 August 2026 — product scope, data classification, privacy governance, and
the production service charter — so Phase 2 is no longer blocked on them. The register records what
changed under *Knowledge-base documents reconciled*.

Two dependencies were surfaced rather than resolved, and both constrain Phase 2:

- **Session notes have no retention period**, because Q11 is open and clinical records may carry a prescribed minimum. The data dictionary requires one for every field, so the rule is currently unsatisfiable for notes. Create the note schema; do not build retention or disposal behaviour.
- **Whether a data-subject access request overrides the note release step** is a question for the DPO. If it does, the release control is not a privacy boundary and Phase 2 must not treat it as one.

**Launch shape.** The first launch is a controlled pilot with public patient registration and no
active-patient cap. Monitoring and the owner-defined operating-review cadence determine when scaling
work is needed; approved geography remains a Q1 launch-boundary decision.

Update this section and the Tier 2 status column whenever a gate closes or a decision lands.
