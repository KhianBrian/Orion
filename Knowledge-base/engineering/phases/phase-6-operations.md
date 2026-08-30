# Phase 6 — Operations and Controlled Release

**Tier 2 status:** Blocked. Needs the Phase 5 as-built provider integration and register answers Q1, Q10, Q11 — all still open or partial.

## Purpose

Make Orion operable and then release it under control: minimal admin tooling, clinician and secretary
offboarding, support and incident runbooks, monitoring, security, accessibility and performance review,
and rehearsed restore, video-outage, privacy, and clinical-escalation exercises.

## Gate

No critical or high finding remains, and accountable owners approve the residual risk and the
controlled-pilot release.

## Consumes

- **Phase 5 as-built:** the approved provider, its failure modes, and the video kill switch — which together define the outage runbook. Blocked while Q8 is deferred.
- **Phase 4 as-built:** the booking kill switch and the appointment states support staff will encounter.
- **Phase 2 as-built:** the tables that retention and data-subject request processes operate on, now including session notes.
- **Phase 1 as-built:** monitoring, backups, and the restore procedure being exercised.

## Owner decisions now available

| Decision | Effect on this phase |
| --- | --- |
| **Q10 — secretary role** | The secretary is the first-line support tier for bookings and client questions. This partially answers who provides support, and the offboarding process must now cover three provisioned roles. |
| **Q12 — approval and demo first** | Company owners give final go/no-go, and the synthetic demo is showcased to them before any real-user decision. |
| **Q6 — session notes** | Retention, data-subject requests, and any admin visibility must now account for clinical content. Admin tooling should not expose notes by default. |

## Still blocked

| Register question | What cannot be finalised |
| --- | --- |
| **Q10** — stop authority, support hours, incident communication, clinical escalation contact | The runbooks. A secretary handling bookings does not answer who may halt bookings or video, or who is called in a clinical escalation. |
| **Q11** — retention and deletion | The retention schedule and the data-subject request process. Session notes as clinical records may carry a prescribed minimum retention, and the meaning of deletion against append-only history is unresolved. |
| **Q1** — geography and operating review | Operational load, review cadence, and release scoping. No active-patient cap is planned; the approved geography and operating-review cadence remain to be decided. |
| **Q8 and Q9** — provider and vendor terms | The video-outage runbook and the vendor section of the incident procedure. |
| **Q2** — entity and DPO | Privacy escalation ownership and breach notification responsibility. |

## Referred to the clinical lead

The owners' position that a clinical emergency will not occur conflicts with the approved Q4 crisis and
referral path, and is recorded in the register as referred to the clinical lead. Engineering proceeds
with the Q4 answer: the crisis path stays in, and a clinical-escalation exercise remains a deliverable
of this phase. A psychiatric consultation carries a foreseeable risk of acute distress or a safety
disclosure during a session, and planning as though it cannot happen would leave this phase without a
rehearsed response. This is not a determination engineering may make.

## Deliverables

- Minimal admin tooling sufficient to operate the pilot, no broader, with session notes not exposed by default.
- Offboarding for psychiatrist, secretary, and admin accounts that revokes access without destroying appointment, consent, note, or audit history.
- Support and incident runbooks naming contacts, hours, and stop authority, with the secretary as first-line support.
- Operational monitoring and alerting that remains privacy-safe and never captures note content.
- Completed security, accessibility, and performance reviews with findings triaged.
- Rehearsed exercises: environment restore, video outage, a privacy or data-subject request, and a clinical escalation.
- A retention schedule and data-subject request process in operation, covering session notes.
- Written owner approval of residual risk and the controlled-pilot release.

## Authoritative documents

- [Operations and incident response](../../operations/operations-and-incident-response.md) — the primary authority for this phase.
- [Environment, release and secrets](../../operations/environment-release-and-secrets.md) — release and restore procedure.
- [Privacy governance](../../governance/privacy-governance.md) — retention, data-subject requests, and breach handling.
- [Clinical safety and telepsychiatry policy](../../product/clinical-safety-and-telepsychiatry-policy.md) — clinical escalation.
- [Access control and audit policy](../../architecture/access-control-and-audit-policy.md) — admin tooling access and audit expectations.
- [Pilot decision register](../../product/pilot-decision-register.md) — the release approval requirement.

## Release condition

The register states plainly that company-owner approval is required before the pilot moves from
staging to real users, and the owners confirmed on 27 August 2026 that the demo is showcased first.
Technical readiness does not constitute approval, and this phase cannot be self-closed by engineering.

## Inputs I did not have

To be completed by the implementation plan. Verify directly: the as-built state of monitoring, the
result of the Phase 1 restore exercise, which findings from any earlier security or accessibility
review remain open, and whether the deferred simplifications ledger still holds open entries.

## Constraints carried from policy

- Never delete appointment, consent, note, or audit history to roll back a release or offboard a clinician.
- Admin tooling is minimal by design; broad administrative visibility is a privacy risk, not a feature — more so now that clinical content exists.
- Monitoring must not capture sensitive client, appointment, or note data.
- Booking and video kill switches remain independently operable.
