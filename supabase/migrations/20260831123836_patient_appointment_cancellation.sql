-- D4 patient cancellation boundary. Forward-only; no applied migration is modified.

alter table public.appointments
  add column cancellation_idempotency_key uuid;

create unique index appointments_patient_cancellation_idempotency_key
  on public.appointments (patient_id, cancellation_idempotency_key)
  where cancellation_idempotency_key is not null;

create function public.cancel_appointment_for_patient(
  appointment_id uuid,
  request_id uuid,
  actor_profile_id uuid
)
returns table (
  cancelled_appointment_id uuid,
  slot_id uuid,
  appointment_status public.appointment_status,
  cancelled_at timestamptz,
  cancelled_by public.cancellation_party
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  locked_appointment public.appointments%rowtype;
  locked_slot public.availability_slots%rowtype;
  cancellation_time timestamptz := now();
begin
  if actor_profile_id is null or request_id is null or appointment_id is null
     or not exists (
       select 1 from public.profiles
       where id = actor_profile_id and role = 'patient'
     ) then
    raise exception 'cancellation_not_permitted' using errcode = '42501';
  end if;

  -- Lock the appointment first, then its slot. Every cancellation uses this order.
  select * into locked_appointment
  from public.appointments
  where id = cancel_appointment_for_patient.appointment_id
  for update;

  if not found then
    raise exception 'cancellation_not_permitted' using errcode = '42501';
  end if;

  if locked_appointment.patient_id <> actor_profile_id then
    raise exception 'cancellation_not_permitted' using errcode = '42501';
  end if;

  if locked_appointment.status = 'cancelled'
     and locked_appointment.cancellation_idempotency_key = request_id then
    return query select locked_appointment.id, locked_appointment.slot_id,
      locked_appointment.status, locked_appointment.cancelled_at,
      locked_appointment.cancelled_by;
    return;
  end if;

  if locked_appointment.status <> 'booked'
     or locked_appointment.starts_at <= now() + interval '24 hours' then
    raise exception 'cancellation_not_permitted' using errcode = '42501';
  end if;

  select * into locked_slot
  from public.availability_slots
  where id = locked_appointment.slot_id
  for update;

  if not found then
    raise exception 'cancellation_not_permitted' using errcode = '42501';
  end if;

  begin
    update public.appointments
    set status = 'cancelled',
        cancelled_at = cancellation_time,
        cancelled_by = 'patient',
        cancellation_idempotency_key = request_id
    where id = locked_appointment.id;
  exception when unique_violation then
    -- A request key cannot be reused for a different cancellation.
    raise exception 'cancellation_not_permitted' using errcode = '42501';
  end;

  if exists (
    select 1 from public.psychiatrists
    where id = locked_appointment.psychiatrist_id and is_active
  ) then
    update public.availability_slots
    set status = 'open'
    where id = locked_slot.id;
  end if;

  insert into public.audit_events (
    actor_id, event_code, target_type, target_id, outcome, correlation_id
  ) values (
    actor_profile_id, 'appointment_cancelled', 'appointment',
    locked_appointment.id, 'success', request_id
  );

  return query select locked_appointment.id, locked_appointment.slot_id,
    'cancelled'::public.appointment_status, cancellation_time,
    'patient'::public.cancellation_party;
end;
$$;

revoke all on function public.cancel_appointment_for_patient(uuid, uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.cancel_appointment_for_patient(uuid, uuid, uuid)
  to service_role;
