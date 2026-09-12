import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function response(body: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function validText(value: unknown, maxLength: number) {
  return typeof value === "string" && value.trim().length > 0 && value.trim().length <= maxLength;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return response({ error: "method_not_allowed" }, 405);

  const authorization = request.headers.get("Authorization");
  if (!authorization) return response({ error: "provisioning_not_permitted" }, 401);

  let payload: {
    email?: unknown;
    fullName?: unknown;
    displayName?: unknown;
    bio?: unknown;
  };
  try {
    payload = await request.json();
  } catch {
    return response({ error: "invalid_request" }, 400);
  }

  if (typeof payload.email !== "string"
      || !emailPattern.test(payload.email.trim())
      || !validText(payload.fullName, 200)
      || !validText(payload.displayName, 200)
      || (payload.bio !== undefined && payload.bio !== null && !validText(payload.bio, 2000))) {
    return response({ error: "invalid_request" }, 400);
  }

  const callerClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { global: { headers: { Authorization: authorization } } },
  );
  const { data: userData, error: userError } = await callerClient.auth.getUser();
  if (userError || !userData.user) return response({ error: "provisioning_not_permitted" }, 401);

  const serviceClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const { data: adminProfile, error: adminError } = await serviceClient
    .from("profiles")
    .select("role")
    .eq("id", userData.user.id)
    .eq("role", "admin")
    .maybeSingle();
  if (adminError || !adminProfile) return response({ error: "provisioning_not_permitted" }, 403);

  const inviteOptions: {
    data: { full_name: string };
    redirectTo?: string;
  } = { data: { full_name: payload.fullName } };
  const requestOrigin = request.headers.get("Origin")?.replace(/\/$/, "");
  if (requestOrigin) inviteOptions.redirectTo = `${requestOrigin}/auth/confirm?mode=invite`;

  const { data: invited, error: inviteError } = await serviceClient.auth.admin.inviteUserByEmail(
    payload.email.trim().toLowerCase(),
    inviteOptions,
  );
  if (inviteError) {
    if (/already registered|already exists/i.test(inviteError.message)) return response({ error: "account_already_exists" }, 409);
    return response({ error: "provisioning_failed" }, 502);
  }

  const { data: provisioned, error: provisionError } = await serviceClient.rpc("provision_psychiatrist", {
    target_user_id: invited.user.id,
    target_full_name: payload.fullName,
    target_display_name: payload.displayName,
    target_bio: payload.bio ?? null,
    actor_profile_id: userData.user.id,
  });
  if (provisionError) {
    await serviceClient.auth.admin.deleteUser(invited.user.id);
    if (provisionError.message.includes("provisioning_not_permitted")) return response({ error: "provisioning_not_permitted" }, 403);
    return response({ error: "provisioning_failed" }, 500);
  }

  return response({ psychiatrist: provisioned?.[0] }, 201);
});
