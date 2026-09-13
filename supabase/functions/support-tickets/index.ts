import { callerId, corsHeaders, jsonPayload, response, serviceClient, uuidPattern } from "../_shared/orion.ts";

async function callerRole(actorId: string) {
  const { data, error } = await serviceClient().from("profiles").select("role").eq("id", actorId).single();
  return error ? null : data?.role;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return response({ error: "method_not_allowed" }, 405);

  const payload = await jsonPayload(request);
  const actorId = await callerId(request.headers.get("Authorization"));
  if (!actorId || !payload || typeof payload.action !== "string") return response({ error: "support_ticket_not_permitted" }, 401);

  const client = serviceClient();
  const role = await callerRole(actorId);

  if (payload.action === "create") {
    if (!(["patient", "psychiatrist"] as string[]).includes(role ?? "") || typeof payload.body !== "string" || typeof payload.idempotencyKey !== "string"
      || !uuidPattern.test(payload.idempotencyKey) || payload.body.trim().length === 0 || payload.body.length > 2000) {
      return response({ error: "invalid_request" }, 400);
    }
    const { data, error } = await client.rpc("create_support_ticket", {
      actor_profile_id: actorId,
      request_id: payload.idempotencyKey,
      message_body: payload.body,
    });
    if (error) return response({ error: "support_ticket_not_permitted" }, 403);
    return response({ ticket: data?.[0] ?? null }, 201);
  }

  if (payload.action === "list") {
    if (role === "patient" || role === "psychiatrist") {
      const { data, error } = await client.rpc("get_my_support_tickets", { actor_profile_id: actorId });
      if (error) return response({ error: "support_ticket_not_permitted" }, 403);
      return response({ tickets: data ?? [], role });
    }
    if (role === "admin") {
      const { data, error } = await client.rpc("get_admin_support_tickets", { actor_profile_id: actorId });
      if (error) return response({ error: "support_ticket_not_permitted" }, 403);
      return response({ tickets: data ?? [], role });
    }
    return response({ error: "support_ticket_not_permitted" }, 403);
  }

  if (payload.action === "read" && typeof payload.ticketId === "string" && uuidPattern.test(payload.ticketId)) {
    const functionName = role === "patient" || role === "psychiatrist" ? "read_my_support_ticket" : role === "admin" ? "read_admin_support_ticket" : null;
    if (!functionName) return response({ error: "support_ticket_not_permitted" }, 403);
    const params = { target_ticket_id: payload.ticketId, actor_profile_id: actorId };
    const { data, error } = await client.rpc(functionName, params);
    if (error) return response({ error: "support_ticket_not_permitted" }, 403);
    return response({ messages: data ?? [] });
  }

  if (payload.action === "reply" && typeof payload.ticketId === "string" && uuidPattern.test(payload.ticketId)
    && typeof payload.body === "string" && typeof payload.idempotencyKey === "string"
    && uuidPattern.test(payload.idempotencyKey) && payload.body.trim().length > 0 && payload.body.length <= 2000
    && (["patient", "psychiatrist", "admin"] as string[]).includes(role ?? "")) {
    const { data, error } = await client.rpc("send_support_ticket_message", {
      target_ticket_id: payload.ticketId,
      actor_profile_id: actorId,
      request_id: payload.idempotencyKey,
      message_body: payload.body,
    });
    if (error) return response({ error: "support_ticket_not_permitted" }, 403);
    return response({ message: data?.[0] ?? null }, 201);
  }

  return response({ error: "invalid_request" }, 400);
});
