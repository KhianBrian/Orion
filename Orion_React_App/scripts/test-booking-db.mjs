import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

try {
  process.loadEnvFile(".env");
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceRoleKey) {
  throw new Error("Database booking tests require SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the ignored .env");
}

const supabase = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function required(query, label) {
  const { data, error } = await query;
  if (error) throw new Error(`${label}: ${error.message}`);
  return data;
}

const patients = await required(
  supabase.from("profiles").select("id").eq("role", "patient").limit(2),
  "load synthetic patients",
);
const psychiatrist = await required(
  supabase.from("psychiatrists").select("id").eq("is_active", true).limit(1).single(),
  "load active synthetic psychiatrist",
);
assert.equal(patients.length, 2, "exactly two synthetic patients are required for booking concurrency coverage");

const ids = {
  idempotentSlot: crypto.randomUUID(),
  concurrentSlot: crypto.randomUUID(),
};
const startsAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
startsAt.setUTCMinutes(0, 0, 0);

async function createOpenSlot(id, offsetHours) {
  const start = new Date(startsAt.getTime() + offsetHours * 60 * 60 * 1000);
  await required(supabase.from("availability_slots").insert({
    id,
    psychiatrist_id: psychiatrist.id,
    starts_at: start.toISOString(),
    ends_at: new Date(start.getTime() + 45 * 60 * 1000).toISOString(),
    status: "open",
  }), "create synthetic booking test slot");
}

try {
  await createOpenSlot(ids.idempotentSlot, 0);
  const retryKey = crypto.randomUUID();
  const first = await required(supabase.rpc("book_appointment_for_patient", {
    requested_slot_id: ids.idempotentSlot,
    request_id: retryKey,
    actor_profile_id: patients[0].id,
  }), "book synthetic slot");
  const retry = await required(supabase.rpc("book_appointment_for_patient", {
    requested_slot_id: ids.idempotentSlot,
    request_id: retryKey,
    actor_profile_id: patients[0].id,
  }), "retry synthetic booking");
  assert.equal(first.length, 1);
  assert.equal(retry.length, 1);
  assert.equal(retry[0].appointment_id, first[0].appointment_id);

  await createOpenSlot(ids.concurrentSlot, 2);
  const concurrent = await Promise.all([
    supabase.rpc("book_appointment_for_patient", {
      requested_slot_id: ids.concurrentSlot,
      request_id: crypto.randomUUID(),
      actor_profile_id: patients[0].id,
    }),
    supabase.rpc("book_appointment_for_patient", {
      requested_slot_id: ids.concurrentSlot,
      request_id: crypto.randomUUID(),
      actor_profile_id: patients[1].id,
    }),
  ]);
  assert.equal(concurrent.filter(({ error }) => !error).length, 1);
  assert.equal(concurrent.filter(({ error }) => /slot_unavailable/.test(error?.message || "")).length, 1);

  const bookings = await required(
    supabase.from("appointments").select("id").in("slot_id", [ids.idempotentSlot, ids.concurrentSlot]),
    "inspect synthetic booking results",
  );
  assert.equal(bookings.length, 2, "one idempotent booking and one concurrent winner must remain");
  console.log("Database booking checks passed: idempotent retry and concurrent single-winner booking.");
} finally {
  const bookings = await supabase.from("appointments").select("id").in("slot_id", [ids.idempotentSlot, ids.concurrentSlot]);
  if (bookings.data?.length) await supabase.from("audit_events").delete().in("target_id", bookings.data.map(({ id }) => id));
  await supabase.from("appointments").delete().in("slot_id", [ids.idempotentSlot, ids.concurrentSlot]);
  await supabase.from("availability_slots").delete().in("id", [ids.idempotentSlot, ids.concurrentSlot]);
}
