import { supabase } from "../../lib/supabase";

export const supportTicketsQueryKey = (accountId) => ["support-tickets", accountId];
export const supportTicketQueryKey = (accountId, ticketId) => ["support-ticket", accountId, ticketId];

async function invoke(body) {
  const { data, error } = await supabase.functions.invoke("support-tickets", { body });
  if (error) throw error;
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
