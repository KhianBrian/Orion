import { Link, useNavigate } from "react-router-dom";
import { getRoleNavigation, ROUTES } from "../constants/routes";
import { useAuth } from "../features/auth/authContext";
import "./Navbar.css";

const Navbar = () => {
  const { ability, profile, signOut, status } = useAuth();
  const navigate = useNavigate();
  const accountLinks = getRoleNavigation(profile?.role).filter(({ subject }) => ability.can("visit", subject));
  const handleSignOut = async () => {
    await signOut();
    navigate(ROUTES.LOGIN);
  };

  return (
    <header className="orion-navbar">
      <div className="navbar-container">
        <div className="navbar-logo">
          <Link to="/home">
            <img src="/images/ORION.jpg" alt="Orion Logo" />
          </Link>
        </div>

        <nav className="navbar-links" aria-label="Public navigation">
          <Link to="/home" className="nav-link">
            Home
          </Link>
          <Link to="/about" className="nav-link">
            About
          </Link>
          <Link to="/contact" className="nav-link">Contact</Link>
          <Link to="/services" className="nav-link">Services</Link>
          <Link to="/portfolio" className="nav-link">Portfolio</Link>
          <Link to="/blog" className="nav-link">Blog</Link>
          {status === "signedIn" ? <>
            <Link to={ROUTES.APP} className="nav-link">Account</Link>
            {accountLinks.map(({ label, path }) => <Link key={path} to={path} className="nav-link">{label}</Link>)}
            <button type="button" onClick={handleSignOut} className="nav-link-login">Sign out</button>
          </> : <Link to="/login" className="nav-link-login">Sign in</Link>}
        </nav>
      </div>
    </header>
  );
};

export default Navbar;
