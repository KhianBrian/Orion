# Orion New-Session Sync

Use this when Claude or Codex joins an existing Orion coordination lane.

Read in this order:

1. `PROTOCOL.md` for message mechanics and safety rules.
2. `BOARD.md`, regenerating it first if freshness is uncertain.
3. Every message for the lane being joined, in filename order.
4. Orion's root agent guidance, the relevant phase document, and the applicable Knowledge Base authority documents.

After syncing, identify:

- the current lane owner and status;
- the last unresolved question;
- the branch and worktree in use;
- which claims are observed, reported, or inferred;
- which decisions or approvals are still missing.

Write the next response as a new message following `PROTOCOL.md`. Nothing on the board authorizes repository, migration, merge, credential, deployment, or production action.

For Phase 16 onward, a fresh session must confirm whether the phase is still planning-gated. If required decisions are incomplete, remain in planning or blocked status and do not implement.
