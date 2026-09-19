import { callerId, corsHeaders, jsonPayload, response, serviceClient, uuidPattern } from "../_shared/orion.ts";

const denial = "video_session_access_denied";
const unavailable = "video_session_unavailable";

function base64url(value: Uint8Array | string) {
  const bytes = typeof value === "string" ? new TextEncoder().encode(value) : value;
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

async function hmac(secret: string, value: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return base64url(new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value))));
}

async function signedJoinToken(secret: string, claims: Record<string, unknown>) {
  const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = base64url(JSON.stringify(claims));
  return `${header}.${payload}.${await hmac(secret, `${header}.${payload}`)}`;
}

async function turnCredential(secret: string, username: string) {
  return hmac(secret, username);
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return response({ error: "method_not_allowed" }, 405);

  const payload = await jsonPayload(request);
  const appointmentId = typeof payload?.appointmentId === "string" ? payload.appointmentId : "";
  if (!uuidPattern.test(appointmentId)) return response({ error: denial }, 400);

  const actorId = await callerId(request.headers.get("Authorization"));
  if (!actorId) return response({ error: denial }, 401);

  const signalingEndpoint = Deno.env.get("DIRECT_WEBRTC_SIGNALING_URL");
  const turnUrls = (Deno.env.get("DIRECT_WEBRTC_TURN_URLS") ?? "").split(",").map((item) => item.trim()).filter(Boolean);
  const turnSecret = Deno.env.get("DIRECT_WEBRTC_TURN_SECRET");
  const signalingSecret = Deno.env.get("DIRECT_WEBRTC_SIGNALING_SECRET");
  if (!signalingEndpoint || !turnUrls.length || !turnSecret || !signalingSecret) {
    return response({ error: unavailable }, 503);
  }

  const { data, error } = await serviceClient().rpc("get_direct_webrtc_session_access", {
    target_appointment_id: appointmentId,
    actor_profile_id: actorId,
  });
  const access = data?.[0];
  if (error || !access) {
    if (error?.message.includes("direct_webrtc_access_denied")) return response({ error: denial }, 403);
    return response({ error: unavailable }, 503);
  }

  const expiresAtSeconds = Math.floor(new Date(access.access_expires_at).getTime() / 1000);
  const endsAtSeconds = Math.floor(new Date(access.ends_at).getTime() / 1000);
  const nowSeconds = Math.floor(Date.now() / 1000);
  if (!Number.isFinite(expiresAtSeconds) || expiresAtSeconds <= nowSeconds) return response({ error: denial }, 403);

  const signalingToken = await signedJoinToken(signalingSecret, {
    sub: actorId,
    sid: access.session_id,
    role: access.participant_role,
    gen: access.session_generation,
    iat: nowSeconds,
    exp: Math.min(expiresAtSeconds, endsAtSeconds),
  });
  const username = `${endsAtSeconds}:${access.session_id}`;
  const credential = await turnCredential(turnSecret, username);

  return response({
    mode: "direct-webrtc",
    sessionId: access.session_id,
    appointmentId: access.appointment_id,
    participantRole: access.participant_role,
    startsAt: access.starts_at,
    endsAt: access.ends_at,
    accessExpiresAt: access.access_expires_at,
    signaling: { endpoint: signalingEndpoint, token: signalingToken },
    iceServers: [{ urls: turnUrls, username, credential }],
  }, 200);
});
