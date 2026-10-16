import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

try { process.loadEnvFile(".env"); } catch (error) { if (error.code !== "ENOENT") throw error; }
const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Booking conflict checks require SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env");

const db = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
const patients = (await db.from("profiles").select("id").eq("role", "patient").order("created_at").limit(2)).data;
assert.equal(patients?.length, 2, "two synthetic patients are required");
const psychiatrist = (await db.from("psychiatrists").select("id").eq("is_active", true).order("created_at").limit(1).single()).data;

// Next weekdays in Manila, so the checks do not depend on a psychiatrist working weekends.
const manilaDay = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" });
function nextWeekdays(count) {
  const days = [];
  for (let offset = 2; days.length < count && offset < 13; offset += 1) {
    const day = manilaDay.format(new Date(Date.now() + offset * 86400000));
    const weekday = new Date(`${day}T12:00:00+08:00`).getUTCDay();
    if (weekday !== 0 && weekday !== 6) days.push(day);
  }
  return days;
}

const slots = [];
const appointments = [];
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
const book = (slotId, patient, requestId = crypto.randomUUID()) => db.rpc("book_appointment_for_patient", {
  requested_slot_id: slotId, request_id: requestId, actor_profile_id: patient.id,
});
function summarise(results) {
  const winners = results.filter((result) => !result.error);
  winners.forEach((result) => appointments.push(result.data[0].appointment_id));
  return { winners, losers: results.filter((result) => result.error) };
}

try {
  const days = nextWeekdays(6);
  assert.ok(days.length >= 6, "not enough upcoming weekdays inside the booking horizon");

  // The same slot requested by four people in the same instant: exactly one booking wins and every
  // other request is refused with the clear conflict code.
  for (const day of days.slice(0, 3)) {
    const slotId = await makeSlot(day, "14:00:01");
    const { winners, losers } = summarise(await Promise.all([
      book(slotId, patients[0]), book(slotId, patients[1]), book(slotId, patients[0]), book(slotId, patients[1]),
    ]));
    assert.equal(winners.length, 1, `same slot: exactly one booking must win on ${day}`);
    assert.equal(losers.length, 3);
    assert.ok(losers.every(({ error }) => /slot_unavailable/.test(error.message)), `same slot: losers must see slot_unavailable (${losers.map(({ error }) => error.message)})`);
    const stored = await db.from("appointments").select("id", { count: "exact", head: true }).eq("slot_id", slotId);
    assert.equal(stored.count, 1, "only one appointment is stored for the slot");
  }

  // Different but overlapping slots with the same psychiatrist: the database admits one booking and the
  // loser must also see slot_unavailable, not a raw constraint error.
  for (const day of days.slice(3, 6)) {
    const first = await makeSlot(day, "14:00:01");
    const second = await makeSlot(day, "14:15:01");
    const { winners, losers } = summarise(await Promise.all([book(first, patients[0]), book(second, patients[1])]));
    assert.equal(winners.length, 1, `overlapping slots: exactly one booking must win on ${day}`);
    assert.equal(losers.length, 1);
    assert.match(losers[0].error.message, /slot_unavailable/, `overlapping slots: the loser must see slot_unavailable (${losers[0].error.message})`);
    assert.doesNotMatch(losers[0].error.message, /exclusion constraint/, "the raw constraint error must not reach the caller");
  }

  // A repeated request (double click) returns the same appointment instead of a second booking.
  const retrySlot = await makeSlot(days[0], "16:00:01");
  const requestId = crypto.randomUUID();
  const firstTry = await book(retrySlot, patients[0], requestId);
  const secondTry = await book(retrySlot, patients[0], requestId);
  assert.ok(!firstTry.error && !secondTry.error, "a repeated request is not an error");
  appointments.push(firstTry.data[0].appointment_id);
  assert.equal(secondTry.data[0].appointment_id, firstTry.data[0].appointment_id, "a repeated request returns the same appointment");

  console.log("Booking conflict database checks passed");
} finally {
  if (appointments.length) {
    await db.from("audit_events").delete().in("target_id", appointments);
    await db.from("appointments").delete().in("id", appointments);
  }
  if (slots.length) await db.from("availability_slots").delete().in("id", slots);
}
