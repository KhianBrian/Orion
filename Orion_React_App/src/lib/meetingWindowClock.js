import { DEMO_EARLY_JOIN_MILLISECONDS } from "./appointmentTiming.js";

export function nextMeetingWindowBoundary(appointments, now = Date.now()) {
  const boundaries = appointments.flatMap((appointment) => {
    if (appointment.status !== "booked") return [];

    return [
      new Date(appointment.starts_at).getTime() - DEMO_EARLY_JOIN_MILLISECONDS,
      new Date(appointment.ends_at).getTime(),
    ].filter((boundary) => Number.isFinite(boundary) && boundary > now);
  });

  return boundaries.length ? Math.min(...boundaries) : null;
}
