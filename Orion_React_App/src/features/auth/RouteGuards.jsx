import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./authContext";

function AccessState({ message }) {
  return <main className="marketing-page"><h1>Access unavailable</h1><p className="marketing-lead">{message}</p></main>;
}

export function RequireAuth() {
  const { status, error } = useAuth();
  const location = useLocation();

  if (status === "loading") return <AccessState message="Checking your account…" />;
  if (status === "error") return <AccessState message={error} />;
  if (status !== "signedIn") return <Navigate to="/login" replace state={{ from: location }} />;

  return <Outlet />;
}

export function RequireAbility({ action, subject }) {
  const { ability } = useAuth();

  if (!ability.can(action, subject)) {
    return <AccessState message="This area is not available for your account." />;
  }

  return <Outlet />;
}
