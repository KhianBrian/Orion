# 2026-10-31 Phase 17 Maya Sandbox Spike Evidence

**Test date:** 30 October 2026 (Asia/Manila evening, 16:15–17:26 UTC)

**Environment:** Maya sandbox only, shared public sandbox merchant, local terminal, desktop browser.
Non-production. No Orion application code, database, or Edge Function was changed or called.

**Related test tool:**
[`maya-sandbox-spike.mjs`](../../Orion_React_App/tools/maya-sandbox-spike.mjs)

**Status:** Evidence only. Phase 17 stays *Waiting on PayMaya API* until owner, merchant, and
policy decisions are recorded. Nothing here approves implementation.

## Purpose

Learn the real behaviour of the Maya Checkout API, including the failure paths, so the Phase 17
plan can be written against observed responses instead of documentation alone.

## Method

Sandbox public and secret keys were entered through hidden terminal prompts and held only in that
shell session. The tool never prints or writes keys, card tokens, or fund-source IDs. Three kinds of
test ran:

1. API-only request and lookup edge cases (no browser).
2. Browser scenarios on Maya's hosted page with the published sandbox test cards, one labelled
   checkout per scenario.
3. Refund and void probes against a paid checkout.

Labels: **observed** = seen in this spike; **reported** = Maya documentation, not exercised;
**inferred** = our reading.

## Observed results

### Create and retrieve

- **Observed.** `POST /checkout/v1/checkouts` with the public key returns `{ checkoutId, redirectUrl }`.
  The hosted page host was `payments-web-sandbox.maya.ph`; Maya's Create Checkout page documents a
  `paymaya.com` host. Always redirect to the returned `redirectUrl`; never construct it.
- **Observed.** Retrieval needs the **secret** key. The public key is rejected (`401`, `K004`), and
  the secret key is likewise rejected on create. The secret key must live only in server-side secrets.
- **Observed.** Three working reads: `GET /checkout/v1/checkouts/{id}`, `GET /payments/v1/payments/{id}`,
  and `GET /payments/v1/payment-rrns/{requestReferenceNumber}`, which returns an **array**.
  `GET /payments/v1/payments?requestReferenceNumber=…` is not a valid route (`K004`).
- **Observed.** The checkout ID and the payment ID are the same value.
- **Observed.** Unknown ID or reference: `404`, `PY0009`. Malformed ID: `400`, `2553`, requiring UUID v4.
  A lookup 404 is therefore a normal "not found" case, not an outage.

### Request validation (create)

| Case | Result |
| --- | --- |
| Missing auth header | `401` `K001` |
| Garbage key | `401` `K003` |
| Empty body; missing, empty, or over-36-character `requestReferenceNumber` | `400` `2553` |
| Amount 0, 0.001, or negative | `400` `2553`, minimum 0.01 |
| Amount 10,000,000 | `400` `2553`, maximum 9,999,999 |
| Currency `USD` | `400` `PY0037`, not supported |
| Invalid currency code | `400` `2553` |
| Redirect values that are not URLs | `400` `2553` |
| Malformed JSON | `400` `PY0064` |
| Amount sent as a string (`"100.00"`) | Accepted |
| **Item totals that differ from `totalAmount`** | **Accepted** |
| **`http://` redirect URLs** | **Accepted** |
| No `redirectUrl` at all | Accepted |
| Amounts 0.01 and 9,999,999 | Accepted |

*Inferred:* Maya does not cross-check items against the total or enforce HTTPS redirects, so Orion
must compute the price server-side, send an `https` redirect, and never trust client amounts.

### Payment states seen

| Scenario | Checkout `status` | `paymentStatus` | `isPaid` | `receiptNumber` |
| --- | --- | --- | --- | --- |
| Created, not opened | `CREATED` | `PENDING_TOKEN` | false | null |
| Paid by card (no 3-D Secure) | `COMPLETED` | `PAYMENT_SUCCESS` | true | short hex receipt |
| Paid by card with 3-D Secure | `COMPLETED` | `PAYMENT_SUCCESS` (`threeDS: true`) | true | short hex receipt |
| Wrong 3-D Secure password | `COMPLETED` | `AUTH_FAILED` | false | null |
| Declined card (3-D Secure page, failed) | `COMPLETED` | `PAYMENT_FAILED` | false | **a UUID, not null** |
| Cancelled with Back to Merchant | `COMPLETED` | `PAYMENT_CANCELLED` | false | null |
| Voided after payment | `COMPLETED` | `VOIDED` | false | unchanged |
| Tab closed without paying | `CREATED` | `PENDING_TOKEN` | false | null |

Consequences that matter for Orion:

1. **Observed.** Checkout `status: COMPLETED` is set for failed, cancelled, and voided payments as
   well as paid ones. It must never be read as "paid".
2. **Observed.** Only `paymentStatus: PAYMENT_SUCCESS` with `isPaid: true` (payment record) means paid.
3. **Observed.** A non-null `receiptNumber` does not prove payment: the failed card payment carried
   a UUID in that field.
4. **Observed.** Orion's normalised statuses need at least pending, succeeded, failed (`PAYMENT_FAILED`,
   `AUTH_FAILED`), cancelled, and voided. `payment_attempt_status` currently lacks voided and
   distinguishes only `expired`; extending it is a Phase 17 planning decision.
5. **Observed.** Paying twice: after paying `mastercard-ok`, reopening the same link showed a
   success page and Maya recorded one payment. A paid link cannot be paid again.
6. **Observed.** Maya accepts **duplicate `requestReferenceNumber`** values. Two checkouts sharing
   one reference both exist and the reference lookup returns both (one paid, one pending).
   *Inferred:* Orion must use a fresh reference per payment attempt and always match the returned
   checkout ID, never take the first record from a reference lookup.
7. **Reported by the tester, not proven by the API.** Landing on the `/cancel` redirect for a
   scenario Maya still shows as pending (`closed-tab`) means a redirect is not evidence of state.
   Only the explicit Back to Merchant scenario was recorded as cancelled.

### Card and 3-D Secure behaviour

- **Observed.** 3-D Secure succeeded on the retry for the Visa ending 1381 with password `mctest1`
  (`PAYMENT_SUCCESS`, `threeDS: true`). The first attempt on a different checkout ended `AUTH_FAILED`.
  *Inferred:* most likely a mistyped password, but not proven.
- **Observed.** The made-up card `4111 1111 1111 1111` produced `PAYMENT_FAILED` on the retry.
  The first attempt never reached the card form (the tester saw an invalid request page) and that
  checkout stayed `PENDING_TOKEN`. The cause of the invalid page is **not explained**.

### Void and refund

- **Observed.** A refund immediately after a card payment is rejected: `400`, `PY0072`, "cannot
  refund before cut-off time". `canRefund` was false.
- **Observed.** A void on a paid card payment succeeds (`200`) and the payment then reads `VOIDED`,
  `isPaid: false`. A second void is rejected: `400`, `PY0045`, so repeated voids are safe.
- *Inferred:* before the cut-off a cancellation is a void, and after it a refund. The cut-off time
  and refund path are not yet exercised and need Maya confirmation.

### Data to store

- **Observed.** Responses contain a payment token, masked card number, expiry, buyer-name
  defaults, and merchant details. Orion should store only the provider reference, normalised
  status, amount, currency, receipt number, and timestamps. Do not persist the token, card
  details, or raw payloads in application tables or logs.
- `payment_attempts.provider_attempt_reference` ← Maya `checkoutId`. Maya `requestReferenceNumber`
  (36-character limit, a UUID fits) ← a fresh per-attempt value. `amount_minor` must be converted from
  Maya's decimal strings with exact arithmetic, never floats.

## Not tested or not available

- **Expiry.** Maya documents one hour (`expiredAt` is exactly one hour after creation).
  The abandoned checkouts were still pending at 17:26 UTC, before their 17:47 UTC expiry, so
  **whether and how the status changes after expiry is untested.** Re-run `report` after that time.
- **Maya wallet and QR payments.** The sandbox merchant's hosted page offered cards only; no wallet
  option was shown, and the checkout record listed only Mastercard, Visa, and JCB. Whether wallets
  need a different merchant, enablement, or a phone is unknown.
- **Webhooks.** Sandbox cannot reach localhost and the shared merchant is not safe to register
  webhooks on, so delivery, payload shape, event identifiers, and retries remain **reported** only.
  A merchant of our own with a public HTTPS test endpoint is required.
- **Refund after the cut-off,** partial refunds, and capture.
- **Webhook authenticity.** Maya documents no payload signature. Source IP allow-listing is
  documented but may not be readable inside a Supabase Edge Function.

## Design consequences for the Phase 17 plan

These are inputs for planning, not decisions.

1. Treat any webhook only as a trigger. Re-fetch the payment from Maya with the secret key and
   require `PAYMENT_SUCCESS`, `isPaid`, amount, currency, the stored checkout ID, and the attempt's
   unique reference to all match before moving an appointment to `booked`.
2. Never infer "paid" from checkout `status`, `receiptNumber`, or a browser redirect.
3. A reconciliation job can use the reference lookup, filtered by checkout ID, to recover missed
   webhooks and to settle attempts that stay pending.
4. Orion must own its `payment_pending` expiry rather than rely on Maya to flip the status.
5. Validate amount and currency server-side, always send `https` redirects, and use one unique
   reference per attempt.
6. Plan for a void path (cancel before cut-off) and a separate refund path after it.

## Open questions for Maya

1. Is a webhook signature or shared secret available?
2. Which production host is correct for Create Checkout: `pg.maya.ph` or `pg.paymaya.com`?
3. Do webhooks carry a unique event ID, or must idempotency use payment ID plus status?
4. What is the refund cut-off time, and the exact refund endpoint, window, and fees?
5. Why does the sandbox merchant hide wallet payment, and how is wallet testing enabled?
6. What status does an abandoned checkout take after its hour has passed?

## Data handling

Only published sandbox test cards and a shared public sandbox merchant were used. No real person,
card, or clinical data was involved. No credentials, tokens, or card tokens are recorded here.
