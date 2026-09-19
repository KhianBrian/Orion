#!/usr/bin/env node
/**
 * Generate BOARD.md from append-only messages/*.md.
 * Copy this zero-dependency script into the private ignored board.
 */
import { readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
const messagesDir = join(root, "messages");
const boardPath = join(root, "BOARD.md");

function parseMessage(raw, filename) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) {
    return { filename, agent: "unknown", timestamp: "", status: "info", lane: "unfiled", branch: "-", worktree: "-", files: "-", blockers: "-", nextAction: "-", body: raw.trim() };
  }

  const fields = {};
  for (const line of match[1].split(/\r?\n/)) {
    const field = line.match(/^([a-zA-Z_]+):\s*(.*)$/);
    if (field) fields[field[1]] = field[2].trim();
  }

  return {
    filename,
    agent: fields.agent || "unknown",
    timestamp: fields.timestamp || "",
    status: fields.status || "info",
    lane: fields.lane || "unfiled",
    branch: fields.branch || "-",
    worktree: fields.worktree || "-",
    files: fields.files || "-",
    blockers: fields.blockers || "-",
    nextAction: fields.next_action || "-",
    body: match[2].trim(),
  };
}

const messages = existsSync(messagesDir)
  ? readdirSync(messagesDir).filter((file) => file.endsWith(".md")).sort().map((file) => parseMessage(readFileSync(join(messagesDir, file), "utf8"), file))
  : [];

const latestByLane = new Map();
for (const message of messages) {
  if (message.status !== "info") latestByLane.set(message.lane, message);
}

const statusIcon = { claiming: "🟡", "in-progress": "🔵", blocked: "🔴", done: "✅" };
const lines = [
  "# Orion Agent Coordination Board",
  "",
  "> Generated file — do not hand-edit. Run `node scripts/generate-board.mjs` after appending a message.",
  `> Last generated: ${new Date().toISOString()}`,
  "",
  "## Current lanes",
  "",
];

if (latestByLane.size === 0) {
  lines.push("_No active lanes._");
} else {
  lines.push("| Lane | Agent | Status | Branch | Blockers | Next action | Last update |");
  lines.push("|---|---|---|---|---|---|---|");
  for (const [lane, message] of latestByLane) {
    lines.push(`| ${lane} | ${message.agent} | ${statusIcon[message.status] || "⚪"} ${message.status} | ${message.branch} | ${message.blockers} | ${message.nextAction} | ${message.timestamp || message.filename} |`);
  }
}

lines.push("", "## Recent activity (newest last)", "");
if (messages.length === 0) {
  lines.push("_No messages yet._");
} else {
  for (const message of messages.slice(-20)) {
    lines.push(`- **${message.timestamp || message.filename}** [${message.agent}] \`${message.lane}\` (${message.status}) — ${message.nextAction}`);
  }
}

writeFileSync(boardPath, `${lines.join("\n")}\n`, "utf8");
console.log(`generate-board: wrote ${boardPath} from ${messages.length} message(s), ${latestByLane.size} active lane(s)`);
