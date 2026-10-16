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
const lifecycle = (name, args) => db.rpc(name, args);

const [patient, psychiatrist] = await Promise.all([
  required(db.from("profiles").select("id").eq("role", "patient").order("created_at").limit(1).single(), "load synthetic patient"),
  required(db.from("profiles").select("id").eq("role", "psychiatrist").order("created_at").limit(1).single(), "load synthetic psychiatrist"),
]);
const admins = await required(db.from("profiles").select("id, full_name").eq("role", "admin").order("created_at"), "load synthetic admins");
assert.ok(admins.length >= 1, "at least one synthetic admin is required");
const [admin, secondAdmin] = admins;

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
  // New tickets start submitted and unassigned.
  const countsBefore = await counts(admin.id);
  const ticketId = await newTicket(patient, "lifecycle");
  const countsAfter = await counts(admin.id);
  assert.equal(countsAfter.unread_tickets, countsBefore.unread_tickets + 1);
  assert.equal(countsAfter.unassigned_tickets, countsBefore.unassigned_tickets + 1);
  assert.equal(countsAfter.attention_tickets, countsBefore.attention_tickets + 1, "a ticket that is both unread and unassigned counts once");
  const initial = find(await adminList(admin.id), ticketId);
  assert.equal(initial.status_code, "submitted");
  assert.equal(initial.assigned_to, null);
  assert.ok((await counts(admin.id)).unassigned_tickets >= 1, "admin sees the unassigned ticket in the count");
  assert.equal((await counts(patient.id)).unassigned_tickets, 0, "requesters never see the unassigned count");

  // Only an admin may use any lifecycle command; patients and psychiatrists are refused.
  for (const requester of [patient, psychiatrist]) {
    await rejected(lifecycle("take_support_ticket", { target_ticket_id: ticketId, actor_profile_id: requester.id }), "support_ticket_not_permitted", "requester take");
    await rejected(lifecycle("release_support_ticket", { target_ticket_id: ticketId, actor_profile_id: requester.id }), "support_ticket_not_permitted", "requester release");
    await rejected(lifecycle("set_support_ticket_status", { target_ticket_id: ticketId, actor_profile_id: requester.id, new_status: "closed", change_reason_code: null }), "support_ticket_not_permitted", "requester status change");
    await rejected(lifecycle("list_support_handlers", { actor_profile_id: requester.id }), "support_ticket_not_permitted", "requester handler list");
    await rejected(lifecycle("get_admin_support_tickets", { actor_profile_id: requester.id }), "support_ticket_not_permitted", "requester admin queue");
  }
  assert.equal(find(await adminList(admin.id), ticketId).status_code, "submitted", "refused commands changed nothing");

  // Another requester's ticket cannot be read or answered by a different requester.
  await rejected(db.rpc("read_my_support_ticket", { target_ticket_id: ticketId, actor_profile_id: psychiatrist.id }), "support_ticket_not_permitted", "psychiatrist reads a patient's ticket");
  await rejected(reply(ticketId, psychiatrist.id), "support_ticket_not_permitted", "psychiatrist replies to a patient's ticket");

  // Take: claims the ticket and starts work. Taking again is a no-op.
  const [taken] = await required(lifecycle("take_support_ticket", { target_ticket_id: ticketId, actor_profile_id: admin.id }), "take ticket");
  assert.equal(taken.out_status, "in_progress");
  assert.equal(taken.out_assigned_to, admin.id);
  await required(lifecycle("take_support_ticket", { target_ticket_id: ticketId, actor_profile_id: admin.id }), "take ticket again");
  const afterTake = find(await adminList(admin.id), ticketId);
  assert.equal(afterTake.assigned_to, admin.id);
  assert.equal(afterTake.assigned_to_display_name, admins[0].full_name);
  assert.equal(find(await myList(patient.id), ticketId).status_code, "in_progress", "requester can read the status");

  if (secondAdmin) {
    await rejected(lifecycle("take_support_ticket", { target_ticket_id: ticketId, actor_profile_id: secondAdmin.id }), "support_ticket_already_taken", "second admin take");
    const [moved] = await required(lifecycle("reassign_support_ticket", { target_ticket_id: ticketId, actor_profile_id: secondAdmin.id, new_assignee_id: secondAdmin.id }), "reassign ticket");
    assert.equal(moved.out_assigned_to, secondAdmin.id);
    await required(lifecycle("reassign_support_ticket", { target_ticket_id: ticketId, actor_profile_id: admin.id, new_assignee_id: admin.id }), "reassign back");
  } else {
    console.log("note: only one synthetic admin exists, so already-taken and reassignment between admins were not exercised");
  }
  await rejected(lifecycle("reassign_support_ticket", { target_ticket_id: ticketId, actor_profile_id: admin.id, new_assignee_id: patient.id }), "support_ticket_not_permitted", "reassign to a non-admin");

  // Status moves: allowed ones work, disallowed ones are refused, bad reasons are refused.
  await required(lifecycle("set_support_ticket_status", { target_ticket_id: ticketId, actor_profile_id: admin.id, new_status: "awaiting_requester", change_reason_code: null }), "awaiting requester");
  await rejected(lifecycle("set_support_ticket_status", { target_ticket_id: ticketId, actor_profile_id: admin.id, new_status: "closed", change_reason_code: "not_a_reason" }), "support_ticket_invalid_request", "bad reason code");
  await required(lifecycle("set_support_ticket_status", { target_ticket_id: ticketId, actor_profile_id: admin.id, new_status: "resolved", change_reason_code: "requester_confirmed" }), "resolve");

  // A requester reply on a resolved ticket is stored, does not change status, and flags the queue.
  await required(reply(ticketId, patient.id, "Synthetic reply after resolution"), "requester reply after resolution");
  const afterReply = find(await adminList(admin.id), ticketId);
  assert.equal(afterReply.status_code, "resolved", "a reply never changes status");
  assert.equal(afterReply.reply_after_resolution, true);

  // Reopen, then close: a closed ticket accepts no replies or takes, and can be reopened.
  await required(lifecycle("set_support_ticket_status", { target_ticket_id: ticketId, actor_profile_id: admin.id, new_status: "in_progress", change_reason_code: null }), "reopen");
  await required(lifecycle("set_support_ticket_status", { target_ticket_id: ticketId, actor_profile_id: admin.id, new_status: "closed", change_reason_code: "other" }), "close");
  await rejected(reply(ticketId, patient.id), "support_ticket_closed", "requester reply on closed ticket");
  await rejected(reply(ticketId, admin.id), "support_ticket_closed", "admin reply on closed ticket");
  await rejected(lifecycle("release_support_ticket", { target_ticket_id: ticketId, actor_profile_id: admin.id }), "support_ticket_closed", "release closed ticket");
  const [reopened] = await required(lifecycle("set_support_ticket_status", { target_ticket_id: ticketId, actor_profile_id: secondAdmin?.id ?? admin.id, new_status: "in_progress", change_reason_code: null }), "reopen closed ticket");
  assert.equal(reopened.out_assigned_to, secondAdmin?.id ?? admin.id, "the reopening admin becomes the handler");

  // Disallowed jump, and release behavior.
  const secondId = await newTicket(patient, "transitions");
  await rejected(lifecycle("set_support_ticket_status", { target_ticket_id: secondId, actor_profile_id: admin.id, new_status: "resolved", change_reason_code: null }), "support_ticket_transition_not_allowed", "submitted straight to resolved");
  await required(lifecycle("take_support_ticket", { target_ticket_id: secondId, actor_profile_id: admin.id }), "take second");
  await rejected(lifecycle("set_support_ticket_status", { target_ticket_id: secondId, actor_profile_id: admin.id, new_status: "submitted", change_reason_code: null }), "support_ticket_transition_not_allowed", "set back to submitted");
  const [released] = await required(lifecycle("release_support_ticket", { target_ticket_id: secondId, actor_profile_id: admin.id }), "release in-progress ticket");
  assert.equal(released.out_status, "submitted");
  assert.equal(released.out_assigned_to, null);
  await required(lifecycle("take_support_ticket", { target_ticket_id: secondId, actor_profile_id: admin.id }), "take again");
  await required(lifecycle("set_support_ticket_status", { target_ticket_id: secondId, actor_profile_id: admin.id, new_status: "awaiting_requester", change_reason_code: null }), "awaiting");
  const unassignedBeforeRelease = (await counts(admin.id)).unassigned_tickets;
  const [releasedAwaiting] = await required(lifecycle("release_support_ticket", { target_ticket_id: secondId, actor_profile_id: admin.id }), "release awaiting ticket");
  assert.equal(releasedAwaiting.out_status, "awaiting_requester", "release keeps a non-working status");
  assert.equal((await counts(admin.id)).unassigned_tickets, unassignedBeforeRelease + 1, "an unowned awaiting ticket is counted as unassigned");

  // Notifications are counts only and clear once the ticket is read.
  const thirdId = await newTicket(patient, "notifications");
  const before = (await counts(patient.id)).unread_tickets;
  await required(reply(thirdId, admin.id, "Synthetic admin reply"), "admin reply");
  assert.equal((await counts(patient.id)).unread_tickets, before + 1, "requester is notified of the admin reply");
  assert.equal(find(await myList(patient.id), thirdId).has_unread_reply, true);
  await required(db.rpc("read_my_support_ticket", { target_ticket_id: thirdId, actor_profile_id: patient.id }), "requester reads ticket");
  assert.equal((await counts(patient.id)).unread_tickets, before, "reading clears the notification");
  const adminBefore = (await counts(admin.id)).unread_tickets;
  await required(reply(thirdId, patient.id, "Synthetic requester reply"), "requester reply");
  assert.equal((await counts(admin.id)).unread_tickets, adminBefore + 1, "admin side is notified of the requester reply");
  assert.deepEqual(Object.keys((await required(db.rpc("get_support_notification_counts", { actor_profile_id: admin.id }), "count shape"))[0]).sort(), ["attention_tickets", "unassigned_tickets", "unread_tickets"], "notification data carries counts only");

  // History is append-only and holds no message content.
  const history = await required(db.from("support_ticket_history").select("*").eq("ticket_id", ticketId).order("created_at"), "load history");
  assert.ok(history.length >= 6, "every change was recorded");
  assert.ok(history.every((row) => !("body" in row) && !("category_code" in row)), "history carries no content");
  // The service role holds no update or delete privilege on history, so the database refuses both
  // before the append-only trigger (a second guard for owner roles) is reached.
  const { error: updateError } = await db.from("support_ticket_history").update({ change_code: "taken" }).eq("id", history[0].id);
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
