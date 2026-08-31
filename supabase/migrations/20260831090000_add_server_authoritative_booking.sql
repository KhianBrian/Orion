-- D3 scheduling boundary. This is a forward-only migration: it adds the
-- transaction used by the book-appointment Edge Function without changing
-- the already-applied demo foundation migrations.

alter table public.appointments
  add constraint appointments_no_overlapping_booked_sessions
  exclude using gist (
    psychiatrist_id with =,
    tstzrange(starts_at, ends_at, '[)') with &&
  ) where (status = 'booked');

create function public.book_appointment(
  requested_slot_id uuid,
  request_id uuid
)
returns table (
  appointment_id uuid,
  slot_id uuid,
  starts_at timestamptz,
  ends_at timestamptz,
  appointment_status public.appointment_status
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  caller_id uuid := auth.uid();
  locked_slot public.availability_slots%rowtype;
  existing_appointment public.appointments%rowtype;
begin
  if caller_id is null or private.current_app_role() <> 'patient' then
    raise exception 'booking_not_permitted' using errcode = '42501';
  end if;

  -- A retry returns the appointment created by the first call. The key is
  -- patient-scoped by the unique index defined in the demo foundation.
  select * into existing_appointment
  from public.appointments
  where patient_id = caller_id and idempotency_key = request_id;

  if found then
    return query select
      existing_appointment.id,
      existing_appointment.slot_id,
      existing_appointment.starts_at,
      existing_appointment.ends_at,
      existing_appointment.status;
    return;
  end if;

  select * into locked_slot
  from public.availability_slots
  where id = requested_slot_id
  for update;

  if not found
    or locked_slot.status <> 'open'
    or locked_slot.starts_at <= now()
    or not exists (
      select 1
      from public.psychiatrists
      where id = locked_slot.psychiatrist_id and is_active
    ) then
    raise exception 'slot_unavailable' using errcode = 'P0001';
  end if;

  begin
    insert into public.appointments (
      patient_id,
      psychiatrist_id,
      slot_id,
      starts_at,
      ends_at,
      idempotency_key
    ) values (
      caller_id,
      locked_slot.psychiatrist_id,
      locked_slot.id,
      locked_slot.starts_at,
      locked_slot.ends_at,
      request_id
    ) returning * into existing_appointment;
  exception when unique_violation then
    -- This covers a duplicate idempotency request that races before the
    -- first insert is visible. A slot collision stays deliberately generic.
    select * into existing_appointment
    from public.appointments
    where patient_id = caller_id and idempotency_key = request_id;

    if found then
      return query select
        existing_appointment.id,
        existing_appointment.slot_id,
        existing_appointment.starts_at,
        existing_appointment.ends_at,
        existing_appointment.status;
      return;
    end if;

    raise exception 'slot_unavailable' using errcode = 'P0001';
  end;

  update public.availability_slots
  set status = 'booked'
  where id = locked_slot.id;

  insert into public.audit_events (
    actor_id,
    event_code,
    target_type,
    target_id,
    outcome,
    correlation_id
  ) values (
    caller_id,
    'appointment_booked',
    'appointment',
    existing_appointment.id,
    'success',
    request_id
  );

  return query select
    existing_appointment.id,
    existing_appointment.slot_id,
    existing_appointment.starts_at,
    existing_appointment.ends_at,
    existing_appointment.status;
end;
$$;

revoke all on function public.book_appointment(uuid, uuid) from public, anon;
grant execute on function public.book_appointment(uuid, uuid) to authenticated;
