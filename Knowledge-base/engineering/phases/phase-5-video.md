# Phase 5 — Approved Private Video

**Tier 2 status:** Blocked. The real-launch provider decision (Q8) was deferred by the owners. The demo's video surface is covered by the [demo milestone](demo-milestone.md), not by this phase.

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

**Demo only.** Daily is preferred for the demo, with public Jitsi permitted as a demo fallback in a
clearly labelled internal fake-data mode using the five synthetic accounts. That work belongs to the
demo milestone.

**Real launch: deferred.** The owners deferred the production provider decision on 27 August 2026. Any
Daily integration built for the demo is a proof of the integration boundary, not an approved production
choice, and must not be promoted to real sessions without a recorded Q8 decision.

## Still blocked

| Register question | What cannot proceed |
| --- | --- |
| **Q8** — real-launch provider | The production integration. A provider abstraction may be designed and the demo integration may be built, but no production integration may be built against an unapproved provider. |
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
