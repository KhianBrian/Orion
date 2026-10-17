import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

try { process.loadEnvFile(".env"); } catch (error) { if (error.code !== "ENOENT") throw error; }
const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Support hardening checks require SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env");

const db = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
async function required(query, label) {
  const { data, error } = await query;
  if (error) throw new Error(`${label}: ${error.message}`);
  return data;
}
async function rejected(query, expected, label) {
  const { data, error } = await query;
  assert.ok(error, `${label}: expected a refusal, but it returned ${JSON.stringify(data)}`);
  assert.match(error.message, new RegExp(expected), `${label}: wrong refusal (${error.message})`);
}

const patients = (await db.from("profiles").select("id").eq("role", "patient").order("created_at").limit(2)).data;
const psychiatrist = (await db.from("psychiatrists").select("id, profile_id, display_name").eq("is_active", true).order("created_at").limit(1).single()).data;
const admin = (await db.from("profiles").select("id").eq("role", "admin").order("created_at").limit(1).single()).data;
assert.equal(patients?.length, 2, "two synthetic patients are required");
const [patientOne, patientTwo] = patients;
const names = Object.fromEntries((await db.from("profiles").select("id, full_name").in("id", [patientOne.id, patientTwo.id])).data.map((row) => [row.id, row.full_name]));

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
const tickets = [];
const createTicket = (requester, extra = {}, requestId = crypto.randomUUID()) => db.rpc("create_support_ticket", {
  actor_profile_id: requester.id,
  request_id: requestId,
  ticket_category_code: "technical_issue",
  message_body: `Synthetic hardening ticket ${crypto.randomUUID()}`,
  ...extra,
});
async function newTicket(requester, extra) {
  const [ticket] = await required(createTicket(requester, extra), "create ticket");
  tickets.push(ticket.ticket_id);
  return ticket.ticket_id;
}
const reply = (ticketId, actor, requestId = crypto.randomUUID()) => db.rpc("send_support_ticket_message", {
  target_ticket_id: ticketId, actor_profile_id: actor, request_id: requestId, message_body: "Synthetic hardening reply",
});
const attach = (ticketId, actor, name = "evidence.png") => db.rpc("register_support_ticket_attachment", {
  target_ticket_id: ticketId, actor_profile_id: actor, target_storage_path: `${ticketId}/${crypto.randomUUID()}-${name}`,
  target_original_name: name, target_mime_type: "image/png", target_size_bytes: 1024,
});

// A booked appointment moved to a chosen time: books a future slot, then edits the appointment.
async function makeAppointment(patient, day, offsetMs, { cancelled = false, time = "14:00:01" } = {}) {
  const startsAt = new Date(`${day}T${time}+08:00`);
  const slot = await required(db.from("availability_slots").insert({
    psychiatrist_id: psychiatrist.id, starts_at: startsAt.toISOString(),
    ends_at: new Date(startsAt.getTime() + 45 * 60000).toISOString(), status: "open",
  }).select("id").single(), "create slot");
  slots.push(slot.id);
  const booked = await required(db.rpc("book_appointment_for_patient", {
    requested_slot_id: slot.id, request_id: crypto.randomUUID(), actor_profile_id: patient.id,
  }), "book appointment");
  const id = booked[0].appointment_id;
  appointments.push(id);
  if (cancelled) {
    await required(db.rpc("cancel_appointment_for_psychiatrist", {
      appointment_id: id, request_id: crypto.randomUUID(), reason_code: "scheduling_or_administrative_error",
      explanation: "Synthetic cancelled call", actor_profile_id: psychiatrist.profile_id,
    }), "cancel appointment");
  }
  if (offsetMs !== null) {
    const start = new Date(Date.now() + offsetMs);
    await required(db.from("appointments").update({ starts_at: start.toISOString(), ends_at: new Date(start.getTime() + 45 * 60000).toISOString() }).eq("id", id), "move appointment");
  }
  return id;
}
const DAY = 86400000;

try {
  const days = nextWeekdays(6);
  assert.ok(days.length >= 6, "not enough upcoming weekdays inside the booking horizon");
  const hourAgo = new Date(Date.now() - 3600000).toISOString();
  const before = await required(db.from("support_tickets").select("id").eq("requester_id", patientOne.id).gte("created_at", hourAgo), "count patient one's recent tickets");
  assert.equal(before.length, 0, "this check needs a clean hour: patient one already has tickets inside the limit window");

  // ---- Report a recent call ----
  const callA = await makeAppointment(patientOne, days[0], -2 * DAY);               // own, recent
  const callB = await makeAppointment(patientTwo, days[1], -2 * DAY - 3 * 3600000); // someone else's, recent
  const callC = await makeAppointment(patientOne, days[2], -20 * DAY);              // own, too old
  const callD = await makeAppointment(patientOne, days[3], -2 * DAY - 6 * 3600000, { cancelled: true }); // cancelled
  const callE = await makeAppointment(patientOne, days[4], null);                   // own, in the future
  const callF = await makeAppointment(patientOne, days[0], 30 * 60000, { time: "16:00:01" });                 // own, starts in 30 minutes
  const callG = await makeAppointment(patientOne, days[1], 2 * 3600000, { time: "16:00:01" });                // own, starts in 2 hours
  const callH = await makeAppointment(patientOne, days[2], -(14 * DAY) + 3600000, { time: "16:00:01" });      // own, 13 days 23 hours ago
  const callI = await makeAppointment(patientOne, days[3], -(14 * DAY) - 3600000, { time: "16:00:01" });      // own, 14 days 1 hour ago

  const own = await required(db.rpc("get_my_recent_calls", { actor_profile_id: patientOne.id }), "patient one's recent calls");
  const ownIds = new Set(own.map((row) => row.call_id));
  for (const offered of [callA, callF, callH]) assert.ok(ownIds.has(offered), "a patient is offered their own recent calls, including one about to start and one just inside 14 days");
  for (const hidden of [callB, callC, callD, callE, callG, callI]) assert.ok(!ownIds.has(hidden), "a patient is not offered someone else's, old, cancelled, or future calls");
  const ownA = own.find((row) => row.call_id === callA);
  assert.match(ownA.call_reference, /^[0-9A-F]{8}$/, "the call ID shown to users is 8 hex characters");
  assert.equal(ownA.call_reference, callA.replaceAll("-", "").slice(0, 8).toUpperCase());
  assert.equal(ownA.counterpart_display_name, psychiatrist.display_name, "a patient sees the psychiatrist's name");
  const other = await required(db.rpc("get_my_recent_calls", { actor_profile_id: patientTwo.id }), "patient two's recent calls");
  const otherIds = new Set(other.map((row) => row.call_id));
  assert.ok(otherIds.has(callB));
  for (const hidden of [callA, callC, callD, callE, callF, callG, callH, callI]) assert.ok(!otherIds.has(hidden), "another patient never sees these calls");
  const clinician = await required(db.rpc("get_my_recent_calls", { actor_profile_id: psychiatrist.profile_id }), "psychiatrist's recent calls");
  const clinicianIds = new Set(clinician.map((row) => row.call_id));
  for (const offered of [callA, callB, callF, callH]) assert.ok(clinicianIds.has(offered), "a psychiatrist is offered the calls they took");
  for (const hidden of [callC, callD, callE, callG, callI]) assert.ok(!clinicianIds.has(hidden));
  assert.equal(clinician.find((row) => row.call_id === callA).counterpart_display_name, names[patientOne.id]);
  await rejected(db.rpc("get_my_recent_calls", { actor_profile_id: admin.id }), "support_ticket_not_permitted", "an admin has no recent-call picker");

  const withCall = await newTicket(patientOne, { related_call_id: callA });
  await rejected(createTicket(patientOne, { related_call_id: callB }), "support_ticket_invalid_related_call", "another patient's call");
  await rejected(createTicket(patientOne, { related_call_id: callC }), "support_ticket_invalid_related_call", "a call older than 14 days");
  await rejected(createTicket(patientOne, { related_call_id: callD }), "support_ticket_invalid_related_call", "a cancelled call");
  await rejected(createTicket(patientOne, { related_call_id: callE }), "support_ticket_invalid_related_call", "a call that has not started");
  await rejected(createTicket(patientOne, { related_call_id: callG }), "support_ticket_invalid_related_call", "a call starting in two hours");
  await rejected(createTicket(patientOne, { related_call_id: callI }), "support_ticket_invalid_related_call", "a call just over 14 days old");
  await rejected(createTicket(patientOne, { related_call_id: crypto.randomUUID() }), "support_ticket_invalid_related_call", "an unknown call");
  const clinicianTicket = await newTicket({ id: psychiatrist.profile_id }, { related_call_id: callB });
  const plainTicket = await newTicket(patientTwo);

  // The reference is informational: the requester sees only the short ID and start time.
  const mine = (await required(db.rpc("get_my_support_tickets", { actor_profile_id: patientOne.id }), "own tickets")).find((row) => row.ticket_id === withCall);
  assert.equal(mine.related_call_reference, ownA.call_reference);
  assert.ok(mine.related_call_starts_at);
  assert.ok(!("related_call_id" in mine) && !("related_call_patient_name" in mine), "a requester's list carries no extra call details");
  // Admins can track it: full ID, short ID, time, status, and both names (nothing from notes).
  const queue = await required(db.rpc("get_admin_support_tickets", { actor_profile_id: admin.id }), "admin queue");
  const adminRow = queue.find((row) => row.ticket_id === withCall);
  assert.equal(adminRow.related_call_id, callA);
  assert.equal(adminRow.related_call_reference, ownA.call_reference);
  assert.equal(adminRow.related_call_psychiatrist_name, psychiatrist.display_name);
  assert.equal(adminRow.related_call_patient_name, names[patientOne.id]);
  assert.equal(queue.find((row) => row.ticket_id === plainTicket).related_call_id, null, "a ticket without a call has no call fields");
  assert.ok(queue.some((row) => row.ticket_id === clinicianTicket && row.related_call_id === callB));
  const status = await required(db.from("appointments").select("status").eq("id", callA).single(), "reload the reported call");
  assert.equal(status.status, "booked", "reporting a call changes no appointment state");
  const audit = await required(db.from("audit_events").select("metadata").eq("target_id", withCall).eq("event_code", "support_ticket_created"), "load create audit");
  assert.equal(audit[0].metadata.related_appointment_id, callA);
  assert.ok(Object.keys(audit[0].metadata).every((metadataKey) => ["message_id", "related_appointment_id"].includes(metadataKey)), "audit holds IDs only");

  // ---- Rate limits ----
  // New tickets: 5 per rolling hour. Tickets created above for patient one already count.
  const startingCount = (await required(db.from("support_tickets").select("id").eq("requester_id", patientOne.id).gte("created_at", hourAgo), "count tickets")).length;
  assert.equal(startingCount, 1, "only the ticket that references a call should exist so far");
  const keys = [];
  const patientOneTickets = [];
  for (let count = startingCount; count < 5; count += 1) {
    const requestId = crypto.randomUUID();
    keys.push(requestId);
    const [ticket] = await required(createTicket(patientOne, {}, requestId), "create ticket up to the limit");
    tickets.push(ticket.ticket_id);
    patientOneTickets.push(ticket.ticket_id);
  }
  await rejected(createTicket(patientOne), "support_rate_limited", "the sixth ticket in an hour");
  if (keys.length) {
    const [again] = await required(createTicket(patientOne, {}, keys[0]), "retry of an earlier ticket at the limit");
    assert.ok(tickets.includes(again.ticket_id), "a repeated request returns the earlier ticket and is not refused");
  }
  await required(createTicket(patientTwo), "another patient is unaffected by the limit").then((rows) => tickets.push(rows[0].ticket_id));

  // Replies: 30 per rolling hour for requesters; admins are exempt; a retry is never refused.
  const thread = withCall;
  const replyKeys = [];
  for (let count = 0; count < 30; count += 1) {
    const requestId = crypto.randomUUID();
    replyKeys.push(requestId);
    await required(reply(thread, patientOne.id, requestId), `reply ${count + 1}`);
  }
  await rejected(reply(thread, patientOne.id), "support_rate_limited", "the 31st reply in an hour");
  const retried = await required(reply(thread, patientOne.id, replyKeys[29]), "retry of the 30th reply");
  assert.ok(retried[0].message_id, "a repeated reply returns the earlier message");
  for (let count = 0; count < 31; count += 1) await required(reply(thread, admin.id), `admin reply ${count + 1} is not limited`);

  // Upload links: a reservation is recorded before each signed URL, 10 per person per rolling hour.
  for (let count = 0; count < 10; count += 1) {
    assert.equal(await required(db.rpc("reserve_support_upload", { target_ticket_id: withCall, actor_profile_id: patientOne.id }), `reserve upload ${count + 1}`), true);
  }
  await rejected(db.rpc("reserve_support_upload", { target_ticket_id: withCall, actor_profile_id: patientOne.id }), "support_rate_limited", "the eleventh upload link in an hour");
  await rejected(db.rpc("reserve_support_upload", { target_ticket_id: withCall, actor_profile_id: patientTwo.id }), "support_ticket_attachment_not_permitted", "another requester cannot reserve an upload");
  await required(db.rpc("reserve_support_upload", { target_ticket_id: clinicianTicket, actor_profile_id: psychiatrist.profile_id }), "another person's reservations are counted separately");

  // Registered attachments: at most 3 per ticket, enforced on the server.
  for (let count = 0; count < 3; count += 1) await required(attach(clinicianTicket, psychiatrist.profile_id), `attachment ${count + 1}`);
  await rejected(attach(clinicianTicket, psychiatrist.profile_id), "support_rate_limited", "a fourth attachment on one ticket");
  await rejected(attach(clinicianTicket, patientOne.id), "support_ticket_attachment_not_permitted", "another requester cannot attach to the ticket");
  await rejected(db.rpc("reserve_support_upload", { target_ticket_id: clinicianTicket, actor_profile_id: psychiatrist.profile_id }), "support_rate_limited", "no upload link once the ticket has three attachments");

  // At most 10 attachments per uploader per rolling hour, even when no single ticket is full.
  const [ticketTwo, ticketThree, ticketFour, ticketFive] = patientOneTickets;
  for (const ticket of [ticketTwo, ticketThree, ticketFour]) {
    for (let count = 0; count < 3; count += 1) await required(attach(ticket, patientOne.id), "attachment within the hourly limit");
  }
  await required(attach(ticketFive, patientOne.id), "the tenth attachment in an hour");
  await rejected(attach(ticketFive, patientOne.id), "support_rate_limited", "the eleventh attachment in an hour");

  console.log("Support hardening database checks passed");
} finally {
  if (tickets.length) {
    await db.from("audit_events").delete().in("target_id", tickets);
    await db.from("support_ticket_attachments").delete().in("ticket_id", tickets);
    await db.from("support_ticket_reads").delete().in("ticket_id", tickets);
    await db.from("support_ticket_messages").delete().in("ticket_id", tickets);
    await db.from("support_tickets").delete().in("id", tickets);
  }
  if (appointments.length) {
    await db.from("audit_events").delete().in("target_id", appointments);
    await db.from("appointments").delete().in("id", appointments);
  }
  if (slots.length) await db.from("availability_slots").delete().in("id", slots);
}
