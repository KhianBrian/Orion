#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHmac, randomUUID } from "node:crypto";
import { once } from "node:events";
import { spawn } from "node:child_process";

const users = Number(process.env.DIRECT_WEBRTC_LOAD_USERS || 30);
const sessionsPerWave = Number(process.env.DIRECT_WEBRTC_LOAD_SESSIONS || 10);
const waves = Number(process.env.DIRECT_WEBRTC_LOAD_WAVES || 2);
const port = 19000 + Math.floor(Math.random() * 1000);
const secret = `load-${randomUUID()}`;
const participantsPerWave = sessionsPerWave * 2;

if (!Number.isInteger(users) || users < 30) throw new Error("DIRECT_WEBRTC_LOAD_USERS must be at least 30");
if (!Number.isInteger(sessionsPerWave) || sessionsPerWave < 1 || participantsPerWave > users) {
  throw new Error("DIRECT_WEBRTC_LOAD_SESSIONS must create no more participants than DIRECT_WEBRTC_LOAD_USERS");
}
if (!Number.isInteger(waves) || waves < 1) throw new Error("DIRECT_WEBRTC_LOAD_WAVES must be at least 1");

const appRoot = new URL("../", import.meta.url).pathname;
const gateway = spawn(process.execPath, ["tools/direct-webrtc-signaling.mjs"], {
  cwd: appRoot,
  env: { ...process.env, DIRECT_WEBRTC_SIGNALING_PORT: String(port), DIRECT_WEBRTC_SIGNALING_SECRET: secret },
  stdio: ["ignore", "pipe", "pipe"],
});

function token(sessionId, role, userId) {
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const now = Math.floor(Date.now() / 1000);
  const header = encode({ alg: "HS256", typ: "JWT" });
  const payload = encode({ sub: userId, sid: sessionId, role, iat: now, exp: now + 120 });
  const signature = createHmac("sha256", secret).update(`${header}.${payload}`).digest("base64url");
  return `${header}.${payload}.${signature}`;
}

function queue(socket) {
  const messages = [];
  const waiters = [];
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    const waiter = waiters.shift();
    if (waiter) waiter(message);
    else messages.push(message);
  });
  return {
    next() {
      return messages.length ? Promise.resolve(messages.shift()) : new Promise((resolve) => waiters.push(resolve));
    },
  };
}

async function open(url, tokenValue) {
  const socket = new WebSocket(url, ["orion.direct-webrtc.v1", tokenValue]);
  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });
  return socket;
}

async function nextMatching(messages, predicate, label) {
  for (;;) {
    const message = await messages.next();
    if (predicate(message)) return message;
    if (message.type === "error") throw new Error(`${label}: unexpected signaling error`);
  }
}

async function runWave(wave) {
  const sockets = [];
  const used = new Set();
  try {
    await Promise.all(Array.from({ length: sessionsPerWave }, async (_, index) => {
      const sessionId = `load-${wave}-${index}-${randomUUID()}`;
      const patientUser = (wave * sessionsPerWave + index * 2) % users;
      const psychiatristUser = (patientUser + 1) % users;
      used.add(patientUser);
      used.add(psychiatristUser);
      const patient = await open(`ws://127.0.0.1:${port}/signaling`, token(sessionId, "patient", `user-${patientUser}`));
      const psychiatrist = await open(`ws://127.0.0.1:${port}/signaling`, token(sessionId, "psychiatrist", `user-${psychiatristUser}`));
      const patientMessages = queue(patient);
      const psychiatristMessages = queue(psychiatrist);
      sockets.push(patient, psychiatrist);

      patient.send(JSON.stringify({ type: "join", sessionId }));
      psychiatrist.send(JSON.stringify({ type: "join", sessionId }));
      assert.deepEqual(await nextMatching(patientMessages, (message) => message.type === "joined", "patient join"), { type: "joined", role: "patient" });
      assert.deepEqual(await nextMatching(psychiatristMessages, (message) => message.type === "joined", "psychiatrist join"), { type: "joined", role: "psychiatrist" });
      await nextMatching(patientMessages, (message) => message.type === "peer_joined", "peer join");

      const largeSdp = `v=0\r\n${"a=x-load:".repeat(700)}${randomUUID()}`;
      patient.send(JSON.stringify({ type: "offer", description: { type: "offer", sdp: largeSdp } }));
      const offer = await nextMatching(psychiatristMessages, (message) => message.type === "offer", "large offer");
      assert.equal(offer.from, "patient");
      assert.equal(offer.description.sdp, largeSdp);

      psychiatrist.send(JSON.stringify({ type: "answer", description: { type: "answer", sdp: largeSdp } }));
      const answer = await nextMatching(patientMessages, (message) => message.type === "answer", "large answer");
      assert.equal(answer.from, "psychiatrist");
      assert.equal(answer.description.sdp, largeSdp);

      patient.send(JSON.stringify({ type: "heartbeat" }));
      psychiatrist.send(JSON.stringify({ type: "heartbeat" }));
      await nextMatching(patientMessages, (message) => message.type === "heartbeat_ack", "patient heartbeat");
      await nextMatching(psychiatristMessages, (message) => message.type === "heartbeat_ack", "psychiatrist heartbeat");
    }));
    return used.size;
  } finally {
    sockets.forEach((socket) => socket.close());
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
}

try {
  await once(gateway.stdout, "data");
  const startedAt = Date.now();
  const usersSeen = new Set();
  for (let wave = 0; wave < waves; wave += 1) {
    const waveUsers = await runWave(wave);
    for (let index = 0; index < waveUsers; index += 1) usersSeen.add((wave * sessionsPerWave + index) % users);
  }
  assert.equal(usersSeen.size, Math.min(users, waves * participantsPerWave));
  console.log(JSON.stringify({
    users,
    waves,
    sessionsPerWave,
    peakParticipants: participantsPerWave,
    uniqueUsersExercised: usersSeen.size,
    elapsedMs: Date.now() - startedAt,
    result: "passed",
  }));
} finally {
  gateway.kill("SIGTERM");
}
