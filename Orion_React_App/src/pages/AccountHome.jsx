import { Link } from "react-router-dom";
import { getRoleNavigation } from "../constants/routes";
import { useAuth } from "../features/auth/authContext";

const roleLabels = {
  admin: "Administrator",
  patient: "Patient",
  psychiatrist: "Psychiatrist",
};

export default function AccountHome() {
  const { profile, ability } = useAuth();
  const links = getRoleNavigation(profile.role).filter(({ subject }) => ability.can("visit", subject));

  return (
    <section className="marketing-page">
      <p className="eyebrow">Signed in</p>
      <h1>Welcome, {profile.full_name}</h1>
      <p className="marketing-lead">{roleLabels[profile.role]} access is active for this synthetic demo account.</p>
      <div className="marketing-details">
        {links.map(({ label, path }) => <Link key={path} to={path} className="action-button">{label}</Link>)}
      </div>
    </section>
  );
}
