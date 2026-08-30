import { Link, useNavigate } from "react-router-dom";
import { getRoleNavigation, ROUTES } from "../constants/routes";
import { useAuth } from "../features/auth/authContext";
import "./Navbar.css";

const Navbar = () => {
  const { ability, profile, signOut, status } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate(ROUTES.LOGIN);
  };

  return (
    <nav className="orion-navbar">
      <div className="navbar-container">
        <div className="navbar-logo">
          <Link to="/home">
            <img src="/images/ORION.jpg" alt="Orion Logo" />
          </Link>
        </div>

        <div className="navbar-links">
          <Link to="/home" className="nav-link">
            Home
          </Link>
          <Link to="/about" className="nav-link">
            About
          </Link>
          {getRoleNavigation(profile?.role)
            .filter(({ subject }) => ability.can("visit", subject))
            .map(({ label, path }) => <Link key={path} to={path} className="nav-link">{label}</Link>)}
          <Link to="/contact" className="nav-link">
            Contact
          </Link>
          <Link to="/services" className="nav-link">
            Services
          </Link>
          <Link to="/portfolio" className="nav-link">
            Portfolio
          </Link>
          <Link to="/blog" className="nav-link">
            Blog
          </Link>

          {status === "signedIn" ? (
            <button onClick={handleLogout} className="nav-link-login">
              Sign out {profile.full_name}
            </button>
          ) : (
            <Link to="/login" className="nav-link-login">
              Login
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
