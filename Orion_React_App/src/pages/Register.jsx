import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { StatusMessage } from "../components/ui/StatusMessage";
import { useAuth } from "../features/auth/authContext";
import AuthCard from "./AuthCard";

export default function Register() {
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const [form, setForm] = useState({ fullName: "", email: "", password: "", confirmPassword: "" });
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const update = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setBusy(true);
    const result = await signUp(form.email.trim(), form.password, form.fullName);
    setBusy(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    if (result.requiresEmailConfirmation) {
      navigate(`/confirm-email?email=${encodeURIComponent(form.email.trim())}`, { replace: true });
    } else {
      setMessage("Your account is ready.");
    }
  };

  return <AuthCard title="Create your Orion account" intro="Create a patient account with your email address.">
    <form className="login-form" onSubmit={submit}>
      <label htmlFor="fullName">Full name</label>
      <input id="fullName" name="fullName" className="login-input" autoComplete="name" required value={form.fullName} onChange={update} />
      <label htmlFor="registerEmail">Email address</label>
      <input id="registerEmail" name="email" type="email" className="login-input" autoComplete="email" required value={form.email} onChange={update} />
      <label htmlFor="registerPassword">Password</label>
      <div className="password-field"><input id="registerPassword" name="password" type={showPassword ? "text" : "password"} className="login-input" autoComplete="new-password" minLength="8" required value={form.password} onChange={update} /><button className="password-toggle" type="button" aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword} onClick={() => setShowPassword((visible) => !visible)}>{showPassword ? "Hide" : "Show"}</button></div>
      <label htmlFor="confirmPassword">Confirm password</label>
      <div className="password-field"><input id="confirmPassword" name="confirmPassword" type={showConfirmPassword ? "text" : "password"} className="login-input" autoComplete="new-password" minLength="8" required value={form.confirmPassword} onChange={update} /><button className="password-toggle" type="button" aria-label={showConfirmPassword ? "Hide confirmation password" : "Show confirmation password"} aria-pressed={showConfirmPassword} onClick={() => setShowConfirmPassword((visible) => !visible)}>{showConfirmPassword ? "Hide" : "Show"}</button></div>
      <Button type="submit" busy={busy}>{busy ? "Creating account…" : "Create account"}</Button>
    </form>
    {error && <StatusMessage tone="error">{error}</StatusMessage>}
    {message && <StatusMessage tone="success">{message}</StatusMessage>}
    <p className="auth-secondary-link">Already have an account? <Link to="/login">Sign in</Link></p>
  </AuthCard>;
}
