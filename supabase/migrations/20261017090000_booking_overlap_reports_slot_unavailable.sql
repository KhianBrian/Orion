-- Booking race: report an overlapping booking as "slot_unavailable".
-- When two patients book different but overlapping times with the same psychiatrist at the same
-- instant, the database exclusion constraint appointments_no_overlapping_active_sessions already
-- admits exactly one. The loser used to receive a raw exclusion_violation, which the booking
-- function turned into a generic server failure (500). It now receives slot_unavailable (409), the
-- same clear conflict a patient gets when someone books the identical slot first.
-- Only the exception clause changes; the rest of the function is as defined in Phase 14.

create or replace function public.book_appointment_for_patient(
  requested_slot_id uuid, request_id uuid, actor_profile_id uuid
)
returns table (appointment_id uuid, slot_id uuid, starts_at timestamptz, ends_at timestamptz, appointment_status public.appointment_status)
language plpgsql security definer set search_path = pg_catalog, public
as $$
declare locked_slot public.availability_slots%rowtype; existing_appointment public.appointments%rowtype; booking_enabled boolean;
begin
  perform private.assert_service_role();
  if actor_profile_id is null or request_id is null or requested_slot_id is null or not exists (select 1 from public.profiles where id = actor_profile_id and role = 'patient') then raise exception 'booking_not_permitted' using errcode = '42501'; end if;
  select * into existing_appointment from public.appointments where patient_id = actor_profile_id and idempotency_key = request_id;
  if found then
    if existing_appointment.slot_id <> requested_slot_id then raise exception 'booking_not_permitted' using errcode = '42501'; end if;
    return query select existing_appointment.id, existing_appointment.slot_id, existing_appointment.starts_at, existing_appointment.ends_at, existing_appointment.status; return;
  end if;
  select enabled into booking_enabled from public.system_controls where control_key = 'booking_enabled';
  if not coalesce(booking_enabled, false) then raise exception 'booking_disabled' using errcode = 'P0001'; end if;
  select * into locked_slot from public.availability_slots where id = requested_slot_id for update;
  if not found or locked_slot.status <> 'open' or locked_slot.starts_at <= now() or locked_slot.starts_at > now() + interval '14 days'
     or not exists (select 1 from public.psychiatrists where id = locked_slot.psychiatrist_id and is_active)
     or not private.schedule_range_published(locked_slot.psychiatrist_id, locked_slot.starts_at, locked_slot.ends_at) then raise exception 'slot_unavailable' using errcode = 'P0001'; end if;
  begin
    insert into public.appointments (patient_id, psychiatrist_id, slot_id, starts_at, ends_at, idempotency_key)
    values (actor_profile_id, locked_slot.psychiatrist_id, locked_slot.id, locked_slot.starts_at, locked_slot.ends_at, request_id) returning * into existing_appointment;
  exception when unique_violation or exclusion_violation then
    select * into existing_appointment from public.appointments where patient_id = actor_profile_id and idempotency_key = request_id;
    if found then return query select existing_appointment.id, existing_appointment.slot_id, existing_appointment.starts_at, existing_appointment.ends_at, existing_appointment.status; return; end if;
    raise exception 'slot_unavailable' using errcode = 'P0001';
  end;
  update public.availability_slots set status = 'booked' where id = locked_slot.id;
  insert into public.audit_events (actor_id, event_code, target_type, target_id, outcome, correlation_id) values (actor_profile_id, 'appointment_booked', 'appointment', existing_appointment.id, 'success', request_id);
  return query select existing_appointment.id, existing_appointment.slot_id, existing_appointment.starts_at, existing_appointment.ends_at, existing_appointment.status;
end;
$$;

revoke all on function public.book_appointment_for_patient(uuid, uuid, uuid) from public, anon, authenticated;
grant execute on function public.book_appointment_for_patient(uuid, uuid, uuid) to service_role;
