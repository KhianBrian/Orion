import { useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../features/auth/authContext";
import "./Login.css";
import { Button } from "../components/ui/Button";
import { StatusMessage } from "../components/ui/StatusMessage";

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, status } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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
      <main className="login-main">
        <div className="login-card">
          <img className="login-logo" src="/images/ORION.jpg" alt="Orion Interface Philippines" />
          <h1 className="login-title">Sign in to Orion</h1>
          <p className="login-intro">Access appointment booking and meeting tools using your approved account.</p>

          <form className="login-form" onSubmit={handleLogin}>
            <label htmlFor="email">Email address</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              aria-invalid={Boolean(error)}
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="login-input"
            />
            <label htmlFor="password">Password</label>
            <div className="password-field"><input id="password" type={showPassword ? "text" : "password"} autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} className="login-input" /><button className="password-toggle" type="button" aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword} onClick={() => setShowPassword((visible) => !visible)}>{showPassword ? "Hide" : "Show"}</button></div>
            <Button type="submit" busy={isSubmitting} disabled={status === "loading"}>{isSubmitting ? "Signing in…" : "Sign in"}</Button>
          </form>
          {error && <StatusMessage tone="error">{error}</StatusMessage>}
        </div>
      </main>
    </div>
  );
};

export default Login;
