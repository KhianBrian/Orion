# 2026-10-31 Phase 17 Maya Sandbox Spike Evidence

**Test date:** 30 October 2026 (Asia/Manila evening, 16:15–17:26 UTC)

**Environment:** Maya sandbox only, shared public sandbox merchant, local terminal, desktop browser.
Non-production. No Orion application code, database, or Edge Function was changed or called.

**Related test tool:**
[`maya-sandbox-spike.mjs`](../../Orion_React_App/tools/maya-sandbox-spike.mjs)

**Status:** Evidence only. Phase 17 stays *Waiting on PayMaya API* until owner, merchant, and
policy decisions are recorded. Nothing here approves implementation.

## Corrections (1 November 2026)

Reading Maya's own documentation after the spike showed that five statements in this entry were
wrong or incomplete. The original wording below is kept and marked, not silently rewritten. Every
item here is **reported** (Maya documentation read on 1 November 2026, not exercised in the sandbox)
unless it says **observed** or **inferred**. Engineering recommendations are for owners to confirm;
anything marked **policy** is an owner decision.

1. **Refund cut-off (corrects "Void and refund" and open question 4).**
   [Managing voids and refunds in Maya Checkout](https://developers.maya.ph/reference/managing-voids-and-refunds-in-maya-checkout)
   and [Voids and refunds](https://developers.maya.ph/reference/voids-and-refunds) say:
   - **Reported.** A void is possible on the same day until midnight Philippine time (11:59 pm
     GMT+8 for one-time charges).
   - **Reported.** Refunds open at 12:00 am GMT+8 on the day after the transaction and last 180
     days (a manual request through Maya after-sales extends this to one year). Partial refunds
     are allowed up to the original amount.
   - **Reported.** Refund credit timing by method: Maya wallet instant; credit card 7–14 working
     days; debit card 30–45 days; GCash, Maya Credit and QR PH need a manual request.
   - **Inferred.** The test payments were made 16:15–17:26 UTC on 30 October, which is 12:15 am to
     1:26 am GMT+8 on 31 October. The refunds tried about 20 hours later were therefore still the
     same Philippine day, so `PY0072` is the documented behaviour, not a longer cut-off and not a
     sandbox gap. The "Asia/Manila evening" description of the test date in the header is also
     wrong: it was just after midnight on 31 October, Philippine time.
   - **Observed (retest, see "Refund retest" under Void and refund).** Refunds were accepted after
     12:00 am GMT+8 on 1 November, confirming this explanation.
2. **Webhook signing (corrects "Webhook authenticity" and open question 1).**
   [Webhook security](https://developers.maya.ph/reference/webhook-security) documents:
   - **Reported.** RSA-SHA256 signatures in the `X-Maya-Webhook-Signature` header (a `v1` value
     plus a nonce).
   - **Reported.** An `X-Maya-Webhook-Timestamp` header to validate, with a suggested five-minute
     tolerance.
   - **Reported.** Maya public keys per environment for verification.
   - **Reported.** Source IPs: sandbox 13.229.160.234 and 3.1.199.75; production 18.138.50.235 and
     3.1.207.200.
   - **Unknown.** The documentation does not say whether this covers Pay with Maya wallet webhooks.
     Signature verification has not been exercised; the original "documents no payload signature"
     statement was wrong.
3. **Webhook event ID (corrects open question 3).**
   - **Reported.** No unique event ID is documented. Maya says to make handlers idempotent on the
     payment `id` plus `status`
     ([Webhook security](https://developers.maya.ph/reference/webhook-security)).
   - **Reported.** Expect duplicate delivery and no ordering guarantee. Events listed are
     `PAYMENT_SUCCESS`, `PAYMENT_FAILED`, `PAYMENT_EXPIRED`, `PAYMENT_CANCELLED` and `AUTHORIZED`,
     with four delivery attempts at 0, 5, 15 and 45 minutes
     ([Receive real-time payment information using webhooks](https://developers.maya.ph/reference/receive-real-time-payment-information-using-webhooks)).
4. **Production host (corrects open question 2 and the note in "Create and retrieve").**
   [New production URL and migration guide for online payments](https://developers.maya.ph/changelog/new-production-url-and-migration-guide-for-online-payments)
   - **Reported.** `https://pg.maya.ph` is the current production API host and
     `https://pg.paymaya.com` is the old one; hosted pages moved to `payments.maya.ph`.
   - **Reported.** The Create Single Payment reference still lists the old host, so the reference
     pages are not a reliable source for the host.
5. **Wallets (corrects the "Not tested" wallet bullet and open question 5).**
   - **Reported.** [Maya Checkout](https://developers.maya.ph/docs/maya-checkout) says wallets and
     QR Ph on Maya Checkout are enabled by Maya on request (through the relationship manager or
     business.support@maya.ph). **Inferred:** the first sandbox merchant simply lacked the
     enablement, so "cards only" was a merchant configuration, not a mystery.
   - **Reported.** Pay with Maya (wallet link) is a different product: `POST /payby/v2/paymaya/payments`
     with the public key; body `totalAmount{value,currency}`, `redirectUrl{success,failure,cancel}`,
     `requestReferenceNumber` (1–36 characters), optional `userId` and `metadata`, and an optional
     `X-Idempotency-Key` header; response `paymentId` and `redirectUrl`. Status is read with
     `GET /payments/v1/payments/{id}/status` (public key) or `/payments/v1/payments/{id}` (secret
     key); a payment is cancelled before authorisation with `POST /payments/v1/payments/{id}/cancel`
     ([Create single payment](https://developers.maya.ph/reference/createv2singlepayment),
     [One-time wallet payments](https://developers.maya.ph/docs/one-time-wallet-payments)).
   - **Observed.** The Pay with Maya sandbox keys return `401` `K007` "Invalid key scope" on the
     Checkout create endpoint, so the two products need separate key sets.

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
  `paymaya.com` host (the old host; see Corrections, item 4). Always redirect to the returned `redirectUrl`; never construct it.
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
| Tab closed without paying, checked before expiry | `CREATED` | `PENDING_TOKEN` | false | null |
| Any unpaid checkout, checked after its hour passed | `EXPIRED` | `PAYMENT_EXPIRED` | false | null |

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

### Expiry

- **Observed.** Every unpaid checkout (never opened, tab closed, abandoned before the card form, and
  the unpaid duplicate-reference twin) changed to `status: EXPIRED`, `paymentStatus: PAYMENT_EXPIRED`
  about 14 seconds after its `expiredAt` time (`updatedAt` 17:47:15 against `expiredAt` 17:47:01 UTC).
  Paid, failed, cancelled, and authentication-failed checkouts were left unchanged.
- **Observed.** Before `expiredAt` those same checkouts still read `PENDING_TOKEN`, so a pending status
  is not final until the hour has passed.
- *Inferred:* the change is a periodic sweep, not an instant event, so a short delay after `expiredAt`
  is normal. Orion should still run its own timer and reconcile, rather than rely on the sweep alone.

### Registered webhooks

- **Observed.** A read-only `GET /payments/v1/webhooks` on the shared sandbox merchant returned an
  empty object, so nothing is registered there. Nothing was created or changed.

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
- **Observed.** About 20 hours after payment, both a full refund (100 PHP) and a partial refund
  (40 PHP) were still rejected with `PY0072`, and `canRefund` stayed false. ~~The real cut-off is
  therefore longer than 20 hours, or the sandbox does not simulate it.~~ **Corrected 1 November
  2026:** the payments were made just after midnight GMT+8, so ~20 hours later was still the same
  Philippine day; refunds open the next Philippine day (see Corrections, item 1).
- *Inferred:* before the cut-off a cancellation is a void, and after it a refund. ~~The cut-off time
  and a successful refund remain unexercised and need Maya confirmation.~~ **Corrected:** the cut-off
  is documented as midnight Philippine time (**reported**); a successful refund remains unexercised.

### Refund retest (observed 31 October 2026, about 16:57 UTC = 00:57 GMT+8 on 1 November)

Run shortly after the refund window opened, on the card sandbox merchant (Sandbox Party 2), against
two of the three earlier paid test checkouts (paid 30 October about 16:47 UTC = 00:47 GMT+8 on 31
October). The refund calls were made by the parallel testing session; this entry records its
results.

- **Observed.** A full refund (100 PHP) on a Mastercard payment was accepted. The refund response
  itself was not captured; the later lookup shows `paymentStatus` `REFUNDED`, `refundedAmount` 100,
  `updatedAt` 16:57:09.685Z.
- **Observed.** A partial refund (40 PHP) on a Visa payment, `POST /payments/v1/payments/{id}/refunds`,
  returned `200` with a separate refund object (its own ID, status `SUCCESS`, amount 40, PHP). The
  payment record then read `REFUNDED` with `isPaid` still true, and the checkout record read `status`
  `COMPLETED`, `paymentStatus` `REFUNDED`, `refundedAmount` 40. **`REFUNDED` therefore does not mean
  fully refunded; Orion must read `refundedAmount`** and compare it with the amount paid.
- **Observed.** `canRefund` stayed true even on the fully refunded payment, so it is not a reliable
  "refundable amount remains" flag. `canVoid` was false on both (the Philippine day had passed) and a
  void returned `400` `PY0045` "Payment is not available for void", as did a second void.
- **Observed.** Over-refund is rejected: a further full-amount refund on each already-refunded payment
  returned `400` `PY0048` "Requested refund amount is greater than the original amount" (on the
  40 PHP-refunded payment it would have exceeded the original in total). Nothing extra was refunded.
- **Observed.** The same kinds of refund were rejected with `PY0072` about 20 hours after payment
  (still the same Philippine day) and succeeded after 12:00 am GMT+8 on 1 November. This confirms the
  cut-off explanation in the Corrections section.
- **Reported, not exercised.** Maya's webhook status table lists no event for `REFUNDED`
  (**inferred** consequence: Orion must record a refund from the API response and reconcile by
  lookup, not wait for a webhook).
- **Not yet tested.** A second partial refund (60 PHP remains refundable on the Visa payment), refund
  fees, and how long the money takes to reach a card. One paid checkout is untouched.

### Data to store

- **Observed.** Responses contain a payment token, masked card number, expiry, buyer-name
  defaults, and merchant details. Orion should store only the provider reference, normalised
  status, amount, currency, receipt number, and timestamps. Do not persist the token, card
  details, or raw payloads in application tables or logs.
- `payment_attempts.provider_attempt_reference` ← Maya `checkoutId`. Maya `requestReferenceNumber`
  (36-character limit, a UUID fits) ← a fresh per-attempt value. `amount_minor` must be converted from
  Maya's decimal strings with exact arithmetic, never floats.

## Not tested or not available

- **Maya wallet and QR payments.** The sandbox merchant's hosted page offered cards only; no wallet
  option was shown, and the checkout record listed only Mastercard, Visa, and JCB. **Corrected 1
  November 2026:** Maya documents that wallets and QR Ph on Maya Checkout are enabled by Maya on
  request, so this merchant most likely lacked the enablement (**reported**, see Corrections, item
  5). Pay with Maya (wallet link) is a separate product and key set; a wallet test is pending.
- **Webhooks.** Sandbox cannot reach localhost and the shared merchant is not safe to register
  webhooks on, so delivery, payload shape, event identifiers, and retries remain **reported** only.
  A merchant of our own with a public HTTPS test endpoint is required.
- **A successful refund.** ~~Not reached.~~ **Updated 1 November 2026:** full and partial refunds
  and over-refund rejection were exercised in the retest (see "Refund retest"). Still untested:
  a second partial refund, refund fees, card credit timing, and capture.
- **Webhook authenticity.** ~~Maya documents no payload signature.~~ **Corrected 1 November 2026:**
  Maya documents RSA-SHA256 signatures and a timestamp header (**reported**, see Corrections, item
  2); verification is untested, and coverage of Pay with Maya wallet webhooks is unknown. Source IP
  allow-listing is documented but may not be readable inside a Supabase Edge Function.

## Design consequences for the Phase 17 plan

These are inputs for planning, not decisions.

1. Treat any webhook only as a trigger. Re-fetch the payment from Maya with the secret key and
   require `PAYMENT_SUCCESS`, `isPaid`, amount, currency, the stored checkout ID, and the attempt's
   unique reference to all match before moving an appointment to `booked`.
2. Never infer "paid" from checkout `status`, `receiptNumber`, or a browser redirect.
3. A reconciliation job can use the reference lookup, filtered by checkout ID, to recover missed
   webhooks and to settle attempts that stay pending.
4. Maya flips an abandoned checkout to `PAYMENT_EXPIRED` shortly after its hour, but Orion should
   still own its `payment_pending` expiry and reconcile, because the change is a delayed sweep and a
   missed webhook must not hold a slot. The Orion expiry value is an owner decision.
5. Validate amount and currency server-side, always send `https` redirects, and use one unique
   reference per attempt.
6. Plan for a void path (cancel before cut-off) and a separate refund path after it.

## Open questions for Maya

Status after the 1 November 2026 corrections:

1. ~~Is a webhook signature or shared secret available?~~ **Answered (reported):** RSA-SHA256
   signature and timestamp headers. Still open: whether it covers Pay with Maya wallet webhooks.
2. ~~Which production host is correct for Create Checkout?~~ **Answered (reported):**
   `https://pg.maya.ph`; `pg.paymaya.com` is the old host.
3. ~~Do webhooks carry a unique event ID?~~ **Answered (reported):** none documented; use payment
   `id` plus `status`.
4. ~~What is the refund cut-off time?~~ **Answered (reported):** void until 11:59 pm GMT+8 the same
   day, refund from 12:00 am GMT+8 the next day for 180 days. Refunds then **observed** to work in
   the sandbox. Still open: **fees** (policy and Maya) and real card credit timing.
5. ~~Why does the sandbox merchant hide wallet payment?~~ **Answered (reported):** wallets and QR Ph
   are enabled by Maya on request. Still open: how to request it for our own merchant.

## Data handling

Only published sandbox test cards and a shared public sandbox merchant were used. No real person,
card, or clinical data was involved. No credentials, tokens, or card tokens are recorded here.
