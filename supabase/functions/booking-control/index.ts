import { callerId, corsHeaders, jsonPayload, response, serviceClient } from "../_shared/orion.ts";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return response({ error: "method_not_allowed" }, 405);
  const payload = await jsonPayload(request);
  const actorId = await callerId(request.headers.get("Authorization"));
  if (!actorId) return response({ error: "booking_control_not_permitted" }, 401);
  if (!payload || typeof payload.enabled !== "boolean" || typeof payload.idempotencyKey !== "string") {
    return response({ error: "invalid_request" }, 400);
  }
  const { data, error } = await serviceClient().rpc("set_booking_enabled", {
    next_enabled: payload.enabled, actor_profile_id: actorId, request_id: payload.idempotencyKey,
  });
  if (error) {
    if (/booking_control_not_permitted/.test(error.message)) return response({ error: "booking_control_not_permitted" }, 403);
    return response({ error: "booking_control_failed" }, 500);
  }
  return response({ enabled: data }, 200);
});
