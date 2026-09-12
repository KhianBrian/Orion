import { callerId, corsHeaders, jsonPayload, response, serviceClient, uuidPattern } from "../_shared/orion.ts";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return response({ error: "method_not_allowed" }, 405);
  const payload = await jsonPayload(request);
  const actorId = await callerId(request.headers.get("Authorization"));
  if (!actorId || !payload || typeof payload.action !== "string") return response({ error: "note_not_permitted" }, 401);
  const client = serviceClient();
  if (payload.action === "index") {
    const { data, error } = await client.rpc("get_my_session_notes", { actor_profile_id: actorId });
    if (error) return response({ error: "note_not_permitted" }, 403);
    return response({ notes: data ?? [] }, 200);
  }
  if (payload.action === "read" && typeof payload.noteId === "string" && uuidPattern.test(payload.noteId)) {
    const { data, error } = await client.rpc("read_session_note", { target_note_id: payload.noteId, actor_profile_id: actorId });
    if (error) return response({ error: "note_not_permitted" }, 403);
    return response({ note: data?.[0] ?? null }, 200);
  }
  if (payload.action === "create" && typeof payload.appointmentId === "string" && typeof payload.body === "string"
      && uuidPattern.test(payload.appointmentId) && payload.body.trim().length > 0 && payload.body.length <= 10000
      && (payload.supersedesNoteId === undefined || payload.supersedesNoteId === null
        || (typeof payload.supersedesNoteId === "string" && uuidPattern.test(payload.supersedesNoteId)))) {
    const { data, error } = await client.rpc("create_session_note", {
      target_appointment_id: payload.appointmentId, note_body: payload.body,
      actor_profile_id: actorId, superseded_note_id: payload.supersedesNoteId ?? null,
    });
    if (error) return response({ error: "note_not_permitted" }, 403);
    return response({ note: data?.[0] }, 201);
  }
  if (payload.action === "release" && typeof payload.noteId === "string" && uuidPattern.test(payload.noteId)) {
    const { data, error } = await client.rpc("release_session_note", { target_note_id: payload.noteId, actor_profile_id: actorId });
    if (error) return response({ error: "note_not_permitted" }, 403);
    return response({ releasedAt: data }, 200);
  }
  return response({ error: "invalid_request" }, 400);
});
