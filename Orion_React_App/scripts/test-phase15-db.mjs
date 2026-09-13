import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

try { process.loadEnvFile(".env"); } catch (error) { if (error.code !== "ENOENT") throw error; }
const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Phase 15 database checks require SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env");

const db = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
async function required(query, label) {
  const { data, error } = await query;
  if (error) throw new Error(`${label}: ${error.message}`);
  return data;
}
async function latestTicket(ticketId, actorId, listFunction) {
  const tickets = await required(db.rpc(listFunction, { actor_profile_id: actorId }), `list tickets via ${listFunction}`);
  return tickets.find((ticket) => ticket.ticket_id === ticketId);
}

const [patient, psychiatrist, admin] = await Promise.all([
  required(db.from("profiles").select("id").eq("role", "patient").order("created_at").limit(1).single(), "load synthetic patient"),
  required(db.from("profiles").select("id").eq("role", "psychiatrist").order("created_at").limit(1).single(), "load synthetic psychiatrist"),
  required(db.from("profiles").select("id").eq("role", "admin").single(), "load synthetic admin"),
]);

const patientRequestId = crypto.randomUUID();
const patientSentinel = `Synthetic patient support request ${crypto.randomUUID()}`;
const adminSentinel = `Synthetic admin support reply ${crypto.randomUUID()}`;
const patientReplySentinel = `Synthetic patient support reply ${crypto.randomUUID()}`;
const psychiatristRequestId = crypto.randomUUID();
const psychiatristSentinel = `Synthetic psychiatrist support request ${crypto.randomUUID()}`;
const psychiatristReplySentinel = `Synthetic psychiatrist support reply ${crypto.randomUUID()}`;
let patientTicketId;
let psychiatristTicketId;
try {
  const createdPatientTicket = await required(db.rpc("create_support_ticket", {
    actor_profile_id: patient.id,
    request_id: patientRequestId,
    message_body: patientSentinel,
  }), "create patient support ticket");
  patientTicketId = createdPatientTicket[0].ticket_id;
  assert.equal(createdPatientTicket[0].status_code, "submitted");

  const retry = await required(db.rpc("create_support_ticket", {
    actor_profile_id: patient.id,
    request_id: patientRequestId,
    message_body: "A retry must not create a second ticket",
  }), "retry patient support ticket");
  assert.equal(retry[0].ticket_id, patientTicketId);

  const ownMessages = await required(db.rpc("read_my_support_ticket", { target_ticket_id: patientTicketId, actor_profile_id: patient.id }), "read patient ticket");
  assert.equal(ownMessages.length, 1);
  assert.equal(ownMessages[0].body, patientSentinel);
  const initialPatientTicket = await latestTicket(patientTicketId, patient.id, "get_my_support_tickets");
  assert.equal(initialPatientTicket.has_unread_reply, false);

  const adminReply = await required(db.rpc("send_support_ticket_message", {
    target_ticket_id: patientTicketId,
    actor_profile_id: admin.id,
    request_id: crypto.randomUUID(),
    message_body: adminSentinel,
  }), "send admin support reply");
  assert.equal(adminReply[0].body, adminSentinel);
  assert.equal((await latestTicket(patientTicketId, patient.id, "get_my_support_tickets")).has_unread_reply, true);

  const patientMessagesAfterReply = await required(db.rpc("read_my_support_ticket", { target_ticket_id: patientTicketId, actor_profile_id: patient.id }), "read admin reply as patient");
  assert.equal(patientMessagesAfterReply.some((message) => message.body === adminSentinel), true);
  assert.equal((await latestTicket(patientTicketId, patient.id, "get_my_support_tickets")).has_unread_reply, false);

  const patientReply = await required(db.rpc("send_support_ticket_message", {
    target_ticket_id: patientTicketId,
    actor_profile_id: patient.id,
    request_id: crypto.randomUUID(),
    message_body: patientReplySentinel,
  }), "send patient support reply");
  assert.equal(patientReply[0].body, patientReplySentinel);
  assert.equal((await latestTicket(patientTicketId, admin.id, "get_admin_support_tickets")).has_unread_reply, true);

  const adminMessagesAfterReply = await required(db.rpc("read_admin_support_ticket", { target_ticket_id: patientTicketId, actor_profile_id: admin.id }), "read patient reply as admin");
  assert.equal(adminMessagesAfterReply.some((message) => message.body === patientReplySentinel), true);
  assert.equal((await latestTicket(patientTicketId, admin.id, "get_admin_support_tickets")).has_unread_reply, false);

  const createdPsychiatristTicket = await required(db.rpc("create_support_ticket", {
    actor_profile_id: psychiatrist.id,
    request_id: psychiatristRequestId,
    message_body: psychiatristSentinel,
  }), "create psychiatrist support ticket");
  psychiatristTicketId = createdPsychiatristTicket[0].ticket_id;
  const psychiatristOwnTickets = await required(db.rpc("get_my_support_tickets", { actor_profile_id: psychiatrist.id }), "list psychiatrist tickets");
  assert.equal(psychiatristOwnTickets.some((ticket) => ticket.ticket_id === psychiatristTicketId), true);
  assert.equal((await required(db.rpc("get_admin_support_tickets", { actor_profile_id: admin.id }), "list admin tickets")).some((ticket) => ticket.ticket_id === psychiatristTicketId), true);

  await required(db.rpc("send_support_ticket_message", {
    target_ticket_id: psychiatristTicketId,
    actor_profile_id: admin.id,
    request_id: crypto.randomUUID(),
    message_body: psychiatristReplySentinel,
  }), "send psychiatrist support reply");
  assert.equal((await latestTicket(psychiatristTicketId, psychiatrist.id, "get_my_support_tickets")).has_unread_reply, true);
  const psychiatristMessages = await required(db.rpc("read_my_support_ticket", { target_ticket_id: psychiatristTicketId, actor_profile_id: psychiatrist.id }), "read admin reply as psychiatrist");
  assert.equal(psychiatristMessages.some((message) => message.body === psychiatristReplySentinel), true);

  const audit = await required(db.from("audit_events").select("event_code, metadata").in("target_id", [patientTicketId, psychiatristTicketId]), "inspect support audit");
  assert.ok(audit.some((event) => event.event_code === "support_ticket_created"));
  assert.ok(audit.some((event) => event.event_code === "support_ticket_message_created"));
  assert.ok(audit.every((event) => JSON.stringify(event.metadata || {}).includes("Synthetic") === false));
  console.log("Phase 15 database checks passed: patient/psychiatrist participation, cross-role replies, unread state, ownership, audit redaction, and idempotent creation.");
} finally {
  const ticketIds = [patientTicketId, psychiatristTicketId].filter(Boolean);
  if (ticketIds.length) {
    await db.from("audit_events").delete().in("target_id", ticketIds);
    await db.from("support_ticket_reads").delete().in("ticket_id", ticketIds);
    await db.from("support_ticket_messages").delete().in("ticket_id", ticketIds);
    await db.from("support_tickets").delete().in("id", ticketIds);
  }
}
