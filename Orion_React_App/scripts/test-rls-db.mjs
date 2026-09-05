import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

try {
  process.loadEnvFile(".env");
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const credentials = [
  ["patient.one@demo.orion.invalid", process.env.DEMO_SHARED_PASSWORD || process.env.DEMO_PATIENT_ONE_PASSWORD],
  ["patient.two@demo.orion.invalid", process.env.DEMO_SHARED_PASSWORD || process.env.DEMO_PATIENT_TWO_PASSWORD],
  ["psychiatrist.one@demo.orion.invalid", process.env.DEMO_SHARED_PASSWORD || process.env.DEMO_PSYCHIATRIST_ONE_PASSWORD],
  ["psychiatrist.two@demo.orion.invalid", process.env.DEMO_SHARED_PASSWORD || process.env.DEMO_PSYCHIATRIST_TWO_PASSWORD],
  ["admin@demo.orion.invalid", process.env.DEMO_SHARED_PASSWORD || process.env.DEMO_ADMIN_PASSWORD],
];
if (!url || !anonKey || !serviceRoleKey || credentials.some(([, password]) => !password)) {
  throw new Error("RLS tests require Supabase URL/keys plus all five local synthetic demo passwords in the ignored .env");
}

const service = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function required(query, label) {
  const { data, error } = await query;
  if (error) throw new Error(`${label}: ${error.message}`);
  return data;
}

async function signedInClient(email, password) {
  const client = createClient(url, anonKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.user) throw new Error(`sign in ${email}: ${error?.message || "no user returned"}`);
  return { client, userId: data.user.id };
}

const [patientOneSession, patientTwoSession, psychiatristOneSession, psychiatristTwoSession, adminSession] = await Promise.all(
  credentials.map(([email, password]) => signedInClient(email, password)),
);
const { client: patientOne, userId: patientOneId } = patientOneSession;
const { client: patientTwo } = patientTwoSession;
const { client: psychiatristOne, userId: psychiatristOneId } = psychiatristOneSession;
const { client: psychiatristTwo } = psychiatristTwoSession;
const { client: admin } = adminSession;
const psychiatristProfile = await required(
  service.from("psychiatrists").select("id, profile_id").eq("profile_id", psychiatristOneId).eq("is_active", true).single(),
  "load assigned synthetic psychiatrist",
);
const [expectedPatientProfile, expectedPsychiatrist] = await Promise.all([
  required(service.from("profiles").select("full_name").eq("id", patientOneId).single(), "load synthetic patient display name"),
  required(service.from("psychiatrists").select("display_name").eq("id", psychiatristProfile.id).single(), "load synthetic psychiatrist display name"),
]);

const slotId = crypto.randomUUID();
let appointmentId;
const start = new Date(Date.now() + 35 * 24 * 60 * 60 * 1000);
start.setUTCMinutes(0, 0, 0);

try {
  await required(service.from("availability_slots").insert({
    id: slotId,
    psychiatrist_id: psychiatristProfile.id,
    starts_at: start.toISOString(),
    ends_at: new Date(start.getTime() + 45 * 60 * 1000).toISOString(),
    status: "open",
  }), "create synthetic RLS test slot");
  const booking = await required(service.rpc("book_appointment_for_patient", {
    requested_slot_id: slotId,
    request_id: crypto.randomUUID(),
    actor_profile_id: patientOneId,
  }), "create synthetic RLS test appointment");
  appointmentId = booking[0].appointment_id;

  const ownAppointment = await required(patientOne.from("appointments").select("id").eq("id", appointmentId), "patient reads own appointment");
  const otherPatientAppointment = await required(patientTwo.from("appointments").select("id").eq("id", appointmentId), "other patient appointment denial");
  const assignedAppointment = await required(psychiatristOne.from("appointments").select("id").eq("id", appointmentId), "assigned psychiatrist reads appointment");
  const otherPsychiatristAppointment = await required(psychiatristTwo.from("appointments").select("id").eq("id", appointmentId), "other psychiatrist appointment denial");
  const adminAppointment = await required(admin.from("appointments").select("id").eq("id", appointmentId), "admin appointment denial");
  assert.equal(ownAppointment.length, 1);
  assert.equal(otherPatientAppointment.length, 0);
  assert.equal(assignedAppointment.length, 1);
  assert.equal(otherPsychiatristAppointment.length, 0);
  assert.equal(adminAppointment.length, 0);

  const ownProjection = await required(patientOne.rpc("get_my_appointments"), "patient appointment projection");
  const assignedProjection = await required(psychiatristOne.rpc("get_my_appointments"), "assigned psychiatrist appointment projection");
  const otherPatientProjection = await required(patientTwo.rpc("get_my_appointments"), "other patient appointment projection denial");
  const otherPsychiatristProjection = await required(psychiatristTwo.rpc("get_my_appointments"), "other psychiatrist appointment projection denial");
  const adminProjection = await required(admin.rpc("get_my_appointments"), "admin appointment projection denial");
  const patientRow = ownProjection.find((row) => row.id === appointmentId);
  const psychiatristRow = assignedProjection.find((row) => row.id === appointmentId);
  assert.deepEqual(Object.keys(patientRow).sort(), ["counterpart_display_name", "ends_at", "id", "starts_at", "status"]);
  assert.equal(patientRow.counterpart_display_name, expectedPsychiatrist.display_name);
  assert.equal(psychiatristRow.counterpart_display_name, expectedPatientProfile.full_name);
  assert.equal(otherPatientProjection.some((row) => row.id === appointmentId), false);
  assert.equal(otherPsychiatristProjection.some((row) => row.id === appointmentId), false);
  assert.equal(adminProjection.some((row) => row.id === appointmentId), false);

  const roleChange = await patientOne.from("profiles").update({ role: "admin" }).eq("id", patientOneId);
  assert.ok(roleChange.error, "a patient role update must be rejected");
  const role = await required(service.from("profiles").select("role").eq("id", patientOneId).single(), "verify protected patient role");
  assert.equal(role.role, "patient");
  console.log("Database RLS checks passed: appointment relationship and safe projection allow/deny, plus protected role denial.");
} finally {
  if (appointmentId) {
    await service.from("audit_events").delete().eq("target_id", appointmentId);
    await service.from("appointments").delete().eq("id", appointmentId);
  }
  await service.from("availability_slots").delete().eq("id", slotId);
}
