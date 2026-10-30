// Throwaway Maya sandbox spike. Reads keys from env, never prints them.
// Sandbox only. Uses a shared public merchant, so it never creates or edits webhooks.
//
//   MAYA_PUBLIC_KEY / MAYA_SECRET_KEY must be set in the shell (hidden prompt, never chat).
//   node maya-sandbox-spike.mjs validate         API-only request and lookup edge cases
//   node maya-sandbox-spike.mjs prepare          create labelled checkouts for browser scenarios
//   node maya-sandbox-spike.mjs report           re-fetch every labelled checkout, print summaries
//   node maya-sandbox-spike.mjs create <label>   one more labelled checkout (retries)
//   node maya-sandbox-spike.mjs adopt <label> <checkoutId> <requestReferenceNumber>
//   node maya-sandbox-spike.mjs money <label>    refund then void probes on a paid checkout
//   node maya-sandbox-spike.mjs refund <label> [amount]   refund after the cut-off (partial if amount given)
//   node maya-sandbox-spike.mjs webhooks         read-only list of registered webhooks
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { tmpdir } from "node:os";

const BASE = "https://pg-sandbox.paymaya.com";
const STATE = `${tmpdir()}/maya-spike-state.json`;
const mode = process.argv[2];

const basic = (key) => "Basic " + Buffer.from(`${key}:`).toString("base64");
const env = (name) => process.env[name];
const need = (name) => {
  if (!env(name)) { console.error(`Missing env ${name}`); process.exit(1); }
  return env(name);
};
const loadState = () => (existsSync(STATE) ? JSON.parse(readFileSync(STATE, "utf8")) : { runs: {} });
const saveState = (s) => writeFileSync(STATE, JSON.stringify(s, null, 2));

async function call(method, path, key, body, raw) {
  const headers = { "Content-Type": "application/json" };
  if (key) headers.Authorization = basic(key);
  const res = await fetch(BASE + path, {
    method,
    headers,
    body: raw !== undefined ? raw : body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let parsed; try { parsed = JSON.parse(text); } catch { parsed = text.slice(0, 200); }
  return { status: res.status, body: parsed };
}

const checkoutBody = (over = {}) => ({
  totalAmount: { value: 100, currency: "PHP" },
  requestReferenceNumber: randomUUID(),
  items: [{ name: "Orion spike session", quantity: "1", amount: { value: "100.00" }, totalAmount: { value: "100.00" } }],
  redirectUrl: {
    success: "https://example.com/success",
    failure: "https://example.com/failure",
    cancel: "https://example.com/cancel",
  },
  ...over,
});

// Never print card tokens or fund-source ids.
const summarise = (b) => {
  if (!b || typeof b !== "object") return b;
  return {
    id: b.id, status: b.status, paymentStatus: b.paymentStatus, isPaid: b.isPaid,
    amount: b.amount ?? b.totalAmount?.amount, currency: b.currency ?? b.totalAmount?.currency,
    canVoid: b.canVoid, canRefund: b.canRefund, refundedAmount: b.refundedAmount,
    receiptNumber: b.receiptNumber, scheme: b.paymentScheme ?? b.fundSource?.details?.scheme,
    fundSourceType: b.fundSource?.type, threeDS: b.paymentDetails?.["3ds"],
    createdAt: b.createdAt, updatedAt: b.updatedAt, expiredAt: b.expiredAt,
    rrn: b.requestReferenceNumber,
    error: b.error, code: b.code, message: b.message, parameters: b.parameters,
  };
};
const show = (title, r) => console.log(`\n${title} -> ${r.status}\n${JSON.stringify(summarise(r.body), (k, v) => v ?? undefined, 2)}`);

async function createLabelled(state, label, over, note) {
  const body = checkoutBody(over);
  const r = await call("POST", "/checkout/v1/checkouts", need("MAYA_PUBLIC_KEY"), body);
  if (r.status !== 200) { console.log(`${label}: create failed ${r.status}`, r.body); return; }
  state.runs[label] = { rrn: body.requestReferenceNumber, checkoutId: r.body.checkoutId, url: r.body.redirectUrl, note };
  console.log(`\n[${label}] ${note}\n  ${r.body.redirectUrl}`);
}

if (mode === "validate") {
  const pk = need("MAYA_PUBLIC_KEY"), sk = need("MAYA_SECRET_KEY");
  const long = "x".repeat(37);
  const create = [
    ["no auth header", null, checkoutBody()],
    ["secret key on create", sk, checkoutBody()],
    ["garbage key", "pk-not-a-real-key", checkoutBody()],
    ["empty object", pk, {}],
    ["missing requestReferenceNumber", pk, (({ requestReferenceNumber, ...r }) => r)(checkoutBody())],
    ["rrn 37 chars", pk, checkoutBody({ requestReferenceNumber: long })],
    ["rrn empty", pk, checkoutBody({ requestReferenceNumber: "" })],
    ["amount 0", pk, checkoutBody({ totalAmount: { value: 0, currency: "PHP" } })],
    ["amount 0.001", pk, checkoutBody({ totalAmount: { value: 0.001, currency: "PHP" } })],
    ["amount negative", pk, checkoutBody({ totalAmount: { value: -5, currency: "PHP" } })],
    ["amount 10000000", pk, checkoutBody({ totalAmount: { value: 10000000, currency: "PHP" } })],
    ["amount as string", pk, checkoutBody({ totalAmount: { value: "100.00", currency: "PHP" } })],
    ["currency USD", pk, checkoutBody({ totalAmount: { value: 100, currency: "USD" } })],
    ["currency invalid", pk, checkoutBody({ totalAmount: { value: 100, currency: "PH" } })],
    ["items total differs from totalAmount", pk, checkoutBody({ items: [{ name: "x", totalAmount: { value: "5.00" } }] })],
    ["redirect not a URL", pk, checkoutBody({ redirectUrl: { success: "nope", failure: "nope", cancel: "nope" } })],
    ["redirect http (not https)", pk, checkoutBody({ redirectUrl: { success: "http://example.com/s", failure: "http://example.com/f", cancel: "http://example.com/c" } })],
    ["no redirectUrl", pk, (({ redirectUrl, ...r }) => r)(checkoutBody())],
  ];
  console.log("== CREATE CHECKOUT edge cases ==");
  for (const [name, key, body] of create) {
    const r = await call("POST", "/checkout/v1/checkouts", key, body);
    const b = r.body;
    console.log(`${String(r.status).padEnd(4)} ${name.padEnd(40)} ${b?.checkoutId ? "created" : JSON.stringify(summarise(b))}`);
  }
  const malformed = await call("POST", "/checkout/v1/checkouts", pk, undefined, "{not json");
  console.log(`${String(malformed.status).padEnd(4)} ${"malformed JSON body".padEnd(40)} ${JSON.stringify(malformed.body)}`);

  console.log("\n== RETRIEVE edge cases ==");
  const missing = randomUUID();
  const retrieve = [
    ["checkout: unknown id", `/checkout/v1/checkouts/${missing}`, sk],
    ["checkout: malformed id", `/checkout/v1/checkouts/not-a-uuid`, sk],
    ["checkout: no auth", `/checkout/v1/checkouts/${missing}`, null],
    ["payment: unknown id", `/payments/v1/payments/${missing}`, sk],
    ["payment: malformed id", `/payments/v1/payments/not-a-uuid`, sk],
    ["payment: public key", `/payments/v1/payments/${missing}`, pk],
    ["rrn: unknown reference", `/payments/v1/payment-rrns/${missing}`, sk],
    ["rrn: 37 char reference", `/payments/v1/payment-rrns/${long}`, sk],
  ];
  for (const [name, path, key] of retrieve) {
    const r = await call("GET", path, key);
    console.log(`${String(r.status).padEnd(4)} ${name.padEnd(40)} ${JSON.stringify(summarise(r.body))}`);
  }

  console.log("\n== BOUNDARY amounts that should be accepted (creates real sandbox checkouts, unpaid) ==");
  for (const v of [0.01, 9999999]) {
    const r = await call("POST", "/checkout/v1/checkouts", pk, checkoutBody({
      totalAmount: { value: v, currency: "PHP" },
      items: [{ name: "boundary", totalAmount: { value: String(v) } }],
    }));
    console.log(`${String(r.status).padEnd(4)} amount ${String(v).padEnd(33)} ${r.body?.checkoutId ? "created" : JSON.stringify(summarise(r.body))}`);
  }
} else if (mode === "prepare") {
  const state = loadState();
  const sharedRrn = randomUUID();
  const scenarios = [
    ["threeds-ok", {}, "Visa 4123450131001381 12/2030 CVV 123, 3-D Secure password mctest1: should SUCCEED"],
    ["threeds-wrong-password", {}, "Visa 4123450131001522 12/2030 CVV 123, type a WRONG 3-D Secure password: expect FAIL"],
    ["mastercard-ok", {}, "Mastercard 5123456789012346 12/2030 CVV 111 (no 3DS): SUCCEED, then re-open this same link and try to pay AGAIN (double-pay check)"],
    ["card-declined", {}, "Made-up card 4111111111111111 12/2030 CVV 123: expect decline or invalid card"],
    ["ewallet-ok", {}, "Choose Maya wallet, +639900100900, OTP 123456: SUCCEED"],
    ["ewallet-no-balance", {}, "Choose Maya wallet, +639900100916, OTP 123456: expect FAIL (insufficient balance). Do NOT top up"],
    ["cancel-on-page", {}, "Open the link, then click the cancel / back-to-merchant option on the page"],
    ["closed-tab", {}, "Open the link, enter nothing, close the tab"],
    ["never-opened", {}, "Do NOT open this link at all (pure abandon)"],
    ["dup-rrn-a", { requestReferenceNumber: sharedRrn }, "Pay with Visa 4123450131000508 12/2030 CVV 111: SUCCEED (shares its reference number with dup-rrn-b)"],
    ["dup-rrn-b", { requestReferenceNumber: sharedRrn }, "Do NOT open (same reference number as dup-rrn-a)"],
  ];
  for (const [label, over, note] of scenarios) await createLabelled(state, label, over, note);
  saveState(state);
  console.log(`\nSaved ${Object.keys(state.runs).length} runs to ${STATE}`);
} else if (mode === "create") {
  const label = process.argv[3];
  if (!label) { console.error("usage: create <label>"); process.exit(1); }
  const state = loadState();
  await createLabelled(state, label, {}, "single retry checkout");
  saveState(state);
} else if (mode === "report") {
  const state = loadState();
  const sk = need("MAYA_SECRET_KEY");
  for (const [label, run] of Object.entries(state.runs)) {
    const c = await call("GET", `/checkout/v1/checkouts/${run.checkoutId}`, sk);
    const p = await call("GET", `/payments/v1/payments/${run.checkoutId}`, sk);
    const rr = await call("GET", `/payments/v1/payment-rrns/${run.rrn}`, sk);
    console.log(`\n=== ${label} ===`);
    console.log("checkout :", c.status, JSON.stringify(summarise(c.body)));
    console.log("payment  :", p.status, JSON.stringify(summarise(p.body)));
    console.log("by rrn   :", rr.status, Array.isArray(rr.body) ? `${rr.body.length} record(s): ${rr.body.map((x) => `${x.id.slice(0, 8)}=${x.status}`).join(", ")}` : JSON.stringify(summarise(rr.body)));
  }
} else if (mode === "adopt") {
  const [, , , label, checkoutId, rrn] = process.argv;
  const state = loadState();
  state.runs[label] = { rrn, checkoutId, note: "adopted" };
  saveState(state);
  console.log(`adopted ${label}`);
} else if (mode === "money") {
  const run = loadState().runs[process.argv[3]];
  if (!run) { console.error("unknown label"); process.exit(1); }
  const sk = need("MAYA_SECRET_KEY");
  const id = run.checkoutId;
  show("before", await call("GET", `/payments/v1/payments/${id}`, sk));
  show("refund (expect rejected while canRefund=false)", await call("POST", `/payments/v1/payments/${id}/refunds`, sk, { totalAmount: { amount: 100, currency: "PHP" }, reason: "spike" }));
  show("void", await call("POST", `/payments/v1/payments/${id}/voids`, sk, { reason: "spike" }));
  show("void again (double void)", await call("POST", `/payments/v1/payments/${id}/voids`, sk, { reason: "spike" }));
  show("after", await call("GET", `/payments/v1/payments/${id}`, sk));
  show("checkout after", await call("GET", `/checkout/v1/checkouts/${id}`, sk));
} else if (mode === "refund") {
  // refund <label> [amount]  — omit amount for a full refund. Only works after Maya's cut-off.
  const run = loadState().runs[process.argv[3]];
  if (!run) { console.error("unknown label"); process.exit(1); }
  const sk = need("MAYA_SECRET_KEY");
  const amount = process.argv[4] ? Number(process.argv[4]) : 100;
  show("before", await call("GET", `/payments/v1/payments/${run.checkoutId}`, sk));
  show(`refund ${amount}`, await call("POST", `/payments/v1/payments/${run.checkoutId}/refunds`, sk, { totalAmount: { amount, currency: "PHP" }, reason: "spike" }));
  show("after", await call("GET", `/payments/v1/payments/${run.checkoutId}`, sk));
  show("checkout after", await call("GET", `/checkout/v1/checkouts/${run.checkoutId}`, sk));
} else if (mode === "webhooks") {
  show("webhooks (read-only)", await call("GET", "/payments/v1/webhooks", need("MAYA_SECRET_KEY")));
} else {
  console.error("Usage: validate | prepare | create | report | adopt | money | refund | webhooks");
  process.exit(1);
}
