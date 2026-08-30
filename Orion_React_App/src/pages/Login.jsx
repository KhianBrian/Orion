import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { useState } from "react";
import { login } from "../redux/slices/authSlice";
import "./Login.css";

const Login = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = () => {
    let role = "User";
    const lowerEmail = email.toLowerCase();

    if (lowerEmail.includes("admin")) {
      role = "Admin";
    } else if (lowerEmail.includes("doctor")) {
      role = "Doctor";
    } else if (lowerEmail.includes("patient")) {
      role = "Patient";
    }

    const userData = {
      user: {
        name: `Logged ${role}`,
        email: email || `${role.toLowerCase()}@example.com`,
        role: role,
      },
      accessToken:
        "dummy-access-token-" + role.toLowerCase() + "-" + Date.now(),
      refreshToken:
        "dummy-refresh-token-" + role.toLowerCase() + "-" + Date.now(),
    };

    dispatch(login(userData));
    navigate("/home");
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
          {!isAuthenticated && <Link to="/login" className="login-nav-button">Login</Link>}
        </div>
      </nav>

      {/* Main Content */}
      <main className="login-main">
        <div className="login-card">
          <h4 className="login-title">LOGIN</h4>

          <div className="login-form">
            <input
              type="text"
              placeholder="email id"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="login-input"
            />
            <input
              type="password"
              placeholder="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="login-input"
            />
          </div>

          <div className="login-forgot">
            <Link to="/forgot-password" className="login-forgot-link">
              Forgot Password?
            </Link>
          </div>

          <div className="login-buttons">
            <button onClick={handleLogin} className="login-button">
              Login
            </button>
            <p className="login-hint">
              Try email with "admin", "doctor", or "patient" for role
              simulation.
            </p>
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
