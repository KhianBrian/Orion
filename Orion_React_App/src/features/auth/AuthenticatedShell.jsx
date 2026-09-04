import { Link, Outlet, useNavigate } from "react-router-dom";
import { getRoleNavigation, ROUTES } from "../../constants/routes";
import { useAuth } from "./authContext";
import { Button } from "../../components/ui/Button";
import Footer from "../../components/Footer";
import "../../components/ui/ui.css";
import "./authenticatedShell.css";

export function AuthenticatedShell() {
  const { ability, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const navigation = getRoleNavigation(profile?.role).filter(({ subject }) => ability.can("visit", subject));
  const logout = async () => { await signOut(); navigate(ROUTES.LOGIN); };
  return <section className="app-shell" data-testid="authenticated-shell"><a className="skip-link" href="#app-content">Skip to content</a><header className="app-header"><Link className="app-brand" to={ROUTES.APP}><img src="/images/ORION.jpg" alt="Orion Interface Philippines" /></Link><nav aria-label="Account navigation" className="app-navigation"><Link to="/home">Home</Link><Link to="/about">About</Link><Link to="/contact">Contact</Link><Link to="/services">Services</Link><Link to="/portfolio">Portfolio</Link><Link to="/blog">Blog</Link><Link to={ROUTES.APP}>Account</Link>{navigation.map(({ label, path }) => <Link key={path} to={path}>{label}</Link>)}<Button variant="quiet" onClick={logout}>Sign out</Button></nav></header><main id="app-content" className="app-content" tabIndex="-1"><Outlet /></main><Footer /></section>;
}
