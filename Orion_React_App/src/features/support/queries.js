import { supabase } from "../../lib/supabase";

export const supportTicketsQueryKey = (accountId) => ["support-tickets", accountId];
export const supportTicketQueryKey = (accountId, ticketId) => ["support-ticket", accountId, ticketId];
export const supportNotificationsQueryKey = (accountId) => ["support-notifications", accountId];
export const supportRecentCallsQueryKey = (accountId) => ["support-recent-calls", accountId];

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

// Opens the ticket first, then uploads any attachments. Once the ticket exists it counts as submitted:
// an attachment failure is reported on the result (attachmentFailed) and never thrown, so a retry cannot
// create a second ticket.
export async function createSupportTicket({ categoryCode, body, files = [], relatedCallId }) {
  const created = await invoke({ action: "create", categoryCode, body, relatedCallId: relatedCallId || undefined, idempotencyKey: crypto.randomUUID() });
  const ticketId = created?.ticket?.ticket_id;
  if (!ticketId || !files.length) return created;

  try {
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
  } catch (error) {
    return { ...created, attachmentFailed: true, attachmentErrorCode: error?.code };
  }
  return created;
}

export async function sendSupportTicketMessage({ ticketId, body }) {
  return invoke({ action: "reply", ticketId, body, idempotencyKey: crypto.randomUUID() });
}

export async function fetchSupportNotifications() {
  const data = await invoke({ action: "notifications" });
  return { unreadTickets: data?.unreadTickets ?? 0 };
}

export async function setSupportTicketStatus({ ticketId, status, reasonCode }) {
  return invoke({ action: "set-status", ticketId, status, reasonCode });
}

export async function fetchRecentCalls() {
  const data = await invoke({ action: "recent-calls" });
  return data?.calls ?? [];
}
