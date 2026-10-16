import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

try { process.loadEnvFile(".env"); } catch (error) { if (error.code !== "ENOENT") throw error; }
const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Phase 19 database checks require SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env");

const db = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
async function required(query, label) {
  const { data, error } = await query;
  if (error) throw new Error(`${label}: ${error.message}`);
  return data;
}
async function rejected(query, expected, label) {
  const { data, error } = await query;
  assert.ok(error, `${label}: expected the database to refuse this, but it returned ${JSON.stringify(data)}`);
  assert.match(error.message, new RegExp(expected), `${label}: wrong refusal (${error.message})`);
}
const adminList = (actor) => required(db.rpc("get_admin_support_tickets", { actor_profile_id: actor }), "admin ticket list");
const myList = (actor) => required(db.rpc("get_my_support_tickets", { actor_profile_id: actor }), "own ticket list");
const find = (tickets, id) => tickets.find((ticket) => ticket.ticket_id === id);
const counts = async (actor) => (await required(db.rpc("get_support_notification_counts", { actor_profile_id: actor }), "notification counts"))[0];
const setStatus = (ticketId, actor, status, reason = null) => db.rpc("set_support_ticket_status", {
  target_ticket_id: ticketId, actor_profile_id: actor, new_status: status, change_reason_code: reason,
});

const [patient, psychiatrist, admin] = await Promise.all([
  required(db.from("profiles").select("id").eq("role", "patient").order("created_at").limit(1).single(), "load synthetic patient"),
  required(db.from("profiles").select("id").eq("role", "psychiatrist").order("created_at").limit(1).single(), "load synthetic psychiatrist"),
  required(db.from("profiles").select("id").eq("role", "admin").order("created_at").limit(1).single(), "load synthetic admin"),
]);

const created = [];
async function newTicket(requester, label) {
  const [ticket] = await required(db.rpc("create_support_ticket", {
    actor_profile_id: requester.id,
    request_id: crypto.randomUUID(),
    ticket_category_code: "technical_issue",
    message_body: `Synthetic phase 19 ${label} ${crypto.randomUUID()}`,
  }), `create ${label} ticket`);
  created.push(ticket.ticket_id);
  return ticket.ticket_id;
}
const reply = (ticketId, actor, body = "Synthetic phase 19 reply") => db.rpc("send_support_ticket_message", {
  target_ticket_id: ticketId, actor_profile_id: actor, request_id: crypto.randomUUID(), message_body: body,
});

try {
  // A new ticket starts submitted. Tickets have no owner: no assignment column or command exists.
  const countsBefore = await counts(admin.id);
  const ticketId = await newTicket(patient, "lifecycle");
  const initial = find(await adminList(admin.id), ticketId);
  assert.equal(initial.status_code, "submitted");
  assert.ok(!("assigned_to" in initial), "the admin queue carries no owner field");
  assert.equal((await counts(admin.id)).unread_tickets, countsBefore.unread_tickets + 1, "admins are notified of a new ticket");
  assert.deepEqual(Object.keys(await counts(admin.id)), ["unread_tickets"], "notification data is a single number");
  for (const removed of ["take_support_ticket", "release_support_ticket", "reassign_support_ticket", "list_support_handlers"]) {
    const { error } = await db.rpc(removed, { actor_profile_id: admin.id, target_ticket_id: ticketId });
    assert.ok(error, `${removed} no longer exists`);
  }

  // Only an admin may change status; patients and psychiatrists are refused and nothing changes.
  for (const requester of [patient, psychiatrist]) {
    await rejected(setStatus(ticketId, requester.id, "closed"), "support_ticket_not_permitted", "requester status change");
    await rejected(db.rpc("get_admin_support_tickets", { actor_profile_id: requester.id }), "support_ticket_not_permitted", "requester admin queue");
  }
  assert.equal(find(await adminList(admin.id), ticketId).status_code, "submitted", "refused commands changed nothing");

  // Another requester's ticket cannot be read or answered.
  await rejected(db.rpc("read_my_support_ticket", { target_ticket_id: ticketId, actor_profile_id: psychiatrist.id }), "support_ticket_not_permitted", "psychiatrist reads a patient's ticket");
  await rejected(reply(ticketId, psychiatrist.id), "support_ticket_not_permitted", "psychiatrist replies to a patient's ticket");

  // Allowed and disallowed status moves; bad reason codes are refused.
  await required(setStatus(ticketId, admin.id, "in_progress"), "start work");
  assert.equal(find(await myList(patient.id), ticketId).status_code, "in_progress", "the requester can read the status");
  await rejected(setStatus(ticketId, admin.id, "submitted"), "support_ticket_transition_not_allowed", "back to submitted");
  await required(setStatus(ticketId, admin.id, "awaiting_requester"), "awaiting requester");
  await rejected(setStatus(ticketId, admin.id, "closed", "not_a_reason"), "support_ticket_invalid_request", "bad reason code");
  await required(setStatus(ticketId, admin.id, "resolved", "requester_confirmed"), "resolve");

  // A requester reply on a resolved ticket is stored, does not change status, and flags the queue.
  await required(reply(ticketId, patient.id, "Synthetic reply after resolution"), "requester reply after resolution");
  const afterReply = find(await adminList(admin.id), ticketId);
  assert.equal(afterReply.status_code, "resolved", "a reply never changes status");
  assert.equal(afterReply.reply_after_resolution, true);

  // Reopen, then close: a closed ticket accepts no replies from anyone and can be reopened.
  await required(setStatus(ticketId, admin.id, "in_progress"), "reopen");
  await required(setStatus(ticketId, admin.id, "closed", "other"), "close");
  await rejected(reply(ticketId, patient.id), "support_ticket_closed", "requester reply on closed ticket");
  await rejected(reply(ticketId, admin.id), "support_ticket_closed", "admin reply on closed ticket");
  await required(setStatus(ticketId, admin.id, "in_progress"), "reopen closed ticket");

  // A disallowed jump from the start.
  const secondId = await newTicket(patient, "transitions");
  await rejected(setStatus(secondId, admin.id, "resolved"), "support_ticket_transition_not_allowed", "submitted straight to resolved");
  await required(setStatus(secondId, admin.id, "closed", "duplicate"), "close without starting work");

  // Notifications are a count and clear once the ticket is read, for both sides.
  const thirdId = await newTicket(patient, "notifications");
  const before = (await counts(patient.id)).unread_tickets;
  await required(reply(thirdId, admin.id, "Synthetic admin reply"), "admin reply");
  assert.equal((await counts(patient.id)).unread_tickets, before + 1, "requester is notified of the admin reply");
  assert.equal(find(await myList(patient.id), thirdId).has_unread_reply, true);
  await required(db.rpc("read_my_support_ticket", { target_ticket_id: thirdId, actor_profile_id: patient.id }), "requester reads ticket");
  assert.equal((await counts(patient.id)).unread_tickets, before, "reading clears the requester's notification");
  const adminBefore = (await counts(admin.id)).unread_tickets;
  await required(reply(thirdId, patient.id, "Synthetic requester reply"), "requester reply");
  assert.equal((await counts(admin.id)).unread_tickets, adminBefore + 1, "the admin side is notified of the requester reply");
  assert.equal(find(await adminList(admin.id), thirdId).has_unread_reply, true);

  // History records status changes only, is append-only, and holds no message content.
  const history = await required(db.from("support_ticket_history").select("*").eq("ticket_id", ticketId).order("created_at"), "load history");
  assert.ok(history.length >= 6, "every status change was recorded");
  assert.ok(history.every((row) => row.change_code === "status_changed"));
  assert.ok(history.every((row) => !("body" in row) && !("category_code" in row) && !("to_assignee" in row)), "history carries no content or owner");
  const { error: updateError } = await db.from("support_ticket_history").update({ reason_code: "other" }).eq("id", history[0].id);
  assert.match(updateError?.message ?? "", /permission denied|support_ticket_history_is_append_only/, "history rows cannot be edited");
  const { error: deleteError } = await db.from("support_ticket_history").delete().eq("id", history[0].id);
  assert.match(deleteError?.message ?? "", /permission denied/, "history rows cannot be deleted directly");
  const audit = await required(db.from("audit_events").select("event_code, metadata").eq("target_id", ticketId), "load audit");
  assert.ok(audit.some((row) => row.event_code === "support_ticket_status_changed"));
  const allowedMetadataKeys = new Set(["message_id", "from_status", "to_status"]);
  assert.ok(audit.every((row) => Object.keys(row.metadata ?? {}).every((metadataKey) => allowedMetadataKeys.has(metadataKey))), "audit metadata holds only IDs and status codes");

  console.log("Phase 19 support lifecycle database checks passed");
} finally {
  if (created.length) {
    await db.from("audit_events").delete().in("target_id", created);
    await db.from("support_ticket_reads").delete().in("ticket_id", created);
    await db.from("support_ticket_messages").delete().in("ticket_id", created);
    await db.from("support_tickets").delete().in("id", created);
  }
}
