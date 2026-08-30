import Layout from "../components/Layout";
import Home from "../pages/Home";
import About from "../pages/About";
import Dashboard from "../pages/Dashboard";
import Profile from "../pages/Profile";
import ProfileSettings from "../pages/ProfileSettings";
import Appointments from "../pages/Appointments";
import Sessions from "../pages/Sessions";
import Settings from "../pages/Settings";
import SubmitBlog from "../pages/SubmitBlog";
import Login from "../pages/Login";
import ForgotPassword from "../pages/ForgotPassword";
import NotFound from "../pages/NotFound";
import DoctorAvailability from "../pages/DoctorAvailability";
import PatientAppointment from "../pages/PatientAppointment";
import MarketingPage from "../pages/MarketingPage";

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
        path: "appointments",
        element: <Appointments />,
      },
      {
        path: "doctor-availability",
        element: <DoctorAvailability />,
      },
      {
        path: "patient-appointment",
        element: <PatientAppointment />,
      },
      {
        path: "sessions",
        element: <Sessions />,
      },
      {
        path: "settings",
        element: <Settings />,
      },
      {
        path: "submit-blog",
        element: <SubmitBlog />,
      },
      {
        path: "dashboard",
        element: <Dashboard />,
      },
      {
        path: "profile",
        children: [
          {
            index: true,
            element: <Profile />,
          },
          {
            path: "abs",
            element: <ProfileSettings />,
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
