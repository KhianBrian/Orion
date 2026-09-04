import { getRoleNavigation } from "../constants/routes";
import { useAuth } from "../features/auth/authContext";
import { ButtonLink } from "../components/ui/Button";

const roleLabels = {
  admin: "Administrator",
  patient: "Patient",
  psychiatrist: "Psychiatrist",
};

export default function AccountHome() {
  const { profile, ability } = useAuth();
  const links = getRoleNavigation(profile.role).filter(({ subject }) => ability.can("visit", subject));

  return (
    <section className="account-home">
      <p className="eyebrow">Signed in</p>
      <h1>Welcome, {profile.full_name}</h1>
      <p className="marketing-lead">{roleLabels[profile.role]} access is active for this synthetic demo account.</p>
      <div className="account-actions">
        {links.map(({ label, path }) => <ButtonLink key={path} to={path}>{label}</ButtonLink>)}
      </div>
    </section>
  );
}
