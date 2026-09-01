import jwt from "npm:jsonwebtoken@9.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const denial = "meeting_access_denied";
const unavailable = "meeting_unavailable";
const earlyJoinSeconds = 15 * 60;

function response(body: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function audit(serviceClient: ReturnType<typeof createClient>, actorId: string | null, appointmentId: string | null, outcome: "success" | "failure", reasonCode: string) {
  return serviceClient.from("audit_events").insert({
    actor_id: actorId,
    event_code: "demo_meeting_access",
    target_type: "appointment",
    target_id: appointmentId,
    outcome,
    reason_code: reasonCode,
  });
}

function privateKeyFromSecret(value: string) {
  return value.replaceAll("\\n", "\n").trim();
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return response({ error: "method_not_allowed" }, 405);

  const serviceClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );
  const authorization = request.headers.get("Authorization");
  let actorId: string | null = null;
  let appointmentId: string | null = null;

  try {
    const payload = await request.json();
    appointmentId = typeof payload?.appointmentId === "string" && uuidPattern.test(payload.appointmentId)
      ? payload.appointmentId
      : null;
  } catch {
    await audit(serviceClient, actorId, appointmentId, "failure", "invalid_request");
    return response({ error: denial }, 400);
  }

  if (!appointmentId) {
    await audit(serviceClient, actorId, appointmentId, "failure", "invalid_request");
    return response({ error: denial }, 400);
  }

  if (!authorization) {
    await audit(serviceClient, actorId, appointmentId, "failure", "unauthenticated");
    return response({ error: denial }, 401);
  }

  const callerClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { global: { headers: { Authorization: authorization } } },
  );
  const { data: userData, error: userError } = await callerClient.auth.getUser();
  actorId = userData.user?.id ?? null;
  if (userError || !actorId) {
    await audit(serviceClient, actorId, appointmentId, "failure", "unauthenticated");
    return response({ error: denial }, 401);
  }

  const { data: appointment, error: appointmentError } = await serviceClient
    .from("appointments")
    .select("id, patient_id, psychiatrist_id, starts_at, ends_at, status, video_room_id, psychiatrist:psychiatrists!appointments_psychiatrist_id_fkey(profile_id)")
    .eq("id", appointmentId)
    .maybeSingle();

  const assignedPsychiatristId = Array.isArray(appointment?.psychiatrist)
    ? appointment.psychiatrist[0]?.profile_id
    : appointment?.psychiatrist?.profile_id;
  const related = appointment && (appointment.patient_id === actorId || assignedPsychiatristId === actorId);
  const nowSeconds = Math.floor(Date.now() / 1000);
  const startsAt = appointment ? Math.floor(new Date(appointment.starts_at).getTime() / 1000) : 0;
  const endsAt = appointment ? Math.floor(new Date(appointment.ends_at).getTime() / 1000) : 0;
  const enabled = Deno.env.get("DEMO_JAAS_ENABLED") === "true";

  if (appointmentError || !appointment || !related || appointment.status !== "booked" || !enabled
      || nowSeconds < startsAt - earlyJoinSeconds || nowSeconds >= endsAt) {
    await audit(serviceClient, actorId, appointmentId, "failure", "not_eligible");
    return response({ error: denial }, 403);
  }

  const appId = Deno.env.get("JAAS_APP_ID");
  const keyId = Deno.env.get("JAAS_KEY_ID");
  const privateKey = Deno.env.get("JAAS_PRIVATE_KEY");
  if (!appId || !keyId || !privateKey || !appointment.video_room_id) {
    await audit(serviceClient, actorId, appointmentId, "failure", "provider_unavailable");
    return response({ error: unavailable }, 503);
  }

  const roomName = `orion-demo-${appointment.video_room_id}`;
  const expiresAtSeconds = Math.min(nowSeconds + 5 * 60, endsAt);
  if (expiresAtSeconds <= nowSeconds) {
    await audit(serviceClient, actorId, appointmentId, "failure", "window_expired");
    return response({ error: denial }, 403);
  }

  try {
    const token = jwt.sign({
      aud: "jitsi",
      iss: "chat",
      sub: appId,
      room: roomName,
      nbf: nowSeconds - 5,
      exp: expiresAtSeconds,
      context: {
        user: {
          id: actorId,
          name: "Orion synthetic participant",
          moderator: false,
        },
        features: {
          livestreaming: false,
          recording: false,
          transcription: false,
          "sip-inbound-call": false,
          "sip-outbound-call": false,
          "inbound-call": false,
          "outbound-call": false,
          "file-upload": false,
          "list-visitors": false,
          "send-groupchat": false,
          "create-polls": false,
        },
        room: { regex: false },
      },
    }, privateKeyFromSecret(privateKey), {
      algorithm: "RS256",
      keyid: keyId,
      noTimestamp: true,
    });

    await audit(serviceClient, actorId, appointmentId, "success", "granted");
    return response({
      roomName,
      token,
      expiresAt: new Date(expiresAtSeconds * 1000).toISOString(),
      mode: "synthetic-demo",
    }, 200);
  } catch {
    await audit(serviceClient, actorId, appointmentId, "failure", "provider_unavailable");
    return response({ error: unavailable }, 503);
  }
});
