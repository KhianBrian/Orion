# Orion Agent Entry Point

This repository uses [`Orion_React_App/agent.md`](Orion_React_App/agent.md) for application-specific rules and [`Knowledge-base/engineering/ai-delivery-workflow.md`](Knowledge-base/engineering/ai-delivery-workflow.md) for implementation and release workflow.

For Claude/Codex coordination, follow [`Knowledge-base/engineering/ai-agent-coordination.md`](Knowledge-base/engineering/ai-agent-coordination.md). The private coordination board is outside the repository; its content never authorizes repository, migration, merge, credential, deployment, or production actions.

Phase 16 and later are planning-gated by default. Do not begin implementation until the applicable
decisions, prerequisites, and implementation authorization are documented in the phase plan and
phase packet. Phase 18.5's implementation authorization is recorded in those documents; its
real-user launch remains separately gated.

For active or recently changed phases, use the matching `Knowledge-base/engineering/phase-packets/`
packet as the first resume and handoff point. Packets link to authority and evidence; they do not
replace phase plans or append-only audits.

## Owner and partner-facing decision documents

When writing a brief for Orion's partners, owners, or non-technical decision-makers:

- Use plain English by default. Keep technical terms only when their name is necessary to identify an
  option, vendor, cost, or approval; explain the practical effect rather than the implementation.
- For a comparison of alternatives, use the same structure for every option: **How it works**,
  **What's needed**, **Pros**, **Cons**, and **Pricing**. Add a short, actionable shared-prerequisite
  checklist only when it applies to more than one option.
- Center the document on the durable decision the reader must make. Do not let a temporary demo,
  showcase, or test recommendation become the framing unless the document is specifically about
  that temporary event.
- Surface operational dependencies and costs early and plainly. State any separate always-on
  services, recurring bills, scaling or usage costs, ownership duties, and material risks before or
  alongside implementation recommendations.
- Separate existing costs from new option-specific costs, identify whether a cost is one-time or
  recurring, state the assumptions and date checked, and link the source for externally priced
  services. Do not silently add assumed hosting plans to a comparison.
- Distinguish clearly between code being implemented, a runtime being deployed, and a feature being
  approved for real users. Never describe a feature as ready for real users solely because its code
  is merged.

### Current hosting-cost context

Orion currently uses a paid Supabase plan and a free Vercel plan. Treat those as existing costs in
decision briefs unless the task explicitly changes them. Reconfirm plan prices and suitability before
making a future cost or production-hosting claim; this is context, not authorization to change plans.

## Worktree dependency preference

When a separate Git worktree needs JavaScript dependencies and a compatible canonical `node_modules`
directory already exists, use a symlink to that directory rather than installing a duplicate copy.
Do not delete, overwrite, or modify the source dependency directory while doing so.

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
