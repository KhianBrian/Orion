import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../features/auth/authContext";
import "./Login.css";

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, status } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async (event) => {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);
    const result = await signIn(email, password);
    setIsSubmitting(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    navigate(location.state?.from?.pathname || "/app", { replace: true });
  };

  return (
    <div className="login-page">
      {/* Navbar */}
      <nav className="login-navbar">
        <div className="login-navbar-logo">
          <img src="/images/ORION.jpg" alt="Orion Interface PH" />
        </div>
        <div className="login-navbar-links">
          <Link to="/home" className="login-nav-link">
            Home
          </Link>
          <Link to="/about" className="login-nav-link">
            About
          </Link>
          <Link to="/contact" className="login-nav-link">
            Contact
          </Link>
          <Link to="/services" className="login-nav-link">
            Services
          </Link>
          <Link to="/portfolio" className="login-nav-link">
            Portfolio
          </Link>
          <Link to="/blog" className="login-nav-link">
            Blog
          </Link>
          {status !== "signedIn" && <Link to="/login" className="login-nav-button">Login</Link>}
        </div>
      </nav>

      {/* Main Content */}
      <main className="login-main">
        <div className="login-card">
          <h4 className="login-title">LOGIN</h4>

          <form className="login-form" onSubmit={handleLogin}>
            <input
              type="email"
              aria-label="Email address"
              placeholder="email id"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="login-input"
            />
            <input
              type="password"
              aria-label="Password"
              placeholder="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="login-input"
            />
          </form>

          <div className="login-forgot">
            <Link to="/forgot-password" className="login-forgot-link">
              Forgot Password?
            </Link>
          </div>

          <div className="login-buttons">
            <button onClick={handleLogin} className="login-button" disabled={isSubmitting}>
              {isSubmitting ? "Signing in…" : "Login"}
            </button>
            {error && <p className="login-hint" role="alert">{error}</p>}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="login-footer">
        <div className="login-footer-content">
          <div>
            <p>
              © 2023 Orion Interface Philippines, Inc. &nbsp; All rights
              reserved under Albetros Philippines, Inc.
            </p>
            <p>Follow us on social media:</p>
          </div>
          <div className="login-footer-social">
            <div className="login-footer-icon"></div>
            <div className="login-footer-icon"></div>
          </div>
          <div className="login-footer-links">
            {[
              "FAQ",
              "Privacy Policy",
              "Terms of Service",
              "Careers",
              "Support",
              "Sitemap",
            ].map((link) => (
              <button key={link} className="login-footer-link">
                {link}
              </button>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Login;
