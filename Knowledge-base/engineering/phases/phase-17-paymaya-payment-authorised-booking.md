# Phase 17 — PayMaya payment-authorised booking

**Status:** Waiting on PayMaya API — planning only

**Scope:** Define and implement the payment-authorised booking workflow for eligible patients.
Payment information must be verified by PayMaya and Orion’s server before an appointment becomes
`booked`.

## Current status

Phase 17 cannot proceed to implementation until the PayMaya API, merchant integration details,
supported payment methods, webhook contract, sandbox access, and provider operating requirements are
available.

## Intended workflow

```text
Eligible patient selects an available slot
        ↓
Orion creates a payment attempt
        ↓
Patient completes PayMaya checkout
        ↓
Orion verifies the provider result server-side
        ↓
Appointment becomes booked only after verified payment
```

The browser must not be able to mark an appointment paid or booked. Payment confirmation must be
idempotent, auditable, and safe against forged, duplicated, delayed, or replayed provider events.

## Decisions and inputs still required

- PayMaya API and SDK documentation;
- merchant account and sandbox credentials;
- supported payment methods and currencies;
- payment-intent and webhook lifecycle;
- payment timeout and abandoned-checkout behavior;
- cancellation, refund, reversal, and chargeback policy;
- payment data retention and privacy requirements;
- provider outage and reconciliation procedure;
- owner approval of the payment-authorised booking contract.

## Non-blocking boundary

Phase 17 does not block unrelated work or planning. It blocks implementation of the PayMaya booking
path and any workflow that requires a provider-verified paid `booked` appointment.

## Exit criteria for planning

Planning can close when the provider contract, payment policies, state model, server verification
boundary, audit requirements, implementation plan, and QA plan are documented and approved.
