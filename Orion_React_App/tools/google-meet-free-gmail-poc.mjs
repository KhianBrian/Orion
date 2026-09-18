#!/usr/bin/env node

/**
 * Non-production Google Meet feasibility test for a free Gmail account.
 *
 * This script deliberately does not use Orion data, Supabase, the existing
 * JaaS demo path, or any patient information. It requests only the scope
 * required to create a Meet space, then prints the result for manual testing.
 *
 * Official references:
 * - https://developers.google.com/workspace/meet/api/reference/rest/v2/spaces/create
 * - https://developers.google.com/workspace/meet/api/guides/authenticate-authorize
 */

import http from "node:http";
import { createInterface } from "node:readline/promises";
import { URL } from "node:url";
import { execFile } from "node:child_process";
import { randomBytes, timingSafeEqual } from "node:crypto";

const CLIENT_ID = process.env.GOOGLE_MEET_POC_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_MEET_POC_CLIENT_SECRET;
const REDIRECT_URI = process.env.GOOGLE_MEET_POC_REDIRECT_URI || "http://127.0.0.1:8787/oauth2/callback";
const SCOPES = ["https://www.googleapis.com/auth/meetings.space.created"];
const OAUTH_STATE = randomBytes(24).toString("hex");
const TEST_END_ACTIVE_CONFERENCE = process.argv.includes("--test-end-active-conference");

function fail(message) {
  console.error(`Google Meet POC failed: ${message}`);
  process.exitCode = 1;
}

function describeApiError(payload) {
  const error = payload?.error;
  if (!error) return "unknown_error";

  const detailReasons = Array.isArray(error.details)
    ? error.details
        .map((detail) => detail?.reason || detail?.metadata?.consumer || detail?.metadata?.service)
        .filter(Boolean)
        .join(", ")
    : "";

  return [error.status, error.message, detailReasons].filter(Boolean).join(" — ");
}

function requiredEnv() {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    fail([
      "missing OAuth client configuration.",
      "Set GOOGLE_MEET_POC_CLIENT_ID and GOOGLE_MEET_POC_CLIENT_SECRET first.",
      "Do not put either value in Git, the browser bundle, or a VITE_* variable.",
    ].join(" "));
    return false;
  }

  const redirect = new URL(REDIRECT_URI);
  if (redirect.hostname !== "127.0.0.1" && redirect.hostname !== "localhost") {
    fail("the redirect URI must point to localhost for this local-only test.");
    return false;
  }
  return true;
}

function openBrowser(url) {
  execFile("open", [url], (error) => {
    if (error) {
      console.log("Open this URL manually in the Gmail browser session:");
      console.log(url);
    }
  });
}

function waitForOAuthCode() {
  return new Promise((resolve, reject) => {
    const redirect = new URL(REDIRECT_URI);
    const server = http.createServer((request, response) => {
      const requestUrl = new URL(request.url, `http://${request.headers.host}`);
      if (requestUrl.pathname !== redirect.pathname) {
        response.writeHead(404);
        response.end("Not found");
        return;
      }

      const error = requestUrl.searchParams.get("error");
      const code = requestUrl.searchParams.get("code");
      const returnedState = requestUrl.searchParams.get("state") || "";
      if (error) {
        response.writeHead(400, { "Content-Type": "text/plain" });
        response.end("Google authorization was denied. You may close this tab.");
        server.close();
        reject(new Error(`Google authorization returned ${error}`));
        return;
      }

      if (!code) {
        response.writeHead(400, { "Content-Type": "text/plain" });
        response.end("No authorization code was returned. You may close this tab.");
        server.close();
        reject(new Error("Google did not return an authorization code"));
        return;
      }

      const expectedState = Buffer.from(OAUTH_STATE);
      const actualState = Buffer.from(returnedState);
      if (expectedState.length !== actualState.length || !timingSafeEqual(expectedState, actualState)) {
        response.writeHead(400, { "Content-Type": "text/plain" });
        response.end("Authorization state mismatch. You may close this tab.");
        server.close();
        reject(new Error("Google authorization state did not match"));
        return;
      }

      response.writeHead(200, { "Content-Type": "text/plain" });
      response.end("Authorization received. You may close this tab and return to the terminal.");
      server.close();
      resolve(code);
    });

    server.on("error", reject);
    server.listen(Number(redirect.port || 80), redirect.hostname, () => {
      const authorizationUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
      authorizationUrl.searchParams.set("client_id", CLIENT_ID);
      authorizationUrl.searchParams.set("redirect_uri", REDIRECT_URI);
      authorizationUrl.searchParams.set("response_type", "code");
      authorizationUrl.searchParams.set("scope", SCOPES.join(" "));
      authorizationUrl.searchParams.set("state", OAUTH_STATE);
      authorizationUrl.searchParams.set("access_type", "offline");
      authorizationUrl.searchParams.set("prompt", "consent");

      console.log("Opening Google authorization in your default browser...");
      console.log("Use the Gmail account you want to test.");
      openBrowser(authorizationUrl.toString());
    });
  });
}

async function exchangeCode(code) {
  const body = new URLSearchParams({
    code,
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    redirect_uri: REDIRECT_URI,
    grant_type: "authorization_code",
  });

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const payload = await response.json();
  if (!response.ok || !payload.access_token) {
    throw new Error(`token exchange failed (${response.status}): ${describeApiError(payload)}`);
  }
  return payload.access_token;
}

async function createMeetingSpace(accessToken) {
  const response = await fetch("https://meet.googleapis.com/v2/spaces", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}),
  });
  const payload = await response.json();
  if (!response.ok || !payload.name || !payload.meetingUri) {
    throw new Error(`Meet space creation failed (${response.status}): ${describeApiError(payload)}`);
  }
  return payload;
}

async function endActiveConference(accessToken, spaceName) {
  const response = await fetch(
    `https://meet.googleapis.com/v2/${spaceName}:endActiveConference`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );
  const responseText = await response.text();
  let payload = {};

  if (responseText) {
    try {
      payload = JSON.parse(responseText);
    } catch {
      payload = { error: { message: responseText } };
    }
  }

  if (!response.ok) {
    throw new Error(
      `Meet active-conference end failed (${response.status}): ${describeApiError(payload)}`,
    );
  }
}

async function waitForManualApiEnd() {
  const prompt = createInterface({ input: process.stdin, output: process.stdout });
  try {
    await prompt.question(
      "\nAfter the host and guest are both in the meeting, press Enter to end it through the API.",
    );
  } finally {
    prompt.close();
  }
}

async function main() {
  if (!requiredEnv()) return;

  try {
    const code = await waitForOAuthCode();
    const accessToken = await exchangeCode(code);
    const space = await createMeetingSpace(accessToken);

    console.log("\nPASS: free Gmail account authorized Google Meet API space creation.");
    console.log(`Provider space: ${space.name}`);
    console.log(`Meeting URI: ${space.meetingUri}`);
    if (TEST_END_ACTIVE_CONFERENCE) {
      console.log("\nAPI end-conference test:");
      console.log("1. Open the URI as the psychiatrist/host.");
      console.log("2. Open the URI in an incognito window and join as the guest.");
      console.log("3. Have the host admit the guest and keep both browsers in the call.");
      await waitForManualApiEnd();
      await endActiveConference(accessToken, space.name);
      console.log("\nPASS: Google Meet active conference ended through the REST API.");
      console.log("Verify that both browsers were disconnected and the meeting cannot be rejoined until the host restarts it.");
    } else {
      console.log("\nManual checks still required:");
      console.log("1. Open the URI as the psychiatrist/host.");
      console.log("2. Open the URI in an incognito window without signing into Google.");
      console.log("3. Confirm the guest can request entry and the host can admit them.");
      console.log("4. Leave and rejoin during the same call.");
      console.log("5. Confirm the psychiatrist can end the call for everyone.");
      console.log("6. Confirm the chosen account exposes the access controls Orion requires.");
    }
    console.log("\nNo token or meeting URI was written to disk by this script.");
  } catch (error) {
    fail(error instanceof Error ? error.message : String(error));
  }
}

await main();
