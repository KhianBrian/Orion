export const APPOINTMENT_DURATION_MILLISECONDS = 45 * 60 * 1000;
export const PATIENT_CANCELLATION_NOTICE_MILLISECONDS = 24 * 60 * 60 * 1000;
export const DEMO_EARLY_JOIN_MILLISECONDS = 15 * 60 * 1000;

export function deriveAppointmentEnd(startsAt) {
  return new Date(new Date(startsAt).getTime() + APPOINTMENT_DURATION_MILLISECONDS);
}

export function canPatientCancel(startsAt, now = new Date()) {
  return new Date(startsAt).getTime() > new Date(now).getTime() + PATIENT_CANCELLATION_NOTICE_MILLISECONDS;
}

export function isInDemoMeetingWindow(startsAt, endsAt, now = new Date()) {
  const currentTime = new Date(now).getTime();
  return currentTime >= new Date(startsAt).getTime() - DEMO_EARLY_JOIN_MILLISECONDS
    && currentTime < new Date(endsAt).getTime();
}
