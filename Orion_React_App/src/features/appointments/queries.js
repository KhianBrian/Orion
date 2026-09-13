import { supabase } from "../../lib/supabase";

export const appointmentQueryKey = (accountId) => ["appointments", accountId];
export const openAvailabilityQueryKey = ["availability", "open"];
export const rescheduleRequestQueryKey = (accountId) => ["reschedule-requests", accountId];
export const sessionNotesQueryKey = (accountId) => ["session-notes", accountId];

export async function fetchAppointments() {
  const { data, error } = await supabase.rpc("get_my_appointments_detailed");

  if (error) throw error;
  return data || [];
}

export async function fetchAdminAppointments() {
  const { data, error } = await supabase.rpc("get_admin_appointments");
  if (error) throw error;
  return data || [];
}

export async function fetchRescheduleRequests() {
  const { data, error } = await supabase.functions.invoke("review-appointment-reschedule", { body: { action: "list" } });
  if (error) throw error;
  return data?.requests || [];
}

export async function fetchSessionNoteIndex() {
  const { data, error } = await supabase.functions.invoke("session-note", { body: { action: "index" } });
  if (error) throw error;
  return data?.notes || [];
}

export async function fetchOpenAvailability() {
  const { data, error } = await supabase
    .from("availability_slots")
    .select("id, starts_at, ends_at, psychiatrist:psychiatrists!availability_slots_psychiatrist_id_fkey(display_name)")
    .eq("status", "open")
    .gt("starts_at", new Date().toISOString())
    .order("starts_at", { ascending: true });

  if (error) throw error;
  return data || [];
}
