import { supabase } from "../../lib/supabase";

export async function cancelAppointment({ appointmentId, idempotencyKey }) {
  const { error } = await supabase.functions.invoke("cancel-appointment", {
    body: { appointmentId, idempotencyKey },
  });

  if (error) throw error;
}

async function invoke(name, body) {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) throw error;
  return data;
}

export const cancellationReasons = [
  { value: "psychiatrist_unavailable", label: "Psychiatrist unavailable" },
  { value: "psychiatrist_emergency", label: "Psychiatrist emergency" },
  { value: "technical_problem", label: "Technical problem" },
  { value: "safety_or_clinical_direction", label: "Safety or clinical direction" },
  { value: "scheduling_or_administrative_error", label: "Scheduling or administrative error" },
  { value: "other_operational_reason", label: "Other approved operational reason" },
];

export function cancelPsychiatristAppointment(values) {
  return invoke("cancel-psychiatrist-appointment", values);
}

export function cancelAdminAppointment(values) {
  return invoke("cancel-admin-appointment", values);
}

export function requestReschedule(values) {
  return invoke("request-appointment-reschedule", values);
}

export function reviewReschedule(values) {
  return invoke("review-appointment-reschedule", values);
}

export function recordOutcome(values) {
  return invoke("appointment-outcome", values);
}

export function correctOutcome(values) {
  return invoke("correct-appointment-outcome", values);
}

export function saveBookingControl(values) {
  return invoke("booking-control", values);
}

export function saveSessionNote(values) {
  return invoke("session-note", { action: "create", ...values });
}

export function releaseSessionNote(noteId) {
  return invoke("session-note", { action: "release", noteId });
}

export function readSessionNote(noteId) {
  return invoke("session-note", { action: "read", noteId });
}

export async function appointmentErrorCode(error) {
  if (error?.context instanceof Response) {
    try {
      return (await error.context.json()).error;
    } catch {
      return undefined;
    }
  }

  return undefined;
}
