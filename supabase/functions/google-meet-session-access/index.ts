import {
  createGoogleMeetSpace,
  googleMeetConfig,
  hasOAuthConfig,
  refreshGoogleAccessToken,
} from "../_shared/googleMeet.ts";
import { callerId, corsHeaders, jsonPayload, response, serviceClient, uuidPattern } from "../_shared/orion.ts";

const denial = "google_meet_access_denied";
const unavailable = "google_meet_unavailable";

function errorSummary(error: unknown) {
  const value = error && typeof error === "object" ? error as Record<string, unknown> : {};
  return {
    name: typeof value.name === "string" ? value.name.slice(0, 80) : "unknown_error",
    message: typeof value.message === "string" ? value.message.slice(0, 200) : "unknown_error",
    code: typeof value.code === "string" ? value.code.slice(0, 40) : undefined,
    providerStatus: typeof value.providerStatus === "number" ? value.providerStatus : undefined,
    providerError: typeof value.providerError === "string" ? value.providerError.slice(0, 80) : undefined,
  };
}

function logFailure(stage: string, appointmentId: string, details: Record<string, unknown> = {}) {
  console.error("google_meet_access_failed", { stage, appointmentId, ...details });
}

function audit(client: ReturnType<typeof serviceClient>, actorId: string | null, appointmentId: string | null, outcome: "success" | "denied", reasonCode: string) {
  return client.from("audit_events").insert({
    actor_id: actorId,
    event_code: "google_meet_access",
    target_type: "appointment",
    target_id: appointmentId,
    outcome,
    reason_code: reasonCode,
  });
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return response({ error: "method_not_allowed" }, 405);

  const payload = await jsonPayload(request);
  const appointmentId = typeof payload?.appointmentId === "string" ? payload.appointmentId : "";
  if (!uuidPattern.test(appointmentId)) return response({ error: denial }, 400);

  const actorId = await callerId(request.headers.get("Authorization"));
  if (!actorId) return response({ error: denial }, 401);

  const client = serviceClient();
  const { data, error } = await client.rpc("get_google_meet_admission", {
    target_appointment_id: appointmentId,
    actor_profile_id: actorId,
  });
  const admission = data?.[0];
  if (error || !admission) {
    logFailure("admission", appointmentId, { error: errorSummary(error), returnedAdmission: Boolean(admission) });
    const isDenied = error?.message.includes("google_meet_access_denied");
    return response({ error: isDenied ? denial : unavailable }, isDenied ? 403 : 503);
  }

  if (admission.meeting_status === "active" && admission.meeting_uri) {
    await audit(client, actorId, appointmentId, "success", "granted_existing");
    return response({
      mode: "google-meet",
      appointmentId,
      meetingUri: admission.meeting_uri,
      startsAt: admission.starts_at,
      endsAt: admission.ends_at,
      participantRole: admission.participant_role,
    }, 200);
  }

  const config = googleMeetConfig();
  if (!hasOAuthConfig(config)) {
    logFailure("configuration", appointmentId, {
      missing: Object.entries(config).filter(([, value]) => !value).map(([key]) => key),
    });
    await audit(client, actorId, appointmentId, "denied", "provider_unavailable");
    return response({ error: unavailable }, 503);
  }

  const { data: connection, error: connectionError } = await client.from("google_meet_connections")
    .select("refresh_token")
    .eq("profile_id", admission.host_profile_id)
    .is("revoked_at", null)
    .maybeSingle();
  if (connectionError || !connection?.refresh_token) {
    logFailure("host_connection", appointmentId, { error: errorSummary(connectionError), hasRefreshToken: Boolean(connection?.refresh_token) });
    await audit(client, actorId, appointmentId, "denied", "host_not_connected");
    return response({ error: unavailable }, 503);
  }

  const claimToken = crypto.randomUUID();
  const { data: claim, error: claimError } = await client.rpc("claim_google_meet_space", {
    target_appointment_id: appointmentId,
    target_host_profile_id: admission.host_profile_id,
    requested_claim_token: claimToken,
  });
  const claimed = claim?.[0];
  if (claimError || !claimed) {
    logFailure("claim", appointmentId, { error: errorSummary(claimError), returnedClaim: Boolean(claimed) });
    await audit(client, actorId, appointmentId, "denied", "provider_busy");
    return response({ error: unavailable }, 503);
  }
  if (!claimed.claim_granted) {
    if (claimed.meeting_status === "active" && claimed.meeting_uri) {
      return response({ mode: "google-meet", appointmentId, meetingUri: claimed.meeting_uri, startsAt: admission.starts_at, endsAt: admission.ends_at, participantRole: admission.participant_role }, 200);
    }
    logFailure("claim_busy", appointmentId, { meetingStatus: claimed.meeting_status });
    await audit(client, actorId, appointmentId, "denied", "provider_busy");
    return response({ error: unavailable }, 503);
  }

  try {
    let accessToken: string;
    try {
      accessToken = await refreshGoogleAccessToken(config, connection.refresh_token);
    } catch (error) {
      logFailure("token_refresh", appointmentId, { error: errorSummary(error) });
      await client.from("google_meet_connections").delete().eq("profile_id", admission.host_profile_id);
      await audit(client, actorId, appointmentId, "denied", "host_google_authorization_revoked");
      throw new Error("google_authorization_revoked");
    }
    const space = await createGoogleMeetSpace(accessToken);
    const { data: completed, error: completeError } = await client.rpc("complete_google_meet_space", {
      target_appointment_id: appointmentId,
      requested_claim_token: claimToken,
      provider_space_name: space.name,
      provider_meeting_uri: space.meetingUri,
    });
    if (completeError || !completed?.[0]?.meeting_uri) {
      logFailure("complete_space", appointmentId, {
        error: errorSummary(completeError),
        hasProviderUri: Boolean(space.meetingUri),
        hasCompletedUri: Boolean(completed?.[0]?.meeting_uri),
      });
      throw new Error("google_meet_space_save_failed");
    }
    await audit(client, actorId, appointmentId, "success", "granted_created");
    return response({
      mode: "google-meet",
      appointmentId,
      meetingUri: completed[0].meeting_uri,
      startsAt: admission.starts_at,
      endsAt: admission.ends_at,
      participantRole: admission.participant_role,
    }, 200);
  } catch (error) {
    logFailure("provider", appointmentId, { error: errorSummary(error) });
    const { error: failError } = await client.rpc("fail_google_meet_space", {
      target_appointment_id: appointmentId,
      requested_claim_token: claimToken,
    });
    if (failError) logFailure("mark_failed", appointmentId, { error: errorSummary(failError) });
    await audit(client, actorId, appointmentId, "denied", "provider_unavailable");
    return response({ error: unavailable }, 503);
  }
});
