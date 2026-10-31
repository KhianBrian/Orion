# Phase 17 use-case and edge-case matrix

**Status:** Planning input only. Nothing here approves implementation or decides policy.

**Plan:** [Phase 17 — PayMaya payment-authorised booking](phases/phase-17-paymaya-payment-authorised-booking.md)

**Evidence:** [Maya sandbox spike audit](../audit-trail/20261031-phase-17-maya-sandbox-spike-audit.md)

**Lifecycle:** [Appointment lifecycle](../product/appointment-lifecycle.md)

This matrix exists so that nothing is overlooked when the real Maya API access arrives. Each row
names a scenario, what Orion must guarantee, what we know about Maya's behaviour, and how it will
be tested. Evidence labels: **observed** (seen in the sandbox spike), **reported** (Maya
documentation only), **unknown** (not yet established), **policy** (an owner decision, which
engineering must not make by default).

## How to read the "Orion must" column

Where a row says *invariant*, it follows directly from the approved lifecycle and the rule that only
a server-verified payment may move an appointment to `booked`. Where it says *policy*, the
behaviour is a commercial, clinical or operations decision that is still open, and the row only
records that a decision is needed.

## A. Creating a payment attempt

| # | Scenario | Orion must | Maya evidence | Test |
| --- | --- | --- | --- | --- |
| A1 | Two patients select the same slot at once | Only one `payment_pending` appointment exists for the slot (invariant) | Not a Maya concern; protected by the Phase 15 active-slot constraint | Database test with concurrent calls |
| A2 | One patient double-clicks or retries Pay | One attempt per idempotency key, never two checkouts for one click (invariant) | Maya accepts duplicate reference numbers, so it will not stop us (observed) | Database test on the unique key; Edge Function test |
| A3 | Client sends its own price or items | Ignore it and compute the amount server-side (invariant) | Maya accepts items that do not add up to the total (observed) | Edge Function test with a tampered body |
| A4 | Redirect URL is `http://` or missing | Always send our own `https` URLs (invariant) | Maya accepts both (observed) | Edge Function unit test |
| A5 | Amount is 0, over 9,999,999 or not PHP | Reject before calling Maya (invariant) | Maya rejects with `2553` or `PY0037` (observed) | Unit test |
| A6 | Maya create call fails or times out | Leave no orphaned paid-looking state; the attempt is failed or retried safely (invariant) | Errors seen for bad keys and bad JSON; outage behaviour unknown | Edge Function test with a stubbed failure |
| A7 | Create succeeds but our database write fails afterwards | Detect the orphan checkout later and settle it (invariant) | Checkout exists at Maya and expires after one hour (observed) | Reconciliation test |
| A8 | Reference number reuse | One fresh reference per attempt, always match on checkout ID (invariant) | Duplicates accepted, lookup returns an array (observed) | Unit test |

## B. Confirming a payment

| # | Scenario | Orion must | Maya evidence | Test |
| --- | --- | --- | --- | --- |
| B1 | Patient returns to the success URL | Treat it as a hint only; verify with Maya using the secret key (invariant) | Landing on `/cancel` was reported for a still-pending checkout (observed) | Forged-return test |
| B2 | Status says `COMPLETED` | Never read it as paid (invariant) | Set for failed, cancelled and voided payments too (observed) | Unit test on the status mapper |
| B3 | Receipt number present | Never read it as paid (invariant) | A declined payment carried a UUID receipt (observed) | Unit test |
| B4 | Paid amount or currency differs from the appointment | Do not book; flag for review (invariant) | Not tested because the sandbox charges what we ask | Unit test with a mismatched fixture |
| B5 | Payment ID does not match the stored checkout ID | Do not book (invariant) | Checkout ID equals payment ID (observed) | Unit test |
| B6 | Reference lookup returns several records | Select by checkout ID, never the first row (invariant) | Array returned, duplicates possible (observed) | Unit test |
| B7 | Patient pays twice | Only one payment settles the appointment; the extra is surfaced (invariant); its handling is policy | A paid link cannot be paid again (observed); two separate checkouts can both be paid | Database test; sandbox re-run |
| B8 | Maya says paid but the lookup call fails | Stay `payment_pending` and retry; never guess (invariant) | Lookup errors seen (observed) | Edge Function test |

## C. Webhooks

| # | Scenario | Orion must | Maya evidence | Test |
| --- | --- | --- | --- | --- |
| C1 | Forged webhook | Treat as a trigger only; re-fetch and verify (invariant) | No documented signature (reported) | Forged-event test |
| C2 | Same event delivered twice | Process once (invariant) | Retries at 0, 5, 15 and 45 minutes (reported); event ID unknown | Database test on the unique event key |
| C3 | Events arrive out of order | End in the right state regardless of order (invariant) | Unknown | Unit test with shuffled events |
| C4 | Webhook arrives before the patient returns | Same result as the return path (invariant) | Unknown | End-to-end test |
| C5 | Webhook never arrives | Reconciliation settles it within the policy window (invariant); the window is policy | Unknown | Reconciliation test |
| C6 | Handler is slow | Return 200 within five seconds and defer heavy work (invariant) | Five-second limit (reported) | Edge Function timing test |
| C7 | Source IP filtering | Decide whether it is usable inside an Edge Function | IPs documented (reported); readability unknown | Spike on the deployed function |
| C8 | Which events to subscribe to | Success, failed, expired, cancelled and authorised, per the Maya docs | Reported only | Sandbox run with our own merchant |

**Status of section C.** Webhook delivery has not been tested. It needs a sandbox merchant that
only we use and a public HTTPS address. This is the next planned work after this document merges.

## D. Time and expiry

| # | Scenario | Orion must | Maya evidence | Test |
| --- | --- | --- | --- | --- |
| D1 | Patient abandons checkout | Release the slot at Orion's own expiry (invariant); the length is policy | Maya expires unpaid checkouts one hour after creation, about 14 seconds late (observed) | Database test on the expiry job |
| D2 | Orion's expiry is shorter than Maya's hour | A late success must not be lost or silently kept (invariant); handling is policy | Checkout stays payable until Maya's expiry (observed) | Race test |
| D3 | Payment succeeds after the slot was released or rebooked | Do not double-book; surface for void or refund (invariant); handling is policy | Void works after payment (observed) | Race test |
| D4 | Patient pays at the last second | Exactly one of paid or released wins (invariant) | Unknown | Concurrency test |
| D5 | Clock difference between Orion and Maya | Use server time and Maya's `expiredAt` consistently (invariant) | `expiredAt` is one hour after creation (observed) | Unit test |

## E. Cancellation, void and refund

| # | Scenario | Orion must | Maya evidence | Test |
| --- | --- | --- | --- | --- |
| E1 | Cancel before Maya's cut-off | Void the payment and record it (invariant); fee treatment is policy | Void works and a second void is rejected safely (observed) | Sandbox re-run; Edge Function test |
| E2 | Cancel after cut-off | Refund through a separate path (invariant); eligibility is policy | Refund rejected with `PY0072` after 20 hours (observed); cut-off unknown | Needs Maya's answer |
| E3 | Partial refund and over-refund | Never refund more than was paid (invariant) | Partial refund attempted but not accepted (observed) | Unit test; sandbox once reachable |
| E4 | Appointment cancelled while the patient is paying | Cancel the attempt and void any late payment (invariant) | Unknown | Race test |
| E5 | Psychiatrist cancels a paid appointment | A refund or void follows (invariant); the rule is policy | Unknown | Policy first |
| E6 | Reschedule of a paid appointment | Keep one payment tied to the linked appointments (invariant); treatment is policy | Unknown | Policy first |
| E7 | Void or refund call fails | Retry safely and keep an audit trail (invariant) | `PY0045` and `PY0072` seen (observed) | Edge Function test |
| E8 | Chargeback | Record and surface it (invariant); handling is policy | Unknown | Policy first |

## F. States and data

| # | Scenario | Orion must | Maya evidence | Test |
| --- | --- | --- | --- | --- |
| F1 | Map every Maya state | Cover pending, success, failed, auth-failed, cancelled, voided and expired (invariant) | All seen (observed); `voided` is missing from `payment_attempt_status` | Migration and unit test |
| F2 | Store only what is needed | Keep provider reference, status, amount, currency, receipt and timestamps; never card data, tokens or raw payloads (invariant) | Responses contain tokens and masked card data (observed) | Log and schema review |
| F3 | Money arithmetic | Convert Maya decimal strings with exact arithmetic, never floats (invariant) | Amounts arrive as decimals, strings accepted (observed) | Unit test |
| F4 | Audit trail | Every state change leaves an audit event (invariant) | Not a Maya concern | Database test |
| F5 | Patient privacy | No clinical detail sent to Maya (invariant) | Items and buyer fields are free text | Edge Function test on the payload |

## G. Operations

| # | Scenario | Orion must | Maya evidence | Test |
| --- | --- | --- | --- | --- |
| G1 | Maya outage | Fail safe and keep the slot unbooked (invariant); patient messaging is policy | Unknown | Stubbed-failure test |
| G2 | Reconciliation job | Settle stuck attempts by reference lookup filtered by checkout ID (invariant); cadence is policy | Lookup works (observed) | Reconciliation test |
| G3 | Key rotation and leakage | Secret key lives only in server secrets (invariant) | Public key cannot read, secret key cannot create (observed) | Secret-scan check |
| G4 | Sandbox versus production | Same code path, different host and keys (invariant); production host unresolved | `pg.maya.ph` versus `pg.paymaya.com` (reported, unresolved) | Config test |
| G5 | Receipts to patients | Policy | Unknown | Policy first |

## Re-run when the real Maya access arrives

Use [`maya-sandbox-spike.mjs`](../../Orion_React_App/tools/maya-sandbox-spike.mjs) against the real
merchant's sandbox first, never production.

1. Run `validate` and `prepare`, then `create` and `report` for the success, declined, 3-D Secure
   failure, cancelled and abandoned cases. Compare every result to the spike audit tables.
2. Re-check each **observed** claim in this matrix. A difference is a finding to record, not a
   surprise to absorb in code.
3. Test wallet payments (see the not-yet-covered work below).
4. Test void and refund again, and capture Maya's actual cut-off.
5. Register webhooks on a merchant only we use and run section C.
6. Answer every open question for Maya recorded in the audit entry.

## Not yet covered, planned after this document merges

- **Webhook delivery.** Needs a Maya sandbox merchant that only we use and a public HTTPS address.
  It waits on the answer about Maya Business Manager access. No remote deploy or webhook
  registration happens without an explicit go-ahead for the named project.
- **Wallet payments.** The first sandbox merchant offered cards only. Next step is trying the other
  sandbox merchants from Maya's key table to see whether a wallet option appears, then testing the
  two sandbox wallet accounts.
- **A successful refund.** Waits on Maya confirming the cut-off.

## Owner decisions still blocking (not for engineering to decide)

- Payment-pending expiry length.
- Failed and abandoned payment treatment.
- Duplicate-payment handling.
- Refund, reschedule, no-show and chargeback treatment, and any fees.
- Receipts and payment data retention.
- Reconciliation cadence and outage procedure.
- Approval of the payment-authorised booking contract.
