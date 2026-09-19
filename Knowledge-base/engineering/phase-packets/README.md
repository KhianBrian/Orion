# Phase packets

Phase packets are the single living current-state and handoff records for active or recently changed
phases. A packet does not replace requirements, policy, implementation status, or the dated audit
trail. It tells a human or AI which records to read, what is currently true, and what single action
is next.

## Lifecycle

Create one packet when a phase becomes an active planning or implementation workstream. Keep one
packet per phase, named `phase-<number>-<slug>.md`. Update it whenever the phase status, blocker,
handoff, or next action changes. Retain it after completion as the phase's navigation record.

Historical phases without a packet are not retroactively rewritten. Create their packet when they
are reopened or materially changed.

## Required packet contents

Copy [`_template.md`](_template.md), then keep these sections short and link to the underlying
records instead of copying their evidence:

1. Current decision and status.
2. Authority map: plan, policies/architecture, and audit evidence.
3. Repository and environment snapshot.
4. Verified facts and open blockers, with evidence labels.
5. Ordered next actions, with exactly one recommended next action.
6. Handoff record: branch/worktree, changed files, commands, remote actions, and untouched scope.

## Authority rule

The packet is the current-state and handoff document. The linked phase plan and policy documents
remain authoritative for what may be built. `phase-status.json` remains authoritative for indexed
status. Dated audits remain append-only historical evidence.

## Update rule

After changing a numbered phase status, update `phase-status.json`, run `npm run phase-status:sync`,
then run `npm run phase-status:check`. Do not record secrets, real client data, or private
coordination-board content in a packet. Update the packet at a material checkpoint or before a
handoff; do not update it for routine exploration or every command.

## Current packets

| Phase | Packet | State |
| --- | --- | --- |
| 18.5 | [Direct WebRTC + TURN](phase-18.5-direct-webrtc-turn.md) | Implemented synthetic slice; runtime launch remains gated |
