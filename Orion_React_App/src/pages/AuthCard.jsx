import Navbar from "../components/Navbar";
import "./Login.css";

export default function AuthCard({ title, intro, children }) {
  return <div className="login-page">
    <Navbar showSignIn={false} />
    <main className="login-main">
      <div className="login-card">
        <header className="login-brand-header">
          <span className="login-logo">
            <img src="/images/orion-interface-ph-logo-space.png" alt="Orion Interface Philippines" />
            <span aria-hidden="true" className="logo-planet-o" />
          </span>
        </header>
        <div className="login-card-content">
          <h1 className="login-title">{title}</h1>
          {intro && <p className="login-intro">{intro}</p>}
          {children}
        </div>
      </div>
    </main>
  </div>;
}
