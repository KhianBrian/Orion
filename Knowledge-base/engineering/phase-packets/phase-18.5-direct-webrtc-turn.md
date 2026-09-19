# Phase 18.5 — Direct WebRTC + TURN

**Packet purpose:** Resume Phase 18.5 without reconstructing implementation and launch context from
conversation history.
**Last updated:** 2026-09-19
**Status:** Implemented and verified — synthetic/non-production; runtime launch remains gated.
**Recommended next action:** Review the launch-readiness track, then decide whether to authorize the
separately gated runtime deployment sequence. No deployment is authorized by this packet.

## Authority map

- **Phase plan:** [Direct WebRTC + TURN plan](../phases/phase-18.5-direct-webrtc-turn-planning.md)
- **Launch gates:** [production-readiness track](../phases/phase-18.5-production-readiness.md)
- **Historical evidence:** [2026-09-19 audit](../../audit-trail/20260919-phase-18.5-direct-webrtc-turn-audit.md)
- **Canonical status:** [`phase-status.json`](../phase-status.json)

## Current snapshot

- **Repository/branch/worktree:** `Verified` — implementation is merged into local `main` at
  `5389d39`, matching `origin/main`; the feature worktree is not the website deployment source.
- **Environment/database:** `Verified` — linked Supabase migrations and database behavior checks
  passed for the existing non-production target. No new database target was created.
- **Scope boundary:** `Verified` — code, migrations, protected Edge Functions, UI, signaling
  boundary, TURN credential boundary, and synthetic verification are recorded. Runtime deployment,
  real-user launch, and production readiness remain separate gates.

## Evidence and blockers

- **Verified:** lint, build, unit tests, local and linked schema lint, linked database behavior,
  signaling load, and gated browser evidence are recorded in the [2026-09-19 audit](../../audit-trail/20260919-phase-18.5-direct-webrtc-turn-audit.md).
- **Observed:** Phase 18.5 Edge Functions, signaling gateway, TURN relay, and website runtime have
  not been deployed from this workflow refinement task.
- **Deferred:** runtime deployment and real-user launch evidence remain intentionally deferred; this
  task changes documentation workflow only.
- **Blocked:** runtime progression still requires the launch-readiness prerequisites and explicit
  authorization recorded in the linked phase plan and launch-readiness track.

## Ordered next actions

1. **Recommended:** confirm the runtime deployment decision and prerequisites against the launch-readiness track; do not deploy until explicitly authorized.
2. If authorized, update this packet at each material runtime checkpoint and append fresh dated audit
   evidence after each completed milestone.
3. Re-run the phase-status synchronizer and relevant verification after any status change.

## Handoff

- **Changed surfaces:** the Phase 18.5 implementation is recorded in the linked plan and audit; the
  latest documentation change consolidates its living handoff into this packet. Runtime code was not
  changed.
- **Commands and results:** packet/index verification is recorded in the final handoff; phase-status
  synchronization and check must pass before completion.
- **Remote runtime actions:** no Phase 18.5 deployment, migration, or secret change has been
  performed by this documentation workflow.
- **Untouched scope:** the three pre-existing untracked documentation items in the main worktree are
  preserved and remain outside this task.
