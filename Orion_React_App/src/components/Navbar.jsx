import { Link, useNavigate } from "react-router-dom";
import { getRoleNavigation, ROUTES } from "../constants/routes";
import { useAuth } from "../features/auth/authContext";
import "./Navbar.css";

const Navbar = ({ showSignIn = true }) => {
  const { ability, profile, signOut, status } = useAuth();
  const navigate = useNavigate();
  const accountLinks = getRoleNavigation(profile?.role).filter(({ subject }) => ability.can("visit", subject));
  const isSignedIn = status === "signedIn";
  const brandDestination = isSignedIn ? ROUTES.APP : "/home";
  const handleSignOut = async () => {
    await signOut();
    navigate(ROUTES.LOGIN);
  };

  return (
    <header className="app-header">
      <Link className="app-brand" to={brandDestination}>
        <span className="orion-logo">
          <img src="/images/orion-interface-ph-logo-space.png" alt="Orion Interface Philippines" />
          <span aria-hidden="true" className="logo-planet-o" />
        </span>
      </Link>
      <nav aria-label={isSignedIn ? "Account navigation" : "Public navigation"} className="app-navigation">
        {isSignedIn ? <>
          <Link to={ROUTES.APP}>Account</Link>
          {accountLinks.map(({ label, path }) => <Link key={path} to={path}>{label}</Link>)}
          <button type="button" onClick={handleSignOut} className="app-sign-out">Sign out</button>
        </> : <>
          <Link to="/home">Home</Link>
          <Link to="/about">About</Link>
          <Link to="/contact">Contact</Link>
          <Link to="/services">Services</Link>
          <Link to="/blog">Blog</Link>
          {showSignIn && <Link to="/login" className="app-sign-in">Sign in</Link>}
        </>}
      </nav>
    </header>
  );
};

export default Navbar;
