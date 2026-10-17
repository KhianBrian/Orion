# Phase 19 — Support Tickets and Launch Operations

**R1 mapping:** Implements the support and operational-control portion of R1.5 using the exact
Phase 15 ticket contract and the Phase 16–18 as-built behavior.

**Status:** Done — complete for the owner-approved scope (17 October 2026). Items outside that scope are
carried forward to Phase 20 as launch blockers; this does not approve real-user activation.

Read the **Close-off 17 October 2026** section first. The sections after it record the original plan,
proposals, and gate for history; where they differ from the close-off, the close-off governs. Phase 19
is not reopened by the items carried forward to Phase 20.

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
- Minimal approved operations queue, reply, status, and reopen behavior. No ticket ownership.
- Approved payment reconciliation and Google Meet incident operations using prior-phase commands.
- Independent kill switches, privacy-safe observability, rate limits, and abuse handling.
- Approved retention, export, correction, deletion/disposal, and legal-hold processes.
- Runbooks and exercises needed before integrated launch verification.

## Non-goals

- Clinical advice, diagnosis, session notes, emergency response, or crisis triage in tickets.
- Email ingestion or support-email activation without a separate approved decision. (File
  attachments on tickets were approved on 16 October 2026.)
- Broad admin browsing of patients, guardians, payments, appointments, meetings, or notes.
- Letting a ticket message or operator edit directly determine booking, payment, consent, meeting, or
  outcome state.
- Giving any separate support role ticket access by assumption. Default is deny until owners approve a precise
  scope and the full allow/deny matrix passes.
- Implementing retention or data-rights actions while Q11/DPO rules remain unresolved.

## Owner decisions recorded 16 October 2026

- **Ownership:** none. A ticket is not owned or assigned. Every admin sees every ticket, replies to it,
  and resolves it. (A same-day earlier direction, that the available developer handles a ticket,
  was withdrawn by the owners.)
- **Status control:** ticket statuses are changeable only from the admin side. Requesters read the
  status and cannot change it.
- **Role:** no separate support role. Developers use the existing `admin` role (confirmed).
- **Visibility:** every admin can see every ticket in the queue. This is limited to tickets and their
  messages and attachments.
- **Attachments:** support tickets accept file attachments, as built.
- **Status lifecycle:** the five-status lifecycle (`submitted`, `in_progress`,
  `awaiting_requester`, `resolved`, `closed`) below is approved.
- **Notifications:** a ticket sender and the admin side are notified when a message is received.
  See "Notifications" below.
- **Support hours, response-time wording, and escalation contacts:** the owners stated these do not
  need to be decided.

These decisions are recorded in the
[pilot decision register](../../product/pilot-decision-register.md). They do not by themselves
authorise implementation: the gate below still applies.

## Close-off 17 October 2026

Phase 19 is closed for the scope the owners approved. This section is the record of what that means.

| Original gate item | Result |
| --- | --- |
| Patients reach only their own tickets; admins reach the audited queue | Done and tested through the database, the Edge Function, direct access, and storage. |
| Psychiatrist, other patients, and anonymous callers denied at every layer | Done. Psychiatrists may open their own tickets (a decision since the plan was written). |
| Ticket content cannot change or grant access to appointment, payment, meeting, or note state | Done. A call reference is informational only. |
| Exception operations use the approved Phase 17/18 commands | Not built: payment exceptions need Phase 17; the Meet problem view was dropped by direction. |
| Sensitive content absent from logs, audit, analytics, URLs, errors | Covered by design (IDs and codes only) and existing audit tests; a separate leak-test pass was dropped by direction. |
| Retention, data rights, runbooks, and kill-switch exercises pass | Retention decided at a maximum of 1 year; enforcement not built. Runbooks and the kill switch were dropped by direction. |
| Named approvals recorded | Not recorded; carried to Phase 20. |
| Dated as-built audit exists | Yes: `20261017-phase-19-close-off-audit.md`. |

**Retention decision:** support tickets, messages, attachments, and status history are kept for at most
1 year.

**Carried forward to Phase 20 as launch blockers:** automatic deletion at the 1-year limit; export,
correction, and deletion on request; payment exception handling (Phase 17); the named sign-offs;
removal of orphaned upload files and a decision on scanning uploads; email notifications and a support
email address (deferred).

## Scope narrowed 17 October 2026

The remaining Phase 19 work is limited to three items by owner direction:

1. **Rate limits** on new tickets and replies, so one person cannot flood the queue.
2. **Wider permission tests** across every layer (database, commands, Edge Function, routes, storage).
3. **Report a recent call on a ticket.** A patient or psychiatrist can pick one of their own recent calls
   when they open a ticket, so the ticket carries that call's ID and admins can track it. The reference
   is informational: it grants no access to the call or its notes and changes no appointment state.

Not needed now, by the same direction: a support on/off switch, an admin Google Meet problem view,
written runbooks and drills, and a separate privacy-leak test pass. Retention and data rights, payment
exceptions, and the named sign-offs stay open and are not built here. The dated as-built audit entry
for this work is still written.

## Approved design (16 October 2026) and the operations plan as proposed then (historical)

### Status lifecycle (approved; replaces the single `submitted` status)

| Status | Meaning | Who sets it |
| --- | --- | --- |
| `submitted` | New. Set automatically on creation. | System |
| `in_progress` | An admin has started work. | Admin |
| `awaiting_requester` | An admin asked the requester something. | Admin |
| `resolved` | An admin believes it is answered. | Admin |
| `closed` | Finished; no further replies. | Admin |

- Only an admin can change status, and any admin can change any ticket. The server checks the actor's
  role and an allowed-transition list; the browser never decides. Reopening is an admin moving a
  `resolved` or `closed` ticket back to `in_progress`. A requester reply on a resolved ticket is stored
  but does not change status; the admin queue marks it so an admin notices.
- **No ownership.** There is no taking, releasing, reassigning, or handler field. Every admin sees every
  ticket and may reply to it or change its status.
- Every status change writes an append-only history row (ticket, actor, from, to, database time,
  optional reason code) with no message content.

### Notifications (approved requirement; in-app only confirmed 16 October 2026)

- **Who is notified:** every admin when a requester sends a new ticket or a reply, and the requester
  (patient or psychiatrist) when an admin replies.
- **Channel:** in-app only. A badge on the Support navigation item counts tickets with an unread
  message for the signed-in person, and each ticket row shows a "New reply" marker. For admins, the
  queue also marks tickets where a requester replied after the ticket was resolved.
- **Content:** notifications carry only the fact that something is new, never the message text,
  category, or attachment names. This follows the P19-2 rule that support content must not appear in
  notification metadata.
- **Freshness:** the badge refreshes when the person opens or refocuses the app and on a short
  interval; live push is not required.
- **Not included:** email, SMS, or push notifications. The support email address and email
  notifications remain deferred until implementation is otherwise complete, as recorded on 8
  September 2026.

### Operations side, in recommended order

1. **Lifecycle and history** (above). This is the core of P19-1 and P19-4.
2. **Safeguards (P19-2, P19-5):** rate limits on creating tickets and replies, an abuse path (an admin
   closes the ticket with a reason code), a support kill switch reusing the existing
   `system_controls` pattern, and logs that carry counts and reason codes only.
3. **Read-only incident view for meetings (P19-3):** show an admin the privacy-safe Google Meet
   failure records and the existing Meet kill switch. No meeting identifiers or entry links.
4. **Concern markers:** tickets with the topics `clinician_or_user_concern` or `privacy_or_data` show a
   visible marker in the queue so admins treat them carefully. No named escalation contact is
   required, per the owners.
5. **Runbooks and drills (P19-5, P19-6):** written runbooks for ticket abuse, Meet outage, privacy
   request, and security incident, then a synthetic-data drill of each kill switch.
6. **Waiting on others:** payment exception handling waits for Phase 17; retention, export, and
   deletion wait for the DPO and legal decisions. Leave those actions unavailable until then.

### Open questions

- None from the 16 October 2026 review. The lifecycle and notification design are
  approved. The operations-side order (safeguards, incident view, runbooks) remains a proposal.

## Required decisions and material

| Authority | Decision/input |
| --- | --- |
| Company owners/operations | Queue owner, responder roles, lifecycle, assignment, reply/reopen rules, support hours/SLA wording, escalation, abuse handling, stop authority, and support-email activation. |
| Finance/payment operations | Reconciliation actors, reason/evidence requirements, refund/chargeback/late-success/duplicate-charge procedures, dual control if required, and customer communication. |
| Workspace/video operations | Outage and admission-incident owner, provider escalation, evidence, recovery, and communication. |
| DPO/legal/security | Ticket and operational evidence readers, lawful basis, notices, retention/disposal, exports/rights, legal holds, log redaction, rate limits, incident handling, and admin boundary. |

## Original provisional implementation plan (historical; superseded by the close-off above)

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
- Implement operator queue/detail/reply/status commands returning the minimum approved
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
- Provide no email path and no HTML/script execution. File attachments stay limited to the
  approved private-storage path (3 files, 10 MB each, PNG/JPEG/PDF/text). Prevent support content from entering
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
- Add the smallest approved operations queue, filters, detail, response, and state actions,
  plus the in-app message notifications described above.
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

## Original gate (historical; see the close-off above for the result)

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

## Inputs that were not available when this plan was written (historical)

- Phase 15–18 dated as-built evidence.
- Owner approval of the proposed status lifecycle and stop authority. (Support hours and escalation
  contacts are not required, per the owners on 16 October 2026.)
- Final payment and Google Meet exception procedures.
- Field-level ticket/operations/audit retention, rights, disposal, backup, and legal-hold decisions.
- Retention and disposal rules for ticket attachments, which follow the DPO and legal decision above.
