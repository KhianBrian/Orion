import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { StatusMessage } from "../components/ui/StatusMessage";
import { useAuth } from "../features/auth/authContext";
import AuthCard from "./AuthCard";

export default function ResetPassword() {
  const navigate = useNavigate();
  const location = useLocation();
  const { status, updatePassword } = useAuth();
  const isInvitation = new URLSearchParams(location.search).get("mode") === "invite";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [updated, setUpdated] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    const result = await updatePassword(password);
    setBusy(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setUpdated(true);
    setTimeout(() => navigate("/app", { replace: true }), 1200);
  };

  return <AuthCard title={isInvitation ? "Set your password" : "Choose a new password"} intro="Your password will be changed for this Orion account.">
    {status !== "signedIn" && <StatusMessage tone="warning">Open this page from the {isInvitation ? "psychiatrist invitation" : "password recovery"} email.</StatusMessage>}
    <form className="login-form" onSubmit={submit}>
      <label htmlFor="newPassword">New password</label>
      <input id="newPassword" type="password" className="login-input" autoComplete="new-password" minLength="8" required value={password} onChange={(event) => setPassword(event.target.value)} />
      <label htmlFor="confirmNewPassword">Confirm new password</label>
      <input id="confirmNewPassword" type="password" className="login-input" autoComplete="new-password" minLength="8" required value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} />
      <Button type="submit" busy={busy} disabled={status !== "signedIn"}>{busy ? "Updating…" : "Update password"}</Button>
    </form>
    {error && <StatusMessage tone="error">{error}</StatusMessage>}
    {updated && <StatusMessage tone="success">Password updated. Returning to your account…</StatusMessage>}
    <p className="auth-secondary-link"><Link to="/login">Return to sign in</Link></p>
  </AuthCard>;
}
