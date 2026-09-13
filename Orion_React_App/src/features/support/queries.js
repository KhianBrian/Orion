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
  return data?.messages ?? [];
}

export async function createSupportTicket(body) {
  return invoke({ action: "create", body, idempotencyKey: crypto.randomUUID() });
}

export async function sendSupportTicketMessage({ ticketId, body }) {
  return invoke({ action: "reply", ticketId, body, idempotencyKey: crypto.randomUUID() });
}
