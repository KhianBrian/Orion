import { supabase } from "../../lib/supabase";

export const appointmentQueryKey = (accountId) => ["appointments", accountId];
export const openAvailabilityQueryKey = ["availability", "open"];

export async function fetchAppointments() {
  const { data, error } = await supabase.rpc("get_my_appointments");

  if (error) throw error;
  return data || [];
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
