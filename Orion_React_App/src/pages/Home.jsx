import { Link } from "react-router-dom";
import { ButtonLink } from "../components/ui/Button";
import { useAuth } from "../features/auth/authContext";
import "./Home.css";

const Home = () => {
  const { status } = useAuth();

  return (
    <div className="home-page">
      <div className="home-hero">
        <div className="hero-text-center">
          <p className="eyebrow">Psychiatry booking</p><h1 className="hero-main-title">A clearer path to your appointment.</h1>
          <p className="hero-subtitle">Orion helps approved accounts book and manage psychiatry appointments.</p>
          <ButtonLink to={status === "signedIn" ? "/app" : "/login"}>{status === "signedIn" ? "Go to your account" : "Sign in"}</ButtonLink>
        </div>
      </div>
      <section className="home-info"><h2>Book, review, and join</h2><p>Use your account to select an available 45-minute appointment, review it after refresh, and join when server-side access allows.</p><Link to="/about">About Orion</Link></section>
    </div>
  );
};

export default Home;
