# Phase 14 — Doctor-Managed Availability and Patient Time Selection

## Outcome

Patients choose an active psychiatrist first, then select a date and a valid appointment time from that psychiatrist's published availability. Psychiatrists manage their own recurring schedules and one-off exceptions. Orion remains the sole authority that decides whether a requested 45-minute appointment can be booked.

## Confirmed product decisions

- Psychiatrists' standard working window is **weekdays, 8:00 AM–5:00 PM Asia/Manila**.
- A session lasts exactly **45 minutes**. The latest standard start time is therefore **4:15 PM**.
- Patients may book up to **two weeks ahead**.
- Patients select a psychiatrist before selecting a date and time.
- Available starts are presented on a **15-minute grid** (for example, 8:00, 8:15, 8:30), rather than entered as arbitrary minute values.
- A booked appointment blocks only its 45-minute session range. If a session is 8:43–9:28, the next appointment may start at 9:28.
- The 15-minute early-join period is video access for the patient only; it does not reserve clinician availability or create an appointment conflict.
- Psychiatrists can manage their own schedule. Administrators may retain operational visibility, but this phase does not invent authority to change a clinician's schedule on their behalf.

## Scope

- Replace the patient-facing flat list of pre-created appointment cards with a three-step booking flow:
  1. choose a psychiatrist;
  2. choose a date within the two-week booking horizon;
  3. choose a displayed, bookable 15-minute-grid start time.
- Allow each active psychiatrist to publish recurring weekday working periods and create one-off schedule exceptions, including leave, breaks, and additional hours.
- Derive available times server-side from published availability, 45-minute duration, the Manila timezone, the booking horizon, exception periods, and existing appointments.
- Keep one server-authoritative booking transaction. It must validate the requested psychiatrist and start time, acquire the relevant conflict protection, create the appointment, and emit its audit event atomically.
- Preserve existing cancellation, appointment-history, and meeting-admission behavior. The early-join rule is not changed by this phase.
- Provide clinician-facing schedule-management screens with clear empty, save, conflict, and unavailable states.

## Non-goals

- Arbitrary minute-by-minute patient-entered appointment times.
- Double-booking, overbooking, or client-side availability decisions.
- Changes to the 45-minute duration, patient cancellation boundary, clinician cancellation boundary, or appointment outcome rules.
- Automatic completion, no-show assignment, reminders, billing, or production activation.
- Using the synthetic video-demo early-join value as a real clinical policy without clinical-owner approval.

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
- [Phase 13 — Appointment outcomes and rescheduling](phase-13-appointment-outcomes-and-rescheduling.md) remains responsible for clinician-recorded outcomes; it is not folded into availability management.
- The demo's 15-minute early-join behavior remains synthetic-demo behavior until the clinical lead approves a real-session policy.

## Tier 2 implementation plan

Draft only after the current scheduling schema, booking function, and RLS policies are re-verified. It must include:

1. A forward-only migration for recurring availability, overrides, indexes, RLS, grants, and audit events.
2. A protected clinician schedule-management operation with ownership checks, validation of 8 AM–5 PM weekday defaults, and conflict handling for already booked appointments.
3. A protected availability projection that generates 15-minute candidate starts, checks the full 45-minute range, honors exceptions, and restricts choices to the next two weeks.
4. A single replacement or extension of the current booking transaction that locks and verifies the chosen range at write time, supports idempotent retry, and never trusts client-calculated availability.
5. Patient UI changes in `PatientAppointment.jsx` and appointment feature components for psychiatrist, date, and time selection without duplicating booking behavior.
6. Clinician UI for publishing schedule rules and one-off exceptions, including mobile, empty, loading, error, and focus states.
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

## Inputs to re-confirm before implementation

- Whether the clinician can publish hours outside the 8 AM–5 PM weekday default as an approved exception, or whether admin approval is required.
- Whether clinicians need multiple appointment types or durations in a later phase. This phase assumes the approved single 45-minute type only.
- The clinical lead's real-session decision for early join and session end. This phase preserves the synthetic-demo behavior but does not ratify it for production.
