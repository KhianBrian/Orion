import { supabase } from "../../lib/supabase";

export const appointmentQueryKey = (accountId) => ["appointments", accountId];
export const upcomingAppointmentsQueryKey = (accountId) => ["appointments", accountId, "upcoming"];
export const appointmentCountsQueryKey = (accountId) => ["appointments", accountId, "counts"];
export const historyQueryKey = (accountId, args) => ["appointments", accountId, "history", args];
export const careJournalQueryKey = (accountId) => ["appointments", accountId, "care-journal"];
export const todayAwaitingOutcomeQueryKey = (accountId, day) => ["appointments", accountId, "today-awaiting-outcome", day];
export const rescheduleRequestQueryKey = (accountId) => ["reschedule-requests", accountId];
export const sessionNotesQueryKey = (accountId) => ["session-notes", accountId];
export const psychiatristsQueryKey = ["psychiatrists", "active"];
export const patientAvailabilityQueryKey = (psychiatristId, localDate) => ["availability", psychiatristId, localDate];

export async function fetchAppointments() {
  const { data, error } = await supabase.rpc("get_my_appointments_detailed");

  if (error) throw error;
  return data || [];
}

export async function fetchUpcomingAppointments() {
  const { data, error } = await supabase.rpc("get_my_upcoming_appointments");
  if (error) throw error;
  return data || [];
}

export async function fetchAppointmentCounts() {
  const { data, error } = await supabase.rpc("get_my_appointment_counts");
  if (error) throw error;
  const row = data?.[0];
  return { upcoming: Number(row?.upcoming_count || 0), history: Number(row?.history_count || 0) };
}

// One page of history, newest first. `cursor` is the last row already shown ({ startsAt, id }) or null for the first page.
export async function fetchHistoryPage({ args, cursor, pageSize }) {
  const { data, error } = await supabase.rpc("get_my_appointment_history_page", {
    search_text: args.searchText || null,
    from_date: args.fromDate || null,
    to_date: args.toDate || null,
    status_filter: args.status || null,
    cursor_starts_at: cursor?.startsAt ?? null,
    cursor_id: cursor?.id ?? null,
    page_size: pageSize,
  });
  if (error) throw error;
  const rows = data || [];
  return { rows, total: rows.length ? Number(rows[0].total_count) : 0 };
}

// The four most recent completed sessions plus the total number of completed sessions (patient home).
export function fetchCareJournal() {
  return fetchHistoryPage({ args: { searchText: "", fromDate: "", toDate: "", status: "completed" }, cursor: null, pageSize: 4 });
}

// Sessions from one Manila day that are still marked booked after they ended and need an outcome (psychiatrist home).
export function fetchAwaitingOutcomeOn(day) {
  return fetchHistoryPage({ args: { searchText: "", fromDate: day, toDate: day, status: "booked" }, cursor: null, pageSize: 50 });
}

export async function fetchAdminAppointments() {
  const { data, error } = await supabase.rpc("get_admin_appointments");
  if (error) throw error;
  return data || [];
}

export async function fetchAdminSchedules() {
  const { data, error } = await supabase.functions.invoke("manage-schedule", { body: { action: "admin-list" } });
  if (error) throw error;
  return data?.schedule || [];
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
