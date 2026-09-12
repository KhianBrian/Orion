import { supabase } from "../../lib/supabase";

export const appointmentQueryKey = (accountId) => ["appointments", accountId];
export const rescheduleRequestQueryKey = (accountId) => ["reschedule-requests", accountId];
export const sessionNotesQueryKey = (accountId) => ["session-notes", accountId];
export const psychiatristsQueryKey = ["psychiatrists", "active"];
export const patientAvailabilityQueryKey = (psychiatristId, localDate) => ["availability", psychiatristId, localDate];

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

export async function fetchActivePsychiatrists() {
  const { data, error } = await supabase.from("psychiatrists").select("id, display_name").eq("is_active", true).order("display_name");
  if (error) throw error;
  return data || [];
}

export async function fetchPatientAvailability({ queryKey }) {
  const [, psychiatristId, localDate] = queryKey;
  const { data, error } = await supabase.rpc("get_patient_availability", { target_psychiatrist_id: psychiatristId, target_date: localDate });
  if (error) throw error;
  return data || [];
}
