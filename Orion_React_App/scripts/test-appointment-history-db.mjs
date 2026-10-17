// Checks the appointment paging functions (migration 20261017110000) against the demo project.
// Run after the migration is applied. Creates synthetic past appointments, removes them afterwards.
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

try { process.loadEnvFile(".env"); } catch (error) { if (error.code !== "ENOENT") throw error; }
const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const shared = process.env.DEMO_SHARED_PASSWORD;
const credentials = {
  patientOne: ["patient.one@demo.orion.invalid", shared || process.env.DEMO_PATIENT_ONE_PASSWORD],
  patientTwo: ["patient.two@demo.orion.invalid", shared || process.env.DEMO_PATIENT_TWO_PASSWORD],
  psychiatristOne: ["psychiatrist.one@demo.orion.invalid", shared || process.env.DEMO_PSYCHIATRIST_ONE_PASSWORD],
  psychiatristTwo: ["psychiatrist.two@demo.orion.invalid", shared || process.env.DEMO_PSYCHIATRIST_TWO_PASSWORD],
  admin: ["admin@demo.orion.invalid", shared || process.env.DEMO_ADMIN_PASSWORD],
};
if (!url || !anonKey || !serviceKey || Object.values(credentials).some(([, password]) => !password)) {
  throw new Error("Appointment history checks require the Supabase URL, publishable key, service role key and demo passwords in .env");
}
const service = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
async function required(query, label) {
  const { data, error } = await query;
  if (error) throw new Error(`${label}: ${error.message}`);
  return data;
}
async function signIn([email, password]) {
  const client = createClient(url, anonKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.user) throw new Error(`sign in ${email}: ${error?.message || "no user"}`);
  return { client, id: data.user.id };
}
const sessions = Object.fromEntries(await Promise.all(Object.entries(credentials).map(async ([name, creds]) => [name, await signIn(creds)])));
const page = (who, args = {}) => required(sessions[who].client.rpc("get_my_appointment_history_page", args), `history page for ${who}`);

const psychiatrist = await required(service.from("psychiatrists").select("id, display_name").eq("profile_id", sessions.psychiatristOne.id).single(), "load psychiatrist");
const patients = { one: await required(service.from("profiles").select("id, full_name").eq("id", sessions.patientOne.id).single(), "load patient one"), two: await required(service.from("profiles").select("id, full_name").eq("id", sessions.patientTwo.id).single(), "load patient two") };

// 24 synthetic appointments, one per day, starting about two years back so they never touch real demo data.
const day = 86400000;
const base = new Date(Date.now() - 730 * day); base.setUTCHours(1, 0, 0, 0); // 09:00 Manila
const created = [];
const slots = [];
try {
  for (let index = 0; index < 24; index += 1) {
    const start = new Date(base.getTime() + index * day);
    const slotId = crypto.randomUUID();
    const appointmentId = crypto.randomUUID();
    const cancelled = index % 4 === 3;
    const patient = index % 2 === 0 ? patients.one : patients.two;
    await required(service.from("availability_slots").insert({ id: slotId, psychiatrist_id: psychiatrist.id, starts_at: start.toISOString(), ends_at: new Date(start.getTime() + 45 * 60000).toISOString(), status: "booked" }), "create slot");
    slots.push(slotId);
    await required(service.from("appointments").insert({
      id: appointmentId, patient_id: patient.id, psychiatrist_id: psychiatrist.id, slot_id: slotId,
      starts_at: start.toISOString(), ends_at: new Date(start.getTime() + 45 * 60000).toISOString(),
      status: cancelled ? "cancelled" : "booked", idempotency_key: crypto.randomUUID(),
      ...(cancelled ? { cancelled_at: new Date(start.getTime() - 3 * day).toISOString(), cancelled_by: "patient" } : {}),
    }), "create appointment");
    created.push({ id: appointmentId, start, cancelled, patient });
  }
  const mine = new Set(created.map((item) => item.id));
  const lastDay = created[created.length - 1].start;

  // Paging: pages of 10 are newest first, never repeat a row, and together cover every match.
  const everything = await page("psychiatristOne", { from_date: base.toISOString().slice(0, 10), page_size: 100 });
  const ours = everything.filter((row) => mine.has(row.id));
  assert.equal(ours.length, 24, "all synthetic appointments are in history");
  assert.ok(everything.every((row, index) => index === 0 || new Date(everything[index - 1].starts_at) >= new Date(row.starts_at)), "newest first");
  const seen = [];
  let cursor = {};
  for (let guard = 0; guard < 10; guard += 1) {
    const rows = await page("psychiatristOne", { page_size: 10, ...cursor });
    assert.ok(rows.length <= 10, "page size is respected");
    if (!rows.length) break;
    seen.push(...rows.map((row) => row.id));
    const last = rows[rows.length - 1];
    cursor = { cursor_starts_at: last.starts_at, cursor_id: last.id };
    if (rows.length < 10) break;
  }
  assert.equal(new Set(seen).size, seen.length, "no appointment repeats across pages");
  assert.equal(seen.length, Number((await page("psychiatristOne", { page_size: 1 }))[0].total_count), "pages cover every match");
  assert.ok(created.every((item) => seen.includes(item.id)), "every synthetic appointment is reachable by paging");

  // Filters.
  const cancelledOnly = await page("psychiatristOne", { status_filter: "cancelled", page_size: 100 });
  assert.ok(cancelledOnly.length >= 6 && cancelledOnly.every((row) => row.status === "cancelled"), "status filter");
  const wanted = created[5];
  const manilaDay = new Date(wanted.start.getTime() + 8 * 3600000).toISOString().slice(0, 10);
  const oneDay = await page("psychiatristOne", { from_date: manilaDay, to_date: manilaDay });
  assert.deepEqual(oneDay.map((row) => row.id), [wanted.id], "a single Manila day returns that day only");
  const bySearch = await page("psychiatristOne", { search_text: ` ${patients.two.full_name.toUpperCase()} `, from_date: base.toISOString().slice(0, 10), page_size: 100 });
  assert.ok(bySearch.length >= 12 && bySearch.every((row) => row.counterpart_display_name === patients.two.full_name), "search is case-insensitive and trimmed");
  assert.equal((await page("psychiatristOne", { search_text: "%", page_size: 5 })).length, 0, "a typed % is matched literally, not as a wildcard");
  assert.equal((await page("psychiatristOne", { search_text: "_" , page_size: 5 })).length, 0, "a typed _ is matched literally");
  const { error: cursorError } = await sessions.psychiatristOne.client.rpc("get_my_appointment_history_page", { cursor_id: crypto.randomUUID() });
  assert.match(cursorError?.message || "", /invalid_cursor/, "half a cursor is refused");

  // Access: each person sees only their own appointments; admins and strangers see none of these.
  const patientRows = await page("patientOne", { from_date: base.toISOString().slice(0, 10), page_size: 100 });
  const patientOurs = patientRows.filter((row) => mine.has(row.id));
  assert.equal(patientOurs.length, created.filter((item) => item.patient.id === patients.one.id).length, "patient sees only their own");
  assert.ok(patientOurs.every((row) => row.counterpart_display_name === psychiatrist.display_name), "patient sees the psychiatrist's name");
  assert.equal((await page("psychiatristTwo", { from_date: base.toISOString().slice(0, 10), page_size: 100 })).filter((row) => mine.has(row.id)).length, 0, "another psychiatrist sees none");
  assert.equal((await page("admin", { page_size: 100 })).length, 0, "admin gets no clinical history rows from this function");
  const anonymous = createClient(url, anonKey, { auth: { autoRefreshToken: false, persistSession: false } });
  assert.ok((await anonymous.rpc("get_my_appointment_history_page", {})).error, "anonymous callers are refused");

  // Upcoming and counts.
  const upcoming = await required(sessions.psychiatristOne.client.rpc("get_my_upcoming_appointments"), "upcoming");
  assert.ok(upcoming.every((row) => row.status === "booked" && new Date(row.ends_at) >= new Date()) && !upcoming.some((row) => mine.has(row.id)), "upcoming excludes past appointments");
  const counts = (await required(sessions.psychiatristOne.client.rpc("get_my_appointment_counts"), "counts"))[0];
  assert.ok(Number(counts.history_count) >= 24 && Number(counts.upcoming_count) === upcoming.length, "counts agree with the lists");
  console.log(`Appointment history database checks passed (${lastDay.toISOString().slice(0, 10)} last synthetic day).`);
} finally {
  if (created.length) await service.from("appointments").delete().in("id", created.map((item) => item.id));
  if (slots.length) await service.from("availability_slots").delete().in("id", slots);
}
