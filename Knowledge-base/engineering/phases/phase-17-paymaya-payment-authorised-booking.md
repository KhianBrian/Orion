# Phase 17 — PayMaya Payment-Authorised Booking

**R1 mapping:** Implements R1.3 using the Phase 15 payment foundation and Phase 16 eligibility gate.

**Status:** Blocked — official PayMaya material, commercial policy, DPO/legal approval, and Phase 16
as-built evidence are required before implementation.

## Outcome

Orion has one patient booking path. It reserves the selected slot, creates one appointment in
`payment_pending`, creates PayMaya checkout server-side, and changes that same appointment to `booked`
only after an authentic provider result is processed idempotently. Browser-return parameters never
prove payment.

## Where implementation draws its basis

1. Payment direction and commercial blockers in the
   [decision register](../../product/pilot-decision-register.md),
   [product scope](../../product/product-scope.md), and
   [appointment lifecycle](../../product/appointment-lifecycle.md).
2. Privacy/vendor approval in [privacy governance](../../governance/privacy-governance.md) and field
   limits in the [data dictionary](../../governance/data-classification-and-data-dictionary.md).
3. Provider-neutral contract in [R1.1](../launch-readiness/r1.1-data-consent-and-audit-extension.md).
4. Exact Phase 15 payment/status/constraint schema and Phase 16 bookability predicate from their dated
   as-built audits. If either audit is absent, implementation stops.
5. Official PayMaya documentation and credentials for the selected merchant product—not remembered or
   third-party field names.
6. Fresh inspection of the current booking Edge Function, transaction signatures, slot model,
   appointment projection/UI, cancellation behavior, and tests.

## Scope

- One server-authoritative pending-payment reservation transaction.
- Provider adapter and PayMaya checkout creation.
- Verified webhook/event processing, duplicate/retry/order handling, and safe status retrieval.
- Pending/booked patient and assigned-psychiatrist UI states.
- Approved admin reconciliation boundary and payment exception states where policy exists.
- Booking/payment kill switches, audit, observability, and synthetic verification.

## Non-goals

- Trusting client patient/psychiatrist/amount/currency/status/provider IDs or browser returns.
- Storing card, wallet, credential, raw sensitive provider payload, or provider secrets.
- Inventing expiry, failure, cancellation, refund, reschedule, no-show, receipt, chargeback, late
  success, settlement, or reconciliation policy.
- Adding a second booking route or falling back to current direct `booked` behavior in real mode.
- Meeting creation/admission, ticket support, or production activation.

## Required decisions and material

| Authority | Decision/input |
| --- | --- |
| PayMaya/vendor | API/product version, sandbox, checkout/lookup/event/reference fields, authentication/signing, replay, retries/order, expiry, statuses, acknowledgment, and reconciliation. |
| Owners/finance/operations | Amount/currency source, reservation expiry, provider-create failure, abandonment, cancellation, reschedule, no-show, refunds, duplicate charge, chargeback, receipt, late success, settlement, and manual reconciliation authority. |
| DPO/legal | Vendor/data-flow approval, lawful basis, notice, readers, retention/disposal, evidence, data location/transfer, and provider terms. |
| Security/operations | Secret rotation, webhook exposure, rate limits, alerting, kill-switch owner, reconciliation access, and incident response. |

## Provisional Tier 2 implementation plan

### P17-0 — Re-ground and map PayMaya

- Read Phase 15/16 as-built audits and query exact live schema/functions/policies/grants.
- Inspect `book-appointment`, `book_appointment_for_patient`, active slot/appointment constraints,
  `get_my_appointments()`, cancellation, and current React booking states.
- Map official PayMaya fields/statuses/events to Orion-normalized fields/codes in a reviewed adapter
  table; record unknown/unmapped events as non-booking outcomes.
- Freeze the commercial transition matrix and safe API/error contract.

### P17-1 — Pending reservation transaction

- Replace the real booking transaction behind the existing entry point; do not create a parallel path.
- Accept only slot ID and patient-scoped idempotency key.
- Authenticate, call Phase 16 bookability, lock/recheck slot with database time, derive patient,
  psychiatrist, amount, currency, and 45-minute timestamps server-side.
- Atomically create reserved slot, `payment_pending` appointment, payment attempt, and audit event.
- Return the original attempt for retry. A competing caller receives generic `slot_unavailable`.
- Keep current synthetic direct booking explicitly demo-only until no longer needed by its tests.

### P17-2 — Checkout adapter

- Call PayMaya only after the reservation commits, using server secrets and Orion references.
- Persist only allow-listed checkout/payment references, normalized state, and database timestamps.
- On timeout/failure, keep the appointment non-booked and follow only the approved reservation policy.
- Ensure retry resolves the existing attempt before any provider-create call.
- Return only an approved redirect target and safe Orion status; no sensitive relationship in URLs.

### P17-3 — Webhook and provider events

- Verify method, size, content type, authenticity/signature, timestamp/replay, and identifiers exactly
  as official material requires, while keeping raw request content out of logs/errors/audit.
- Resolve attempts from stored provider references, not client relationship IDs.
- Insert one append-only provider event under a unique provider/event identity.
- Lock current attempt/appointment state and transition `payment_pending` to `booked` once only for an
  approved verified-success event.
- Treat duplicate, unknown, conflicting, out-of-order, late, failed, and cancelled events according to
  the approved matrix; otherwise leave them unresolved and non-booked.

### P17-4 — Browser return, projections, and UI

- Add an authenticated payment-return/status route that ignores success/cancel query parameters as
  evidence and reads Orion state.
- Replace immediate confirmation with reserving, checkout-ready, redirecting, pending/verifying,
  booked, unresolved, and provider-unavailable states.
- Show `payment_pending` distinctly in My appointments and never show Join.
- Expose assigned psychiatrist only a coarse operational status needed for their schedule.
- Add approved admin reconciliation UI only through a protected function and without broad patient or
  provider-payload access. Secretary remains denied until approved.

### P17-5 — Cancellation and exception compatibility

- Re-ground the existing patient cancellation transaction against pending/payment states.
- Do not let existing cancellation logic accidentally cancel/reopen/refund a pending or paid booking
  without approved policy.
- Integrate Phase 13 reschedule/no-show/outcome only after their commercial effects are approved.
- Make manual reconciliation require approved actor, reason, evidence reference, correlation, and
  immutable audit; relationship IDs remain immutable.

### P17-6 — Verification and as-built handoff

- Test concurrency and idempotency for reservation, checkout, provider event, and transition.
- Test forged returns, cross-patient/psychiatrist/appointment rebinding, direct RPC, bad signatures,
  replay, duplicate and out-of-order events, status visibility, and redaction.
- Test expiry/failure/refund/late-success only after the corresponding policy exists.
- Verify `payment_pending` cannot obtain meeting admission.
- Run all existing booking/cancellation/RLS/appointment/D5/unit/desktop/mobile regressions.
- Write the Phase 17 as-built audit with exact provider/API version, migrations/functions/events,
  secrets/configuration names (never values), tests, deviations, and open commercial gates.

## Expected files changed during implementation

- New forward payment/appointment/slot/RLS/function migrations.
- `supabase/functions/book-appointment/index.ts` and new PayMaya checkout, webhook, status, and
  approved reconciliation Edge Functions.
- `Orion_React_App/src/pages/PatientAppointment.jsx`, `src/pages/Appointments.jsx`, appointment
  queries/mutations/components, route constants/configuration, and new payment-return feature files.
- Booking/payment DB scripts, integration/unit/redaction tests, and desktop/mobile Playwright flows.
- Decision, lifecycle, data/privacy, RBAC/audit, Supabase/status, provider, operations, and Phase 17
  audit documents.

## Gate

Phase 17 completes only when:

- one booking entry point creates one pending reservation/attempt under retry and concurrency;
- immutable database relationships prevent every cross-user/provider-reference rebind;
- only one authentic provider event changes pending to booked;
- browser return/direct client calls cannot mark paid/booked;
- payment-pending and every non-booked outcome denies meeting admission;
- safe role projections and audit/redaction tests pass;
- every implemented exception matches recorded commercial/privacy policy;
- existing critical synthetic regressions pass; and
- the dated Phase 17 as-built audit exists.

## Phase 18 and 19 implementation input

Phase 18 consumes the exact booked/payment-confirmation predicate. Phase 19 consumes the exact
exception/reconciliation states and protected operational functions. Neither reinterprets PayMaya.

## Inputs not yet available

- Phase 15/16 as-built evidence.
- Official PayMaya material and sandbox/merchant configuration.
- Commercial, DPO/legal, security, reconciliation, and retention decisions.
