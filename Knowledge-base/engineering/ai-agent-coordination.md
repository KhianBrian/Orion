# AI Agent Coordination Process

This file is the repository-visible handoff contract for Claude, Codex, and any future AI agent.
The private coordination board is not authoritative and never grants permission for repository,
database, credential, deployment, merge, or production actions.

## Before acting

1. Read `AGENTS.md`, `Orion_React_App/agent.md`, the engineering README, the applicable phase plan,
   and the phase packet when one exists.
2. Inspect the current branch, worktree, status, recent commits, applied migration state, and
   deployed-function state when relevant.
3. State the intended scope and identify the files, environment, and external systems involved.
4. Preserve existing user changes. Do not duplicate a task already recorded as active.

## Evidence labels

Use these labels in phase-packet updates and handoffs:

- **Observed** — directly read from a file, command, database, or deployed service.
- **Verified** — observed after a fresh check with a recorded command and result.
- **Assumed** — a temporary working assumption that must not be treated as a requirement.
- **Deferred** — intentionally not performed, with the reason recorded.
- **Blocked** — cannot proceed without a named decision, credential, service, or external change.

Never turn an assumption or a previous agent's claim into verified evidence without rerunning the
check.

## Handoff minimum

Every handoff must identify:

- current branch and worktree;
- files changed or intentionally untouched;
- database/project and environment used, without exposing secrets;
- commands run and their exit/result;
- remote actions performed or explicitly not performed;
- open risks, blockers, and the single recommended next action.

The handoff belongs in the relevant phase packet. Keep the audit trail dated and append-only; do not
use it as a live task list.

The phase packet is the first resume point and the sole live work record for a phase. It must name
the single recommended next action and link to audit evidence; it must not become a second
implementation log.

## Integration ownership

One agent owns each write surface at a time. The coordinator reconciles the combined diff, runs
fresh verification after integration, updates status indexes, and records the final merge and push.
Feature worktrees do not deploy the website. Website deployment is performed from verified `main`.
