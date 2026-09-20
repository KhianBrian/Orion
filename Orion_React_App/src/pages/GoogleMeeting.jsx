import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import googleMeetSignInGuide from "../assets/google-meet-sign-in-guide.png";
import "./GoogleMeeting.css";

async function functionErrorCode(error) {
  if (error?.context instanceof Response) {
    try {
      return (await error.context.json()).error;
    } catch {
      return undefined;
    }
  }
  return undefined;
}

export default function GoogleMeeting() {
  const { appointmentId } = useParams();
  const navigate = useNavigate();
  const [state, setState] = useState("loading");
  const [access, setAccess] = useState(null);

  useEffect(() => {
    let active = true;
    const loadAccess = async () => {
      if (!supabase) {
        if (active) setState("unavailable");
        return;
      }
      const { data, error } = await supabase.functions.invoke("google-meet-session-access", {
        body: { appointmentId },
      });
      if (!active) return;
      if (error) {
        setState((await functionErrorCode(error)) === "google_meet_access_denied" ? "denied" : "unavailable");
        return;
      }
      if (data?.mode !== "google-meet" || !data.meetingUri) {
        setState("unavailable");
        return;
      }
      setAccess(data);
      setState("ready");
    };
    loadAccess();
    return () => { active = false; };
  }, [appointmentId]);

  const leave = () => navigate("/appointments");

  return <main className="google-meeting-page">
    <div className="google-meeting-header">
      <div>
        <p className="eyebrow">Google Meet appointment</p>
        <h1>Join your secure call</h1>
        <p>Orion checked your appointment and the current server time before providing the meeting entry.</p>
      </div>
      <button className="secondary-action-button" onClick={leave}>Return to appointments</button>
    </div>
    {state === "loading" && <p role="status">Checking your appointment access…</p>}
    {state === "denied" && <div className="schedule-message error"><h2>Call unavailable</h2><p>This call is not available for your account or at this time.</p><button onClick={leave}>Return to appointments</button></div>}
    {state === "unavailable" && <div className="schedule-message error"><h2>Google Meet is unavailable</h2><p>The call could not be prepared. Your appointment was not changed. Please return to your appointments.</p><button onClick={leave}>Return to appointments</button></div>}
    {state === "ready" && access && <section className="google-meeting-card" aria-labelledby="google-meeting-ready-title">
      <h2 id="google-meeting-ready-title">Your call is ready</h2>
      <p>Open Google Meet in a new tab. Keep this Orion page available if you need to return to your appointment.</p>
      {access.participantRole === "psychiatrist" && <div className="schedule-message info"><strong>Important for psychiatrists:</strong> open Google Meet while signed in to the same Google account connected to Orion. If Google asks for your name or shows “Ask to join,” you are entering as a guest. Switch to the connected host account first so you can admit the patient.</div>}
      {access.participantRole === "psychiatrist" && <figure className="google-meeting-guide">
        <img src={googleMeetSignInGuide} alt="Google Meet pre-join screen with a red arrow pointing to Sign in in the upper-right corner" />
        <figcaption>If you see this screen, click <strong>Sign in</strong> and use the same Google account connected to Orion.</figcaption>
      </figure>}
      <a className="ui-button ui-button--primary" href={access.meetingUri} target="_blank" rel="noreferrer">Open Google Meet</a>
      <p className="google-meeting-note">Only the assigned patient and psychiatrist can request this entry from Orion during the appointment window.</p>
    </section>}
  </main>;
}
