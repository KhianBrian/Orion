import assert from "node:assert/strict";
import fs from "node:fs";
import process from "node:process";
import { createClient } from "@supabase/supabase-js";

if (process.loadEnvFile && fs.existsSync(".env")) process.loadEnvFile(".env");

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("test:db:phase185 requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");

const db = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
const required = async (query, label) => {
  const { data, error } = await query;
  if (error) throw new Error(`${label}: ${error.message}`);
  return data;
};

const { data: users, error: usersError } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 });
if (usersError) throw usersError;
const userByEmail = (email) => users.users.find((user) => user.email === email);
const patientUser = userByEmail("patient.one@demo.orion.invalid");
const otherPatientUser = userByEmail("patient.two@demo.orion.invalid");
const psychiatristUser = userByEmail("psychiatrist.one@demo.orion.invalid");
const adminUser = userByEmail("admin@demo.orion.invalid");
if (!patientUser || !otherPatientUser || !psychiatristUser || !adminUser) throw new Error("Phase 18.5 synthetic accounts are missing");

const psychiatrist = await required(db.from("psychiatrists").select("id").eq("profile_id", psychiatristUser.id).single(), "load psychiatrist");
const startsAt = new Date(Date.now() + 5 * 60 * 1000);
const slot = await required(db.from("availability_slots").insert({
  psychiatrist_id: psychiatrist.id,
  starts_at: startsAt.toISOString(),
  ends_at: new Date(startsAt.getTime() + 45 * 60 * 1000).toISOString(),
  status: "booked",
}).select("id").single(), "create slot");
const appointment = await required(db.from("appointments").insert({
  patient_id: patientUser.id,
  psychiatrist_id: psychiatrist.id,
  slot_id: slot.id,
  starts_at: startsAt.toISOString(),
  ends_at: new Date(startsAt.getTime() + 45 * 60 * 1000).toISOString(),
  status: "booked",
  idempotency_key: crypto.randomUUID(),
}).select("id").single(), "create appointment");

try {
  await required(db.rpc("set_direct_webrtc_enabled", { next_enabled: true, actor_profile_id: adminUser.id, request_id: crypto.randomUUID() }), "enable direct WebRTC");
  const patientAccess = await required(db.rpc("get_direct_webrtc_session_access", { target_appointment_id: appointment.id, actor_profile_id: patientUser.id }), "patient access");
  const psychiatristAccess = await required(db.rpc("get_direct_webrtc_session_access", { target_appointment_id: appointment.id, actor_profile_id: psychiatristUser.id }), "psychiatrist access");
  assert.equal(patientAccess[0].session_id, psychiatristAccess[0].session_id);
  assert.equal(patientAccess[0].participant_role, "patient");
  assert.equal(psychiatristAccess[0].participant_role, "psychiatrist");

  const unrelated = await db.rpc("get_direct_webrtc_session_access", { target_appointment_id: appointment.id, actor_profile_id: otherPatientUser.id });
  assert.match(unrelated.error?.message || "", /direct_webrtc_access_denied/);
  const disabled = await required(db.rpc("set_direct_webrtc_enabled", { next_enabled: false, actor_profile_id: adminUser.id, request_id: crypto.randomUUID() }), "disable direct WebRTC");
  assert.equal(disabled, false);
  const killSwitch = await db.rpc("get_direct_webrtc_session_access", { target_appointment_id: appointment.id, actor_profile_id: patientUser.id });
  assert.match(killSwitch.error?.message || "", /direct_webrtc_access_denied/);
  console.log("Phase 18.5 database checks passed: shared session, relationship denial, and kill switch.");
} finally {
  await db.rpc("set_direct_webrtc_enabled", { next_enabled: false, actor_profile_id: adminUser.id, request_id: crypto.randomUUID() });
  await db.from("audit_events").delete().eq("target_id", appointment.id);
  await db.from("video_sessions").delete().eq("appointment_id", appointment.id);
  await db.from("appointments").delete().eq("id", appointment.id);
  await db.from("availability_slots").delete().eq("id", slot.id);
}
