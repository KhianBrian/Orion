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

| Phase | What it fixes for later phases |
| --- | --- |
| 0 | Register answers define Phase 2's schema and consent tables, Phase 4's cancellation state machine, Phase 5's provider, and Phase 6's retention and escalation runbooks. |
| 1 | The migration and secrets process determines mechanically how every Phase 2–5 change is authored, reviewed, and applied. |
| 2 | The as-built slot-lock function signature, RLS predicates, and audit columns are what Phase 3 routes read and Phase 4 booking code is written against. This is the tightest coupling in the plan. |
| 3 | How caller identity reaches the server determines Phase 4 authorisation and Phase 5 participant-token derivation. |
| 4 | The as-built appointment record is the input to Phase 5's decision about who may join which room, and when. |
| 5 | The approved provider determines Phase 6's outage exercise, kill-switch design, and vendor incident procedure. |

## Feedback loop

When a phase gate closes, add a dated as-built entry to [`audit-trail/`](../../audit-trail/README.md)
recording what was actually implemented, what deviated from the plan, and what remains open. The next
phase's implementation plan is written from that entry, not from the previous phase's plan. Without
this, each plan inherits the last plan's assumptions instead of reality.

Any intentional shortcut taken to close a gate goes in the audit trail's deferred simplifications
ledger with a stated close condition.

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
| [Phase 1 — Secure platform baseline](phase-1-baseline.md) | Environments, secrets, CI/CD, migrations, backups, monitoring. | Ready to plan — non-production scope only |
| [Phase 2 — Data, RBAC, consent, and audit](phase-2-data-rbac.md) | Schema, RLS, private functions, session notes, lifecycle and concurrency. | **Plannable** — only Q11 retention stays provisional |
| [Phase 3 — Replace prototype identity](phase-3-identity.md) | Supabase Auth, provisioning, and role-aware routes. | Plannable once Phase 2 as-built exists — no longer decision-blocked |
| [Phase 4 — One safe scheduling workflow](phase-4-scheduling.md) | Server-authoritative booking, cancellation, notes surface, conflict states. | **Plannable** — state machine settled; four values carried as named gaps |
| [Phase 5 — Approved private video](phase-5-video.md) | Provider integration, short-lived tokens, kill switches. | Blocked — Q8 real-launch provider deferred by the owners |
| [Phase 6 — Operations and controlled release](phase-6-operations.md) | Admin tooling, runbooks, reviews, release approval. | Blocked — Q1, Q10, Q11 open or partial |

## Continuation phases

D0–D7 implementation and verification slices are complete for the five-account synthetic demo. The
overall application remains subject to open privacy, clinical, legal, business, and operational
decisions. The following plans continue the demo/frontend track without implying that the controlled-
pilot Phase 0–6 gates are closed:

| Step | Covers | Status |
| --- | --- | --- |
| [Phase 7 — Frontend state and session foundation](phase-7-frontend-state-foundation.md) | Refresh-safe synthetic sessions, server-state cache boundaries, invalidation, persistent authenticated-shell boundary, and clock-driven join visibility. | Completed ✅ |
| [Phase 8 — UI system and application shell](phase-8-ui-system-and-app-shell.md) | Responsive shell, approved navigation, shared buttons/dialogs/statuses, and accessibility foundations. | Planned |
| [Phase 9 — Appointment experience](phase-9-appointment-experience.md) | Safe patient display name for assigned psychiatrists, appointment presentation, and centered cancellation confirmation/denial. | Planned |
| [Phase 10 — Focused meeting experience](phase-10-meeting-experience.md) | Unobscured responsive call layout, dedicated meeting shell, and lazy-loaded JaaS route. | Planned |
| [Phase 11 — Frontend performance and acceptance](phase-11-frontend-acceptance.md) | Performance, privacy, accessibility, regression matrix, and deferred owner walkthrough. | Planned |
| [Phase 12 — Multi-factor authentication and privileged access](phase-12-mfa-and-privileged-access.md) | Second-factor enforcement, recovery/offboarding protection, and privileged-access verification. | Planned — owner role decision required |

Each step requires its own dated as-built audit before the next step is treated as complete. These
steps remain synthetic-data-only and authorise no real accounts, appointments, or consultations.

## Current position

Updated 27 August 2026, following the first owner review.

Six of the twelve register questions are answered in some form, four are partially answered, and two are deferred. The
[pilot decision register](../../product/pilot-decision-register.md) records each decision along with
the items carried to the next meeting. **The demo milestone is the immediate priority** — the owners
confirmed the synthetic demo is showcased to them before any real-user decision.

Two answers changed the project's shape rather than filling a gap, and every phase file reflects them:

- **Session notes are in scope.** Written by the psychiatrist, released by the psychiatrist, then readable by the patient. Orion now holds clinical content, which reaches Phase 2 schema, Phase 4 surfaces, and Phase 6 retention. Prescriptions, diagnoses, recordings, and transcripts remain excluded.
- **A secretary role was added.** A fourth role with access to appointments and contact details only, never session notes. It touches Phases 2, 3, 4, and 6.

Also changed: patient registration is public at initial launch, while psychiatrist and secretary
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
