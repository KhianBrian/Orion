import {
  buildAuthorizationUrl,
  exchangeGoogleCode,
  googleMeetConfig,
  hasOAuthConfig,
  revokeGoogleToken,
  signOAuthState,
  verifyOAuthState,
} from "../_shared/googleMeet.ts";
import { callerId, corsHeaders, jsonPayload, response, serviceClient } from "../_shared/orion.ts";

const unavailable = "google_meet_unavailable";

function audit(client: ReturnType<typeof serviceClient>, actorId: string | null, outcome: "success" | "denied", reasonCode: string) {
  return client.from("audit_events").insert({
    actor_id: actorId,
    event_code: "google_meet_oauth",
    target_type: "google_account",
    target_id: actorId,
    outcome,
    reason_code: reasonCode,
  });
}

async function isPsychiatrist(client: ReturnType<typeof serviceClient>, actorId: string) {
  const { data } = await client.from("profiles").select("role").eq("id", actorId).maybeSingle();
  return data?.role === "psychiatrist";
}

Deno.serve(async (request) => {
  const client = serviceClient();
  const config = googleMeetConfig();

  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  if (request.method === "GET") {
    const url = new URL(request.url);
    const error = url.searchParams.get("error");
    const state = url.searchParams.get("state") ?? "";
    const claims = await verifyOAuthState(config.stateSecret, state);
    if (!claims || error) return hasOAuthConfig(config) ? redirectError(config) : response({ error: unavailable }, 503);

    const code = url.searchParams.get("code");
    if (!code || !hasOAuthConfig(config)) return hasOAuthConfig(config) ? redirectError(config) : response({ error: unavailable }, 503);

    try {
      const tokens = await exchangeGoogleCode(config, code);
      const { error: saveError } = await client.from("google_meet_connections").upsert({
        profile_id: claims.sub,
        refresh_token: tokens.refresh_token,
        connected_at: new Date().toISOString(),
        revoked_at: null,
        updated_at: new Date().toISOString(),
      });
      if (saveError) throw saveError;
      await audit(client, claims.sub, "success", "connected");
      return redirectToApp(config, "connected");
    } catch {
      await audit(client, claims.sub, "denied", "oauth_exchange_failed");
      return redirectError(config);
    }
  }

  if (request.method !== "POST") return response({ error: "method_not_allowed" }, 405);
  const actorId = await callerId(request.headers.get("Authorization"));
  if (!actorId || !(await isPsychiatrist(client, actorId))) return response({ error: "google_meet_not_permitted" }, 403);

  const payload = await jsonPayload(request);
  const action = payload?.action || "status";

  if (action === "status") {
    const { data, error } = await client.rpc("get_google_meet_connection_status", { actor_profile_id: actorId });
    if (error) return response({ error: unavailable }, 503);
    const status = data?.[0] ?? { connected: false, connected_at: null };
    return response({ connected: Boolean(status.connected), connectedAt: status.connected_at }, 200);
  }

  if (action === "start") {
    if (!hasOAuthConfig(config)) return response({ error: unavailable }, 503);
    const state = await signOAuthState(config.stateSecret, actorId);
    return response({ authorizationUrl: buildAuthorizationUrl(config, state) }, 200);
  }

  if (action === "disconnect") {
    const { data: connection } = await client.from("google_meet_connections")
      .select("refresh_token")
      .eq("profile_id", actorId)
      .maybeSingle();
    if (connection?.refresh_token) await revokeGoogleToken(connection.refresh_token).catch(() => undefined);
    const { error } = await client.from("google_meet_connections")
      .delete()
      .eq("profile_id", actorId);
    if (error) return response({ error: unavailable }, 503);
    await audit(client, actorId, "success", "disconnected");
    return response({ connected: false }, 200);
  }

  return response({ error: "invalid_request" }, 400);
});

function redirectToApp(config: ReturnType<typeof googleMeetConfig>, result: "connected" | "error") {
  const url = new URL(config.appUrl);
  url.pathname = `${url.pathname.replace(/\/$/, "")}/schedule`;
  url.searchParams.set("googleMeet", result);
  return Response.redirect(url.toString(), 303);
}

function redirectError(config: ReturnType<typeof googleMeetConfig>) {
  return redirectToApp(config, "error");
}
