-- Qualify the meeting table's appointment_id so it cannot collide with the
-- appointment_id output parameter declared by get_google_meet_admission.
create or replace function public.get_google_meet_admission(
  target_appointment_id uuid,
  actor_profile_id uuid
)
returns table (
  appointment_id uuid,
  host_profile_id uuid,
  participant_role public.app_role,
  starts_at timestamptz,
  ends_at timestamptz,
  meeting_status text,
  space_name text,
  meeting_uri text
)
language plpgsql security definer set search_path = pg_catalog, public
as $$
declare
  appointment_row public.appointments%rowtype;
  actor_role public.app_role;
  google_enabled boolean;
  meeting_row public.google_meeting_spaces%rowtype;
begin
  perform private.assert_service_role();

  select role into actor_role from public.profiles where id = actor_profile_id;
  select enabled into google_enabled
  from public.system_controls
  where control_key = 'google_meet_enabled';
  select * into appointment_row
  from public.appointments
  where id = target_appointment_id;

  if not coalesce(google_enabled, false) then
    insert into public.audit_events (actor_id, event_code, target_type, target_id, outcome, reason_code)
    values (actor_profile_id, 'google_meet_access', 'appointment', target_appointment_id, 'denied', 'video_disabled');
    raise exception 'google_meet_access_denied' using errcode = '42501';
  end if;

  if actor_role not in ('patient', 'psychiatrist') or appointment_row.id is null then
    insert into public.audit_events (actor_id, event_code, target_type, target_id, outcome, reason_code)
    values (actor_profile_id, 'google_meet_access', 'appointment', target_appointment_id, 'denied', 'not_related');
    raise exception 'google_meet_access_denied' using errcode = '42501';
  end if;

  if appointment_row.status <> 'booked' then
    insert into public.audit_events (actor_id, event_code, target_type, target_id, outcome, reason_code)
    values (actor_profile_id, 'google_meet_access', 'appointment', target_appointment_id, 'denied', 'appointment_not_booked');
    raise exception 'google_meet_access_denied' using errcode = '42501';
  end if;

  if not (
    (actor_role = 'patient' and appointment_row.patient_id = actor_profile_id)
    or (actor_role = 'psychiatrist' and exists (
      select 1 from public.psychiatrists
      where id = appointment_row.psychiatrist_id
        and profile_id = actor_profile_id
        and is_active
    ))
  ) then
    insert into public.audit_events (actor_id, event_code, target_type, target_id, outcome, reason_code)
    values (actor_profile_id, 'google_meet_access', 'appointment', target_appointment_id, 'denied', 'not_related');
    raise exception 'google_meet_access_denied' using errcode = '42501';
  end if;

  if now() < appointment_row.starts_at - interval '15 minutes' then
    insert into public.audit_events (actor_id, event_code, target_type, target_id, outcome, reason_code)
    values (actor_profile_id, 'google_meet_access', 'appointment', target_appointment_id, 'denied', 'window_not_open');
    raise exception 'google_meet_access_denied' using errcode = '42501';
  end if;

  if now() >= appointment_row.ends_at then
    insert into public.audit_events (actor_id, event_code, target_type, target_id, outcome, reason_code)
    values (actor_profile_id, 'google_meet_access', 'appointment', target_appointment_id, 'denied', 'window_expired');
    raise exception 'google_meet_access_denied' using errcode = '42501';
  end if;

  select * into meeting_row
  from public.google_meeting_spaces as meeting_spaces
  where meeting_spaces.appointment_id = target_appointment_id;

  return query
  select appointment_row.id,
    (select profile_id from public.psychiatrists where id = appointment_row.psychiatrist_id),
    actor_role,
    appointment_row.starts_at,
    appointment_row.ends_at,
    meeting_row.status,
    meeting_row.space_name,
    meeting_row.meeting_uri;
end;
$$;

revoke all on function public.get_google_meet_admission(uuid, uuid) from public, anon, authenticated;
grant execute on function public.get_google_meet_admission(uuid, uuid) to service_role;
