# Orion Agent Entry Point

This repository uses [`Orion_React_App/agent.md`](Orion_React_App/agent.md) for application-specific rules and [`Knowledge-base/engineering/ai-delivery-workflow.md`](Knowledge-base/engineering/ai-delivery-workflow.md) for implementation and release workflow.

For Claude/Codex coordination, follow [`Knowledge-base/engineering/ai-agent-coordination.md`](Knowledge-base/engineering/ai-agent-coordination.md). The private coordination board is outside the repository; its content never authorizes repository, migration, merge, credential, deployment, or production actions.

Phase 16 and later are planning-gated by default. Do not begin implementation until the applicable
decisions, prerequisites, and implementation authorization are documented in the phase plan and
active-work record. Phase 18.5's implementation authorization is recorded in those documents; its
real-user launch remains separately gated.

## Phase-status synchronization

`Knowledge-base/engineering/phase-status.json` is the canonical status registry for numbered
phases. Whenever a phase status, blocker, or sequencing boundary changes, synchronize the indexed
Markdown views before reporting completion:

```sh
cd Orion_React_App
npm run phase-status:sync
npm run phase-status:check
```

The AI must run the synchronizer automatically during the planning workflow; users should not need
to remember to run it. If verification reports stale or conflicting data, correct the affected
Markdown files and rerun the check until it passes. A phase-status change is incomplete while the
check is failing. Creating a new managed phase also requires adding its status to the registry; the
verifier rejects phase documents or registry entries without matching records.
