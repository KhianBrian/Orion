import { APP_ROLES } from "./roles";

export const ROUTES = Object.freeze({
  ADMINISTRATION: "/dashboard",
  APP: "/app",
  AVAILABILITY: "/doctor-availability",
  BOOKING: "/patient-appointment",
  LOGIN: "/login",
});

export const SUBJECTS = Object.freeze({
  ACCOUNT: "account",
  ADMINISTRATION: "administration",
  AVAILABILITY: "availability",
  BOOKING: "booking",
});

export const ROLE_NAVIGATION = Object.freeze({
  [APP_ROLES.PATIENT]: [{ label: "Book an appointment", path: ROUTES.BOOKING, subject: SUBJECTS.BOOKING }],
  [APP_ROLES.PSYCHIATRIST]: [{ label: "Manage availability", path: ROUTES.AVAILABILITY, subject: SUBJECTS.AVAILABILITY }],
  [APP_ROLES.ADMIN]: [{ label: "Administration", path: ROUTES.ADMINISTRATION, subject: SUBJECTS.ADMINISTRATION }],
});

export function getRoleNavigation(role) {
  return ROLE_NAVIGATION[role] || [];
}
