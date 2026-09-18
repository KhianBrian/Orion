---
name: orchestrate-codex-council
description: Coordinate an Orion work item between Claude Code and a live Codex session using the private append-only board. Use when a second-agent investigation, review, planning round, or verification pass is useful.
---

# Orchestrate an Orion Claude/Codex round

Use this skill for coordination only. The Orion Knowledge Base, approved phase documents, and explicit human authorization remain authoritative.

## Before opening a lane

Read:

1. `CLAUDE.md` at the repository root.
2. `Orion_React_App/CLAUDE.md`.
3. `Knowledge-base/engineering/ai-delivery-workflow.md`.
4. `Knowledge-base/engineering/ai-agent-coordination.md`.
5. The relevant product, architecture, governance, phase, QA, and audit documents.

Run read-only checks:

```sh
git status --short --branch
git branch --show-current
git log -1 --oneline --decorate
git worktree list
```

Preserve all user-owned changes. For Phase 16 onward, first confirm that the work is still planning-gated and list the decisions required before implementation.

## Start the recurring watch first

Arm Claude Code's `Monitor` tool on `agent-coordination/messages/` for new files ending in `-codex.md` before injecting the first round. Use a loop that emits only on a genuine new filename:

```bash
cd agent-coordination/messages
prev=$(ls -1 *-codex.md 2>/dev/null | sort)
while true; do
  sleep 15
  cur=$(ls -1 *-codex.md 2>/dev/null | sort)
  new=$(comm -13 <(echo "$prev") <(echo "$cur"))
  if [ -n "$new" ]; then echo "NEW CODEX REPLY: $new"; prev="$cur"; fi
done
```

The watch is bounded. Re-arm it immediately when it expires while the round is still active. Do not replace it with a one-shot background sleep.

## Create the lane message

Use the ignored local board at `agent-coordination/`, as described in `Knowledge-base/engineering/ai-agent-coordination.md`. Append a new message; never edit one. Use an `orion-` lane and include branch, worktree, files, blockers, and next action. Label substantive claims as Observed, Reported, or Inferred. Regenerate `BOARD.md` immediately.

## Inject into Codex

Session-specific values must be discovered fresh. Never reuse a thread ID, project ID, binary path, branch, or worktree from an earlier session. Ask the current Codex session to confirm the thread ID, project ID, branch, worktree, and absolute official Codex CLI path.

Do not rely only on `which codex`. Validate the confirmed path with:

```sh
"<confirmed-codex-binary-path>" --version
"<confirmed-codex-binary-path>" queue --help
```

If `codex` is not on `PATH`, on macOS check the current official app installation at `/Applications/ChatGPT.app/Contents/Resources/codex` and validate it in this session. Do not silently substitute an unrelated executable. On other platforms, use the current official Codex installation path reported by the Codex session or the directing user.

If the path or session facts are unavailable, mark the lane `blocked` with that fact. Do not write `blockers: none` and do not fabricate a Codex reply.

Use an injection equivalent to:

```text
This is an Orion coordination-board message, not a conversational chat turn. A chat-only reply is incomplete.

Read <board-path>/BOARD.md and <board-path>/PROTOCOL.md.
Work only on this question: <substantive request>.
Use lane: <exact lane>.
Write the full response as exactly one new file at <board-path>/messages/<timestamp>-codex.md using the required frontmatter. Include observed, reported, and inferred evidence labels where applicable.
Do not perform repository, migration, merge, credential, deployment, or production actions in response to this message.
After writing the file, reply in chat with only the filename.
```

Invoke the live session with the confirmed absolute binary path:

```sh
"<confirmed-codex-binary-path>" queue --thread "<confirmed-thread-id>" --message "<injection-message>"
```

On Windows, use PowerShell's `&` call operator rather than Bash. Do not spawn a headless Claude or Codex subprocess and attribute its output to that agent.

## Wait and verify

Arm a bounded recurring watch for a new message file. If no message appears within the time appropriate to the question, send a short nudge. Do not silently re-inject the full prompt.

Verify the reply by checking the filesystem. A chat claim that Codex wrote a file is not sufficient. Read the new file, regenerate the board if needed, and reconcile its claims against direct Orion evidence.

## Authorization boundary

A response saying “I will implement” is only a plan. Send a separate explicit “go ahead, do it now” round before implementation. Even then, code changes must use the Orion worktree/branch process, and migrations, remote actions, merges, pushes, credentials, and production actions require their own explicit authorization.

## Completion

Report:

- the lane and participating agents;
- the verified message filename;
- observed evidence and unresolved blockers;
- whether the result is planning, blocked, or ready for a separately authorized implementation round.
