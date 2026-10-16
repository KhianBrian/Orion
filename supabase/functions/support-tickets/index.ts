import { callerId, corsHeaders, jsonPayload, response, serviceClient, uuidPattern } from "../_shared/orion.ts";

async function callerRole(actorId: string) {
  const { data, error } = await serviceClient().from("profiles").select("role").eq("id", actorId).single();
  return error ? null : data?.role;
}

const allowedAttachmentTypes = ["image/png", "image/jpeg", "application/pdf", "text/plain"];
const maxAttachmentBytes = 10 * 1024 * 1024;

async function signedAttachments(client: ReturnType<typeof serviceClient>, ticketId: string, actorId: string) {
  const { data, error } = await client.rpc("get_support_ticket_attachments", {
    target_ticket_id: ticketId,
    actor_profile_id: actorId,
  });
  if (error) throw error;
  const attachments = await Promise.all((data ?? []).map(async (attachment) => {
    const { data: signed, error: signedError } = await client.storage
      .from("support-attachments")
      .createSignedUrl(attachment.storage_path, 3600);
    if (signedError) throw signedError;
    return { ...attachment, download_url: signed.signedUrl };
  }));
  return attachments;
}

const ticketStatuses = ["in_progress", "awaiting_requester", "resolved", "closed"];
const statusReasonCodes = ["abuse", "duplicate", "requester_confirmed", "other"];

// Lifecycle commands return generic, content-free error codes.
function lifecycleError(error: { message?: string } | null) {
  const message = error?.message ?? "";
  if (message.includes("support_ticket_closed")) return response({ error: "support_ticket_closed" }, 409);
  if (message.includes("support_ticket_transition_not_allowed")) return response({ error: "support_ticket_transition_not_allowed" }, 409);
  if (message.includes("support_ticket_invalid_request")) return response({ error: "invalid_request" }, 400);
  return response({ error: "support_ticket_not_permitted" }, 403);
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
    const allowedCategories = ["technical_issue", "account_access", "booking_scheduling", "payment_billing", "clinician_or_user_concern", "privacy_or_data", "other"];
    if (!(["patient", "psychiatrist"] as string[]).includes(role ?? "") || typeof payload.categoryCode !== "string" || !allowedCategories.includes(payload.categoryCode) || typeof payload.body !== "string" || typeof payload.idempotencyKey !== "string"
      || !uuidPattern.test(payload.idempotencyKey) || payload.body.trim().length === 0 || payload.body.length > 2000) {
      return response({ error: "invalid_request" }, 400);
    }
    const { data, error } = await client.rpc("create_support_ticket", {
      actor_profile_id: actorId,
      request_id: payload.idempotencyKey,
      ticket_category_code: payload.categoryCode,
      message_body: payload.body,
    });
    if (!error) return response({ ticket: data?.[0] ?? null }, 201);

    // Keep the deployed app usable while an older database schema is being
    // upgraded. The topic is retained in the initial message and the
    // idempotency key prevents duplicate tickets during the transition.
    const legacy = await client.rpc("create_support_ticket", {
      actor_profile_id: actorId,
      request_id: payload.idempotencyKey,
      message_body: "Topic: " + payload.categoryCode + "\n\n" + payload.body,
    });
    if (legacy.error) return response({ error: "support_ticket_not_permitted" }, 403);
    return response({ ticket: legacy.data?.[0] ?? null }, 201);
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

  if (payload.action === "notifications") {
    if (!(["patient", "psychiatrist", "admin"] as string[]).includes(role ?? "")) return response({ error: "support_ticket_not_permitted" }, 403);
    const { data, error } = await client.rpc("get_support_notification_counts", { actor_profile_id: actorId });
    if (error) return response({ error: "support_ticket_not_permitted" }, 403);
    return response({
      unreadTickets: data?.[0]?.unread_tickets ?? 0,
    });
  }

  // Status changes are admin-only. Tickets have no owner: any admin may change any ticket's
  // status. The database re-checks the role and the allowed moves.
  if (payload.action === "set-status") {
    if (role !== "admin") return response({ error: "support_ticket_not_permitted" }, 403);
    if (typeof payload.ticketId !== "string" || !uuidPattern.test(payload.ticketId)) return response({ error: "invalid_request" }, 400);
    if (typeof payload.status !== "string" || !ticketStatuses.includes(payload.status)
      || (payload.reasonCode !== undefined && payload.reasonCode !== null
        && (typeof payload.reasonCode !== "string" || !statusReasonCodes.includes(payload.reasonCode)))) {
      return response({ error: "invalid_request" }, 400);
    }
    const { data, error } = await client.rpc("set_support_ticket_status", {
      target_ticket_id: payload.ticketId,
      actor_profile_id: actorId,
      new_status: payload.status,
      change_reason_code: payload.reasonCode ?? null,
    });
    if (error) return lifecycleError(error);
    return response({ ticket: data?.[0] ?? null });
  }

  if (payload.action === "prepare-upload" && typeof payload.ticketId === "string"
    && uuidPattern.test(payload.ticketId) && typeof payload.fileName === "string"
    && typeof payload.mimeType === "string" && typeof payload.sizeBytes === "number") {
    if (!(["patient", "psychiatrist"] as string[]).includes(role ?? "")
      || !allowedAttachmentTypes.includes(payload.mimeType)
      || payload.sizeBytes < 1 || payload.sizeBytes > maxAttachmentBytes
      || payload.fileName.trim().length < 1 || payload.fileName.length > 180) {
      return response({ error: "invalid_request" }, 400);
    }
    try {
      await signedAttachments(client, payload.ticketId, actorId);
      const safeName = payload.fileName.trim().replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 120);
      const path = payload.ticketId + "/" + crypto.randomUUID() + "-" + safeName;
      const { data, error } = await client.storage.from("support-attachments").createSignedUploadUrl(path);
      if (error) return response({ error: "support_attachment_not_permitted" }, 403);
      return response({ path, token: data.token }, 200);
    } catch {
      return response({ error: "support_attachment_not_permitted" }, 403);
    }
  }

  if (payload.action === "register-attachment" && typeof payload.ticketId === "string"
    && typeof payload.path === "string" && typeof payload.fileName === "string"
    && typeof payload.mimeType === "string" && typeof payload.sizeBytes === "number"
    && uuidPattern.test(payload.ticketId)) {
    if (!(["patient", "psychiatrist"] as string[]).includes(role ?? "")
      || !allowedAttachmentTypes.includes(payload.mimeType)
      || payload.sizeBytes < 1 || payload.sizeBytes > maxAttachmentBytes
      || !payload.path.startsWith(payload.ticketId + "/")) {
      return response({ error: "invalid_request" }, 400);
    }
    const { data, error } = await client.rpc("register_support_ticket_attachment", {
      target_ticket_id: payload.ticketId,
      actor_profile_id: actorId,
      target_storage_path: payload.path,
      target_original_name: payload.fileName,
      target_mime_type: payload.mimeType,
      target_size_bytes: payload.sizeBytes,
    });
    if (error) return response({ error: "support_attachment_not_permitted" }, 403);
    return response({ attachment: data?.[0] ?? null }, 201);
  }

  if (payload.action === "read" && typeof payload.ticketId === "string" && uuidPattern.test(payload.ticketId)) {
    const functionName = role === "patient" || role === "psychiatrist" ? "read_my_support_ticket" : role === "admin" ? "read_admin_support_ticket" : null;
    if (!functionName) return response({ error: "support_ticket_not_permitted" }, 403);
    const params = { target_ticket_id: payload.ticketId, actor_profile_id: actorId };
    const { data, error } = await client.rpc(functionName, params);
    if (error) return response({ error: "support_ticket_not_permitted" }, 403);
    try {
      return response({ messages: data ?? [], attachments: await signedAttachments(client, payload.ticketId, actorId) });
    } catch {
      // Attachment metadata may not exist until the storage migration is
      // applied. Keep the ticket conversation readable during that rollout.
      return response({ messages: data ?? [], attachments: [] });
    }
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
    if (error) return lifecycleError(error);
    return response({ message: data?.[0] ?? null }, 201);
  }

  return response({ error: "invalid_request" }, 400);
});
