import { callerId, corsHeaders, jsonPayload, response, serviceClient } from "../_shared/orion.ts";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return response({ error: "method_not_allowed" }, 405);

  const actorId = await callerId(request.headers.get("Authorization"));
  if (!actorId) return response({ error: "google_meet_control_not_permitted" }, 401);
  const client = serviceClient();
  const { data: profile } = await client.from("profiles").select("role").eq("id", actorId).maybeSingle();
  if (profile?.role !== "admin") return response({ error: "google_meet_control_not_permitted" }, 403);

  const payload = await jsonPayload(request);
  if (payload?.action === "status") {
    const { data, error } = await client.from("system_controls").select("enabled").eq("control_key", "google_meet_enabled").maybeSingle();
    if (error) return response({ error: "google_meet_control_failed" }, 500);
    return response({ enabled: Boolean(data?.enabled) }, 200);
  }

  if (typeof payload?.enabled !== "boolean") return response({ error: "invalid_request" }, 400);
  const { data, error } = await client.rpc("set_google_meet_enabled", {
    next_enabled: payload.enabled,
    actor_profile_id: actorId,
    request_id: typeof payload.requestId === "string" ? payload.requestId : crypto.randomUUID(),
  });
  if (error) {
    if (error.message.includes("google_meet_control_not_permitted")) return response({ error: "google_meet_control_not_permitted" }, 403);
    return response({ error: "google_meet_control_failed" }, 500);
  }
  return response({ enabled: data }, 200);
});
