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
  throw new Error("Database cancellation tests require SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the ignored .env");
}

const supabase = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const ids = {
  successAppointment: crypto.randomUUID(),
  successSlot: crypto.randomUUID(),
  insideAppointment: crypto.randomUUID(),
  insideSlot: crypto.randomUUID(),
  concurrentAppointment: crypto.randomUUID(),
  concurrentSlot: crypto.randomUUID(),
  request: crypto.randomUUID(),
};

async function required(query, label) {
  const { data, error } = await query;
  if (error) throw new Error(`${label}: ${error.message}`);
  return data;
}

const patients = await required(
  supabase.from("profiles").select("id").eq("role", "patient").limit(2),
  "load synthetic patients",
);
const psychiatrist = (await required(
  supabase.from("psychiatrists").select("id").eq("is_active", true).limit(1).single(),
  "load active synthetic psychiatrist",
)).id;
assert.ok(patients.length >= 2, "two synthetic patients are required for ownership coverage");

const now = Date.now();
const fixtures = [
  { slotId: ids.successSlot, appointmentId: ids.successAppointment, startsAt: new Date(now + 72 * 60 * 60 * 1000), patientId: patients[0].id },
  { slotId: ids.insideSlot, appointmentId: ids.insideAppointment, startsAt: new Date(now + 12 * 60 * 60 * 1000), patientId: patients[0].id },
  { slotId: ids.concurrentSlot, appointmentId: ids.concurrentAppointment, startsAt: new Date(now + 96 * 60 * 60 * 1000), patientId: patients[0].id },
];

try {
  for (const fixture of fixtures) {
    const endsAt = new Date(fixture.startsAt.getTime() + 45 * 60 * 1000);
    await required(
      supabase.from("availability_slots").insert({
        id: fixture.slotId, psychiatrist_id: psychiatrist,
        starts_at: fixture.startsAt.toISOString(), ends_at: endsAt.toISOString(), status: "booked",
      }),
      "create synthetic test slot",
    );
    await required(
      supabase.from("appointments").insert({
        id: fixture.appointmentId, patient_id: fixture.patientId,
        psychiatrist_id: psychiatrist, slot_id: fixture.slotId,
        starts_at: fixture.startsAt.toISOString(), ends_at: endsAt.toISOString(),
        status: "booked", idempotency_key: crypto.randomUUID(),
      }),
      "create synthetic test appointment",
    );
  }

  const denied = await supabase.rpc("cancel_appointment_for_patient", {
    appointment_id: ids.successAppointment,
    request_id: crypto.randomUUID(),
    actor_profile_id: patients[1].id,
  });
  assert.match(denied.error?.message || "", /cancellation_not_permitted/);

  const inside = await supabase.rpc("cancel_appointment_for_patient", {
    appointment_id: ids.insideAppointment,
    request_id: crypto.randomUUID(),
    actor_profile_id: patients[0].id,
  });
  assert.match(inside.error?.message || "", /cancellation_not_permitted/);

  const first = await required(
    supabase.rpc("cancel_appointment_for_patient", {
      appointment_id: ids.successAppointment,
      request_id: ids.request,
      actor_profile_id: patients[0].id,
    }),
    "cancel eligible synthetic appointment",
  );
  assert.equal(first[0].appointment_status, "cancelled");
  assert.equal(first[0].cancelled_by, "patient");

  const retry = await required(
    supabase.rpc("cancel_appointment_for_patient", {
      appointment_id: ids.successAppointment,
      request_id: ids.request,
      actor_profile_id: patients[0].id,
    }),
    "retry cancellation idempotently",
  );
  assert.equal(retry[0].cancelled_appointment_id, ids.successAppointment);
  assert.equal(retry[0].cancelled_at, first[0].cancelled_at);

  const slot = await required(
    supabase.from("availability_slots").select("status").eq("id", ids.successSlot).single(),
    "verify reopened slot",
  );
  assert.equal(slot.status, "open");

  const audit = await required(
    supabase.from("audit_events").select("event_code, correlation_id")
      .eq("target_id", ids.successAppointment).eq("correlation_id", ids.request).single(),
    "verify cancellation audit event",
  );
  assert.equal(audit.event_code, "appointment_cancelled");

  const concurrentRequests = await Promise.all([
    supabase.rpc("cancel_appointment_for_patient", {
      appointment_id: ids.concurrentAppointment,
      request_id: crypto.randomUUID(),
      actor_profile_id: patients[0].id,
    }),
    supabase.rpc("cancel_appointment_for_patient", {
      appointment_id: ids.concurrentAppointment,
      request_id: crypto.randomUUID(),
      actor_profile_id: patients[0].id,
    }),
  ]);
  assert.equal(concurrentRequests.filter(({ error }) => !error).length, 1);
  assert.equal(concurrentRequests.filter(({ error }) => /cancellation_not_permitted/.test(error?.message || "")).length, 1);
  console.log("Database cancellation checks passed: ownership, 24-hour denial, success, idempotency, slot reopening, and audit.");
} finally {
  await supabase.from("audit_events").delete().in("target_id", [ids.successAppointment, ids.concurrentAppointment]);
  await supabase.from("appointments").delete().in("id", [ids.successAppointment, ids.insideAppointment, ids.concurrentAppointment]);
  await supabase.from("availability_slots").delete().in("id", [ids.successSlot, ids.insideSlot, ids.concurrentSlot]);
}
