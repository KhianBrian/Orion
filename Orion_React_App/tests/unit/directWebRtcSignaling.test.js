import { strict as assert } from "node:assert";
import { createHmac, randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { once } from "node:events";
import test from "node:test";
import {
  isOfferCollision,
  nextSignalingReconnectDelay,
  shouldIgnoreOffer,
} from "../../src/lib/directWebRtcSession.js";

const appRoot = new URL("../../", import.meta.url).pathname;

function token(sessionId, role, secret, subject = `${role}-${randomUUID()}`) {
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const header = encode({ alg: "HS256", typ: "JWT" });
  const payload = encode({ sub: subject, sid: sessionId, role, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 60 });
  const signature = createHmac("sha256", secret).update(`${header}.${payload}`).digest("base64url");
  return `${header}.${payload}.${signature}`;
}

function messageQueue(socket) {
  const queued = [];
  const waiting = [];
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    const resolve = waiting.shift();
    if (resolve) resolve(message);
    else queued.push(message);
  });
  return {
    next() {
      return queued.length ? Promise.resolve(queued.shift()) : new Promise((resolve) => waiting.push(resolve));
    },
  };
}

function openSocket(url, tokenValue) {
  const socket = new WebSocket(url, ["orion.direct-webrtc.v1", tokenValue]);
  return new Promise((resolve, reject) => {
    socket.addEventListener("open", () => resolve(socket), { once: true });
    socket.addEventListener("error", reject, { once: true });
  });
}

async function health(port) {
  const response = await fetch(`http://127.0.0.1:${port}/healthz`);
  return { status: response.status, body: await response.json() };
}

test("reconnect backoff is bounded and collision handling is deterministic", () => {
  assert.deepEqual([
    nextSignalingReconnectDelay(1, 100),
    nextSignalingReconnectDelay(2, 100),
    nextSignalingReconnectDelay(3, 100),
  ], [100, 200, 400]);
  assert.equal(nextSignalingReconnectDelay(0, 100), 100);

  const collision = isOfferCollision({
    makingOffer: false,
    signalingState: "have-local-offer",
    isSettingRemoteAnswerPending: false,
  });
  assert.equal(collision, true);
  assert.equal(shouldIgnoreOffer({ polite: false, offerCollision: collision }), true);
  assert.equal(shouldIgnoreOffer({ polite: true, offerCollision: collision }), false);
  assert.equal(isOfferCollision({
    makingOffer: false,
    signalingState: "stable",
    isSettingRemoteAnswerPending: false,
  }), false);
});

test("dedicated signaling boundary enforces two roles and forwards setup only", async () => {
  const secret = `synthetic-${randomUUID()}`;
  const port = 18000 + Math.floor(Math.random() * 1000);
  const gateway = spawn(process.execPath, ["tools/direct-webrtc-signaling.mjs"], {
    cwd: appRoot,
    env: { ...process.env, DIRECT_WEBRTC_SIGNALING_PORT: String(port), DIRECT_WEBRTC_SIGNALING_SECRET: secret },
    stdio: ["ignore", "pipe", "pipe"],
  });
  try {
    await once(gateway.stdout, "data");
    assert.deepEqual(await health(port), { status: 200, body: { status: "ok" } });
    const sessionId = randomUUID();
    const patient = await openSocket(`ws://127.0.0.1:${port}/signaling`, token(sessionId, "patient", secret));
    const psychiatrist = await openSocket(`ws://127.0.0.1:${port}/signaling`, token(sessionId, "psychiatrist", secret));
    const patientMessages = messageQueue(patient);
    const psychiatristMessages = messageQueue(psychiatrist);

    patient.send(JSON.stringify({ type: "join", sessionId }));
    assert.deepEqual(await patientMessages.next(), { type: "joined", role: "patient" });
    psychiatrist.send(JSON.stringify({ type: "join", sessionId }));
    assert.deepEqual(await psychiatristMessages.next(), { type: "joined", role: "psychiatrist" });
    assert.deepEqual(await patientMessages.next(), { type: "peer_joined", role: "psychiatrist" });

    const largeSdp = `v=0\\r\\n${"a=x-test:".repeat(700)}`;
    patient.send(JSON.stringify({ type: "offer", description: { type: "offer", sdp: largeSdp }, sender: "forged" }));
    assert.deepEqual(await psychiatristMessages.next(), {
      type: "offer",
      description: { type: "offer", sdp: largeSdp },
      from: "patient",
    });

    patient.close();
    psychiatrist.close();
  } finally {
    gateway.kill("SIGTERM");
    await once(gateway, "close");
  }
});

test("same participant can replace a stale signaling lease during reconnect", async () => {
  const secret = `synthetic-${randomUUID()}`;
  const port = 18000 + Math.floor(Math.random() * 1000);
  const gateway = spawn(process.execPath, ["tools/direct-webrtc-signaling.mjs"], {
    cwd: appRoot,
    env: { ...process.env, DIRECT_WEBRTC_SIGNALING_PORT: String(port), DIRECT_WEBRTC_SIGNALING_SECRET: secret },
    stdio: ["ignore", "pipe", "pipe"],
  });
  try {
    await once(gateway.stdout, "data");
    assert.deepEqual(await health(port), { status: 200, body: { status: "ok" } });
    const sessionId = randomUUID();
    const patientId = `patient-${randomUUID()}`;
    const firstPatient = await openSocket(`ws://127.0.0.1:${port}/signaling`, token(sessionId, "patient", secret, patientId));
    const replacementPatient = await openSocket(`ws://127.0.0.1:${port}/signaling`, token(sessionId, "patient", secret, patientId));
    const replacementMessages = messageQueue(replacementPatient);
    replacementPatient.send(JSON.stringify({ type: "join", sessionId }));
    assert.deepEqual(await replacementMessages.next(), { type: "joined", role: "patient" });
    firstPatient.close();
    replacementPatient.close();
  } finally {
    gateway.kill("SIGTERM");
    await once(gateway, "close");
  }
});
