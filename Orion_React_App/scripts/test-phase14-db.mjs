import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

try { process.loadEnvFile(".env"); } catch (error) { if (error.code !== "ENOENT") throw error; }
const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const patientPassword = process.env.DEMO_SHARED_PASSWORD || process.env.DEMO_PATIENT_ONE_PASSWORD;
const psychiatristPassword = process.env.DEMO_SHARED_PASSWORD || process.env.DEMO_PSYCHIATRIST_ONE_PASSWORD;
const adminPassword = process.env.DEMO_SHARED_PASSWORD || process.env.DEMO_ADMIN_PASSWORD;
if (!url || !anonKey || !serviceKey || !patientPassword || !psychiatristPassword || !adminPassword) {
  throw new Error("Phase 14 checks require Supabase URL/keys and synthetic patient, psychiatrist, and admin passwords in .env");
}

const service = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
async function required(query, label) { const result = await query; if (result.error) throw new Error(`${label}: ${result.error.message}`); return result.data; }
async function signedIn(email, password) {
  const client = createClient(url, anonKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.user) throw new Error(`sign in ${email}: ${error?.message || "no user returned"}`);
  return { client, userId: data.user.id };
}

const [patient, psychiatrist, admin] = await Promise.all([
  signedIn("patient.one@demo.orion.invalid", patientPassword),
  signedIn("psychiatrist.one@demo.orion.invalid", psychiatristPassword),
  signedIn("admin@demo.orion.invalid", adminPassword),
]);
const psychiatristRow = await required(service.from("psychiatrists").select("id, profile_id").eq("profile_id", psychiatrist.userId).single(), "load psychiatrist");
const rules = await required(service.from("psychiatrist_schedule_rules").select("weekday, starts_local, ends_local").eq("psychiatrist_id", psychiatristRow.id), "load default weekday rules");
assert.equal(rules.length, 5, "each active psychiatrist receives five default weekday rules");
assert.ok(rules.every((rule) => rule.starts_local.startsWith("08:00") && rule.ends_local.startsWith("17:00")));

const directSlots = await patient.client.from("availability_slots").select("id").limit(1);
assert.ok(directSlots.error, "patients must not read raw availability rows");
const directSchedule = await psychiatrist.client.from("psychiatrist_schedule_rules").select("id").limit(1);
assert.ok(directSchedule.error, "psychiatrists must not mutate or read schedule tables directly");

const localDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const projection = await required(patient.client.rpc("get_patient_availability", { target_psychiatrist_id: psychiatristRow.id, target_date: localDate }), "patient availability projection");
assert.ok(projection.every((slot) => slot.psychiatrist_id === psychiatristRow.id));
assert.ok(projection.every((slot) => new Date(slot.ends_at).getTime() - new Date(slot.starts_at).getTime() === 45 * 60 * 1000));
assert.ok(projection.every((slot) => new Date(slot.starts_at).getMinutes() % 15 === 0));
assert.ok(projection.every((slot) => new Date(slot.starts_at).getTime() <= Date.now() + 14 * 24 * 60 * 60 * 1000));

const ownSchedule = await required(psychiatrist.client.functions.invoke("manage-schedule", { body: { action: "list" } }), "psychiatrist schedule projection");
assert.ok(Array.isArray(ownSchedule.data?.schedule));
const adminSchedule = await required(admin.client.functions.invoke("manage-schedule", { body: { action: "admin-list" } }), "admin schedule overview");
assert.ok(Array.isArray(adminSchedule.data?.schedule));
console.log("Phase 14 database checks passed: default rules, raw-table protection, server availability projection, clinician schedule projection, and admin read-only overview.");
