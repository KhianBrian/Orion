#!/usr/bin/env node

/*
 * Test-only Layer 1 Google Meet capacity check.
 *
 * This exercises Orion's deployed google-meet-session-access function with
 * synthetic users and one already-connected test Google refresh token. It
 * does not open browsers, cameras, microphones, or Google Meet calls.
 *
 * Required environment:
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   SUPABASE_ANON_KEY or VITE_SUPABASE_PUBLISHABLE_KEY
 *
 * Optional environment:
 *   GOOGLE_MEET_SOURCE_PROFILE_ID  Existing psychiatrist profile whose
 *                                   connection supplies the test token.
 *   GOOGLE_MEET_LAYER1_COUNT       Default 20.
 *   GOOGLE_MEET_LAYER1_PREFIX      Default google-meet-layer1.
 *
 * The source connection and all created rows are test credentials/data. Never
 * run this against a production project or with a real clinician account.
 */

import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const count = Number.parseInt(process.env.GOOGLE_MEET_LAYER1_COUNT || "20", 10);
const prefix = process.env.GOOGLE_MEET_LAYER1_PREFIX || "google-meet-layer1";
const sourceProfileId = process.env.GOOGLE_MEET_SOURCE_PROFILE_ID || null;

if (process.env.GOOGLE_MEET_LAYER1_CONFIRM !== "I_UNDERSTAND_TEST_ONLY") {
  throw new Error("Set GOOGLE_MEET_LAYER1_CONFIRM=I_UNDERSTAND_TEST_ONLY before running this test-only remote fixture");
}
if (!supabaseUrl || !serviceRoleKey || !anonKey) {
  throw new Error("SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and SUPABASE_ANON_KEY or VITE_SUPABASE_PUBLISHABLE_KEY are required");
}
if (!Number.isInteger(count) || count < 1 || count > 50) throw new Error("GOOGLE_MEET_LAYER1_COUNT must be between 1 and 50");

const service = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });
const runId = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}`;
const testPrefix = `${prefix}-${runId}`;
const created = { users: [], psychiatristProfiles: [], patientProfiles: [], psychiatristRows: [], slotIds: [], appointmentIds: [] };
let adminProfileId;
let sourceConnection;

function required(value, label) {
  if (!value) throw new Error(`${label} was not returned`);
  return value;
}

async function query(promise, label) {
  const { data, error } = await promise;
  if (error) throw new Error(`${label}: ${error.message}`);
  return data;
}

function safeError(error) {
  return {
    name: error?.name,
    message: typeof error?.message === "string" ? error.message.slice(0, 180) : String(error).slice(0, 180),
  };
}

async function findAdmin() {
  const rows = await query(service.from("profiles").select("id").eq("role", "admin").limit(1), "find synthetic admin");
  adminProfileId = required(rows[0]?.id, "synthetic admin profile");
}

async function findSourceConnection() {
  let request = service.from("google_meet_connections").select("profile_id, refresh_token, revoked_at").is("revoked_at", null);
  if (sourceProfileId) request = request.eq("profile_id", sourceProfileId);
  const rows = await query(request.limit(2), "find connected test Google account");
  if (rows.length !== 1) {
    throw new Error(sourceProfileId
      ? "The requested source psychiatrist has no active Google Meet connection"
      : "Expected exactly one active source connection; set GOOGLE_MEET_SOURCE_PROFILE_ID to choose one");
  }
  sourceConnection = rows[0];
}

async function createUser(email, fullName, password) {
  const result = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (result.error) throw new Error(`create synthetic user: ${result.error.message}`);
  const user = required(result.data.user, "created synthetic user");
  created.users.push(user.id);
  return { ...user, password };
}

async function createFixtures() {
  for (let index = 1; index <= count; index += 1) {
    const psychiatristEmail = `${testPrefix}-psychiatrist-${index}@demo.orion.invalid`;
    const patientEmail = `${testPrefix}-patient-${index}@demo.orion.invalid`;
    const password = `Layer1-${crypto.randomUUID()}-A9!`;
    const psychiatristUser = await createUser(psychiatristEmail, `Layer 1 Psychiatrist ${index}`, password);
    const patientUser = await createUser(patientEmail, `Layer 1 Patient ${index}`, password);

    const provisioned = await query(service.rpc("provision_psychiatrist", {
      target_user_id: psychiatristUser.id,
      target_full_name: psychiatristUser.user_metadata?.full_name,
      target_display_name: `Layer 1 Psychiatrist ${index}`,
      target_bio: "Synthetic Layer 1 Google Meet test account",
      actor_profile_id: adminProfileId,
    }), `provision psychiatrist ${index}`);

    created.psychiatristProfiles.push(psychiatristUser.id);
    created.patientProfiles.push(patientUser.id);
    created.psychiatristRows.push({ profileId: psychiatristUser.id, user: psychiatristUser, patient: patientUser, psychiatristId: required(provisioned[0]?.psychiatrist_id, `psychiatrist ${index}`) });
  }

  // This is deliberately test-only: it models the current shared-account setup
  // without asking the same Gmail user to complete 20 interactive OAuth flows.
  await query(service.from("google_meet_connections").upsert(
    created.psychiatristRows.map(({ profileId }) => ({
      profile_id: profileId,
      refresh_token: sourceConnection.refresh_token,
      connected_at: new Date().toISOString(),
      revoked_at: null,
      updated_at: new Date().toISOString(),
    })),
    { onConflict: "profile_id" },
  ), "copy test-only shared connection");

  const startsAt = new Date(Date.now() + 5 * 60 * 1000);
  for (const [index, row] of created.psychiatristRows.entries()) {
    const slotId = crypto.randomUUID();
    const appointmentId = crypto.randomUUID();
    const endsAt = new Date(startsAt.getTime() + 45 * 60 * 1000);
    await query(service.from("availability_slots").insert({
      id: slotId,
      psychiatrist_id: row.psychiatristId,
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      status: "booked",
    }), `create test slot ${index + 1}`);
    await query(service.from("appointments").insert({
      id: appointmentId,
      patient_id: row.patient.id,
      psychiatrist_id: row.psychiatristId,
      slot_id: slotId,
      starts_at: startsAt.toISOString(),
      ends_at: endsAt.toISOString(),
      status: "booked",
      idempotency_key: crypto.randomUUID(),
    }), `create test appointment ${index + 1}`);
    created.slotIds.push(slotId);
    created.appointmentIds.push(appointmentId);
  }
}

async function setMeetEnabled(enabled) {
  const result = await service.rpc("set_google_meet_enabled", {
    next_enabled: enabled,
    actor_profile_id: adminProfileId,
    request_id: crypto.randomUUID(),
  });
  if (result.error) throw new Error(`set Google Meet ${enabled ? "enabled" : "disabled"}: ${result.error.message}`);
}

async function signIn(user) {
  const client = createClient(supabaseUrl, anonKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data, error } = await client.auth.signInWithPassword({ email: user.email, password: user.password });
  if (error || !data.session?.access_token) throw new Error(`sign in ${user.email}: ${error?.message || "no access token"}`);
  return data.session.access_token;
}

async function requestAccess(token, appointmentId) {
  const started = performance.now();
  const response = await fetch(`${supabaseUrl}/functions/v1/google-meet-session-access`, {
    method: "POST",
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ appointmentId }),
  });
  const payload = await response.json().catch(() => ({}));
  return {
    status: response.status,
    elapsedMs: Math.round(performance.now() - started),
    error: typeof payload.error === "string" ? payload.error : null,
    mode: payload.mode || null,
    hasMeetingUri: typeof payload.meetingUri === "string",
  };
}

async function runPsychiatristBurst() {
  const tokens = await Promise.all(created.psychiatristRows.map((row) => signIn(row.user)));
  const started = performance.now();
  const results = await Promise.all(created.appointmentIds.map((appointmentId, index) => requestAccess(tokens[index], appointmentId)));
  const elapsedMs = Math.round(performance.now() - started);
  const successes = results.filter((result) => result.status === 200 && result.mode === "google-meet" && result.hasMeetingUri);
  const statusCounts = Object.fromEntries([...new Set(results.map((result) => result.status))].map((status) => [status, results.filter((result) => result.status === status).length]));
  const auditRows = await query(service.from("audit_events").select("reason_code, outcome").in("target_id", created.appointmentIds), "load Meet access audit reasons");
  const auditReasonCounts = Object.fromEntries([...new Set(auditRows.map((row) => row.reason_code || "missing_reason"))].map((reason) => [reason, auditRows.filter((row) => (row.reason_code || "missing_reason") === reason).length]));
  console.log(JSON.stringify({ phase: "psychiatrist-burst", count, elapsedMs, successes: successes.length, statusCounts, auditReasonCounts, sampleFailures: results.filter((result) => result.status !== 200).slice(0, 5).map((result) => ({ status: result.status, error: result.error })) }, null, 2));
  assert.equal(successes.length, count, "not every synthetic psychiatrist received a Meet link");
  return tokens;
}

async function verifySpaces() {
  const rows = await query(service.from("google_meeting_spaces").select("appointment_id, host_profile_id, status, space_name, meeting_uri").in("appointment_id", created.appointmentIds), "load created meeting spaces");
  assert.equal(rows.length, count, "expected one meeting-space row per appointment");
  assert.equal(rows.filter((row) => row.status === "active").length, count, "expected every meeting space to be active");
  assert.equal(new Set(rows.map((row) => row.space_name)).size, count, "expected unique provider space names");
  assert.equal(new Set(rows.map((row) => row.meeting_uri)).size, count, "expected unique meeting URIs");
  console.log(JSON.stringify({ phase: "space-integrity", rows: rows.length, active: rows.filter((row) => row.status === "active").length, uniqueSpaceNames: new Set(rows.map((row) => row.space_name)).size, uniqueMeetingUris: new Set(rows.map((row) => row.meeting_uri)).size }, null, 2));
}

async function verifyPatients() {
  const tokens = await Promise.all(created.psychiatristRows.map((row) => signIn(row.patient)));
  const results = await Promise.all(created.appointmentIds.map((appointmentId, index) => requestAccess(tokens[index], appointmentId)));
  const successes = results.filter((result) => result.status === 200 && result.mode === "google-meet" && result.hasMeetingUri);
  console.log(JSON.stringify({ phase: "patient-existing-space", count, successes: successes.length, statusCounts: Object.fromEntries([...new Set(results.map((result) => result.status))].map((status) => [status, results.filter((result) => result.status === status).length])) }, null, 2));
  assert.equal(successes.length, count, "not every synthetic patient received the existing Meet link");
}

async function cleanup() {
  if (created.appointmentIds.length) {
    await service.from("audit_events").delete().in("target_id", created.appointmentIds);
    await service.from("google_meeting_spaces").delete().in("appointment_id", created.appointmentIds);
    await service.from("appointments").delete().in("id", created.appointmentIds);
  }
  if (created.slotIds.length) await service.from("availability_slots").delete().in("id", created.slotIds);
  if (created.psychiatristProfiles.length) await service.from("google_meet_connections").delete().in("profile_id", created.psychiatristProfiles);
  for (const userId of created.users) await service.auth.admin.deleteUser(userId);
}

async function main() {
  await findAdmin();
  await findSourceConnection();
  console.log(JSON.stringify({ phase: "setup", count, runId, sourceProfileId: sourceConnection.profile_id }, null, 2));
  await createFixtures();
  await setMeetEnabled(true);
  await runPsychiatristBurst();
  await verifySpaces();
  await verifyPatients();
  console.log(JSON.stringify({ phase: "pass", count, message: "Layer 1 shared-account control-plane test passed" }, null, 2));
}

try {
  await main();
} catch (error) {
  console.error(JSON.stringify({ phase: "fail", error: safeError(error) }, null, 2));
  process.exitCode = 1;
} finally {
  try {
    if (adminProfileId) await setMeetEnabled(false);
  } catch (error) {
    console.error(JSON.stringify({ phase: "cleanup", error: safeError(error) }, null, 2));
    process.exitCode = 1;
  }
  try {
    await cleanup();
  } catch (error) {
    console.error(JSON.stringify({ phase: "cleanup", error: safeError(error) }, null, 2));
    process.exitCode = 1;
  }
}
