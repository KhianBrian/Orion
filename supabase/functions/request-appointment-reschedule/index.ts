import { callerId, corsHeaders, jsonPayload, response, serviceClient, uuidPattern } from "../_shared/orion.ts";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return response({ error: "method_not_allowed" }, 405);
  const payload = await jsonPayload(request);
  const actorId = await callerId(request.headers.get("Authorization"));
  if (!actorId) return response({ error: "reschedule_not_permitted" }, 401);
  if (!payload || typeof payload.appointmentId !== "string" || typeof payload.slotId !== "string"
      || typeof payload.idempotencyKey !== "string" || !uuidPattern.test(payload.appointmentId)
      || !uuidPattern.test(payload.slotId) || !uuidPattern.test(payload.idempotencyKey)) {
    return response({ error: "invalid_request" }, 400);
  }
  const { data, error } = await serviceClient().rpc("request_appointment_reschedule", {
    target_appointment_id: payload.appointmentId, requested_slot_id: payload.slotId,
    request_id: payload.idempotencyKey, actor_profile_id: actorId,
  });
  if (error) {
    if (/slot_unavailable/.test(error.message)) return response({ error: "slot_unavailable" }, 409);
    if (/reschedule_pending/.test(error.message)) return response({ error: "reschedule_pending" }, 409);
    if (/reschedule_not_permitted/.test(error.message)) return response({ error: "reschedule_not_permitted" }, 403);
    return response({ error: "reschedule_failed" }, 500);
  }
  return response({ request: data?.[0] }, 201);
});
