import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { nextWeekdayStart } from "./scheduling-test-helpers.mjs";

try { process.loadEnvFile(".env"); } catch (error) { if (error.code !== "ENOENT") throw error; }
const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Phase 4 database checks require SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env");
const db = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
async function required(query, label) { const { data, error } = await query; if (error) throw new Error(`${label}: ${error.message}`); return data; }
async function expectError(query, code, label) { const { error } = await query; assert.ok(error, `${label} should fail`); assert.match(error.message, new RegExp(code)); }

const [patients, psychiatrist, admin] = await Promise.all([
  required(db.from("profiles").select("id").eq("role", "patient").limit(2), "load patients"),
  required(db.from("psychiatrists").select("id, profile_id").eq("is_active", true).limit(1).single(), "load psychiatrist"),
  required(db.from("profiles").select("id").eq("role", "admin").single(), "load admin"),
]);
assert.ok(patients.length >= 2);
const ids = Array.from({ length: 5 }, () => crypto.randomUUID());
const [switchSlot, clinicianSlot, outcomeSlot, originalSlot, replacementSlot] = ids;
const future = nextWeekdayStart({ daysAhead: 3, hour: 8 });
const starts = [future, new Date(future.getTime() + 2 * 60 * 60 * 1000), new Date(Date.now() - 2 * 60 * 60 * 1000), new Date(future.getTime() + 6 * 60 * 60 * 1000), new Date(future.getTime() + 8 * 60 * 60 * 1000)];
const appointments = [];
try {
  for (const [id, start] of ids.map((id, index) => [id, starts[index]])) {
    await required(db.from("availability_slots").insert({ id, psychiatrist_id: psychiatrist.id, starts_at: start.toISOString(), ends_at: new Date(start.getTime() + 45 * 60 * 1000).toISOString(), status: "open" }), "create Phase 4 slot");
  }
  const first = await required(db.rpc("set_booking_enabled", { next_enabled: false, actor_profile_id: admin.id, request_id: crypto.randomUUID() }), "disable booking");
  assert.equal(first, false);
  await expectError(db.rpc("book_appointment_for_patient", { requested_slot_id: switchSlot, request_id: crypto.randomUUID(), actor_profile_id: patients[0].id }), "booking_disabled", "disabled booking");
  await required(db.rpc("set_booking_enabled", { next_enabled: true, actor_profile_id: admin.id, request_id: crypto.randomUUID() }), "enable booking");

  const clinicianAppointment = (await required(db.rpc("book_appointment_for_patient", { requested_slot_id: clinicianSlot, request_id: crypto.randomUUID(), actor_profile_id: patients[0].id }), "book clinician cancellation appointment"))[0];
  appointments.push(clinicianAppointment.appointment_id);
  await required(db.rpc("cancel_appointment_for_psychiatrist", { appointment_id: clinicianAppointment.appointment_id, request_id: crypto.randomUUID(), reason_code: "technical_problem", explanation: null, actor_profile_id: psychiatrist.profile_id }), "psychiatrist cancellation");
  const clinicianSlotState = await required(db.from("availability_slots").select("status").eq("id", clinicianSlot).single(), "inspect clinician slot");
  assert.equal(clinicianSlotState.status, "booked", "psychiatrist cancellation must not reopen slot");

  const outcomeAppointmentId = crypto.randomUUID();
  await required(db.from("availability_slots").update({ status: "booked" }).eq("id", outcomeSlot), "reserve outcome slot");
  await required(db.from("appointments").insert({ id: outcomeAppointmentId, patient_id: patients[1].id, psychiatrist_id: psychiatrist.id, slot_id: outcomeSlot, starts_at: starts[2].toISOString(), ends_at: new Date(starts[2].getTime() + 45 * 60 * 1000).toISOString(), status: "booked", idempotency_key: crypto.randomUUID() }), "create past outcome appointment");
  const outcomeAppointment = { appointment_id: outcomeAppointmentId };
  appointments.push(outcomeAppointment.appointment_id);
  await required(db.rpc("record_appointment_outcome", { target_appointment_id: outcomeAppointment.appointment_id, next_status: "no_show", absent_party: "patient", request_id: crypto.randomUUID(), actor_profile_id: psychiatrist.profile_id }), "record no-show");
  const outcome = await required(db.from("appointments").select("status, no_show_party").eq("id", outcomeAppointment.appointment_id).single(), "inspect outcome");
  assert.deepEqual(outcome, { status: "no_show", no_show_party: "patient" });

  const original = (await required(db.rpc("book_appointment_for_patient", { requested_slot_id: originalSlot, request_id: crypto.randomUUID(), actor_profile_id: patients[0].id }), "book reschedule source"))[0];
  appointments.push(original.appointment_id);
  const requestKey = crypto.randomUUID();
  const request = (await required(db.rpc("request_appointment_reschedule", { target_appointment_id: original.appointment_id, requested_slot_id: replacementSlot, request_id: requestKey, actor_profile_id: patients[0].id }), "request reschedule"))[0];
  const retry = (await required(db.rpc("request_appointment_reschedule", { target_appointment_id: original.appointment_id, requested_slot_id: replacementSlot, request_id: requestKey, actor_profile_id: patients[0].id }), "retry reschedule request"))[0];
  assert.equal(retry.reschedule_request_id, request.reschedule_request_id);
  const approval = (await required(db.rpc("review_appointment_reschedule", { target_request_id: request.reschedule_request_id, approve: true, decision_reason: null, request_id: crypto.randomUUID(), actor_profile_id: psychiatrist.profile_id }), "approve reschedule"))[0];
  appointments.push(approval.replacement_appointment_id);
  const approvalRetry = (await required(db.rpc("review_appointment_reschedule", { target_request_id: request.reschedule_request_id, approve: true, decision_reason: null, request_id: crypto.randomUUID(), actor_profile_id: psychiatrist.profile_id }), "retry reschedule approval"))[0];
  assert.equal(approvalRetry.replacement_appointment_id, approval.replacement_appointment_id);
  console.log("Phase 4 database checks passed: kill switch, clinician cancellation, manual no-show, reschedule retry, and approval idempotency.");
} finally {
  if (appointments.length) await db.from("audit_events").delete().in("target_id", appointments);
  if (appointments.length) await db.from("reschedule_requests").delete().in("original_appointment_id", appointments);
  await db.from("appointments").delete().in("id", appointments);
  await db.from("availability_slots").delete().in("id", ids);
}
