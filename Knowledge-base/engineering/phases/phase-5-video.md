# Phase 5 — Approved Private Video

**Tier 2 status:** Blocked. Google Meet is the proposed real-launch direction under R1, but its
Workspace configuration and Q8/Q9 approval are not complete. The demo's JaaS video surface remains
covered by the [demo milestone](demo-milestone.md), not by this phase.

## R1 impact and work ownership — 10 September 2026

The video decision is now split clearly. JaaS is implemented only for the synthetic demo. Google
Meet is the proposed real-launch direction, but it is not approved yet and cannot be treated as a
completed Phase 5 implementation.

Phase 5 keeps the provider-abstraction, token, admission, kill-switch, outage, and privacy
requirements for an approved private provider. [Phase 18](phase-18-google-meet-and-session-timing.md)
owns the real-launch Google Meet implementation and consumes the exact eligibility, payment, and
appointment contracts from Phases 16–17. Phase 5 remains blocked until the provider and vendor/data-
transfer decisions are approved; the synthetic D5 audit remains historical evidence.

## Purpose

Integrate the approved video provider behind a provider abstraction, using short-lived participant
tokens issued server-side, with a preflight check before joining and independent booking and video
kill switches. Recording, transcription, chat, and file transfer remain off by default.

## Gate

Participant allow and deny, token expiry and revocation, copied-link denial, provider outage
behaviour, and a manual two-party call check all pass. Public Jitsi is excluded.

## Consumes

- **Phase 4 as-built:** the appointment record and its state transitions, which determine who is entitled to join which session and during which window.
- **Phase 3 as-built:** how the server establishes caller identity and clinician approval, which is the basis for issuing a participant token to the right person.
- **Phase 1 as-built:** server-side secret management, since provider credentials must never reach the browser.

## Owner decisions now available

**Demo only.** JaaS is the selected five-account synthetic-demo provider. That work belongs to the
demo milestone and is never promoted to real sessions.

**Real launch: Google Meet proposed, not approved.** R1.4 must validate the Workspace organisation and
edition, host and participant admission model, 15-minute early entry, scheduled session end, outage
handling, and vendor review before a production integration is written.

## Still blocked

| Register question | What cannot proceed |
| --- | --- |
| **Q8** — Google Meet provider and Workspace configuration | The production integration. No production integration may be built until the provider configuration and admission model are approved and technically validated. |
| **Q9** — vendor and data-transfer terms | Production vendor use. Deferred by the owners, and now more consequential because Orion will hold session notes as health information. |

## Demo work does not close this gate

This distinction matters and the implementation plan must hold it. A working Daily call between two
synthetic accounts demonstrates the integration boundary. It does not demonstrate participant
entitlement derived from a real appointment, token revocation, copied-link denial, or outage handling —
which is what this gate actually tests. Do not let demo success be read as Phase 5 progress.

## Deliverables

- A provider abstraction isolating the rest of the application from provider specifics, so the deferred Q8 decision does not require rework elsewhere.
- Short-lived participant tokens minted server-side, scoped to one participant and one session.
- A psychiatrist-only end-session action that ends the provider room for everyone, persists the early end, prevents further token issuance, and records the action in the audit trail. A participant's ordinary leave action must remain local to that participant.
- Private rooms only — no static or public room URL, and no client-created room.
- A preflight interface allowing a participant to check device and connection before joining.
- Independent booking and video kill switches, each operable without the other.
- Recording, transcription, chat, and file transfer disabled by default.
- Verification of participant allow and deny, expiry and revocation, copied-link denial, psychiatrist-controlled early termination, outage behaviour, and a manual two-party call.

## Authoritative documents

- [Video provider decision record](../../architecture/video-provider-decision-record.md) — the primary authority for this phase.
- [Clinical safety and telepsychiatry policy](../../product/clinical-safety-and-telepsychiatry-policy.md) — session conduct and crisis handling during a call.
- [Privacy governance](../../governance/privacy-governance.md) — vendor review, data transfer, and what may be captured.
- [Threat model and security architecture](../../architecture/threat-model-and-security-architecture.md) — token and access threats.
- [Environment, release and secrets](../../operations/environment-release-and-secrets.md) — provider credential handling.
- [Operations and incident response](../../operations/operations-and-incident-response.md) — outage response and kill-switch authority.

## Outage behaviour, pending a decision

With no approved fallback provider, the interim position is that an outage reschedules the session
rather than downgrading its privacy. Confirm this with the owners when Q8 is decided; it is a service
commitment, not purely a technical choice.

## What this fixes for later phases

The approved provider determines Phase 6's outage exercise, the vendor section of the incident
runbook, and what a client is told when video is unavailable. While Q8 is deferred, Phase 6 cannot
finalise that runbook.

## Inputs I did not have

To be completed by the implementation plan. Verify directly: the current Jitsi usage in the prototype
and every location it appears, whether any room URL is currently static or client-generated, and the
as-built appointment fields available for entitlement decisions.

## Constraints carried from policy

- **Never** use public Jitsi, static or public room URLs, or client-created rooms for real sessions. Public Jitsi is permitted only in a clearly labelled internal fake-data mode with synthetic accounts, and is never a fallback for a real client call.
- No provider secret in `VITE_*`, browser code, Git, or fixtures. Tokens are minted server-side only.
- Recording, transcription, chat, and files stay off. The Q6 decision confirms recordings and transcripts are not permitted.
- Do not guess vendor or clinical policy. Escalate to the named owner.
