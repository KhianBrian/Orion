import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "../../../components/ui/Button";
import { StatusMessage } from "../../../components/ui/StatusMessage";
import { supabase } from "../../../lib/supabase";

async function loadConnection() {
  const { data, error } = await supabase.functions.invoke("google-meet-connect", { body: { action: "status" } });
  if (error) throw error;
  return data;
}

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

export function GoogleMeetConnectionCard() {
  const [message, setMessage] = useState(() => {
    const result = new URLSearchParams(window.location.search).get("googleMeet");
    return result
      ? { tone: result === "connected" ? "success" : "error", text: result === "connected" ? "Google Meet is connected to your account." : "Google Meet could not connect to your account." }
      : null;
  });
  const query = useQuery({ queryKey: ["google-meet-connection"], queryFn: loadConnection });
  const { refetch } = query;

  useEffect(() => {
    const result = new URLSearchParams(window.location.search).get("googleMeet");
    if (!result) return;
    window.history.replaceState({}, "", `${window.location.pathname}${window.location.hash}`);
    void refetch();
  }, [refetch]);

  const connect = async () => {
    setMessage(null);
    const { data, error } = await supabase.functions.invoke("google-meet-connect", { body: { action: "start" } });
    if (error || !data?.authorizationUrl) {
      setMessage({ tone: "error", text: (await functionErrorCode(error)) === "google_meet_unavailable" ? "Google Meet is not configured in this environment." : "Google Meet could not start its account connection." });
      return;
    }
    window.location.assign(data.authorizationUrl);
  };

  const disconnect = async () => {
    setMessage(null);
    const { error } = await supabase.functions.invoke("google-meet-connect", { body: { action: "disconnect" } });
    if (error) {
      setMessage({ tone: "error", text: "Google Meet could not be disconnected." });
      return;
    }
    setMessage({ tone: "success", text: "Google Meet was disconnected." });
    await query.refetch();
  };

  return <section className="schedule-editor google-meet-connection" aria-labelledby="google-meet-connection-title">
    <div className="booking-step__heading"><span className="booking-step__number">3</span><div><h2 id="google-meet-connection-title">Google Meet account</h2><p>Connect the Gmail account that should host your appointment meetings.</p></div></div>
    {message && <StatusMessage tone={message.tone}>{message.text}</StatusMessage>}
    {query.isPending && <StatusMessage>Checking Google Meet connection…</StatusMessage>}
    {query.error && <StatusMessage tone="error">Google Meet connection status could not be loaded.</StatusMessage>}
    {!query.isPending && !query.error && query.data?.connected && <><StatusMessage tone="success">Google Meet is connected. Patients join as guests; they do not need to connect Google.</StatusMessage><Button variant="secondary" onClick={disconnect}>Disconnect Google Meet</Button></>}
    {!query.isPending && !query.error && !query.data?.connected && <><p className="settings-help">Connect once before accepting an appointment. Orion keeps the authorization on the server and never places your Google secret in the browser.</p><Button onClick={connect}>Connect Google Meet</Button></>}
  </section>;
}
