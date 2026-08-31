import { APP_ROLES } from "./roles";

export const ROUTES = Object.freeze({
  ADMINISTRATION: "/dashboard",
  APP: "/app",
  APPOINTMENTS: "/appointments",
  BOOKING: "/patient-appointment",
  LOGIN: "/login",
});

export const SUBJECTS = Object.freeze({
  ACCOUNT: "account",
  APPOINTMENTS: "appointments",
  ADMINISTRATION: "administration",
  BOOKING: "booking",
});

export const ROLE_NAVIGATION = Object.freeze({
  [APP_ROLES.PATIENT]: [
    { label: "Book an appointment", path: ROUTES.BOOKING, subject: SUBJECTS.BOOKING },
    { label: "My appointments", path: ROUTES.APPOINTMENTS, subject: SUBJECTS.APPOINTMENTS },
  ],
  [APP_ROLES.PSYCHIATRIST]: [{ label: "My appointments", path: ROUTES.APPOINTMENTS, subject: SUBJECTS.APPOINTMENTS }],
  [APP_ROLES.ADMIN]: [{ label: "Administration", path: ROUTES.ADMINISTRATION, subject: SUBJECTS.ADMINISTRATION }],
});

export function getRoleNavigation(role) {
  return ROLE_NAVIGATION[role] || [];
}
