import { APP_ROLES } from "./roles";

export const ROUTES = Object.freeze({
  ADMINISTRATION: "/dashboard",
  APP: "/app",
  APPOINTMENTS: "/appointments",
  ADMIN_APPOINTMENTS: "/admin-appointments",
  ADMIN_SCHEDULES: "/admin-schedules",
  SCHEDULE: "/schedule",
  DEMO_MEETING: "/appointments/:appointmentId/meeting",
  DIRECT_MEETING: "/appointments/:appointmentId/direct-meeting",
  BOOKING: "/patient-appointment",
  SUPPORT: "/support",
  LOGIN: "/login",
});

export const SUBJECTS = Object.freeze({
  ACCOUNT: "account",
  APPOINTMENTS: "appointments",
  ADMINISTRATION: "administration",
  BOOKING: "booking",
  ADMIN_APPOINTMENTS: "admin-appointments",
  ADMIN_SCHEDULES: "admin-schedules",
  SCHEDULE: "schedule",
  SUPPORT: "support",
});

export const ROLE_NAVIGATION = Object.freeze({
  [APP_ROLES.PATIENT]: [
    { label: "Book an appointment", path: ROUTES.BOOKING, subject: SUBJECTS.BOOKING },
    { label: "My appointments", path: ROUTES.APPOINTMENTS, subject: SUBJECTS.APPOINTMENTS },
    { label: "Support", path: ROUTES.SUPPORT, subject: SUBJECTS.SUPPORT },
  ],
  [APP_ROLES.PSYCHIATRIST]: [{ label: "My appointments", path: ROUTES.APPOINTMENTS, subject: SUBJECTS.APPOINTMENTS }, { label: "My schedule", path: ROUTES.SCHEDULE, subject: SUBJECTS.SCHEDULE }, { label: "Support", path: ROUTES.SUPPORT, subject: SUBJECTS.SUPPORT }],
  [APP_ROLES.ADMIN]: [
    { label: "Appointment operations", path: ROUTES.ADMIN_APPOINTMENTS, subject: SUBJECTS.ADMIN_APPOINTMENTS },
    { label: "Psychiatrist schedules", path: ROUTES.ADMIN_SCHEDULES, subject: SUBJECTS.ADMIN_SCHEDULES },
    { label: "Support queue", path: ROUTES.SUPPORT, subject: SUBJECTS.SUPPORT },
    { label: "Administration", path: ROUTES.ADMINISTRATION, subject: SUBJECTS.ADMINISTRATION },
  ],
});

export function getRoleNavigation(role) {
  return ROLE_NAVIGATION[role] || [];
}
