# Appointment Lifecycle and Scheduling

## Canonical states

```text
open_slot -> held (optional, expires) -> booked -> completed | cancelled | no_show
```

- A slot is exactly 45 minutes and belongs to one active psychiatrist.
- `held` is optional and must expire automatically; it is never an appointment.
- Only a server transaction may create `booked` from an open/valid held slot.
- `cancelled`, `completed`, and `no_show` retain immutable appointment history.
- Reopening a cancelled slot, rescheduling, psychiatrist cancellation, and no-show handling are defined under *Approved transitions* below.

## Approved transitions

Recorded 27 August 2026 in answer to register question 5. Rescheduling deliberately adds no canonical
state. Items still requiring a clinical ruling are listed under *Outstanding* and must not be filled in
by engineering.

### Patient cancellation

- Permitted only when `starts_at > server_now + 24 hours`.
- The slot returns to availability — see *Slot reopening*.

### Psychiatrist cancellation

- A psychiatrist may cancel in the system only when `starts_at > server_now + 48 hours`. The notice period is deliberately longer than the patient's, because a late clinician cancellation disrupts a patient who has arranged their day around the appointment.
- Inside 48 hours a psychiatrist has no self-service route. Late cancellation is coordinated by a person and executed on the psychiatrist's behalf by a secretary or admin, with a mandatory reason recorded and an audit event raised.
- **This path is required, not optional.** Without it an appointment cancelled by phone stays `booked` in the system while being off in reality, and the record goes stale. Whether the secretary, the admin, or either may execute it is *Outstanding*.
- A psychiatrist cancellation does **not** return the slot to availability.

### Rescheduling

- Modelled as cancellation plus rebooking in one server transaction, with the two appointment records linked by a reference. No `rescheduled` state is added, so the immutable-history rule above holds unchanged.
- Patient-initiated, and permitted only within the same 24-hour boundary as patient cancellation.
- A psychiatrist who needs to move an appointment cancels it under the rules above and offers alternative times; the patient books one. There is no psychiatrist-initiated reschedule that acts on the patient's behalf.

### No-show

- Set by the psychiatrist, never automatically. A patient in acute distress may join late, and an automatic transition would record a no-show against them with no human check.
- The psychiatrist may set it only after the late grace period has elapsed. **The grace period value is Outstanding** — it belongs to the clinical lead per *Timing rules*. Fifteen minutes of a 45-minute session is the value recommended for their consideration.
- Setting `no_show` raises an audit event.
- The *consequences* of a no-show — whether the session is forfeited, whether it counts against a patient, any fee treatment — are a separate commercial and clinical decision and are *Outstanding*. Phase 4 records the state only.

### Slot reopening

- A slot cancelled **by the patient** returns to availability when the cancellation occurs more than 24 hours before `starts_at` and the psychiatrist is still active.
- A slot cancelled **by the psychiatrist**, at any notice, does not return to availability. The psychiatrist cancelled because they are unavailable; rebooking the same time would place a patient into a slot the clinician cannot attend.
- A psychiatrist may re-publish availability for that time manually if circumstances change.

## Timing rules

- Store time as `timestamptz`; the standard display timezone is `Asia/Manila`.
- The server/database clock is authoritative. The client may display eligibility but never decides it.
- Patient cancellation is allowed only when `starts_at > server_now + 24 hours`.
- Psychiatrist self-service cancellation is allowed only when `starts_at > server_now + 48 hours`.
- The clinical lead defines the early join window, late grace period, session-end treatment, and any geographic/timezone expansion.

## Integrity rules

- Appointment start/end values are derived from the locked slot, not accepted from the browser.
- Database constraints and a locked transaction prevent two active appointments for one slot and overlapping active slots/appointments for a psychiatrist.
- Booking and cancellation require an idempotency key so double-clicks and network retries return the original safe result.
- Conflict responses use a stable generic code such as `slot_unavailable`; they never disclose another person's booking.
- A cancellation records which party cancelled, since slot reopening depends on it. This is a stored fact, not inferred from who called the endpoint.
- A reschedule's two appointment records are linked in the same transaction that creates them, so a partial link cannot exist.
- Every transition named under *Approved transitions* raises an audit event.

## Outstanding

Engineering must not fill these in. Each is recorded on the
[pilot decision register](pilot-decision-register.md).

| Item | Owner | Blocks |
| --- | --- | --- |
| Late grace period before a no-show may be set. Recommended value for consideration: 15 minutes. | Clinical lead | Phase 4 no-show behaviour |
| Early join window and session-end treatment. | Clinical lead | Phase 4 join behaviour |
| Consequences of a no-show — forfeiture, fee treatment, whether it counts against a patient. | Company owners with clinical lead | Phase 4 post-session handling, Phase 6 support procedure |
| Whether a psychiatrist no-show is distinguishable from a patient no-show. The canonical list has one `no_show` state and does not say whose. Recommendation: keep the single state and record the absent party as a field, rather than adding a canonical state. | Clinical lead | Phase 2 status model |
| Whether the secretary, the admin, or either may execute a late cancellation on a psychiatrist's behalf. | Company owners | Phase 3 role permissions, Phase 4 cancellation path |

## Ratification

The transitions above were recorded by the developer on 27 August 2026 to unblock Phase 2 and Phase 4
planning. Register question 5 sits with the company owners for product scope, so these should be
ratified at the next owner meeting. Implementation may proceed against them; a change on ratification
would be a change to the status model and the booking path, so ratify before Phase 4 is built rather
than after.
