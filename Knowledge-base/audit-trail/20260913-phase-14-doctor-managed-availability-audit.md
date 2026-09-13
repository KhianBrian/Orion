# Phase 14 psychiatrist-managed availability audit — 2026-09-13

## Scope and delivery record

Phase 14 implemented doctor-managed availability and patient time selection on top of the completed
Phase 4 server-authoritative scheduling workflow. Development was performed on branch
`codex/phase-14-availability` in worktree `../Orion-phase-14`. The branch was rebased onto the
merged Phase 4 `main`, merged with commit `332a1eb` (`Merge Phase 14 psychiatrist availability`),
and the temporary branch and worktree were removed after publishing.

The implementation remained synthetic and non-production. It did not introduce real patient data,
real clinician identities, or a second booking system.

## User-visible flow

1. A patient chooses an active psychiatrist first.
2. The patient chooses a Manila-local date within the next two weeks.
3. Orion displays only server-generated available starts on a 15-minute grid. Each displayed start
   represents a 45-minute clinical session.
4. The patient chooses a time and submits the slot identifier through the existing Phase 4 booking
   Edge Function. The browser cannot make an unavailable time bookable by changing its local data.
5. The booking transaction rechecks the psychiatrist, date, two-week horizon, published schedule,
   slot state, and appointment conflict while holding the relevant database lock. It creates the
   appointment and audit event atomically.

Psychiatrists manage their own recurring weekday periods and one-off exceptions. The default window
is weekdays, 8:00 AM–5:00 PM Asia/Manila, with the latest standard start at 4:15 PM. They may manage
their schedule within that normal window. Outside-hours availability is held for admin approval.
Admins can inspect psychiatrist schedules but cannot directly edit them.

When a schedule edit would conflict with an existing booked appointment, Orion blocks the change and
explains that the psychiatrist must reschedule or cancel the appointment first. Existing booked
appointments are never silently moved or deleted. Recurring changes affect only future unbooked
availability.

Only the 45-minute clinical session consumes scheduling time. The patient's 15-minute early-join
period and the psychiatrist's 15-minute post-session note window do not create scheduling conflicts,
so an adjacent session may start when the clinical session ends.

## Implementation details

### Database and availability model

Migration `20260912185905_phase14_doctor_managed_availability.sql` adds:

- recurring weekday schedule rules with the default Manila working window;
- one-off unavailable, available, and outside-hours override records;
- approval status and reason handling for outside-hours availability;
- quarter-hour validation and 45-minute duration rules;
- default rule seeding for active psychiatrists and future-psychiatrist seeding;
- server-generated availability from schedules, overrides, horizon, and appointments;
- booked-appointment conflict blocking for schedule edits;
- protected raw availability tables and a patient-safe availability projection;
- server-side booking validation so the existing Phase 4 booking path remains authoritative;
- reschedule validation against the same schedule and conflict rules.

The schedule model separates published availability from booked appointments. It does not use the
early-join or note-writing windows as schedule reservations. It preserves booked appointments and
does not silently rewrite historical or future appointment rows.

### Server and authorization boundary

`manage-schedule` is the server-authorized Edge Function for psychiatrist schedule changes and
admin read-only schedule overview. It validates the authenticated caller, role, ownership, payload,
normal-hour boundary, approval requirement, and conflict state before calling protected database
functions. RLS, grants, and protected projections prevent patients from reading raw schedule data or
other users' private information.

The patient availability query is a projection, not direct access to the schedule tables. Booking
continues through the Phase 4 `book-appointment` path; Phase 14 creates no competing booking route.

### Frontend

`PatientAppointment.jsx` now presents psychiatrist → Manila date → available time. The new
`PsychiatristSchedule.jsx` page supports clinician-owned schedule rules and overrides, including
empty, save, pending-approval, unavailable, and conflict states. `AdminSchedules.jsx` provides
read-only operational visibility.

The new and changed screens use the existing Orion theme, accessible controls, responsive layout,
loading/error messaging, and desktop/mobile behavior. Routes and data queries were updated without
introducing a separate scheduling client or business-rule source.

## Verification performed

### Static and application checks

- `npm run check:env-examples` — passed.
- `npm run lint` — passed.
- `npm run test:unit` — passed.
- `npm run build` — passed; the initial JavaScript bundle remained within the configured gzip budget.
- `git diff --check` — passed on the Phase 14 merge and final main comparison.

### Database, RLS, and migration checks

- Local Supabase was started with Docker and the forward-only migration history was reset and applied.
- Phase 2, Phase 4, Phase 14, booking, cancellation, and RLS database checks passed against synthetic
  data.
- The checks covered default schedule seeding, raw-table protection, server availability projection,
  two-week horizon, 15-minute starts, 45-minute duration, psychiatrist ownership, admin read-only
  visibility, outside-hours approval, booked-appointment conflict blocking, and preservation of
  existing appointments.
- `supabase db lint --local` returned `No schema errors found`, including after the session-note lint
  cleanup migration.

### Browser checks

- The authenticated scheduling Playwright scenarios passed on desktop and mobile projects: 14 tests
  passed across seven scheduling behaviors and two browser projects.
- The complete integrated Playwright suite passed: 70 tests passed across public, protected,
  scheduling, desktop, and mobile coverage. Public tests ran without credentials; authenticated tests
  used the synthetic accounts for protected journeys and authorization allow/deny checks.
- Coverage included the patient psychiatrist/date/time flow, booking conflicts, cancellation behavior,
  schedule management, admin read-only visibility, responsive layout, loading/error/conflict states,
  and protected-route behavior.

### Linked non-production deployment

After the user confirmed `Orion-demo` as the target, migration `20260912185905` and the session-note
lint cleanup migration were applied to the linked project. `manage-schedule` was deployed and
`supabase migration list --linked` matched the local migration history. No production environment was
used.

## Remaining risks and boundaries

- This is synthetic, non-production evidence. It does not approve real users, real health data, or a
  controlled pilot.
- Hosted Supabase leaked-password protection remains disabled on the Free project and must be revisited
  before broader password-account use.
- Phase 12 MFA remains intentionally deferred.
- Payment-authorized booking remains Phase 17 work, and real Google Meet admission/timing remains
  Phase 18 work. Phase 14 must continue using the Phase 4 booking workflow.
