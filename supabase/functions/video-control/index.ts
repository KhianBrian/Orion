import { callerId, corsHeaders, jsonPayload, response, serviceClient } from "../_shared/orion.ts";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return response({ error: "method_not_allowed" }, 405);

  const actorId = await callerId(request.headers.get("Authorization"));
  const payload = await jsonPayload(request);
  if (!actorId || typeof payload?.enabled !== "boolean") return response({ error: "direct_webrtc_control_not_permitted" }, 403);

  const { data, error } = await serviceClient().rpc("set_direct_webrtc_enabled", {
    next_enabled: payload.enabled,
    actor_profile_id: actorId,
    request_id: typeof payload.requestId === "string" ? payload.requestId : crypto.randomUUID(),
  });
  if (error) {
    if (error.message.includes("direct_webrtc_control_not_permitted")) return response({ error: "direct_webrtc_control_not_permitted" }, 403);
    return response({ error: "direct_webrtc_control_failed" }, 500);
  }
  return response({ enabled: data }, 200);
});
