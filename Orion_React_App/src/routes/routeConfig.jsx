import { lazy } from "react";
import Layout from "../components/Layout";
import Home from "../pages/Home";
import About from "../pages/About";
import Login from "../pages/Login";
import Register from "../pages/Register";
import ForgotPassword from "../pages/ForgotPassword";
import ResetPassword from "../pages/ResetPassword";
import ConfirmEmail from "../pages/ConfirmEmail";
import NotFound from "../pages/NotFound";
import MarketingPage from "../pages/MarketingPage";
import AccountHome from "../pages/AccountHome";
import Appointments from "../pages/Appointments";
import PatientAppointment from "../pages/PatientAppointment";
import { RequireAbility, RequireAuth } from "../features/auth/RouteGuards";
import { AuthenticatedShell } from "../features/auth/AuthenticatedShell";
import { ROUTES, SUBJECTS } from "../constants/routes";

// Lazy-loaded: pulls in the Jitsi video SDK, which non-meeting routes should never download.
const DemoMeeting = lazy(() => import("../pages/DemoMeeting"));
// Lazy-loaded: admin-only, not needed in the everyday patient/psychiatrist bundle.
const ProvisionPsychiatrist = lazy(() => import("../features/admin/ProvisionPsychiatrist"));

const protectedFeatureRoutes = [
  { path: ROUTES.ADMINISTRATION.slice(1), subject: SUBJECTS.ADMINISTRATION, element: <ProvisionPsychiatrist /> },
];

const authenticatedAppRoutes = [
  { path: ROUTES.APP.slice(1), element: <AccountHome /> },
  { element: <RequireAbility action="visit" subject={SUBJECTS.BOOKING} />, children: [{ path: ROUTES.BOOKING.slice(1), element: <PatientAppointment /> }] },
  { element: <RequireAbility action="visit" subject={SUBJECTS.APPOINTMENTS} />, children: [{ path: ROUTES.APPOINTMENTS.slice(1), element: <Appointments /> }] },
  ...protectedFeatureRoutes.map(({ path, subject, element }) => ({ element: <RequireAbility action="visit" subject={subject} />, children: [{ path, element }] })),
];

export const routeConfig = [
  {
    path: "/",
    element: <Login />,
  },
  {
    path: "login",
    element: <Login />,
  },
  {
    path: "register",
    element: <Register />,
  },
  {
    path: "forgot-password",
    element: <ForgotPassword />,
  },
  {
    path: "reset-password",
    element: <ResetPassword />,
  },
  {
    path: "confirm-email",
    element: <ConfirmEmail />,
  },
  {
    path: "auth/confirm",
    element: <ConfirmEmail />,
  },
  {
    element: <Layout />,
    children: [
      {
        path: "home",
        element: <Home />,
      },
      {
        path: "about",
        element: <About />,
      },
      { path: "contact", element: <MarketingPage type="contact" /> },
      { path: "services", element: <MarketingPage type="services" /> },
      { path: "portfolio", element: <MarketingPage type="portfolio" /> },
      { path: "blog", element: <MarketingPage type="blog" /> },
    ],
  },
  { element: <RequireAuth />, children: [
    { element: <AuthenticatedShell />, children: authenticatedAppRoutes },
    { element: <RequireAbility action="visit" subject={SUBJECTS.APPOINTMENTS} />, children: [{ path: ROUTES.DEMO_MEETING.slice(1), element: <DemoMeeting /> }] },
  ] },
  {
    path: "*",
    element: <NotFound />,
  },
];
