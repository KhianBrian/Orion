import { Link, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { logout } from "../redux/slices/authSlice";
import "./Navbar.css";

const Navbar = () => {
  const { isAuthenticated } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleLogout = () => {
    dispatch(logout());
    navigate("/login");
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
          <Link to="/patient-appointment" className="nav-link">
            Book a Session
          </Link>
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

          {isAuthenticated ? (
            <button onClick={handleLogout} className="nav-link-login">
              Logout
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
