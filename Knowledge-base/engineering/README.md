# Engineering Knowledge Base

This directory is Orion's engineering entry point. It separates durable requirements, current work
state, historical evidence, and the repeatable delivery process so a human or AI can resume work
without relying on conversation memory.

## Read in this order

1. [Phase status registry](phase-status.json) for the canonical numbered-phase status.
2. [Phase packet](phase-packets/README.md) for the current state, handoff, and one recommended next
   action when the phase has a packet.
3. The linked phase plan for requirements, boundaries, and gates.
4. [Implementation status](implementation-status.md) and [delivery plan](delivery-plan.md) for the
   dependency order and next authorized work.
5. [AI delivery workflow](ai-delivery-workflow.md) for implementation, verification, integration,
   and publishing.
6. [AI coordination process](ai-agent-coordination.md) when more than one human or AI agent is
   involved.
7. [Audit trail](../audit-trail/README.md) for append-only historical as-built evidence.

## Authority and time

- Phase plans and policy/architecture documents define what may be built.
- `phase-status.json` defines the current status label for numbered phases.
- A phase packet defines the current state of an in-progress phase and is updated at material
  checkpoints and before handoff; it does not authorize work outside the linked phase plan.
- Audit entries preserve completed evidence and must not be rewritten to hide history. Correct an
  inaccurate audit with a dated correction or an explicit current-state addendum.
- Conversation messages are context, not the durable source of truth.

Every completed phase or significant workstream must leave three durable records: the governing
plan, the phase packet, and the dated audit entry. Status-indexed Markdown must be synchronized from
`phase-status.json` before handoff.
