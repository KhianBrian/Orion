# 2026-10-31 Phase 17 Maya Sandbox Spike Evidence

**Test date:** 30 October 2026 (Asia/Manila)

**Environment:** Maya sandbox only, shared public sandbox merchant, local terminal, desktop browser.
Non-production. No Orion application code, database, or Edge Function was changed or called.

**Related test tool:**
[`maya-sandbox-spike.mjs`](../../Orion_React_App/tools/maya-sandbox-spike.mjs)

**Status:** Evidence only. Phase 17 stays *Waiting on PayMaya API* until owner, merchant, and
policy decisions are recorded. Nothing here approves implementation.

## Purpose

Learn the real behaviour of the Maya Checkout API so the Phase 17 plan can be written against
observed responses instead of documentation alone, while waiting for the merchant API access.

## Method

Sandbox public and secret keys were entered through hidden terminal prompts and held only in that
shell session. The tool never prints or writes keys. One checkout was created for PHP 100.00, paid
in the Maya-hosted page with the published non-3-D-Secure Visa test card, and then read back
through candidate retrieve endpoints.

## Observed results

Labels: **observed** = seen in this spike; **reported** = Maya documentation, not exercised;
**inferred** = our reading.

### Create and pay

- **Observed.** `POST /checkout/v1/checkouts` with the public key as Basic auth username returned
  `200` with `checkoutId` and `redirectUrl`.
- **Observed.** The hosted page host was `payments-web-sandbox.maya.ph`. Maya's Create Checkout
  page documents `payments-web-sandbox.paymaya.com`; the environments page uses `maya.ph` for
  production. Treat the host as provider-supplied: always redirect to the returned `redirectUrl`,
  never construct it.
- **Observed.** After payment the browser landed on the configured `redirectUrl.success`.
  *Inferred:* this redirect is informational only, as the decision register already requires.

### Retrieve endpoints (all sandbox)

| Endpoint | Key | Result |
| --- | --- | --- |
| `GET /checkout/v1/checkouts/{checkoutId}` | secret | `200`, full checkout record |
| `GET /checkout/v1/checkouts/{checkoutId}` | public | `401`, error code `K004` |
| `GET /payments/v1/payments/{checkoutId}` | secret | `200`, payment record |
| `GET /payments/v1/payment-rrns/{requestReferenceNumber}` | secret | `200`, **array** of payments |
| `GET /payments/v1/payments?requestReferenceNumber=…` | secret | `401`, `K004` (not a valid route) |

Findings:

1. **Observed.** The checkout ID and the payment ID are the same value.
2. **Observed.** Retrieval needs the **secret** key. The public key can create a checkout but cannot
   read one. The secret key must live only in server-side secrets.
3. **Observed.** Lookup by our own `requestReferenceNumber` works and returns an array, so the
   server can recover a payment even if it never stored the `checkoutId`.
4. **Observed.** Paid payment fields of interest: `status: "PAYMENT_SUCCESS"`, `isPaid: true`,
   `amount` (string), `currency`, `canVoid`, `canRefund`, `canCapture`, `requestReferenceNumber`,
   `receiptNumber`, `updatedAt`, `fundSource.type` (`card`).
5. **Observed.** The checkout record also carries `status: "COMPLETED"`, `paymentStatus`,
   `expiredAt` (exactly one hour after creation), `refundedAmount`, and `paymentDetails.3ds`.
6. **Observed.** The responses include `paymentTokenId`, a masked card number, expiry, buyer name
   defaults, and merchant details. Orion must store only the minimum: provider reference, normalised
   status, amount, currency, receipt number, and timestamps. Do not persist the token, card
   details, or raw payloads in application tables or logs.
7. **Observed.** `canRefund` was `false` and `canVoid` was `true` immediately after a successful
   card payment. *Inferred:* same-day cancellation is a void and a later one a refund; confirm
   with Maya and the refund policy before relying on it.

### Mapping to Orion's existing tables

- `payment_attempts.provider_attempt_reference` ← Maya `checkoutId` (equal to the payment ID).
- Our attempt ID (or idempotency key) ← Maya `requestReferenceNumber` (limit 36 characters, a UUID
  fits).
- `payment_attempt_status` maps one-to-one from Maya `PAYMENT_SUCCESS`, `PAYMENT_FAILED`,
  `PAYMENT_EXPIRED`, `PAYMENT_CANCELLED`. **Reported**, not yet observed for the three
  non-success states.
- `payment_events.provider_event_reference` has no confirmed webhook event ID yet; see open items.
- `amount_minor`: Maya returns decimal strings, so convert with exact arithmetic, never floats.

## Not tested

- **Webhooks.** Sandbox cannot reach localhost, so delivery, payload shape, event identifiers, and
  retry behaviour are still **reported** only. A public HTTPS test endpoint is required.
- **Failure, cancel, and expiry paths.** Only the success path ran. The zero-balance e-wallet and a
  cancelled or abandoned checkout still need running.
- **3-D Secure and e-wallet flows.**
- **Refund and void endpoints.**
- **Webhook authenticity.** Maya documents no payload signature. Source IP allow-listing is
  documented but may not be readable inside a Supabase Edge Function.

## Design consequences for the Phase 17 plan

These are inputs for planning, not decisions.

1. Treat any webhook only as a trigger. Re-fetch the payment from Maya with the secret key and
   confirm `PAYMENT_SUCCESS`, amount, currency, and `requestReferenceNumber` against the stored
   attempt before moving an appointment to `booked`. This also covers the missing signature.
2. A reconciliation job can use the `payment-rrns` lookup to recover missed webhooks.
3. The browser return page must poll Orion's own state, not trust the redirect.
4. Handle both an expired checkout (one hour) and Orion's own `payment_pending` expiry; the
   Orion expiry value is an owner decision.

## Open questions for Maya

1. Is a webhook signature or shared secret available?
2. Which production host is correct for Create Checkout: `pg.maya.ph` or `pg.paymaya.com`?
3. Do webhooks carry a unique event ID, or must idempotency use payment ID plus status?
4. Exact void and refund endpoints, windows, and fees.

## Data handling

Only published sandbox test cards and a shared public sandbox merchant were used. No real person,
card, or clinical data was involved. No credentials, tokens, or card tokens are recorded here.
