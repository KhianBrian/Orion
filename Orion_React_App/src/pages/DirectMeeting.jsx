import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import "./DirectMeeting.css";

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

function send(socket, message) {
  if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message));
}

export default function DirectMeeting() {
  const { appointmentId } = useParams();
  const navigate = useNavigate();
  const localVideo = useRef(null);
  const remoteVideo = useRef(null);
  const connection = useRef({ stream: null, peer: null, socket: null, heartbeat: null });
  const [state, setState] = useState("loading");
  const [access, setAccess] = useState(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    const loadAccess = async () => {
      if (!supabase) {
        if (active) setState("unavailable");
        return;
      }
      const { data, error } = await supabase.functions.invoke("video-session-access", { body: { appointmentId } });
      if (!active) return;
      if (error) {
        setState((await functionErrorCode(error)) === "video_session_access_denied" ? "denied" : "unavailable");
        return;
      }
      if (data?.mode !== "direct-webrtc" || !data.sessionId || !data.signaling?.endpoint || !data.signaling?.token) {
        setState("unavailable");
        return;
      }
      setAccess(data);
      setState("preflight");
    };
    loadAccess();
    return () => { active = false; };
  }, [appointmentId]);

  useEffect(() => () => {
    const current = connection.current;
    if (current.heartbeat) window.clearInterval(current.heartbeat);
    current.socket?.close();
    current.peer?.close();
    current.stream?.getTracks().forEach((track) => track.stop());
  }, []);

  const leave = () => navigate("/appointments");

  const startCall = async () => {
    if (!access || !navigator.mediaDevices?.getUserMedia || !window.RTCPeerConnection || !window.WebSocket) {
      setMessage("This browser cannot start a secure WebRTC call.");
      setState("failed");
      return;
    }
    setState("connecting");
    setMessage("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      const peer = new RTCPeerConnection({ iceServers: access.iceServers || [] });
      const socket = new WebSocket(access.signaling.endpoint, ["orion.direct-webrtc.v1", access.signaling.token]);
      connection.current = { stream, peer, socket, heartbeat: null };
      if (localVideo.current) localVideo.current.srcObject = stream;
      stream.getTracks().forEach((track) => peer.addTrack(track, stream));
      peer.ontrack = (event) => {
        if (remoteVideo.current) remoteVideo.current.srcObject = event.streams[0];
      };
      peer.onicecandidate = ({ candidate }) => { if (candidate) send(socket, { type: "ice", candidate }); };
      peer.onconnectionstatechange = () => {
        if (["failed", "disconnected", "closed"].includes(peer.connectionState)) setState("failed");
        if (peer.connectionState === "connected") setState("connected");
      };

      socket.onopen = () => {
        send(socket, { type: "join", sessionId: access.sessionId });
        connection.current.heartbeat = window.setInterval(() => send(socket, { type: "heartbeat" }), 15_000);
      };
      socket.onmessage = async (event) => {
        const signal = JSON.parse(event.data);
        if (signal.type === "peer_joined" && access.participantRole === "patient") {
          const offer = await peer.createOffer();
          await peer.setLocalDescription(offer);
          send(socket, { type: "offer", description: offer });
        } else if (signal.type === "offer") {
          await peer.setRemoteDescription(signal.description);
          const answer = await peer.createAnswer();
          await peer.setLocalDescription(answer);
          send(socket, { type: "answer", description: answer });
        } else if (signal.type === "answer") {
          await peer.setRemoteDescription(signal.description);
        } else if (signal.type === "ice" && signal.candidate) {
          await peer.addIceCandidate(signal.candidate);
        } else if (signal.type === "peer_left") {
          setMessage("The other participant left the call.");
          setState("failed");
        }
      };
      socket.onerror = () => { setMessage("The secure signaling service is unavailable."); setState("failed"); };
      socket.onclose = () => { if (!(["connected", "failed"].includes(state))) setState("failed"); };
    } catch (error) {
      connection.current.stream?.getTracks().forEach((track) => track.stop());
      setMessage(error?.name === "NotAllowedError" ? "Camera and microphone permission is required to join." : "The secure call could not start.");
      setState("failed");
    }
  };

  return <main className="direct-meeting-page">
    <div className="synthetic-banner" role="note">Synthetic non-production video boundary. No recording, chat, or public room.</div>
    <div className="direct-meeting-header">
      <div><p className="eyebrow">Direct WebRTC appointment</p><h1>Secure call</h1><p>Only the assigned patient and psychiatrist can join during the server-authorized window.</p></div>
      <button className="secondary-action-button" onClick={leave}>Leave call</button>
    </div>
    {state === "loading" && <p role="status">Requesting secure session access…</p>}
    {state === "denied" && <div className="schedule-message error"><h2>Call unavailable</h2><p>This call is not available for your account or at this time.</p><button onClick={leave}>Return to appointments</button></div>}
    {state === "unavailable" && <div className="schedule-message error"><h2>Call unavailable</h2><p>The direct video boundary is not configured in this environment.</p><button onClick={leave}>Return to appointments</button></div>}
    {state === "preflight" && <section className="direct-meeting-preflight" aria-labelledby="direct-preflight-title"><h2 id="direct-preflight-title">Ready to join</h2><p>Choose Continue to request camera and microphone access. Capture does not start before this action.</p><button onClick={startCall}>Continue with camera and microphone</button></section>}
    {(["connecting", "connected", "failed"].includes(state)) && <section className="direct-meeting-frame" aria-live="polite">
      <div className="direct-meeting-videos"><video ref={localVideo} autoPlay muted playsInline aria-label="Your camera" /><video ref={remoteVideo} autoPlay playsInline aria-label="Other participant camera" /></div>
      <p role="status">{state === "connecting" ? "Connecting securely…" : state === "connected" ? "Connected directly or through the approved relay." : message || "The secure call ended or could not connect."}</p>
      {state === "failed" && <button onClick={leave}>Return to appointments</button>}
    </section>}
  </main>;
}
