import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { StatusMessage } from "../components/ui/StatusMessage";
import { useAuth } from "../features/auth/authContext";
import AuthCard from "./AuthCard";

export default function ConfirmEmail() {
  const location = useLocation();
  const navigate = useNavigate();
  const { status, verifyEmail, resendConfirmation } = useAuth();
  const emailFromQuery = new URLSearchParams(location.search).get("email") || "";
  const isInvitation = new URLSearchParams(location.search).get("mode") === "invite";
  const [email, setEmail] = useState(emailFromQuery);
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("Check your email for a confirmation code, then enter it here. A confirmation link also works if one is provided.");
  const [busy, setBusy] = useState(false);

  const verify = async (event) => {
    event.preventDefault();
    setError("");
    setBusy(true);
    const result = await verifyEmail(email.trim(), token.trim());
    setBusy(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    navigate(isInvitation ? "/reset-password?mode=invite" : "/app", { replace: true });
  };

  const resend = async () => {
    setError("");
    setMessage("");
    const result = await resendConfirmation(email.trim());
    if (result.error) setError(result.error);
    else setMessage("A new confirmation email has been requested.");
  };

  return <AuthCard title="Confirm your email" intro="Enter the code from your Orion confirmation email. This keeps you on this page while you finish signing up.">
    {status === "signedIn" && <>
      <StatusMessage tone="success">Your email has been confirmed.{isInvitation ? " Set a password to finish setting up your psychiatrist account." : ""}</StatusMessage>
      <Button type="button" onClick={() => navigate(isInvitation ? "/reset-password?mode=invite" : "/app", { replace: true })}>{isInvitation ? "Set your password" : "Continue to Orion"}</Button>
    </>}
    {status !== "signedIn" && <>
    <form className="login-form" onSubmit={verify}>
      <label htmlFor="confirmEmail">Email address</label>
      <input id="confirmEmail" type="email" className="login-input" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
      <label htmlFor="confirmationCode">Confirmation code</label>
      <input id="confirmationCode" inputMode="numeric" className="login-input" autoComplete="one-time-code" required value={token} onChange={(event) => setToken(event.target.value)} />
      <Button type="submit" busy={busy}>{busy ? "Confirming…" : "Confirm email"}</Button>
    </form>
    {message && <StatusMessage tone="info">{message}</StatusMessage>}
    {error && <StatusMessage tone="error">{error}</StatusMessage>}
    <Button variant="quiet" type="button" onClick={resend}>Resend confirmation email</Button>
    </>}
    <p className="auth-secondary-link"><Link to="/login">Return to sign in</Link></p>
  </AuthCard>;
}
