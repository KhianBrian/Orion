// Throwaway Maya sandbox spike. Reads keys from env, never prints them.
// Usage: node maya-spike.mjs create | status | webhooks
import { readFileSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { tmpdir } from "node:os";

const BASE = "https://pg-sandbox.paymaya.com";
const STATE = new URL(`file://${tmpdir()}/maya-spike-state.json`);
const mode = process.argv[2];

const basic = (key) => "Basic " + Buffer.from(`${key}:`).toString("base64");
const need = (name) => {
  const v = process.env[name];
  if (!v) { console.error(`Missing env ${name}`); process.exit(1); }
  return v;
};

async function call(method, path, key, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: { Authorization: basic(key), "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let parsed; try { parsed = JSON.parse(text); } catch { parsed = text; }
  return { status: res.status, body: parsed };
}

if (mode === "create") {
  const ref = randomUUID();
  const r = await call("POST", "/checkout/v1/checkouts", need("MAYA_PUBLIC_KEY"), {
    totalAmount: { value: 100, currency: "PHP" },
    requestReferenceNumber: ref,
    items: [{ name: "Orion spike session", quantity: "1", amount: { value: "100.00" }, totalAmount: { value: "100.00" } }],
    redirectUrl: {
      success: "https://example.com/success",
      failure: "https://example.com/failure",
      cancel: "https://example.com/cancel",
    },
  });
  console.log("create ->", r.status, JSON.stringify(r.body, null, 2));
  if (r.status === 200) writeFileSync(STATE, JSON.stringify({ ref, ...r.body }, null, 2));
} else if (mode === "status") {
  const { ref, checkoutId } = JSON.parse(readFileSync(STATE, "utf8"));
  const sk = need("MAYA_SECRET_KEY");
  const pk = need("MAYA_PUBLIC_KEY");
  const probes = [
    ["GET", `/checkout/v1/checkouts/${checkoutId}`, sk],
    ["GET", `/checkout/v1/checkouts/${checkoutId}`, pk],
    ["GET", `/payments/v1/payments/${checkoutId}`, sk],
    ["GET", `/payments/v1/payment-rrns/${ref}`, sk],
    ["GET", `/payments/v1/payments?requestReferenceNumber=${ref}`, sk],
  ];
  for (const [m, p, k] of probes) {
    const r = await call(m, p, k);
    console.log(`\n${m} ${p} [${k === sk ? "secret" : "public"} key] ->`, r.status);
    console.log(JSON.stringify(r.body, null, 2));
  }
} else if (mode === "webhooks") {
  const r = await call("GET", "/payments/v1/webhooks", need("MAYA_SECRET_KEY"));
  console.log("webhooks ->", r.status, JSON.stringify(r.body, null, 2));
} else {
  console.error("Usage: node maya-spike.mjs create | status | webhooks");
  process.exit(1);
}
