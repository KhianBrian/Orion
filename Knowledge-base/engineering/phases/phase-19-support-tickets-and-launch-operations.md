# Phase 19 — Support Tickets and Launch Operations

**R1 mapping:** Implements the support and operational-control portion of R1.5 using the exact
Phase 15 ticket contract and the Phase 16–18 as-built behavior.

**Status:** Blocked — Phase 15–18 as-built evidence plus support ownership, role scope, retention,
privacy, and exception-handling decisions are required before implementation.

## Outcome

Patients can open and follow an administrative support ticket, while only the approved operations
role can use a least-privilege, audited queue. Payment and meeting exceptions are handled through
separate protected operations commands; ticket content never grants authority over an appointment,
payment, meeting, consent decision, or clinical note.

## Where implementation draws its basis

1. [Production service charter](../../product/production-service-charter.md),
   [product scope](../../product/product-scope.md), and
   [clinical safety](../../product/clinical-safety-and-telepsychiatry-policy.md) for the support
   boundary and prohibited clinical/emergency use.
2. [Privacy governance](../../governance/privacy-governance.md), the
   [data dictionary](../../governance/data-classification-and-data-dictionary.md), and the
   [access/audit policy](../../architecture/access-control-and-audit-policy.md) for readers,
   retention, redaction, rights, and evidence.
3. [Phase 6](phase-6-operations.md) for operating ownership, incidents, access review, restore, and
   controlled-release obligations. Phase 19 extends that authority; it does not silently close its
   historical gate.
4. [R1.1](../launch-readiness/r1.1-data-consent-and-audit-extension.md) and the exact ticket schema,
   functions, grants, and event codes recorded by the Phase 15 as-built audit.
5. The exact eligibility, payment, and meeting states and kill switches recorded by the Phase 16,
   Phase 17, and Phase 18 as-built audits. If any is absent, its dependent operation stops.
6. Fresh inspection of the deployed schema, functions, routes, authorization rules, logging,
   monitoring, backup/restore configuration, and test suites when implementation begins.

A phase plan is not implementation evidence. Meeting notes, mockups, or role names alone do not
authorise support access.

## Scope

- Patient-owned administrative tickets and messages through protected functions.
- Minimal approved operations queue, assignment, reply, status, and reopen behavior.
- Approved payment reconciliation and Google Meet incident operations using prior-phase commands.
- Independent kill switches, privacy-safe observability, rate limits, and abuse handling.
- Approved retention, export, correction, deletion/disposal, and legal-hold processes.
- Runbooks and exercises needed before integrated launch verification.

## Non-goals

- Clinical advice, diagnosis, session notes, emergency response, or crisis triage in tickets.
- File uploads, email ingestion, or support-email activation without a separate approved decision.
- Broad admin browsing of patients, guardians, payments, appointments, meetings, or notes.
- Letting a ticket message or operator edit directly determine booking, payment, consent, meeting, or
  outcome state.
- Giving any separate support role ticket access by assumption. Default is deny until owners approve a precise
  scope and the full allow/deny matrix passes.
- Implementing retention or data-rights actions while Q11/DPO rules remain unresolved.

## Required decisions and material

| Authority | Decision/input |
| --- | --- |
| Company owners/operations | Queue owner, responder roles, lifecycle, assignment, reply/reopen rules, support hours/SLA wording, escalation, abuse handling, stop authority, and support-email activation. |
| Finance/payment operations | Reconciliation actors, reason/evidence requirements, refund/chargeback/late-success/duplicate-charge procedures, dual control if required, and customer communication. |
| Workspace/video operations | Outage and admission-incident owner, provider escalation, evidence, recovery, and communication. |
| DPO/legal/security | Ticket and operational evidence readers, lawful basis, notices, retention/disposal, exports/rights, legal holds, log redaction, rate limits, incident handling, and admin boundary. |

## Provisional Tier 2 implementation plan

### P19-0 — Re-ground all consumed contracts

- Read the dated Phase 15–18 as-built audits and resolve every migration, table, projection,
  function, event code, failure state, kill switch, and actor actually delivered.
- Query the deployed grants, RLS policies, function ownership/search paths, status constraints, audit
  fields, and provider-operation boundaries.
- Compare the approved support/retention/incident decisions with the Phase 15 logical ticket model;
  amend the plan before coding if they differ.
- Confirm the selected operator role. Do not translate “admin” into permissions without
  an explicit recorded decision.

### P19-1 — Protected ticket lifecycle

- Add only forward ticket fields/status changes required by the approved lifecycle.
- Implement protected commands for patient create, own-list/detail, approved reply, close, and reopen
  behavior; derive patient ownership and actor server-side.
- Implement operator queue/detail/assignment/reply/status commands returning the minimum approved
  projection.
- Keep messages append-only where evidence requires it; prohibit direct table mutation and hard
  deletion outside the approved retention process.
- Audit read and mutation facts using IDs, actor, transition, reason code, correlation, and database
  time without message/category content.

### P19-2 — Authorization, rate limiting, and content boundary

- Add allow/deny coverage for owner patient, other patient, psychiatrist, admin/operator,
  guardian context, anonymous caller, and infrastructure role.
- Enforce server-side size, category, frequency, and state-transition rules using approved generic
  error codes.
- Provide no upload/email path and no HTML/script execution. Prevent support content from entering
  logs, URLs, analytics, error trackers, traces, or notification metadata.
- Display the approved administrative-only and non-emergency language before submission and in ticket
  detail.

### P19-3 — Payment and meeting exception operations

- Consume Phase 17 protected reconciliation/refund/exception commands without duplicating provider or
  appointment transition logic in the ticket feature.
- Consume Phase 18 outage/admission incident states and meeting kill switch without exposing meeting
  identifiers or reusable entry data.
- Require the approved actor, reason, evidence reference, idempotency key, and audit event for every
  privileged operation.
- Keep a ticket reference informational: linking a ticket never grants the ticket reader access to
  the linked record and never changes domain state.

### P19-4 — Patient and operations surfaces

- Add patient ticket create/list/detail/status and only the approved reply/reopen actions.
- Add the smallest approved operations queue, filters, detail, assignment, response, and state actions.
- Add payment/meeting exception surfaces only for approved commands and projections from Phase 17/18.
- Keep clinical notes, guardian evidence, raw provider data, broad profile browsing, and direct state
  editing absent.
- Add accessible empty, pending, failure, rate-limited, closed, and unavailable states on desktop and
  mobile.

### P19-5 — Retention, observability, controls, and runbooks

- Implement export, correction, deletion/disposal, backup treatment, and legal-hold behavior only from
  the approved field-level schedule. Leave actions unavailable while policy is incomplete.
- Emit counts, latencies, failures, and coarse reason codes only; validate redaction using sentinel
  ticket, guardian, payment, note, and meeting content.
- Exercise independent eligibility/guardian-intake, booking/payment-initiation, webhook-transition,
  meeting-creation/admission, and ticket-mutation kill switches.
- Finalize runbooks for support abuse, payment exception, provider outage, privacy request, security
  incident, clinical escalation, access review, restore, and stop/rollback communication.

### P19-6 — Verification and as-built handoff

- Run ticket table/function/route allow-deny, ownership, transition, rate-limit, XSS/content, audit,
  and redaction tests.
- Verify privileged operations cannot rebind patient/appointment/provider relationships or bypass the
  Phase 16–18 state machines.
- Run approved retention/data-rights/legal-hold tests, or record them as a launch blocker if policy is
  still absent.
- Exercise runbooks and kill switches with synthetic data; record owners, timings, outcomes, and
  follow-ups without sensitive artifacts.
- Run D1–D7, Phase 9, booking/cancellation, eligibility, payment, meeting, lint, build,
  accessibility, desktop/mobile, and security regressions.
- Write the Phase 19 dated as-built audit with exact grants, functions, UI surfaces, runbooks, test
  evidence, deviations, and remaining blockers.

## Expected files changed during implementation

- New forward ticket/status/RLS/function/audit migrations only where the Phase 15 foundation needs an
  approved extension.
- New ticket and privileged-operations Edge Functions only where database functions alone are not the
  correct boundary.
- New `Orion_React_App/src/features/support/` patient and operations surfaces, route/ability
  constants, and narrowly scoped provider-exception UI.
- Ticket, payment-operation, meeting-operation, RLS, audit, redaction, rate-limit, unit, integration,
  desktop/mobile, accessibility, and security tests.
- Operations runbooks, privacy/data dictionary, RBAC/audit, Supabase, status, and dated Phase 19
  as-built documents.

## Gate

Phase 19 completes only when:

- patients can access only their own administrative tickets and approved operators can access only
  the minimum audited queue;
- psychiatrist by default, guardian context, other patients, and anonymous callers are
  denied at table, function, API, route, and navigation layers;
- ticket content cannot change or grant access to appointment, eligibility, payment, meeting, note,
  or clinical state;
- exception operations use the approved Phase 17/18 commands, actors, reasons, evidence, and audit;
- sensitive content is absent from logs, audit metadata, analytics, URLs, errors, screenshots, and
  reports;
- approved retention/data-rights behavior and every required runbook/kill-switch exercise pass;
- support, operations, DPO/legal, security, finance, and provider owners record approval; and
- the dated Phase 19 as-built audit exists.

## Phase 20 implementation input

Phase 20 consumes the exact ticket roles/lifecycle, exception-operation commands, runbook revisions,
kill switches, observability signals, retention controls, and unresolved launch blockers from the
Phase 19 as-built audit.

## Inputs not yet available

- Phase 15–18 dated as-built evidence.
- Approved admin support scope, lifecycle, support hours, escalation, and stop authority.
- Final payment and Google Meet exception procedures.
- Field-level ticket/operations/audit retention, rights, disposal, backup, and legal-hold decisions.
