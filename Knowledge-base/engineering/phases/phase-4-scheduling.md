# Phase 4 — One Safe Scheduling Workflow

**Tier 2 status:** Not yet written. This file currently contains the charter and its recorded state-machine gaps, but no Tier 2 implementation-plan body. Re-ground and write that plan from the actual Phase 2 and Phase 3 as-built state before coding.

## Purpose

Replace the duplicate mock booking pages with a single server-authoritative workflow covering booking,
cancellation, the clinician's appointment view, the secretary's booking view, error and conflict
states, the session notes surface, and the approved rebooking and no-show policy.

The emphasis is *one* workflow. A second booking path is a correctness hazard, not a convenience.

## Gate

Concurrent booking, retry and idempotency, cancellation boundary, timezone, and mobile and desktop
checks all pass.

## Consumes

- **Phase 2 as-built:** the slot-lock function's actual signature and semantics, the appointment status model, the notes table and its release state, and the RLS predicates governing who may read or write each. This phase's code is written directly against them.
- **Phase 3 as-built:** how the server establishes caller identity and checks clinician approval, which is the basis of booking authorisation.

## Owner decisions now available

| Decision | Effect on this phase |
| --- | --- |
| **Q5 — appointment transitions** | The state machine is now defined. The [appointment lifecycle](../../product/appointment-lifecycle.md) *Approved transitions* section is authoritative: 45-minute sessions; patient cancellation beyond 24 hours; psychiatrist self-service cancellation beyond 48 hours with later cancellation executed by a secretary or admin on their behalf with a recorded reason; rescheduling as patient-initiated linked cancel-and-rebook within the 24-hour boundary; no-show set by the psychiatrist after a grace period, never automatically; patient-cancelled slots reopen, psychiatrist-cancelled slots do not. |
| **Q6 — session notes** | The psychiatrist writes a note after each session and releases it; the patient reads it once released. This is a new surface in this phase, tied to the appointment record. |
| **Q4 — adults only, no emergency care** | Booking refuses ineligible clients and shows the approved crisis and referral route where Orion is not appropriate. |
| **Q10 — secretary role** | The secretary sees and manages appointments and contact details. Never notes — not even a preview. |

## Still blocked

The state machine is settled. What remains are values and edges, not structure — so this phase is now
plannable, with these four items carried as named gaps.

| Item | Owner | Effect |
| --- | --- | --- |
| Late grace period before a no-show may be set | Clinical lead | The threshold is unset. Build the mechanism with the value configurable; 15 minutes is the recommendation put to them. |
| Early join window and session-end treatment | Clinical lead | Join behaviour cannot be finalised. |
| No-show consequences — forfeiture, fee treatment, whether it counts against a patient | Company owners with clinical lead | This phase records the state only. Do not build any consequence. |
| Whether the secretary, the admin, or either executes a late cancellation, and whether a secretary may book or cancel on a client's behalf generally | Company owners | The late-cancellation path is required by the 48-hour rule, so one of the two must hold it. Plan the read path first and treat write-on-behalf as a separate flagged increment. |

**Ratification, not a blocker but a sequencing risk.** Q5 was decided by the developer and awaits owner
ratification. A change on ratification would alter the status model and the booking path, so ratify
before this phase is built rather than after.

## Deliverables

- A single server-authoritative booking operation, idempotent under retry.
- Patient cancellation honouring the 24-hour boundary, with the cancelling party stored and the slot reopened.
- Psychiatrist self-service cancellation honouring the 48-hour boundary, with the slot not reopened.
- A coordinator-executed late cancellation path with a mandatory reason and an audit event — required, because without it a phoned-in cancellation leaves the appointment `booked` while it is off in reality.
- Patient-initiated rescheduling as a linked cancel-and-rebook in one transaction, within the 24-hour boundary.
- A psychiatrist-set no-show with a configurable grace period, never an automatic transition.
- A clinician appointment view scoped by RLS rather than by client filtering.
- A secretary appointment view scoped to appointments and contact details only.
- A session notes surface: psychiatrist authoring and release, patient read-after-release, secretary excluded.
- Explicit error and conflict states — including the case where a slot is taken between display and submission.
- Correct timezone handling for display, storage, and boundary calculation.
- **Removal:** the duplicate mock booking route consolidated away.
- Verification across concurrency, retry, cancellation boundary, timezone, and both mobile and desktop.

## Authoritative documents

- [Appointment lifecycle](../../product/appointment-lifecycle.md) — the primary authority for this phase.
- [Product scope](../../product/product-scope.md) — **needs updating**; the approved boundary does not yet include session notes.
- [Database and RBAC](../../architecture/database-and-rbac.md) — the functions and policies this workflow calls.
- [Clinical safety and telepsychiatry policy](../../product/clinical-safety-and-telepsychiatry-policy.md) — eligibility and crisis routing at the point of booking.
- [QA and Playwright](../qa-and-playwright.md) — click-path and route verification.
- [Test strategy and test data policy](../test-strategy-and-test-data-policy.md) — concurrency and synthetic data expectations.

## Known removal target

The audit trail records consolidating `DoctorAvailability.jsx` and `PatientAppointment.jsx` into one
database-backed patient booking workflow, with this phase's completion as the close condition. Verify
the current route inventory; the ledger entry dates from 26 August 2026.

## What this fixes for later phases

The as-built appointment record determines Phase 5's answer to who may join which room and when, and
which appointment states admit a participant at all. Record the appointment shape and its state
transitions precisely in the as-built entry.

## Inputs I did not have

To be completed by the implementation plan. Verify directly: the current booking routes and their
behaviour, hardcoded appointment data in the prototype, and the actual slot-lock function signature in
the live database.

## Constraints carried from policy

- Do not add a second booking flow, a duplicate client, or a new dependency before applying the minimal implementation ladder.
- RLS and protected server functions are authoritative; client-side filtering is presentation only.
- No appointment or note data in `localStorage`, Redux persistence, logs, analytics, screenshots, URLs, or test artefacts.
- A booking kill switch, provisioned in Phase 1, must be operable independently of the video kill switch.
