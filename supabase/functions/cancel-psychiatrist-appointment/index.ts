import { callerId, corsHeaders, jsonPayload, response, serviceClient, uuidPattern } from "../_shared/orion.ts";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return response({ error: "method_not_allowed" }, 405);
  const payload = await jsonPayload(request);
  const actorId = await callerId(request.headers.get("Authorization"));
  if (!actorId) return response({ error: "cancellation_not_permitted" }, 401);
  if (!payload || typeof payload.appointmentId !== "string" || typeof payload.idempotencyKey !== "string"
      || typeof payload.reasonCode !== "string" || !uuidPattern.test(payload.appointmentId)
      || !uuidPattern.test(payload.idempotencyKey) || (payload.explanation !== undefined && typeof payload.explanation !== "string")) {
    return response({ error: "invalid_request" }, 400);
  }
  const { data, error } = await serviceClient().rpc("cancel_appointment_for_psychiatrist", {
    appointment_id: payload.appointmentId, request_id: payload.idempotencyKey,
    reason_code: payload.reasonCode, explanation: payload.explanation ?? null, actor_profile_id: actorId,
  });
  if (error) {
    if (/cancellation_not_permitted/.test(error.message)) return response({ error: "cancellation_not_permitted" }, 403);
    if (/invalid_request/.test(error.message)) return response({ error: "invalid_request" }, 400);
    return response({ error: "cancellation_failed" }, 500);
  }
  return response({ appointment: data?.[0] }, 200);
});
