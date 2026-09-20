import { callerId, corsHeaders, jsonPayload, response, serviceClient, uuidPattern } from "../_shared/orion.ts";

const timePattern = /^([01]\d|2[0-3]):[0-5]\d(:00)?$/;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return response({ error: "method_not_allowed" }, 405);
  const payload = await jsonPayload(request);
  const actorId = await callerId(request.headers.get("Authorization"));
  if (!actorId || !payload || typeof payload.action !== "string") return response({ error: "schedule_not_permitted" }, 401);
  const client = serviceClient();

  if (payload.action === "list") {
    const { data, error } = await client.rpc("get_my_schedule", { actor_profile_id: actorId });
    if (error) return response({ error: "schedule_not_permitted" }, 403);
    return response({ schedule: data ?? [] }, 200);
  }
  if (payload.action === "save-weekly-rule" && typeof payload.startsLocal === "string" && typeof payload.endsLocal === "string"
      && timePattern.test(payload.startsLocal) && timePattern.test(payload.endsLocal)) {
    const { data, error } = await client.rpc("save_weekly_schedule_period", { target_starts_local: payload.startsLocal, target_ends_local: payload.endsLocal, actor_profile_id: actorId });
    if (error) return response({ error: error.message.includes("schedule_conflict") ? "schedule_conflict" : "invalid_schedule" }, 400);
    return response({ schedule: data }, 200);
  }
  if (payload.action === "admin-list") {
    const { data, error } = await client.rpc("get_admin_schedule_overview", { actor_profile_id: actorId });
    if (error) return response({ error: "schedule_not_permitted" }, 403);
    return response({ schedule: data ?? [] }, 200);
  }
  if (payload.action === "save-rule" && typeof payload.weekday === "number" && typeof payload.startsLocal === "string" && typeof payload.endsLocal === "string"
      && timePattern.test(payload.startsLocal) && timePattern.test(payload.endsLocal)
      && (payload.ruleId === undefined || payload.ruleId === null || (typeof payload.ruleId === "string" && uuidPattern.test(payload.ruleId)))) {
    const { data, error } = await client.rpc("save_schedule_rule", { target_rule_id: payload.ruleId ?? null, target_weekday: payload.weekday, target_starts_local: payload.startsLocal, target_ends_local: payload.endsLocal, actor_profile_id: actorId });
    if (error) return response({ error: error.message.includes("schedule_conflict") ? "schedule_conflict" : "invalid_schedule" }, 400);
    return response({ schedule: data }, 200);
  }
  if (payload.action === "delete-rule" && typeof payload.ruleId === "string" && uuidPattern.test(payload.ruleId)) {
    const { error } = await client.rpc("delete_schedule_rule", { target_rule_id: payload.ruleId, actor_profile_id: actorId });
    if (error) return response({ error: error.message.includes("schedule_conflict") ? "schedule_conflict" : "schedule_not_permitted" }, 403);
    return response({}, 200);
  }
  if (payload.action === "save-override" && typeof payload.date === "string" && datePattern.test(payload.date)
      && typeof payload.startsLocal === "string" && typeof payload.endsLocal === "string" && ["available", "unavailable"].includes(payload.kind as string)
      && timePattern.test(payload.startsLocal) && timePattern.test(payload.endsLocal)
      && (payload.overrideId === undefined || payload.overrideId === null || (typeof payload.overrideId === "string" && uuidPattern.test(payload.overrideId)))) {
    const { data, error } = await client.rpc("save_schedule_override", { target_override_id: payload.overrideId ?? null, target_date: payload.date, target_starts_local: payload.startsLocal, target_ends_local: payload.endsLocal, target_kind: payload.kind, actor_profile_id: actorId });
    if (error) return response({ error: error.message.includes("schedule_conflict") ? "schedule_conflict" : "invalid_schedule" }, 400);
    return response({ schedule: data }, 200);
  }
  if (payload.action === "review-override" && typeof payload.overrideId === "string" && typeof payload.approve === "boolean" && uuidPattern.test(payload.overrideId)) {
    const { data, error } = await client.rpc("review_schedule_override", { target_override_id: payload.overrideId, approve: payload.approve, actor_profile_id: actorId });
    if (error) return response({ error: "schedule_not_permitted" }, 403);
    return response({ schedule: data }, 200);
  }
  return response({ error: "invalid_request" }, 400);
});
