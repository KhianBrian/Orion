import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

try { process.loadEnvFile(".env"); } catch (error) { if (error.code !== "ENOENT") throw error; }
const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Reschedule conflict checks require SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env");

const db = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
const patients = (await db.from("profiles").select("id").eq("role", "patient").order("created_at").limit(2)).data;
assert.equal(patients?.length, 2, "two synthetic patients are required");
const psychiatrist = (await db.from("psychiatrists").select("id, profile_id").eq("is_active", true).order("created_at").limit(1).single()).data;

const manilaDay = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" });
function nextWeekdays(count) {
  const days = [];
  for (let offset = 3; days.length < count && offset < 13; offset += 1) {
    const day = manilaDay.format(new Date(Date.now() + offset * 86400000));
    const weekday = new Date(`${day}T12:00:00+08:00`).getUTCDay();
    if (weekday !== 0 && weekday !== 6) days.push(day);
  }
  return days;
}

const slots = [];
const appointments = [];
const requests = [];
async function makeSlot(day, time) {
  const startsAt = new Date(`${day}T${time}+08:00`);
  const { data, error } = await db.from("availability_slots").insert({
    psychiatrist_id: psychiatrist.id,
    starts_at: startsAt.toISOString(),
    ends_at: new Date(startsAt.getTime() + 45 * 60000).toISOString(),
    status: "open",
  }).select("id").single();
  if (error) throw new Error(`create test slot: ${error.message}`);
  slots.push(data.id);
  return data.id;
}
async function required(query, label) {
  const { data, error } = await query;
  if (error) throw new Error(`${label}: ${error.message}`);
  return data;
}

try {
  const [day] = nextWeekdays(1);
  assert.ok(day, "no upcoming weekday inside the horizon");

  // The patient holds an appointment at 10:00 and asks to move to 11:00.
  const originalSlot = await makeSlot(day, "10:00:01");
  const requestedSlot = await makeSlot(day, "11:00:01");
  const booked = await required(db.rpc("book_appointment_for_patient", {
    requested_slot_id: originalSlot, request_id: crypto.randomUUID(), actor_profile_id: patients[0].id,
  }), "patient books the original appointment");
  const originalId = booked[0].appointment_id;
  appointments.push(originalId);
  const asked = await required(db.rpc("request_appointment_reschedule", {
    target_appointment_id: originalId, requested_slot_id: requestedSlot, request_id: crypto.randomUUID(), actor_profile_id: patients[0].id,
  }), "patient requests a reschedule");
  const requestId = asked[0].reschedule_request_id;
  requests.push(requestId);

  // While the request waits, another patient books a time that overlaps the requested one.
  const rivalSlot = await makeSlot(day, "10:45:01");
  const rival = await required(db.rpc("book_appointment_for_patient", {
    requested_slot_id: rivalSlot, request_id: crypto.randomUUID(), actor_profile_id: patients[1].id,
  }), "the rival patient books an overlapping time");
  appointments.push(rival[0].appointment_id);

  // Approving now must be refused with the clear conflict code, not a raw constraint error.
  const { error } = await db.rpc("review_appointment_reschedule", {
    target_request_id: requestId, approve: true, decision_reason: null, request_id: crypto.randomUUID(), actor_profile_id: psychiatrist.profile_id,
  });
  assert.ok(error, "approving an overtaken request must be refused");
  assert.match(error.message, /slot_unavailable/, `the approver must see slot_unavailable (${error.message})`);
  assert.doesNotMatch(error.message, /exclusion constraint/, "the raw constraint error must not reach the caller");

  // The refusal rolled everything back: the original stays booked and the request stays pending.
  const original = await required(db.from("appointments").select("status").eq("id", originalId).single(), "reload the original appointment");
  assert.equal(original.status, "booked", "the original appointment is unchanged");
  const request = await required(db.from("reschedule_requests").select("status").eq("id", requestId).single(), "reload the request");
  assert.equal(request.status, "pending", "the request is still pending");
  const originalSlotRow = await required(db.from("availability_slots").select("status").eq("id", originalSlot).single(), "reload the original slot");
  assert.equal(originalSlotRow.status, "booked", "the original slot is still booked");

  // The psychiatrist can still decline it cleanly.
  const declined = await required(db.rpc("review_appointment_reschedule", {
    target_request_id: requestId, approve: false, decision_reason: "Synthetic decline", request_id: crypto.randomUUID(), actor_profile_id: psychiatrist.profile_id,
  }), "decline the overtaken request");
  assert.equal(declined[0].request_status, "declined");

  console.log("Reschedule conflict database checks passed");
} finally {
  if (requests.length) {
    await db.from("audit_events").delete().in("target_id", requests);
    await db.from("reschedule_requests").delete().in("id", requests);
  }
  if (appointments.length) {
    await db.from("audit_events").delete().in("target_id", appointments);
    await db.from("appointments").delete().in("id", appointments);
  }
  if (slots.length) await db.from("availability_slots").delete().in("id", slots);
}
