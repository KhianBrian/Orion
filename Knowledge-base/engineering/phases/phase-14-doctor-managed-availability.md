# Phase 14 — Doctor-Managed Availability and Patient Time Selection

## Outcome

Patients choose an active psychiatrist first, then select a date and a valid appointment time from that psychiatrist's published availability. Psychiatrists manage their own recurring schedules and one-off exceptions. Orion remains the sole authority that decides whether a requested 45-minute appointment can be booked.

## Confirmed product decisions

- Psychiatrists' standard working window is **weekdays, 8:00 AM–5:00 PM Asia/Manila**.
- Psychiatrists may publish and manage their own schedule within that normal working window. Availability outside 8:00 AM–5:00 PM requires an admin approval step.
- A session lasts exactly **45 minutes**. The latest standard start time is therefore **4:15 PM**.
- Patients may book up to **two weeks ahead**.
- Patients select a psychiatrist before selecting a date and time.
- Available starts are presented on a **15-minute grid** (for example, 8:00, 8:15, 8:30), rather than entered as arbitrary minute values.
- A booked appointment blocks only its 45-minute clinical-session range. The 15-minute early-join period before the session and the 15-minute psychiatrist note window after it do not reserve additional schedule time or create conflicts. An adjacent 45-minute appointment may start when the clinical session ends.
- If a proposed schedule edit overlaps an existing booking, Orion blocks the edit. It must not move, delete, or silently change the patient's appointment.
- The schedule UI must explain the conflict clearly, using the existing Orion UI language (for example, an inline message plus a dialog/popover): the psychiatrist must reschedule or cancel the existing appointment first, with the relevant reason workflow.
- Psychiatrists can manage their own schedule. Administrators may retain operational visibility, but this phase does not give them direct authority to edit a clinician's schedule.

## Decisions recorded — 13 September 2026

- The 8:00 AM–5:00 PM weekday schedule is the default, but each psychiatrist can set their own working periods within that window.
- A psychiatrist cannot independently publish availability outside that window; those hours require admin approval.
- A schedule change that conflicts with an already-booked appointment is blocked and accompanied by clear reschedule/cancellation instructions.
- A patient's booked 45-minute clinical session remains the only schedule-conflict range. The patient may join up to 15 minutes early, and the psychiatrist receives a 15-minute post-session note window; neither period is part of availability or conflict checking.
- Admins can view schedule information but cannot directly edit a psychiatrist's schedule.

## Scope

- Replace the patient-facing flat list of pre-created appointment cards with a three-step booking flow:
  1. choose a psychiatrist;
  2. choose a date within the two-week booking horizon;
  3. choose a displayed, bookable 15-minute-grid start time.
- Allow each active psychiatrist to publish recurring weekday working periods and create one-off schedule exceptions, including leave, breaks, and additional hours.
- Derive available times server-side from published availability, 45-minute duration, the Manila timezone, the booking horizon, exception periods, and existing appointments.
- Keep one server-authoritative booking transaction. It must validate the requested psychiatrist and start time, acquire the relevant conflict protection, create the appointment, and emit its audit event atomically.
- Preserve existing cancellation, appointment-history, and meeting-admission behavior. This phase records the desired 15-minute early-join, 45-minute clinical session, and 15-minute note-window model as a scheduling constraint, but the actual meeting timing/admission and note-posting workflow remain outside this phase.
- Provide clinician-facing schedule-management screens with clear empty, save, conflict, and unavailable states.

## Non-goals

- Arbitrary minute-by-minute patient-entered appointment times.
- Double-booking, overbooking, or client-side availability decisions.
- Changes to the 45-minute duration, patient cancellation boundary, clinician cancellation boundary, or appointment outcome rules.
- Automatic completion, no-show assignment, reminders, billing, or production activation.
- Implementing the actual meeting admission/timing and psychiatrist note-posting workflow; those belong to Phase 18.

## Data and authority model

The current `availability_slots` records are a pre-created inventory. This phase replaces that inventory as the patient-facing source with clinician-owned recurring availability and date-specific overrides. Implementation must choose the smallest safe representation after reviewing the as-built schema:

- recurring availability rules keyed by psychiatrist and weekday;
- date-specific unavailable and additional-availability overrides;
- booked appointments as the source of occupied 45-minute ranges;
- a server-side availability projection that exposes only valid patient choices; and
- a single booking transaction that revalidates availability and overlap protection at commit time.

The browser must never be trusted to calculate whether a time is free. RLS and protected server functions remain authoritative. Availability queries reveal only the minimum clinician and time information needed by the caller.

## Dependencies and policy boundaries

- [Appointment lifecycle](../../product/appointment-lifecycle.md) defines the 45-minute duration, authoritative server time, booking integrity, and immutable history requirements.
- [Phase 4 — One safe scheduling workflow](phase-4-scheduling.md) requires one server-authoritative booking workflow; this phase must not introduce a second route or bypass it.
- [Database and RBAC](../../architecture/database-and-rbac.md) governs RLS, role enforcement, protected functions, and audit design.
- Phase 4 remains responsible for clinician-recorded outcomes and rescheduling; those capabilities are not folded into availability management.
- Phase 18 owns the real meeting timing/admission implementation. This phase must ensure that early join and the post-session note window do not consume clinician availability or create booking conflicts.

## Tier 2 implementation plan

Draft only after the current scheduling schema, booking function, and RLS policies are re-verified. It must include:

1. A forward-only migration for recurring availability, overrides, indexes, RLS, grants, and audit events.
2. A protected clinician schedule-management operation with ownership checks, validation of the 8 AM–5 PM weekday default, an approval path for outside-window hours, and conflict handling for already-booked appointments.
3. A protected availability projection that generates 15-minute candidate starts, checks the full 45-minute range, honors exceptions, and restricts choices to the next two weeks.
4. A single replacement or extension of the current booking transaction that locks and verifies the chosen range at write time, supports idempotent retry, and never trusts client-calculated availability.
5. Patient UI changes in `PatientAppointment.jsx` and appointment feature components for psychiatrist, date, and time selection without duplicating booking behavior.
6. Clinician UI for publishing schedule rules and one-off exceptions, including mobile, empty, loading, error, and focus states. Conflicts must provide clear guidance to reschedule or cancel the affected appointment, using the existing buttons, colors, dialogs/popovers, typography, and focus patterns.
7. Synthetic desktop/mobile tests for concurrent booking, time-zone boundaries, working-window edges, doctor ownership, leave/break overrides, two-week horizon, and appointment/video regression behavior.

## Gate

This phase is complete only when:

- A patient can book an active psychiatrist's valid 15-minute-grid time within the two-week horizon.
- A 45-minute appointment prevents every overlapping option, while an immediately adjacent appointment remains valid.
- A clinician can manage only their own published availability.
- A leave or break removes affected patient choices without modifying past or booked appointments.
- Concurrent requests cannot create overlapping appointments.
- Appointment, cancellation, history, and synthetic video-admission checks remain green.
- RLS, protected-function, audit, desktop, and mobile verification pass using synthetic data only.

## Confirmed recurring-schedule behavior

When a psychiatrist changes a recurring pattern, Orion applies the new pattern only to future, still-open availability. Existing booked appointments remain unchanged. If the requested change overlaps one of those bookings, Orion blocks the change and tells the psychiatrist to reschedule or cancel that appointment first.

This phase continues to assume one 45-minute appointment type. Supporting multiple appointment types or durations can be considered later without changing this decision.
