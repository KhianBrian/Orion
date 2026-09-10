# Launch Readiness R1

R1 is the post-baseline workstream for the initial real-user launch direction recorded on 8 September
2026. It is deliberately separate from Phase 0–6, D0–D7, and the Phase 7–14 frontend continuation
track.

## Why this is a separate workstream

The baseline plans are dated evidence: they show what was approved, planned, implemented, or still
blocked at that point in time. Rewriting them to absorb later decisions would make the audit trail
unreliable and could make synthetic-demo work appear to be real-launch readiness.

R1 therefore has its own identifier, plans, and audit entries:

| Track | Identifiers | Meaning |
| --- | --- | --- |
| Baseline governance and controlled-pilot plan | Phase 0–6 | Original policy, platform, data, identity, scheduling, video, and operations gates. |
| Synthetic demo | D0–D7 | Five-account fake-data implementation and verification only. |
| Frontend continuation | Phase 7–14 | Follow-on synthetic/frontend work; it does not close Phase 0–6. |
| Initial-launch change set | R1.0 onward | Superseding owner decisions and requirements for the launch work. |
| Numbered implementation continuation | Phase 15–20 | Canonical execution plans that implement R1.1–R1.5 after Phase 14. |

An R1 plan must cite the baseline artefacts it consumes and the current decision-register amendment
that authorises its scope. It must never mark a baseline gate complete by implication.

## Work items

| Work item | Purpose | Status |
| --- | --- | --- |
| [R1.0 — Governance and change control](r1.0-governance-and-change-control.md) | Record the new direction, reconcile authoritative documents, and turn unresolved policy inputs into explicit gates. | Completed ✅ — detailed planning may begin, but no launch gate is closed |
| [R1.1 — Data, consent, and audit extension](r1.1-data-consent-and-audit-extension.md) | Plan protected records for guardian consent, payment attempts/events, support tickets, and revised note timing. | Planning completed ✅ — implementation not started; owner/clinical/DPO/vendor gates retained |
| R1.2 — Identity and eligibility | Plan adult and minor onboarding, guardian-consent status, and booking activation rules. | Mapped to Phase 16; implementation blocked on Phase 15 and policy decisions |
| R1.3 — Payment-authorized booking | Plan PayMaya checkout, webhook reconciliation, payment state, and appointment reservation. | Mapped to Phase 17; blocked on Phase 16, PayMaya materials, and commercial policy |
| R1.4 — Google Meet integration | Plan provider configuration, per-appointment meetings, access controls, timing, and outage handling. | Mapped to Phase 18; blocked on Phase 17, Workspace, and vendor approval |
| R1.5 — Support and launch operations | Plan in-app ticket handling, escalation, payment support, provider incidents, integrated verification, and controlled release. | Mapped to Phases 19–20; blocked on prior as-built evidence, support/retention decisions, and release approvals |

The [R1 implementation phase map](../phases/r1-launch-readiness-implementation-map.md) assigns the
R1.1 contract to the numbered continuation and records the cross-phase flow. The canonical execution
basis is:

1. [Phase 15 — Data, consent, and audit foundation](../phases/phase-15-data-consent-and-audit-foundation.md)
2. [Phase 16 — Identity and minor eligibility](../phases/phase-16-identity-and-minor-eligibility.md)
3. [Phase 17 — PayMaya payment-authorised booking](../phases/phase-17-paymaya-payment-authorised-booking.md)
4. [Phase 18 — Google Meet and session timing](../phases/phase-18-google-meet-and-session-timing.md)
5. [Phase 19 — Support tickets and launch operations](../phases/phase-19-support-tickets-and-launch-operations.md)
6. [Phase 20 — Integrated launch verification and controlled release](../phases/phase-20-integrated-launch-verification-and-controlled-release.md)

Each file states its governing authority, predecessor as-built requirement, fresh live-state checks,
implementation changes, test gate, and downstream handoff. They are plans, not implementation
evidence.

## Boundaries

- R1 planning and synthetic verification may proceed before the final legal text, but real registration,
  payment, or sessions may not be enabled without approved wording and the existing launch gates.
- JaaS remains the five-account synthetic-demo provider. R1.4 does not promote it to real use.
- A ticket, note, guardian-consent record, or payment record is not exempt from privacy, retention,
  audit, or least-privilege controls simply because it is a new feature.
