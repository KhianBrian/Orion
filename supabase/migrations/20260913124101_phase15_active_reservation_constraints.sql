-- Phase 15: active reservation constraints.
-- Kept in a follow-up migration because PostgreSQL does not allow a newly
-- added enum value to be referenced before the enum migration commits.

create unique index appointments_one_active_appointment_per_slot
  on public.appointments (slot_id)
  where status in ('payment_pending', 'booked');

alter table public.appointments
  add constraint appointments_no_overlapping_active_sessions
  exclude using gist (
    psychiatrist_id with =,
    tstzrange(starts_at, ends_at, '[)') with &&
  ) where (status in ('payment_pending', 'booked'));
