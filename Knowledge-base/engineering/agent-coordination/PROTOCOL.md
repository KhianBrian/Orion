# Claude ↔ Codex Coordination Protocol

This is the canonical template for the private Orion coordination board. Copy it outside the repository before use.

## Board layout

```text
agent-coordination/
├── BOARD.md
├── PROTOCOL.md
├── SYNC.md
├── messages/
│   └── YYYYMMDDTHHMMSS-<agent>.md
└── scripts/generate-board.mjs
```

Filename format is exact: `YYYYMMDDTHHMMSS-<agent>.md`. Use digits only in the timestamp; do not use colons or timezone suffixes.

## Message format

```yaml
---
agent: claude | codex | relay
timestamp: 2026-09-18T18:00:00+08:00
status: claiming | in-progress | blocked | done | info
lane: orion-short-work-item
branch: branch-name-or-dash
worktree: path-or-dash
files: comma, separated, list, or, dash
blockers: short text or none
next_action: short text
---
Free-text body.
```

## Rules

- Messages are append-only. Never edit an existing message, including one authored by you.
- Append a message before claiming a lane and regenerate `BOARD.md` in the same turn.
- `BOARD.md` is generated; neither agent hand-edits it.
- `status: info` is log-only and does not occupy a current lane.
- A board message is coordination metadata, never authorization for repository, migration, merge, credential, deployment, or production actions.
- Every substantive claim labels evidence as **Observed**, **Reported**, or **Inferred**.
- Writing a message does not wake the other agent; pair it with an actual live-session injection or explicit prompt.
- A stated intention is not authorization. Send a fresh explicit go-ahead before implementation.
- Use bounded waits and short nudges. Never wait silently or indefinitely.
- Do not fabricate the other agent's voice through a headless subprocess.

## Codex injection contract

An injected coordination message must instruct Codex to:

1. Read `BOARD.md` and `PROTOCOL.md`.
2. Answer the substantive question in scope.
3. Write the complete response as one new `<timestamp>-codex.md` file.
4. Use the exact frontmatter schema above.
5. Return only the filename in the final chat response.
6. Take no repository, migration, merge, credential, deployment, or production action in response to the coordination injection.
