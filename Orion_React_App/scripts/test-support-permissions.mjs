import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

// Permission matrix for support tickets, exercised as real signed-in users (not the service role):
//   * through the support-tickets Edge Function (the API layer)
//   * through direct table, command, and storage access with a user's own session (must be denied)
try { process.loadEnvFile(".env"); } catch (error) { if (error.code !== "ENOENT") throw error; }
const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
if (!url || !serviceKey || !anonKey) throw new Error("Permission checks require SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and VITE_SUPABASE_PUBLISHABLE_KEY in .env");
const shared = process.env.DEMO_SHARED_PASSWORD;
const credentials = {
  patientOne: { email: "patient.one@demo.orion.invalid", password: shared || process.env.DEMO_PATIENT_ONE_PASSWORD },
  patientTwo: { email: "patient.two@demo.orion.invalid", password: shared || process.env.DEMO_PATIENT_TWO_PASSWORD },
  psychiatristOne: { email: "psychiatrist.one@demo.orion.invalid", password: shared || process.env.DEMO_PSYCHIATRIST_ONE_PASSWORD },
  psychiatristTwo: { email: "psychiatrist.two@demo.orion.invalid", password: shared || process.env.DEMO_PSYCHIATRIST_TWO_PASSWORD },
  admin: { email: "admin@demo.orion.invalid", password: shared || process.env.DEMO_ADMIN_PASSWORD },
};
for (const [name, { password }] of Object.entries(credentials)) if (!password) throw new Error(`a synthetic password for ${name} is required in .env`);

const service = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
const options = { auth: { autoRefreshToken: false, persistSession: false } };
const anonymous = createClient(url, anonKey, options);
const sessions = {};
for (const [name, { email, password }] of Object.entries(credentials)) {
  const client = createClient(url, anonKey, options);
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`sign in as ${name}: ${error.message}`);
  sessions[name] = { client, id: data.user.id };
}

async function call(client, body) {
  const { data, error } = await client.functions.invoke("support-tickets", { body });
  if (!error) return { ok: true, status: 200, data };
  let payload = null;
  try { payload = await error.context.json(); } catch { /* no body */ }
  return { ok: false, status: error.context?.status, data: payload };
}
function expectStatus(result, status, label) {
  assert.equal(result.status, status, `${label}: expected ${status}, got ${result.status} ${JSON.stringify(result.data)}`);
}
// A direct read must be refused outright or return nothing: never a row.
async function assertNoRows(builder, label) {
  const { data, error } = await builder;
  assert.ok(error || (data ?? []).length === 0, `${label}: a direct read returned data ${JSON.stringify(data)}`);
}
async function assertRefused(builder, label) {
  const { data, error } = await builder;
  assert.ok(error || (Array.isArray(data) && data.length === 0), `${label}: expected a refusal, got ${JSON.stringify(data)}`);
}

const createdTickets = [];
const storedFiles = [];
async function openTicket(session, label) {
  const result = await call(session.client, {
    action: "create", categoryCode: "technical_issue", body: `Synthetic permission check ${label} ${crypto.randomUUID()}`, idempotencyKey: crypto.randomUUID(),
  });
  expectStatus(result, 200, `${label}: create`);
  createdTickets.push(result.data.ticket.ticket_id);
  return result.data.ticket.ticket_id;
}

try {
  const { patientOne, patientTwo, psychiatristOne, psychiatristTwo, admin } = sessions;
  const ticketPatientOne = await openTicket(patientOne, "patient one");
  const ticketPsychiatristOne = await openTicket(psychiatristOne, "psychiatrist one");
  const ticketPatientTwo = await openTicket(patientTwo, "patient two");
  const secretPath = `${ticketPatientOne}/${crypto.randomUUID()}-private.txt`;
  storedFiles.push(secretPath);
  const stored = await service.storage.from("support-attachments").upload(secretPath, new Blob(["private"], { type: "text/plain" }));
  assert.ok(!stored.error, `store a private file: ${stored.error?.message}`);

  // ---- API layer: the Edge Function ----
  const noSession = await call(anonymous, { action: "list" });
  assert.ok(!noSession.ok && [401, 403].includes(noSession.status), `a caller with no session must be refused (got ${noSession.status})`);

  // Own tickets only.
  const listed = async (session) => (await call(session.client, { action: "list" })).data.tickets.map((ticket) => ticket.ticket_id);
  const mineOnly = async (session, own, others) => {
    const ids = await listed(session);
    assert.ok(ids.includes(own), "a requester sees their own ticket");
    for (const other of others) assert.ok(!ids.includes(other), "a requester never sees another person's ticket");
  };
  await mineOnly(patientOne, ticketPatientOne, [ticketPsychiatristOne, ticketPatientTwo]);
  await mineOnly(patientTwo, ticketPatientTwo, [ticketPatientOne, ticketPsychiatristOne]);
  await mineOnly(psychiatristOne, ticketPsychiatristOne, [ticketPatientOne, ticketPatientTwo]);
  for (const id of [ticketPatientOne, ticketPsychiatristOne, ticketPatientTwo]) assert.ok(!(await listed(psychiatristTwo)).includes(id), "a psychiatrist with no tickets sees none of these");
  const adminSees = await listed(admin);
  for (const id of [ticketPatientOne, ticketPsychiatristOne, ticketPatientTwo]) assert.ok(adminSees.includes(id), "an admin sees every ticket");

  // Reading, replying, attaching, and changing status on someone else's ticket is refused.
  for (const [who, session, target] of [["patient two", patientTwo, ticketPatientOne], ["psychiatrist one", psychiatristOne, ticketPatientOne], ["patient one", patientOne, ticketPsychiatristOne], ["psychiatrist two", psychiatristTwo, ticketPatientTwo]]) {
    expectStatus(await call(session.client, { action: "read", ticketId: target }), 403, `${who} reads another's ticket`);
    expectStatus(await call(session.client, { action: "reply", ticketId: target, body: "intrusion", idempotencyKey: crypto.randomUUID() }), 403, `${who} replies to another's ticket`);
    expectStatus(await call(session.client, { action: "prepare-upload", ticketId: target, fileName: "x.png", mimeType: "image/png", sizeBytes: 100 }), 403, `${who} prepares an upload on another's ticket`);
    expectStatus(await call(session.client, { action: "register-attachment", ticketId: target, path: `${target}/x-x.png`, fileName: "x.png", mimeType: "image/png", sizeBytes: 100 }), 403, `${who} registers an attachment on another's ticket`);
  }
  // Only admins change status.
  for (const [who, session] of [["patient one", patientOne], ["psychiatrist one", psychiatristOne]]) {
    expectStatus(await call(session.client, { action: "set-status", ticketId: ticketPatientOne, status: "closed" }), 403, `${who} changes a status`);
  }
  const unchanged = await service.from("support_tickets").select("status_code").eq("id", ticketPatientOne).single();
  assert.equal(unchanged.data.status_code, "submitted", "refused calls changed nothing");

  // The owner can read; admins can read and change status; admins cannot open tickets or pick calls.
  expectStatus(await call(patientOne.client, { action: "read", ticketId: ticketPatientOne }), 200, "owner reads own ticket");
  expectStatus(await call(admin.client, { action: "read", ticketId: ticketPatientOne }), 200, "admin reads any ticket");
  expectStatus(await call(admin.client, { action: "set-status", ticketId: ticketPatientOne, status: "in_progress" }), 200, "admin changes status");
  expectStatus(await call(admin.client, { action: "create", categoryCode: "other", body: "admin ticket", idempotencyKey: crypto.randomUUID() }), 403, "admin cannot open a ticket");
  const adminUpload = await call(admin.client, { action: "prepare-upload", ticketId: ticketPatientOne, fileName: "x.png", mimeType: "image/png", sizeBytes: 100 });
  assert.ok(!adminUpload.ok && [400, 403].includes(adminUpload.status), `an admin must not be given an upload link (got ${adminUpload.status})`);
  expectStatus(await call(admin.client, { action: "recent-calls" }), 403, "admin has no call picker");
  expectStatus(await call(patientOne.client, { action: "recent-calls" }), 200, "patient has a call picker");
  expectStatus(await call(patientOne.client, { action: "notifications" }), 200, "patient reads own notification count");
  expectStatus(await call(admin.client, { action: "notifications" }), 200, "admin reads own notification count");

  // Bad input is a 400, not a server error.
  expectStatus(await call(patientOne.client, { action: "create", categoryCode: "not_a_topic", body: "x", idempotencyKey: crypto.randomUUID() }), 400, "unknown topic");
  expectStatus(await call(patientOne.client, { action: "create", categoryCode: "other", body: "x", idempotencyKey: crypto.randomUUID(), relatedCallId: "not-a-uuid" }), 400, "malformed call ID");
  expectStatus(await call(patientOne.client, { action: "create", categoryCode: "other", body: "x", idempotencyKey: crypto.randomUUID(), relatedCallId: crypto.randomUUID() }), 400, "call the patient never took");
  expectStatus(await call(admin.client, { action: "set-status", ticketId: ticketPatientOne, status: "not_a_status" }), 400, "unknown status");
  expectStatus(await call(patientOne.client, { action: "no-such-action" }), 400, "unknown action");
  expectStatus(await call(patientOne.client, { action: "create", categoryCode: "other", body: "x".repeat(2001), idempotencyKey: crypto.randomUUID() }), 400, "message over 2000 characters");

  // ---- Direct access with a user's own session ----
  // One real column per table, so a refusal is about permission and not a missing column.
  const tables = {
    support_tickets: { column: "updated_at", key: "id" },
    support_ticket_messages: { column: "body", key: "id" },
    support_ticket_history: { column: "reason_code", key: "id" },
    support_ticket_reads: { column: "last_read_at", key: "ticket_id" },
    support_ticket_attachments: { column: "original_name", key: "id" },
  };
  const ticketBefore = (await service.from("support_tickets").select("updated_at, status_code").eq("id", ticketPatientOne).single()).data;
  const everyone = { anonymous: { client: anonymous }, ...sessions };
  for (const [who, session] of Object.entries(everyone)) {
    for (const [table, { column, key }] of Object.entries(tables)) {
      await assertNoRows(session.client.from(table).select("*"), `${who} reads ${table} directly`);
      const value = column === "updated_at" || column === "last_read_at" ? new Date().toISOString() : column === "reason_code" ? "other" : "tampered";
      const update = await session.client.from(table).update({ [column]: value }).not(key, "is", null).select();
      assert.ok(update.error || (update.data ?? []).length === 0, `${who} updates ${table} directly`);
      if (update.error) assert.doesNotMatch(update.error.message, /column .* does not exist/, `${table}: the update must be refused for permission, not a missing column`);
      const removal = await session.client.from(table).delete().not(key, "is", null).select();
      assert.ok(removal.error || (removal.data ?? []).length === 0, `${who} deletes from ${table} directly`);
      if (removal.error) assert.doesNotMatch(removal.error.message, /column .* does not exist/, `${table}: the delete must be refused for permission, not a missing column`);
    }
    const insert = await session.client.from("support_tickets").insert({ requester_id: sessions.patientOne.id, category_code: "other", idempotency_key: crypto.randomUUID() }).select();
    assert.ok(insert.error, `${who} must not insert a ticket directly`);
    // The support commands are for the service role only.
    for (const [command, args] of [
      ["get_admin_support_tickets", { actor_profile_id: admin.id }],
      ["get_my_support_tickets", { actor_profile_id: patientOne.id }],
      ["get_my_recent_calls", { actor_profile_id: patientOne.id }],
      ["set_support_ticket_status", { target_ticket_id: ticketPatientOne, actor_profile_id: admin.id, new_status: "closed", change_reason_code: null }],
      ["send_support_ticket_message", { target_ticket_id: ticketPatientOne, actor_profile_id: patientOne.id, request_id: crypto.randomUUID(), message_body: "direct" }],
      ["create_support_ticket", { actor_profile_id: patientOne.id, request_id: crypto.randomUUID(), ticket_category_code: "other", message_body: "direct" }],
      ["register_support_ticket_attachment", { target_ticket_id: ticketPatientOne, actor_profile_id: patientOne.id, target_storage_path: `${ticketPatientOne}/a-b.png`, target_original_name: "b.png", target_mime_type: "image/png", target_size_bytes: 10 }],
      ["reserve_support_upload", { target_ticket_id: ticketPatientOne, actor_profile_id: patientOne.id }],
      ["get_support_notification_counts", { actor_profile_id: patientOne.id }],
    ]) {
      const result = await session.client.rpc(command, args);
      assert.ok(result.error, `${who} must not call ${command} directly`);
      assert.equal(result.error.code, "42501", `${who} calling ${command}: expected a permission refusal, got ${result.error.code} ${result.error.message}`);
    }
    // Private storage: no listing, no download, no signed link, no public link.
    const bucket = session.client.storage.from("support-attachments");
    const listing = await bucket.list(ticketPatientOne);
    assert.ok(listing.error || (listing.data ?? []).length === 0, `${who} must not list private attachments`);
    const download = await bucket.download(secretPath);
    assert.ok(download.error, `${who} must not download a private attachment`);
    const signed = await bucket.createSignedUrl(secretPath, 60);
    assert.ok(signed.error, `${who} must not create a signed link for a private attachment`);
    const publicResponse = await fetch(`${url}/storage/v1/object/public/support-attachments/${secretPath}`);
    assert.notEqual(publicResponse.status, 200, `${who}: the private bucket must not serve public links`);
  }

  const ticketAfter = (await service.from("support_tickets").select("updated_at, status_code").eq("id", ticketPatientOne).single()).data;
  assert.deepEqual(ticketAfter, ticketBefore, "the direct attempts changed nothing about the ticket");

  console.log("Support permission checks passed");
} finally {
  if (storedFiles.length) await service.storage.from("support-attachments").remove(storedFiles);
  if (createdTickets.length) {
    await service.from("audit_events").delete().in("target_id", createdTickets);
    await service.from("support_ticket_attachments").delete().in("ticket_id", createdTickets);
    await service.from("support_ticket_reads").delete().in("ticket_id", createdTickets);
    await service.from("support_ticket_messages").delete().in("ticket_id", createdTickets);
    await service.from("support_tickets").delete().in("id", createdTickets);
  }
}
