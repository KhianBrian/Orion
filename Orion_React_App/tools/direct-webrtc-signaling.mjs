#!/usr/bin/env node

import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { createServer } from "node:http";

const port = Number(process.env.DIRECT_WEBRTC_SIGNALING_PORT || 8787);
const secret = process.env.DIRECT_WEBRTC_SIGNALING_SECRET;
const maxMessageBytes = 64 * 1024;
const heartbeatIntervalMs = 15_000;
const heartbeatTimeoutMs = 45_000;
const sessions = new Map();

if (!secret) {
  throw new Error("DIRECT_WEBRTC_SIGNALING_SECRET is required");
}

function base64url(value) {
  return Buffer.from(value).toString("base64url");
}

function verifyToken(token) {
  const [header, payload, signature] = String(token || "").split(".");
  if (!header || !payload || !signature) return null;
  const expected = createHmac("sha256", secret).update(`${header}.${payload}`).digest("base64url");
  const actualBytes = Buffer.from(signature);
  const expectedBytes = Buffer.from(expected);
  if (actualBytes.length !== expectedBytes.length || !timingSafeEqual(actualBytes, expectedBytes)) return null;
  try {
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!claims.sid || !claims.sub || !["patient", "psychiatrist"].includes(claims.role)
      || !Number.isInteger(claims.exp) || claims.exp <= Math.floor(Date.now() / 1000)) return null;
    return claims;
  } catch {
    return null;
  }
}

function frame(text) {
  const payload = Buffer.from(text);
  if (payload.length < 126) return Buffer.concat([Buffer.from([0x81, payload.length]), payload]);
  if (payload.length > maxMessageBytes) throw new Error("signaling message too large");
  const header = Buffer.alloc(4);
  header[0] = 0x81;
  header[1] = 126;
  header.writeUInt16BE(payload.length, 2);
  return Buffer.concat([header, payload]);
}

function send(socket, message) {
  if (!socket.destroyed) socket.write(frame(JSON.stringify(message)));
}

function close(socket, code = 1008) {
  if (socket.destroyed) return;
  const payload = Buffer.alloc(2);
  payload.writeUInt16BE(code);
  socket.write(Buffer.concat([Buffer.from([0x88, payload.length]), payload]));
  socket.end();
}

function removeParticipant(context) {
  if (context.heartbeatTimer) clearInterval(context.heartbeatTimer);
  if (context.expiryTimer) clearTimeout(context.expiryTimer);
  const session = sessions.get(context.claims.sid);
  if (!session) return;
  if (session.participants.get(context.claims.role) === context) session.participants.delete(context.claims.role);
  if (session.participants.size === 0) sessions.delete(context.claims.sid);
  else {
    for (const participant of session.participants.values()) send(participant.socket, { type: "peer_left" });
  }
}

function forward(context, message) {
  const session = sessions.get(context.claims.sid);
  if (!session) return;
  for (const participant of session.participants.values()) {
    if (participant !== context) send(participant.socket, { ...message, from: context.claims.role });
  }
}

function handleMessage(context, message) {
  if (!message || typeof message !== "object" || typeof message.type !== "string") return close(context.socket);
  if (message.type === "join") {
    if (context.joined || message.sessionId !== context.claims.sid) return close(context.socket);
    const session = sessions.get(context.claims.sid) || { participants: new Map() };
    if (session.participants.has(context.claims.role)) return close(context.socket, 1008);
    session.participants.set(context.claims.role, context);
    sessions.set(context.claims.sid, session);
    context.joined = true;
    send(context.socket, { type: "joined", role: context.claims.role });
    for (const participant of session.participants.values()) {
      if (participant !== context) send(participant.socket, { type: "peer_joined", role: context.claims.role });
    }
    return;
  }
  if (!context.joined) return close(context.socket);
  if (["offer", "answer", "ice"].includes(message.type)) {
    if (JSON.stringify(message).length > maxMessageBytes) return close(context.socket, 1009);
    forward(context, { type: message.type, description: message.description, candidate: message.candidate });
    return;
  }
  if (message.type === "heartbeat") {
    context.lastHeartbeatAt = Date.now();
    return send(context.socket, { type: "heartbeat_ack" });
  }
  if (message.type === "leave") return close(context.socket, 1000);
  close(context.socket);
}

function consumeFrames(context, chunk) {
  context.buffer = Buffer.concat([context.buffer, chunk]);
  while (context.buffer.length >= 2) {
    const first = context.buffer[0];
    const second = context.buffer[1];
    const opcode = first & 0x0f;
    const masked = Boolean(second & 0x80);
    let length = second & 0x7f;
    let offset = 2;
    if (length === 126) {
      if (context.buffer.length < 4) return;
      length = context.buffer.readUInt16BE(2);
      offset = 4;
    } else if (length === 127) return close(context.socket, 1009);
    if (!masked || length > maxMessageBytes || context.buffer.length < offset + 4 + length) return close(context.socket, 1009);
    const mask = context.buffer.subarray(offset, offset + 4);
    offset += 4;
    const payload = Buffer.alloc(length);
    for (let index = 0; index < length; index += 1) payload[index] = context.buffer[offset + index] ^ mask[index % 4];
    context.buffer = context.buffer.subarray(offset + length);
    if (opcode === 0x8) return close(context.socket, 1000);
    if (opcode === 0x9) {
      context.socket.write(Buffer.concat([Buffer.from([0x8a, payload.length]), payload]));
      continue;
    }
    if (opcode !== 0x1 || !(first & 0x80)) return close(context.socket);
    try {
      handleMessage(context, JSON.parse(payload.toString("utf8")));
    } catch {
      close(context.socket);
    }
  }
}

const server = createServer((_request, response) => {
  response.writeHead(404, { "Content-Type": "application/json" });
  response.end(JSON.stringify({ error: "not_found" }));
});

server.on("upgrade", (request, socket) => {
  const protocols = String(request.headers["sec-websocket-protocol"] || "")
    .split(",").map((item) => item.trim()).filter(Boolean);
  const token = protocols.find((item) => item !== "orion.direct-webrtc.v1");
  const claims = verifyToken(token);
  if (request.url !== "/signaling" || !claims) {
    socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
    socket.destroy();
    return;
  }
  const accept = createHash("sha1").update(`${request.headers["sec-websocket-key"]}258EAFA5-E914-47DA-95CA-C5AB0DC85B11`).digest("base64");
  socket.write([
    "HTTP/1.1 101 Switching Protocols",
    "Upgrade: websocket",
    "Connection: Upgrade",
    `Sec-WebSocket-Accept: ${accept}`,
    "Sec-WebSocket-Protocol: orion.direct-webrtc.v1",
    "\r\n",
  ].join("\r\n"));
  const context = {
    socket,
    claims,
    joined: false,
    buffer: Buffer.alloc(0),
    lastHeartbeatAt: Date.now(),
    heartbeatTimer: null,
    expiryTimer: null,
  };
  context.heartbeatTimer = setInterval(() => {
    if (Date.now() - context.lastHeartbeatAt > heartbeatTimeoutMs) close(socket, 1001);
  }, heartbeatIntervalMs);
  context.expiryTimer = setTimeout(() => close(socket, 1008), Math.max(0, claims.exp * 1000 - Date.now()));
  socket.on("data", (chunk) => consumeFrames(context, chunk));
  socket.on("close", () => removeParticipant(context));
  socket.on("error", () => removeParticipant(context));
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Synthetic Direct WebRTC signaling gateway listening on ws://127.0.0.1:${port}/signaling`);
});
