import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { StatusMessage } from "../components/ui/StatusMessage";
import { useAuth } from "../features/auth/authContext";
import AuthCard from "./AuthCard";

export default function ForgotPassword() {
  const { requestPasswordReset } = useAuth();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setBusy(true);
    const result = await requestPasswordReset(email.trim());
    setBusy(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setSent(true);
  };

  return <AuthCard title="Reset your password" intro="Enter your email address and we’ll send password recovery instructions.">
    <form className="login-form" onSubmit={submit}>
      <label htmlFor="recoveryEmail">Email address</label>
      <input id="recoveryEmail" type="email" className="login-input" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
      <Button type="submit" busy={busy}>{busy ? "Sending…" : "Send reset email"}</Button>
    </form>
    {error && <StatusMessage tone="error">{error}</StatusMessage>}
    {sent && <StatusMessage tone="success">If an account exists for that email, recovery instructions have been sent.</StatusMessage>}
    <p className="auth-secondary-link"><Link to="/login">Return to sign in</Link></p>
  </AuthCard>;
}
