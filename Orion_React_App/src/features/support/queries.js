import { supabase } from "../../lib/supabase";

export const supportTicketsQueryKey = (accountId) => ["support-tickets", accountId];
export const supportTicketQueryKey = (accountId, ticketId) => ["support-ticket", accountId, ticketId];
export const supportNotificationsQueryKey = (accountId) => ["support-notifications", accountId];
export const supportHandlersQueryKey = (accountId) => ["support-handlers", accountId];

// A failed function call carries its generic error code in the response body. Attach it so callers
// can show a specific message without ever seeing ticket content.
async function invoke(body) {
  const { data, error } = await supabase.functions.invoke("support-tickets", { body });
  if (error) {
    const details = await error.context?.json?.().catch(() => null);
    if (details?.error) error.code = details.error;
    throw error;
  }
  return data;
}

export async function fetchSupportTickets() {
  const data = await invoke({ action: "list" });
  return { tickets: data?.tickets ?? [], role: data?.role };
}

export async function fetchSupportTicket({ queryKey }) {
  const ticketId = queryKey[2];
  const data = await invoke({ action: "read", ticketId });
  return { messages: data?.messages ?? [], attachments: data?.attachments ?? [] };
}

export async function createSupportTicket({ categoryCode, body, files = [] }) {
  const created = await invoke({ action: "create", categoryCode, body, idempotencyKey: crypto.randomUUID() });
  const ticketId = created?.ticket?.ticket_id;
  if (!ticketId || !files.length) return created;

  for (const file of files) {
    const prepared = await invoke({
      action: "prepare-upload",
      ticketId,
      fileName: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
    });
    const { error: uploadError } = await supabase.storage
      .from("support-attachments")
      .uploadToSignedUrl(prepared.path, prepared.token, file);
    if (uploadError) throw uploadError;
    await invoke({
      action: "register-attachment",
      ticketId,
      path: prepared.path,
      fileName: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
    });
  }
  return created;
}

export async function sendSupportTicketMessage({ ticketId, body }) {
  return invoke({ action: "reply", ticketId, body, idempotencyKey: crypto.randomUUID() });
}

export async function fetchSupportNotifications() {
  const data = await invoke({ action: "notifications" });
  return { unreadTickets: data?.unreadTickets ?? 0, unassignedTickets: data?.unassignedTickets ?? 0, attentionTickets: data?.attentionTickets ?? 0 };
}

export async function fetchSupportHandlers() {
  const data = await invoke({ action: "handlers" });
  return data?.handlers ?? [];
}

export async function runSupportLifecycleAction({ action, ticketId, assigneeId, status, reasonCode }) {
  return invoke({ action, ticketId, assigneeId, status, reasonCode });
}
