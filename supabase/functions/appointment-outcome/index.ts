import { callerId, corsHeaders, jsonPayload, response, serviceClient, uuidPattern } from "../_shared/orion.ts";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return response({ error: "method_not_allowed" }, 405);
  const payload = await jsonPayload(request);
  const actorId = await callerId(request.headers.get("Authorization"));
  if (!actorId) return response({ error: "outcome_not_permitted" }, 401);
  if (!payload || typeof payload.appointmentId !== "string" || typeof payload.status !== "string"
      || typeof payload.idempotencyKey !== "string" || !uuidPattern.test(payload.appointmentId)
      || !uuidPattern.test(payload.idempotencyKey) || !["completed", "no_show"].includes(payload.status)
      || (payload.absentParty !== undefined && payload.absentParty !== null && !["patient", "psychiatrist"].includes(payload.absentParty as string))) {
    return response({ error: "invalid_request" }, 400);
  }
  const { data, error } = await serviceClient().rpc("record_appointment_outcome", {
    target_appointment_id: payload.appointmentId, next_status: payload.status,
    absent_party: payload.absentParty ?? null, request_id: payload.idempotencyKey, actor_profile_id: actorId,
  });
  if (error) {
    if (/outcome_not_permitted/.test(error.message)) return response({ error: "outcome_not_permitted" }, 403);
    return response({ error: "outcome_failed" }, 500);
  }
  return response({ appointment: data?.[0] }, 200);
});
