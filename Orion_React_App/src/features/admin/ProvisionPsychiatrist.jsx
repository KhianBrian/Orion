import { useState } from "react";
import { Button } from "../../components/ui/Button";
import { StatusMessage } from "../../components/ui/StatusMessage";
import { useAuth } from "../auth/authContext";
import { provisionPsychiatrist } from "./mutations";

export default function ProvisionPsychiatrist() {
  const { profile } = useAuth();
  const [form, setForm] = useState({ email: "", fullName: "", displayName: "", bio: "" });
  const [message, setMessage] = useState(null);
  const [busy, setBusy] = useState(false);

  const update = (event) => setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  const submit = async (event) => {
    event.preventDefault();
    setMessage(null);
    setBusy(true);
    try {
      await provisionPsychiatrist(form);
      setForm({ email: "", fullName: "", displayName: "", bio: "" });
      setMessage({ tone: "success", text: "The psychiatrist account was created and an invitation email was requested." });
    } catch (error) {
      const code = error?.context instanceof Response ? (await error.context.json()).error : undefined;
      const text = code === "account_already_exists"
        ? "An account already exists for this email address."
        : code === "provisioning_not_permitted"
          ? "Only an administrator can create psychiatrist accounts."
          : "We could not create the psychiatrist account. Please try again.";
      setMessage({ tone: "error", text });
    } finally {
      setBusy(false);
    }
  };

  return <section className="marketing-page admin-provisioning">
    <p className="eyebrow">Administrator access</p>
    <h1>Add a psychiatrist</h1>
    <p className="marketing-lead">Create a trusted psychiatrist account. The account will be active immediately and can be made unavailable later through the existing active-state controls.</p>
    <form className="admin-provisioning-form" onSubmit={submit}>
      <label htmlFor="psychiatristEmail">Email address</label>
      <input id="psychiatristEmail" name="email" type="email" autoComplete="email" required value={form.email} onChange={update} />
      <label htmlFor="psychiatristFullName">Full name</label>
      <input id="psychiatristFullName" name="fullName" autoComplete="name" required value={form.fullName} onChange={update} />
      <label htmlFor="psychiatristDisplayName">Display name</label>
      <input id="psychiatristDisplayName" name="displayName" required value={form.displayName} onChange={update} />
      <label htmlFor="psychiatristBio">Bio <span>(optional)</span></label>
      <textarea id="psychiatristBio" name="bio" rows="5" value={form.bio} onChange={update} />
      <Button type="submit" busy={busy} disabled={profile?.role !== "admin"}>{busy ? "Creating…" : "Create psychiatrist account"}</Button>
    </form>
    {message && <StatusMessage tone={message.tone}>{message.text}</StatusMessage>}
  </section>;
}
