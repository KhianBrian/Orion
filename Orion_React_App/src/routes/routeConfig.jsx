import Layout from "../components/Layout";
import Home from "../pages/Home";
import About from "../pages/About";
import Login from "../pages/Login";
import ForgotPassword from "../pages/ForgotPassword";
import NotFound from "../pages/NotFound";
import MarketingPage from "../pages/MarketingPage";
import AccountHome from "../pages/AccountHome";
import FeaturePlaceholder from "../pages/FeaturePlaceholder";
import Appointments from "../pages/Appointments";
import PatientAppointment from "../pages/PatientAppointment";
import DemoMeeting from "../pages/DemoMeeting";
import { RequireAbility, RequireAuth } from "../features/auth/RouteGuards";
import { AuthenticatedShell } from "../features/auth/AuthenticatedShell";
import { ROUTES, SUBJECTS } from "../constants/routes";

const protectedFeatureRoutes = [
  { path: ROUTES.ADMINISTRATION.slice(1), subject: SUBJECTS.ADMINISTRATION, title: "Administration" },
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
    path: "forgot-password",
    element: <ForgotPassword />,
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
      {
        element: <RequireAuth />,
        children: [
          {
            element: <AuthenticatedShell />,
            children: [
              { path: ROUTES.APP.slice(1), element: <AccountHome /> },
              {
                element: <RequireAbility action="visit" subject={SUBJECTS.BOOKING} />,
                children: [{ path: ROUTES.BOOKING.slice(1), element: <PatientAppointment /> }],
              },
              {
                element: <RequireAbility action="visit" subject={SUBJECTS.APPOINTMENTS} />,
                children: [
                  { path: ROUTES.APPOINTMENTS.slice(1), element: <Appointments /> },
                  { path: ROUTES.DEMO_MEETING.slice(1), element: <DemoMeeting /> },
                ],
              },
              ...protectedFeatureRoutes.map(({ path, subject, title }) => ({
                element: <RequireAbility action="visit" subject={subject} />,
                children: [{ path, element: <FeaturePlaceholder title={title} /> }],
              })),
            ],
          },
        ],
      },
    ],
  },
  {
    path: "*",
    element: <NotFound />,
  },
];
