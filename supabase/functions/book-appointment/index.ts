import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function response(body: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return response({ error: "method_not_allowed" }, 405);

  const authorization = request.headers.get("Authorization");
  if (!authorization) return response({ error: "booking_not_permitted" }, 401);

  let payload: { slotId?: unknown; idempotencyKey?: unknown };
  try {
    payload = await request.json();
  } catch {
    return response({ error: "invalid_request" }, 400);
  }

  if (typeof payload.slotId !== "string" || typeof payload.idempotencyKey !== "string") {
    return response({ error: "invalid_request" }, 400);
  }

  const callerClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { global: { headers: { Authorization: authorization } } },
  );

  const { data: userData, error: userError } = await callerClient.auth.getUser();
  if (userError || !userData.user) return response({ error: "booking_not_permitted" }, 401);

  const serviceClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  const { data, error } = await serviceClient.rpc("book_appointment_for_patient", {
    requested_slot_id: payload.slotId,
    request_id: payload.idempotencyKey,
    actor_profile_id: userData.user.id,
  });

  if (error) {
    if (error.message.includes("slot_unavailable")) return response({ error: "slot_unavailable" }, 409);
    if (error.message.includes("booking_not_permitted")) return response({ error: "booking_not_permitted" }, 403);
    return response({ error: "booking_failed" }, 500);
  }

  return response({ appointment: data?.[0] }, 201);
});
