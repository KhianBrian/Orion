import { useEffect, useMemo, useState } from "react";
import { JaaSMeeting } from "@jitsi/react-sdk";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import "./DemoMeeting.css";

function tokenSubject(token) {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const base64 = payload.replaceAll("-", "+").replaceAll("_", "/");
    return JSON.parse(atob(base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "="))).sub;
  } catch {
    return null;
  }
}

async function accessError(error) {
  if (error?.context instanceof Response) {
    try {
      return (await error.context.json()).error;
    } catch {
      return undefined;
    }
  }
  return undefined;
}

export default function DemoMeeting() {
  const { appointmentId } = useParams();
  const navigate = useNavigate();
  const [state, setState] = useState("loading");
  const [access, setAccess] = useState(null);

  useEffect(() => {
    let active = true;
    const requestAccess = async () => {
      if (!supabase) {
        if (active) setState("unavailable");
        return;
      }
      const { data, error } = await supabase.functions.invoke("get-demo-meeting-access", {
        body: { appointmentId },
      });
      if (!active) return;
      if (error) {
        setState((await accessError(error)) === "meeting_access_denied" ? "denied" : "unavailable");
        return;
      }
      if (!data?.roomName || !data?.token || data.mode !== "synthetic-demo") {
        setState("unavailable");
        return;
      }
      setAccess(data);
      setState("ready");
    };
    requestAccess();
    return () => { active = false; };
  }, [appointmentId]);

  const appId = useMemo(() => access?.token ? tokenSubject(access.token) : null, [access]);
  const leave = () => navigate("/appointments");

  return <main className="demo-meeting-page">
    <div className="synthetic-banner" role="note">Synthetic demo only — not a real consultation.</div>
    <div className="demo-meeting-header">
      <div><p className="eyebrow">JaaS synthetic demo</p><h1>Secure demo call</h1><p>Only the booked synthetic participants can enter during the 45-minute appointment window.</p></div>
      <button className="secondary-action-button" onClick={leave}>Leave call</button>
    </div>
    {state === "loading" && <p role="status">Requesting secure meeting access…</p>}
    {state === "denied" && <div className="schedule-message error"><h2>Meeting unavailable</h2><p>This meeting is not available for your account or at this time.</p><button onClick={leave}>Return to appointments</button></div>}
    {state === "unavailable" && <div className="schedule-message error"><h2>Meeting unavailable</h2><p>The synthetic demo call could not be started. Please reschedule the demonstration.</p><button onClick={leave}>Return to appointments</button></div>}
    {state === "ready" && appId && <div className="meeting-frame"><JaaSMeeting
      appId={appId}
      roomName={access.roomName}
      jwt={access.token}
      configOverwrite={{ disableInviteFunctions: true, toolbarButtons: ["microphone", "camera", "hangup", "fullscreen", "settings"] }}
      interfaceConfigOverwrite={{ TOOLBAR_BUTTONS: ["microphone", "camera", "hangup", "fullscreen", "settings"] }}
      onReadyToClose={leave}
      getIFrameRef={(iframe) => { iframe.style.height = "min(70vh, 720px)"; iframe.style.width = "100%"; }}
    /></div>}
    {state === "ready" && !appId && <div className="schedule-message error"><p>The secure meeting could not be configured.</p><button onClick={leave}>Return to appointments</button></div>}
  </main>;
}
