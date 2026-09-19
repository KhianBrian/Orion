import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import {
  isOfferCollision,
  MAX_SIGNALING_RECONNECT_ATTEMPTS,
  nextSignalingReconnectDelay,
  shouldIgnoreOffer,
} from "../lib/directWebRtcSession.js";
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

function createConnection() {
  return {
    stream: null,
    peer: null,
    socket: null,
    heartbeat: null,
    reconnectTimer: null,
    reconnectAttempts: 0,
    iceRestartAttempts: 0,
    iceRestartTimer: null,
    intentionalClose: false,
    peerLeft: false,
    polite: false,
    makingOffer: false,
    isSettingRemoteAnswerPending: false,
    ignoreOffer: false,
    negotiationPending: false,
    joined: false,
    pendingCandidates: [],
    access: null,
  };
}

function send(socket, message) {
  if (socket?.readyState !== WebSocket.OPEN) return false;
  socket.send(JSON.stringify(message));
  return true;
}

function stopTracks(stream) {
  stream?.getTracks().forEach((track) => track.stop());
}

export default function DirectMeeting() {
  const { appointmentId } = useParams();
  const navigate = useNavigate();
  const localVideo = useRef(null);
  const remoteVideo = useRef(null);
  const connection = useRef(createConnection());
  const mounted = useRef(true);
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
    mounted.current = false;
    const current = connection.current;
    current.intentionalClose = true;
    if (current.heartbeat) window.clearInterval(current.heartbeat);
    if (current.reconnectTimer) window.clearTimeout(current.reconnectTimer);
    if (current.iceRestartTimer) window.clearTimeout(current.iceRestartTimer);
    current.socket?.close(1000, "page closed");
    current.peer?.close();
    stopTracks(current.stream);
  }, []);

  const setCallState = (nextState, nextMessage) => {
    if (!mounted.current) return;
    setState(nextState);
    if (nextMessage !== undefined) setMessage(nextMessage);
  };

  const leave = () => {
    connection.current.intentionalClose = true;
    navigate("/appointments");
  };

  const requestAccess = async () => {
    if (!supabase) {
      const unavailableError = new Error("video_session_unavailable");
      unavailableError.code = "video_session_unavailable";
      throw unavailableError;
    }
    const { data, error } = await supabase.functions.invoke("video-session-access", { body: { appointmentId } });
    if (error) {
      const accessError = new Error((await functionErrorCode(error)) || "video_session_unavailable");
      accessError.code = accessError.message;
      throw accessError;
    }
    if (data?.mode !== "direct-webrtc" || !data.sessionId || !data.signaling?.endpoint || !data.signaling?.token) {
      const unavailableError = new Error("video_session_unavailable");
      unavailableError.code = "video_session_unavailable";
      throw unavailableError;
    }
    return data;
  };

  const failConnection = (current, nextMessage) => {
    if (connection.current !== current || current.intentionalClose) return;
    current.intentionalClose = true;
    if (current.heartbeat) window.clearInterval(current.heartbeat);
    if (current.reconnectTimer) window.clearTimeout(current.reconnectTimer);
    if (current.iceRestartTimer) window.clearTimeout(current.iceRestartTimer);
    current.socket?.close(1000, "call failed");
    current.peer?.close();
    stopTracks(current.stream);
    setCallState("failed", nextMessage);
  };

  const flushCandidates = async (current) => {
    if (!current.peer?.remoteDescription) return;
    const candidates = current.pendingCandidates.splice(0);
    for (const candidate of candidates) await current.peer.addIceCandidate(candidate);
  };

  const negotiate = async (current) => {
    if (connection.current !== current || current.intentionalClose || !current.peer) return;
    if (!current.joined || current.socket?.readyState !== WebSocket.OPEN) {
      current.negotiationPending = true;
      return;
    }
    if (current.makingOffer) return;
    current.negotiationPending = false;
    try {
      current.makingOffer = true;
      await current.peer.setLocalDescription();
      send(current.socket, { type: "offer", description: current.peer.localDescription });
    } catch {
      failConnection(current, "The secure call could not negotiate a connection.");
    } finally {
      current.makingOffer = false;
    }
  };

  const scheduleIceRestart = (current) => {
    if (connection.current !== current || current.intentionalClose || current.iceRestartTimer) return;
    if (current.iceRestartAttempts >= 2) {
      failConnection(current, "The secure call lost its network connection.");
      return;
    }
    current.iceRestartTimer = window.setTimeout(() => {
      current.iceRestartTimer = null;
      if (connection.current !== current || current.intentionalClose || !current.peer?.restartIce) return;
      current.iceRestartAttempts += 1;
      setCallState("connecting", "Connection interrupted. Attempting to reconnect securely…");
      current.peer.restartIce();
    }, 1000);
  };

  const openSignaling = (current, nextAccess) => {
    if (connection.current !== current || current.intentionalClose) return;
    current.access = nextAccess;
    current.joined = false;
    let socket;
    try {
      socket = new WebSocket(nextAccess.signaling.endpoint, ["orion.direct-webrtc.v1", nextAccess.signaling.token]);
      current.socket = socket;
      socket.onopen = () => {
        if (connection.current !== current || current.socket !== socket || current.intentionalClose) return;
        send(socket, { type: "join", sessionId: nextAccess.sessionId });
        if (current.heartbeat) window.clearInterval(current.heartbeat);
        current.heartbeat = window.setInterval(() => send(socket, { type: "heartbeat" }), 15_000);
      };
      socket.onmessage = (event) => {
        if (connection.current !== current || current.socket !== socket || current.intentionalClose) return;
        void (async () => {
          const signal = JSON.parse(event.data);
          if (signal.type === "joined") {
            current.joined = true;
            current.reconnectAttempts = 0;
            if (current.negotiationPending) await negotiate(current);
            return;
          }
          if (signal.type === "peer_joined") {
            current.negotiationPending = true;
            await negotiate(current);
            return;
          }
          if (signal.type === "offer" && signal.description) {
            const offerCollision = isOfferCollision({
              makingOffer: current.makingOffer,
              signalingState: current.peer.signalingState,
              isSettingRemoteAnswerPending: current.isSettingRemoteAnswerPending,
            });
            current.ignoreOffer = shouldIgnoreOffer({ polite: current.polite, offerCollision });
            if (current.ignoreOffer) return;
            if (offerCollision && current.polite) await current.peer.setLocalDescription({ type: "rollback" });
            await current.peer.setRemoteDescription(signal.description);
            await flushCandidates(current);
            await current.peer.setLocalDescription();
            send(socket, { type: "answer", description: current.peer.localDescription });
            return;
          }
          if (signal.type === "answer" && signal.description) {
            current.isSettingRemoteAnswerPending = true;
            try {
              await current.peer.setRemoteDescription(signal.description);
              await flushCandidates(current);
            } finally {
              current.isSettingRemoteAnswerPending = false;
            }
            return;
          }
          if (signal.type === "ice" && signal.candidate) {
            if (current.ignoreOffer) return;
            if (!current.peer.remoteDescription) current.pendingCandidates.push(signal.candidate);
            else await current.peer.addIceCandidate(signal.candidate);
            return;
          }
          if (signal.type === "peer_left") {
            current.peerLeft = true;
            failConnection(current, "The other participant left the call.");
          }
        })().catch(() => failConnection(current, "The secure call could not complete negotiation."));
      };
      socket.onerror = () => {
        if (connection.current === current && current.socket === socket && !current.intentionalClose) socket.close();
      };
      socket.onclose = () => {
        if (connection.current !== current || current.socket !== socket || current.intentionalClose) return;
        if (current.heartbeat) window.clearInterval(current.heartbeat);
        current.heartbeat = null;
        current.joined = false;
        if (current.reconnectAttempts >= MAX_SIGNALING_RECONNECT_ATTEMPTS) {
          failConnection(current, "The secure signaling service is unavailable. Try again later.");
          return;
        }
        current.reconnectAttempts += 1;
        setCallState("connecting", `Signaling interrupted. Reconnecting securely (${current.reconnectAttempts}/${MAX_SIGNALING_RECONNECT_ATTEMPTS})…`);
        current.reconnectTimer = window.setTimeout(() => {
          current.reconnectTimer = null;
          void requestAccess().then((refreshedAccess) => {
            if (connection.current !== current || current.intentionalClose) return;
            if (refreshedAccess.sessionId !== current.access.sessionId) {
              failConnection(current, "The secure call session changed. Return to appointments.");
              return;
            }
            setAccess(refreshedAccess);
            openSignaling(current, refreshedAccess);
          }).catch((error) => {
            if (error.code === "video_session_access_denied") {
              failConnection(current, "The secure call expired or was revoked. Return to appointments.");
              return;
            }
            if (current.reconnectAttempts >= MAX_SIGNALING_RECONNECT_ATTEMPTS) {
              failConnection(current, "The secure signaling service is unavailable. Try again later.");
              return;
            }
            openSignaling(current, current.access);
          });
        }, nextSignalingReconnectDelay(current.reconnectAttempts));
      };
    } catch {
      if (current.reconnectAttempts >= MAX_SIGNALING_RECONNECT_ATTEMPTS) {
        failConnection(current, "The secure signaling service is unavailable. Try again later.");
      } else {
        socket?.close();
      }
    }
  };

  const startCall = async () => {
    if (!access || !navigator.mediaDevices?.getUserMedia || !window.RTCPeerConnection || !window.WebSocket) {
      setMessage("This browser cannot start a secure WebRTC call.");
      setState("failed");
      return;
    }
    setState("connecting");
    setMessage("");
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      const current = createConnection();
      current.stream = stream;
      current.access = access;
      current.polite = access.participantRole === "psychiatrist";
      const peer = new RTCPeerConnection({ iceServers: access.iceServers || [] });
      current.peer = peer;
      connection.current = current;
      if (localVideo.current) localVideo.current.srcObject = stream;
      stream.getTracks().forEach((track) => peer.addTrack(track, stream));
      current.negotiationPending = true;
      peer.ontrack = (event) => {
        if (remoteVideo.current) remoteVideo.current.srcObject = event.streams[0];
      };
      peer.onicecandidate = ({ candidate }) => {
        if (candidate) send(current.socket, { type: "ice", candidate });
      };
      peer.onnegotiationneeded = () => { void negotiate(current); };
      peer.onconnectionstatechange = () => {
        if (peer.connectionState === "connected") {
          current.iceRestartAttempts = 0;
          setCallState("connected", "Connected directly or through the approved relay.");
        } else if (["disconnected", "failed"].includes(peer.connectionState)) {
          scheduleIceRestart(current);
        } else if (peer.connectionState === "closed" && !current.intentionalClose) {
          failConnection(current, "The secure call ended or could not connect.");
        }
      };
      openSignaling(current, access);
    } catch (error) {
      stopTracks(stream);
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
    {["connecting", "connected", "failed"].includes(state) && <section className="direct-meeting-frame" aria-live="polite">
      <div className="direct-meeting-videos"><video ref={localVideo} autoPlay muted playsInline aria-label="Your camera" /><video ref={remoteVideo} autoPlay playsInline aria-label="Other participant camera" /></div>
      <p role="status">{state === "connecting" ? message || "Connecting securely…" : state === "connected" ? "Connected directly or through the approved relay." : message || "The secure call ended or could not connect."}</p>
      {state === "failed" && <button onClick={leave}>Return to appointments</button>}
    </section>}
  </main>;
}
