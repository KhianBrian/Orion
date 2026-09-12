import { callerId, corsHeaders, jsonPayload, response, serviceClient, uuidPattern } from "../_shared/orion.ts";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return response({ error: "method_not_allowed" }, 405);
  const payload = await jsonPayload(request);
  const actorId = await callerId(request.headers.get("Authorization"));
  if (!actorId) return response({ error: "reschedule_not_permitted" }, 401);
  if (payload?.action === "list") {
    const { data, error } = await serviceClient().rpc("get_my_reschedule_requests", { actor_profile_id: actorId });
    if (error) return response({ error: "reschedule_not_permitted" }, 403);
    return response({ requests: data ?? [] }, 200);
  }
  if (!payload || typeof payload.requestId !== "string" || typeof payload.approve !== "boolean"
      || typeof payload.idempotencyKey !== "string" || !uuidPattern.test(payload.requestId)
      || !uuidPattern.test(payload.idempotencyKey) || (payload.reason !== undefined && typeof payload.reason !== "string")) {
    return response({ error: "invalid_request" }, 400);
  }
  const { data, error } = await serviceClient().rpc("review_appointment_reschedule", {
    target_request_id: payload.requestId, approve: payload.approve, decision_reason: payload.reason ?? null,
    request_id: payload.idempotencyKey, actor_profile_id: actorId,
  });
  if (error) {
    if (/slot_unavailable/.test(error.message)) return response({ error: "slot_unavailable" }, 409);
    if (/reschedule_not_permitted/.test(error.message)) return response({ error: "reschedule_not_permitted" }, 403);
    return response({ error: "reschedule_failed" }, 500);
  }
  return response({ request: data?.[0] }, 200);
});
