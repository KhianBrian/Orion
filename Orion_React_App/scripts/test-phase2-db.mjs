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
  throw new Error("Phase 2 tests require Supabase URL/keys and all five local synthetic demo passwords in .env");
}

const service = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function data(query, label) {
  const result = await query;
  if (result.error) throw new Error(`${label}: ${result.error.message}`);
  return result.data;
}

async function denied(query, label) {
  const result = await query;
  assert.ok(result.error, `${label} should be rejected`);
  return result.error;
}

async function signedIn(email, password) {
  const client = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: authData, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !authData.user) throw new Error(`sign in ${email}: ${error?.message || "no user returned"}`);
  return { client, userId: authData.user.id };
}

async function rows(query, label) {
  return data(query, label);
}

async function assertDirectCrudDenied(session, table, targetId, insertPayload, updatePayload) {
  await denied(session.client.from(table).insert(insertPayload), `${session.label} ${table} insert`);
  await denied(
    session.client.from(table).update(updatePayload).eq("id", targetId).select("id"),
    `${session.label} ${table} update`,
  );
  await denied(session.client.from(table).delete().eq("id", targetId), `${session.label} ${table} delete`);
}

console.log("Phase 2 matrix: signing in synthetic roles...");
const [patientOne, patientTwo, psychiatristOne, psychiatristTwo, admin] = await Promise.all(
  credentials.map(([email, password]) => signedIn(email, password)),
);
console.log("Phase 2 matrix: signed in; creating isolated fixtures...");
patientOne.label = "patient one";
patientTwo.label = "patient two";
psychiatristOne.label = "psychiatrist one";
psychiatristTwo.label = "psychiatrist two";
admin.label = "admin";

const sessions = [patientOne, patientTwo, psychiatristOne, psychiatristTwo, admin];
const psychiatristOneRow = await data(
  service.from("psychiatrists").select("id, profile_id, is_active").eq("profile_id", psychiatristOne.userId).single(),
  "load first synthetic psychiatrist",
);
const psychiatristTwoRow = await data(
  service.from("psychiatrists").select("id, profile_id, is_active").eq("profile_id", psychiatristTwo.userId).single(),
  "load second synthetic psychiatrist",
);
assert.equal(psychiatristOneRow.is_active, true);
assert.equal(psychiatristTwoRow.is_active, true);

const profileIds = sessions.map(({ userId }) => userId);
const originalPhones = Object.fromEntries(
  (await data(service.from("profiles").select("id, phone").in("id", profileIds), "load profile fixtures"))
    .map(({ id, phone }) => [id, phone]),
);

const existingSlots = await data(
  service.from("availability_slots")
    .select("ends_at")
    .in("psychiatrist_id", [psychiatristOneRow.id, psychiatristTwoRow.id]),
  "load existing psychiatrist slots",
);
const latestSlotEnd = existingSlots.reduce(
  (latest, { ends_at }) => Math.max(latest, new Date(ends_at).getTime()),
  0,
);

const openSlotId = crypto.randomUUID();
const appointmentSlotId = crypto.randomUUID();
const otherPsychiatristSlotId = crypto.randomUUID();
const bookingRequestId = crypto.randomUUID();
const start = new Date(Math.max(
  Date.now() + 45 * 24 * 60 * 60 * 1000,
  latestSlotEnd + 2 * 60 * 60 * 1000,
));
const openSlotStart = new Date(start);
const appointmentSlotStart = new Date(start.getTime() + 2 * 60 * 60 * 1000);
const otherPsychiatristSlotStart = new Date(start.getTime() + 4 * 60 * 60 * 1000);
let appointmentId;
const noteIds = [];

try {
  await data(service.from("availability_slots").insert([
    {
      id: openSlotId,
      psychiatrist_id: psychiatristOneRow.id,
      starts_at: openSlotStart.toISOString(),
      ends_at: new Date(openSlotStart.getTime() + 45 * 60 * 1000).toISOString(),
      status: "open",
    },
    {
      id: appointmentSlotId,
      psychiatrist_id: psychiatristOneRow.id,
      starts_at: appointmentSlotStart.toISOString(),
      ends_at: new Date(appointmentSlotStart.getTime() + 45 * 60 * 1000).toISOString(),
      status: "open",
    },
    {
      id: otherPsychiatristSlotId,
      psychiatrist_id: psychiatristTwoRow.id,
      starts_at: otherPsychiatristSlotStart.toISOString(),
      ends_at: new Date(otherPsychiatristSlotStart.getTime() + 45 * 60 * 1000).toISOString(),
      status: "open",
    },
  ]), "create RLS matrix slots");
  console.log("Phase 2 matrix: fixtures created; checking profiles...");

  const booking = await data(service.rpc("book_appointment_for_patient", {
    requested_slot_id: appointmentSlotId,
    request_id: bookingRequestId,
    actor_profile_id: patientOne.userId,
  }), "book RLS matrix appointment");
  appointmentId = booking[0].appointment_id;
  await denied(
    service.from("appointments").update({ status: "no_show" }).eq("id", appointmentId),
    "no-show without absent-party fact",
  );

  // Profiles: every signed-in role may read and edit only its own non-privileged fields.
  for (const session of sessions) {
    const ownProfile = await rows(
      session.client.from("profiles").select("id, role").eq("id", session.userId),
      `${session.label} reads own profile`,
    );
    assert.equal(ownProfile.length, 1);
    const otherProfile = await rows(
      session.client.from("profiles").select("id").eq("id", patientOne.userId === session.userId ? patientTwo.userId : patientOne.userId),
      `${session.label} cannot read another profile`,
    );
    assert.equal(otherProfile.length, 0);

    const update = await data(
      session.client.from("profiles")
        .update({ phone: `phase2-rbac-${session.userId.slice(0, 8)}` })
        .eq("id", session.userId)
        .select("id, phone"),
      `${session.label} updates own profile contact field`,
    );
    assert.equal(update.length, 1);
    await denied(
      session.client.from("profiles").update({ role: "admin" }).eq("id", session.userId).select("id"),
      `${session.label} changes own application role`,
    );
    await denied(
      session.client.from("profiles").insert({ id: crypto.randomUUID(), full_name: "unauthorized", role: "patient" }),
      `${session.label} inserts profile directly`,
    );
    await denied(session.client.from("profiles").delete().eq("id", session.userId), `${session.label} deletes profile directly`);
  }
  console.log("Phase 2 matrix: checking clinician and slot visibility...");

  // Clinician discovery and availability: active public rows, own clinician rows, and admin operations view.
  assert.equal((await rows(patientOne.client.from("psychiatrists").select("id").eq("id", psychiatristOneRow.id), "patient sees active psychiatrist")).length, 1);
  assert.equal((await rows(psychiatristOne.client.from("psychiatrists").select("id").eq("id", psychiatristOneRow.id), "assigned psychiatrist sees own row")).length, 1);
  assert.equal((await rows(psychiatristTwo.client.from("psychiatrists").select("id").eq("id", psychiatristOneRow.id), "unassigned psychiatrist cannot see other row")).length, 0);
  assert.equal((await rows(admin.client.from("psychiatrists").select("id").in("id", [psychiatristOneRow.id, psychiatristTwoRow.id]), "admin sees clinician rows")).length, 2);

  const patientSlots = await rows(patientOne.client.from("availability_slots").select("id").in("id", [openSlotId, otherPsychiatristSlotId]), "patient sees active open slots");
  assert.deepEqual(patientSlots.map(({ id }) => id).sort(), [openSlotId, otherPsychiatristSlotId].sort());
  assert.equal((await rows(psychiatristOne.client.from("availability_slots").select("id").in("id", [openSlotId, appointmentSlotId, otherPsychiatristSlotId]), "psychiatrist sees own slots only")).length, 2);
  assert.equal((await rows(psychiatristTwo.client.from("availability_slots").select("id").in("id", [openSlotId, otherPsychiatristSlotId]), "second psychiatrist sees own slot only")).length, 1);
  assert.equal((await rows(admin.client.from("availability_slots").select("id").in("id", [openSlotId, appointmentSlotId, otherPsychiatristSlotId]), "admin sees all slots")).length, 3);

  await data(service.from("psychiatrists").update({ is_active: false }).eq("id", psychiatristTwoRow.id), "deactivate second psychiatrist for gating check");
  assert.equal((await rows(patientOne.client.from("psychiatrists").select("id").eq("id", psychiatristTwoRow.id), "patient cannot see inactive psychiatrist")).length, 0);
  assert.equal((await rows(patientOne.client.from("availability_slots").select("id").eq("id", otherPsychiatristSlotId), "patient cannot see inactive psychiatrist slot")).length, 0);
  await data(service.from("psychiatrists").update({ is_active: true }).eq("id", psychiatristTwoRow.id), "restore second psychiatrist activation");
  console.log("Phase 2 matrix: checking appointment visibility...");

  // Appointment relationship: patient-own and assigned-psychiatrist access only; admin has no default table read.
  assert.equal((await rows(patientOne.client.from("appointments").select("id").eq("id", appointmentId), "patient reads own appointment")).length, 1);
  assert.equal((await rows(patientTwo.client.from("appointments").select("id").eq("id", appointmentId), "other patient cannot read appointment")).length, 0);
  assert.equal((await rows(psychiatristOne.client.from("appointments").select("id").eq("id", appointmentId), "assigned psychiatrist reads appointment")).length, 1);
  assert.equal((await rows(psychiatristTwo.client.from("appointments").select("id").eq("id", appointmentId), "other psychiatrist cannot read appointment")).length, 0);
  assert.equal((await rows(admin.client.from("appointments").select("id").eq("id", appointmentId), "admin cannot read appointment by default")).length, 0);

  const patientProjection = await data(patientOne.client.rpc("get_my_appointments"), "patient appointment projection");
  const psychiatristProjection = await data(psychiatristOne.client.rpc("get_my_appointments"), "psychiatrist appointment projection");
  assert.ok(patientProjection.some(({ id }) => id === appointmentId));
  assert.ok(psychiatristProjection.some(({ id }) => id === appointmentId));
  assert.equal((await data(patientTwo.client.rpc("get_my_appointments"), "other patient appointment projection")).some(({ id }) => id === appointmentId), false);
  assert.equal((await data(psychiatristTwo.client.rpc("get_my_appointments"), "other psychiatrist appointment projection")).some(({ id }) => id === appointmentId), false);
  assert.equal((await data(admin.client.rpc("get_my_appointments"), "admin appointment projection")).length, 0);

  await denied(patientOne.client.rpc("book_appointment_for_patient", { requested_slot_id: openSlotId, request_id: crypto.randomUUID(), actor_profile_id: patientOne.userId }), "patient direct booking RPC");
  await denied(psychiatristOne.client.rpc("cancel_appointment_for_patient", { appointment_id: appointmentId, request_id: crypto.randomUUID(), actor_profile_id: psychiatristOne.userId }), "psychiatrist direct cancellation RPC");
  console.log("Phase 2 matrix: checking session notes and audit mutations...");

  // Session notes: direct table CRUD and privileged functions are denied to every application role.
  const note = await data(service.rpc("create_session_note", {
    target_appointment_id: appointmentId,
    note_body: "Phase 2 matrix test note.",
    actor_profile_id: psychiatristOne.userId,
  }), "create matrix test note");
  const noteId = note[0].note_id;
  noteIds.push(noteId);
  await denied(patientOne.client.from("session_notes").select("id").eq("id", noteId), "patient direct note read");
  await denied(admin.client.from("session_notes").select("id").eq("id", noteId), "admin direct note read");
  for (const session of sessions) {
    await assertDirectCrudDenied(
      session,
      "psychiatrists",
      psychiatristOneRow.id,
      { profile_id: patientTwo.userId, display_name: "unauthorized" },
      { display_name: "tampered" },
    );
    await assertDirectCrudDenied(
      session,
      "availability_slots",
      openSlotId,
      { psychiatrist_id: psychiatristOneRow.id, starts_at: new Date(start.getTime() + 12 * 60 * 60 * 1000).toISOString(), ends_at: new Date(start.getTime() + 12 * 60 * 60 * 1000 + 45 * 60 * 1000).toISOString(), status: "open" },
      { status: "booked" },
    );
    await assertDirectCrudDenied(
      session,
      "appointments",
      appointmentId,
      { patient_id: session.userId, psychiatrist_id: psychiatristOneRow.id, slot_id: openSlotId, starts_at: openSlotStart.toISOString(), ends_at: new Date(openSlotStart.getTime() + 45 * 60 * 1000).toISOString(), idempotency_key: crypto.randomUUID() },
      { status: "cancelled" },
    );
    await assertDirectCrudDenied(
      session,
      "session_notes",
      noteId,
      { appointment_id: appointmentId, author_psychiatrist_id: psychiatristOneRow.id, body: "unauthorized" },
      { body: "tampered" },
    );
    // Audit mutation tests are intentionally explicit: application roles have no update/delete path.
    await denied(session.client.from("audit_events").insert({ event_code: "tampered", target_type: "appointment", target_id: appointmentId, outcome: "denied" }), `${session.label} audit insert`);
    await denied(session.client.from("audit_events").update({ reason_code: "tampered" }).eq("target_id", appointmentId).select("id"), `${session.label} audit update`);
    await denied(session.client.from("audit_events").delete().eq("target_id", appointmentId), `${session.label} audit delete`);
  }

  await denied(patientOne.client.rpc("create_session_note", { target_appointment_id: appointmentId, note_body: "unauthorized", actor_profile_id: psychiatristOne.userId }), "patient direct note-create RPC");
  await denied(psychiatristOne.client.rpc("release_session_note", { target_note_id: noteId, actor_profile_id: psychiatristOne.userId }), "psychiatrist direct note-release RPC");
  await denied(patientOne.client.rpc("read_session_note", { target_note_id: noteId, actor_profile_id: patientOne.userId }), "patient direct note-read RPC");

  const unreleasedRead = await data(service.rpc("read_session_note", { target_note_id: noteId, actor_profile_id: patientOne.userId }), "patient reads unreleased note through service path");
  assert.equal(unreleasedRead.length, 0);
  await data(service.rpc("release_session_note", { target_note_id: noteId, actor_profile_id: psychiatristOne.userId }), "release matrix test note");
  const releasedPatientRead = await data(service.rpc("read_session_note", { target_note_id: noteId, actor_profile_id: patientOne.userId }), "patient reads released own note through service path");
  assert.equal(releasedPatientRead[0].body, "Phase 2 matrix test note.");
  const assignedPsychiatristRead = await data(service.rpc("read_session_note", { target_note_id: noteId, actor_profile_id: psychiatristOne.userId }), "assigned psychiatrist reads own note through service path");
  assert.equal(assignedPsychiatristRead[0].body, "Phase 2 matrix test note.");

  const correction = await data(service.rpc("create_session_note", {
    target_appointment_id: appointmentId,
    note_body: "Phase 2 matrix test correction.",
    actor_profile_id: psychiatristOne.userId,
    superseded_note_id: noteId,
  }), "create versioned matrix note correction");
  assert.equal(correction[0].version_number, 2);
  const correctionId = correction[0].note_id;
  noteIds.push(correctionId);
  await data(service.rpc("release_session_note", { target_note_id: correctionId, actor_profile_id: psychiatristOne.userId }), "release versioned matrix note correction");
  const releasedCorrectionRead = await data(service.rpc("read_session_note", { target_note_id: correctionId, actor_profile_id: patientOne.userId }), "patient reads released note correction");
  assert.equal(releasedCorrectionRead[0].body, "Phase 2 matrix test correction.");
  assert.equal((await data(service.rpc("read_session_note", { target_note_id: noteId, actor_profile_id: patientOne.userId }), "patient cannot read superseded note version")).length, 0);
  assert.equal((await data(service.rpc("read_session_note", { target_note_id: noteId, actor_profile_id: patientTwo.userId }), "other patient note denial")).length, 0);
  assert.equal((await data(service.rpc("read_session_note", { target_note_id: noteId, actor_profile_id: psychiatristTwo.userId }), "other psychiatrist note denial")).length, 0);
  assert.equal((await data(service.rpc("read_session_note", { target_note_id: noteId, actor_profile_id: admin.userId }), "admin note denial")).length, 0);

  const auditRows = await data(
    service.from("audit_events")
      .select("event_code, outcome, reason_code, target_id")
      .in("target_id", [appointmentId, ...noteIds])
      .order("created_at", { ascending: true }),
    "load matrix audit evidence",
  );
  assert.equal(auditRows.filter((row) => row.event_code === "session_note_read" && row.outcome === "success").length, 3);
  assert.ok(auditRows.filter((row) => row.event_code === "session_note_read" && row.outcome === "denied").length >= 4);
  assert.ok(auditRows.every((row) => !Object.hasOwn(row, "body") && !Object.hasOwn(row, "note_body")));

  const patientAuditRows = await rows(patientOne.client.from("audit_events").select("event_code, target_type, target_id").limit(10), "patient audit metadata denial");
  const psychiatristAuditRows = await rows(psychiatristOne.client.from("audit_events").select("event_code, target_type, target_id").limit(10), "psychiatrist audit metadata denial");
  const adminAuditRows = await rows(admin.client.from("audit_events").select("event_code, target_type, target_id").eq("target_id", noteId), "admin reads audit metadata");
  assert.equal(patientAuditRows.length, 0);
  assert.equal(psychiatristAuditRows.length, 0);
  assert.ok(adminAuditRows.some((row) => row.event_code === "session_note_read"));

  // Anonymous requests have no table or function access.
  const anonymous = createClient(url, anonKey, { auth: { autoRefreshToken: false, persistSession: false } });
  for (const table of ["profiles", "psychiatrists", "availability_slots", "appointments", "session_notes", "audit_events"]) {
    await denied(anonymous.from(table).select("id").limit(1), `anonymous ${table} read`);
  }
  await denied(anonymous.rpc("get_my_appointments"), "anonymous appointment projection");

  console.log("Phase 2 database checks passed: full three-role RLS CRUD matrix, activation gating, protected notes, audited reads, and append-only audit mutation denial.");
} finally {
  await service.from("psychiatrists").update({ is_active: true }).eq("id", psychiatristTwoRow.id);
  for (const [id, phone] of Object.entries(originalPhones)) {
    await service.from("profiles").update({ phone }).eq("id", id);
  }
  if (noteIds.length > 0) await service.from("audit_events").delete().in("target_id", noteIds);
  if (appointmentId) {
    await service.from("audit_events").delete().eq("target_id", appointmentId);
    await service.from("session_notes").delete().in("id", noteIds);
    await service.from("appointments").delete().eq("id", appointmentId);
  }
  await service.from("availability_slots").delete().in("id", [openSlotId, appointmentSlotId, otherPsychiatristSlotId]);
}
