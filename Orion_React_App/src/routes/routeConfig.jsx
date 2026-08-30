import Layout from "../components/Layout";
import Home from "../pages/Home";
import About from "../pages/About";
import Login from "../pages/Login";
import ForgotPassword from "../pages/ForgotPassword";
import NotFound from "../pages/NotFound";
import MarketingPage from "../pages/MarketingPage";
import AccountHome from "../pages/AccountHome";
import FeaturePlaceholder from "../pages/FeaturePlaceholder";
import { RequireAbility, RequireAuth } from "../features/auth/RouteGuards";
import { ROUTES, SUBJECTS } from "../constants/routes";

const protectedFeatureRoutes = [
  { path: ROUTES.BOOKING.slice(1), subject: SUBJECTS.BOOKING, title: "Appointment booking" },
  { path: ROUTES.AVAILABILITY.slice(1), subject: SUBJECTS.AVAILABILITY, title: "Availability management" },
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
          { path: ROUTES.APP.slice(1), element: <AccountHome /> },
          ...protectedFeatureRoutes.map(({ path, subject, title }) => ({
            element: <RequireAbility action="visit" subject={subject} />,
            children: [{ path, element: <FeaturePlaceholder title={title} /> }],
          })),
        ],
      },
    ],
  },
  {
    path: "*",
    element: <NotFound />,
  },
];
