export const GOOGLE_MEET_SCOPE = "https://www.googleapis.com/auth/meetings.space.created";

function base64url(value: Uint8Array | string) {
  const bytes = typeof value === "string" ? new TextEncoder().encode(value) : value;
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function decodeBase64url(value: string) {
  const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
  return atob(normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "="));
}

async function hmac(secret: string, value: string, verify = false, signature?: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    verify ? ["verify"] : ["sign"],
  );
  const data = new TextEncoder().encode(value);
  if (verify && signature) {
    const signatureBytes = Uint8Array.from(decodeBase64url(signature), (character) => character.charCodeAt(0));
    return crypto.subtle.verify("HMAC", key, signatureBytes, data);
  }
  return base64url(new Uint8Array(await crypto.subtle.sign("HMAC", key, data)));
}

export async function signOAuthState(secret: string, profileId: string) {
  const header = base64url(JSON.stringify({ alg: "HS256", typ: "ORION_GOOGLE_OAUTH_STATE" }));
  const payload = base64url(JSON.stringify({
    sub: profileId,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 10 * 60,
    nonce: crypto.randomUUID(),
  }));
  return `${header}.${payload}.${await hmac(secret, `${header}.${payload}`)}`;
}

export async function verifyOAuthState(secret: string, state: string) {
  const [header, payload, signature] = state.split(".");
  if (!header || !payload || !signature || !(await hmac(secret, `${header}.${payload}`, true, signature))) return null;
  try {
    const claims = JSON.parse(decodeBase64url(payload));
    if (typeof claims.sub !== "string" || typeof claims.exp !== "number" || claims.exp <= Math.floor(Date.now() / 1000)) return null;
    return claims as { sub: string; exp: number; iat: number; nonce: string };
  } catch {
    return null;
  }
}

export function googleMeetConfig() {
  return {
    clientId: Deno.env.get("GOOGLE_MEET_CLIENT_ID") ?? "",
    clientSecret: Deno.env.get("GOOGLE_MEET_CLIENT_SECRET") ?? "",
    redirectUri: Deno.env.get("GOOGLE_MEET_REDIRECT_URI") ?? "",
    stateSecret: Deno.env.get("GOOGLE_MEET_STATE_SECRET") ?? "",
    appUrl: Deno.env.get("ORION_APP_URL") ?? "",
  };
}

export function hasOAuthConfig(config: ReturnType<typeof googleMeetConfig>) {
  return Boolean(config.clientId && config.clientSecret && config.redirectUri && config.stateSecret && config.appUrl);
}

export function buildAuthorizationUrl(config: ReturnType<typeof googleMeetConfig>, state: string) {
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", config.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", GOOGLE_MEET_SCOPE);
  url.searchParams.set("state", state);
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  return url.toString();
}

export async function exchangeGoogleCode(config: ReturnType<typeof googleMeetConfig>, code: string) {
  const body = new URLSearchParams({
    code,
    client_id: config.clientId,
    client_secret: config.clientSecret,
    redirect_uri: config.redirectUri,
    grant_type: "authorization_code",
  });
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || typeof payload.refresh_token !== "string") {
    const error = Object.assign(new Error("google_oauth_exchange_failed"), {
      providerStatus: response.status,
      providerError: typeof payload.error === "string" ? payload.error : null,
      providerErrorDescription: typeof payload.error_description === "string" ? payload.error_description : null,
      hasAccessToken: typeof payload.access_token === "string",
      hasRefreshToken: typeof payload.refresh_token === "string",
    });
    console.warn("google_oauth_exchange_failed", {
      status: error.providerStatus,
      error: error.providerError,
      errorDescription: error.providerErrorDescription,
      hasAccessToken: error.hasAccessToken,
      hasRefreshToken: error.hasRefreshToken,
    });
    throw error;
  }
  return payload as { refresh_token: string; access_token?: string; expires_in?: number; scope?: string; token_type?: string };
}

export async function refreshGoogleAccessToken(config: ReturnType<typeof googleMeetConfig>, refreshToken: string) {
  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const payload = await response.json();
  if (!response.ok || typeof payload.access_token !== "string") throw new Error("google_token_refresh_failed");
  return payload.access_token as string;
}

export async function revokeGoogleToken(token: string) {
  await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token)}`, { method: "POST" });
}

export async function createGoogleMeetSpace(accessToken: string) {
  const response = await fetch("https://meet.googleapis.com/v2/spaces", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  const payload = await response.json();
  if (!response.ok || typeof payload.name !== "string" || typeof payload.meetingUri !== "string") {
    throw new Error("google_meet_space_create_failed");
  }
  return { name: payload.name as string, meetingUri: payload.meetingUri as string };
}
