-- Phase 18.5 correction: qualify the session appointment lookup against the
-- function's output column named appointment_id.

create or replace function public.get_direct_webrtc_session_access(
  target_appointment_id uuid,
  actor_profile_id uuid
)
returns table (
  session_id uuid,
  appointment_id uuid,
  participant_role public.app_role,
  session_generation integer,
  starts_at timestamptz,
  ends_at timestamptz,
  access_expires_at timestamptz
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  appointment_row public.appointments%rowtype;
  session_row public.video_sessions%rowtype;
  actor_role public.app_role;
  direct_enabled boolean;
begin
  perform private.assert_service_role();
  select role into actor_role from public.profiles where id = actor_profile_id;
  select enabled into direct_enabled from public.system_controls where control_key = 'direct_webrtc_enabled';
  select * into appointment_row from public.appointments where id = target_appointment_id for update;

  if not coalesce(direct_enabled, false) then
    insert into public.audit_events (actor_id, event_code, target_type, target_id, outcome, reason_code)
    values (actor_profile_id, 'direct_webrtc_access', 'appointment', target_appointment_id, 'denied', 'video_disabled');
    raise exception 'direct_webrtc_access_denied' using errcode = '42501';
  end if;
  if actor_role not in ('patient', 'psychiatrist') or appointment_row.id is null then
    insert into public.audit_events (actor_id, event_code, target_type, target_id, outcome, reason_code)
    values (actor_profile_id, 'direct_webrtc_access', 'appointment', target_appointment_id, 'denied', 'not_related');
    raise exception 'direct_webrtc_access_denied' using errcode = '42501';
  end if;
  if appointment_row.status <> 'booked' then
    insert into public.audit_events (actor_id, event_code, target_type, target_id, outcome, reason_code)
    values (actor_profile_id, 'direct_webrtc_access', 'appointment', target_appointment_id, 'denied', 'appointment_not_booked');
    raise exception 'direct_webrtc_access_denied' using errcode = '42501';
  end if;
  if not (
    (actor_role = 'patient' and appointment_row.patient_id = actor_profile_id)
    or (actor_role = 'psychiatrist' and exists (
      select 1 from public.psychiatrists
      where id = appointment_row.psychiatrist_id and profile_id = actor_profile_id and is_active
    ))
  ) then
    insert into public.audit_events (actor_id, event_code, target_type, target_id, outcome, reason_code)
    values (actor_profile_id, 'direct_webrtc_access', 'appointment', target_appointment_id, 'denied', 'not_related');
    raise exception 'direct_webrtc_access_denied' using errcode = '42501';
  end if;
  if now() < appointment_row.starts_at - interval '15 minutes' then
    insert into public.audit_events (actor_id, event_code, target_type, target_id, outcome, reason_code)
    values (actor_profile_id, 'direct_webrtc_access', 'appointment', target_appointment_id, 'denied', 'window_not_open');
    raise exception 'direct_webrtc_access_denied' using errcode = '42501';
  end if;
  if now() >= appointment_row.ends_at then
    insert into public.audit_events (actor_id, event_code, target_type, target_id, outcome, reason_code)
    values (actor_profile_id, 'direct_webrtc_access', 'appointment', target_appointment_id, 'denied', 'window_expired');
    raise exception 'direct_webrtc_access_denied' using errcode = '42501';
  end if;

  select candidate.* into session_row
  from public.video_sessions as candidate
  where candidate.appointment_id = get_direct_webrtc_session_access.target_appointment_id
  for update;
  if found and session_row.status = 'revoked' then
    insert into public.audit_events (actor_id, event_code, target_type, target_id, outcome, reason_code)
    values (actor_profile_id, 'direct_webrtc_access', 'video_session', session_row.id, 'denied', 'session_revoked');
    raise exception 'direct_webrtc_access_denied' using errcode = '42501';
  end if;
  if found and session_row.status = 'expired' then
    insert into public.audit_events (actor_id, event_code, target_type, target_id, outcome, reason_code)
    values (actor_profile_id, 'direct_webrtc_access', 'video_session', session_row.id, 'denied', 'session_expired');
    raise exception 'direct_webrtc_access_denied' using errcode = '42501';
  end if;
  if not found then
    insert into public.video_sessions (appointment_id, expires_at)
    values (target_appointment_id, appointment_row.ends_at)
    returning * into session_row;
  end if;
  insert into public.audit_events (actor_id, event_code, target_type, target_id, outcome, reason_code)
  values (actor_profile_id, 'direct_webrtc_access', 'video_session', session_row.id, 'success', 'granted');
  return query select session_row.id, appointment_row.id, actor_role, session_row.session_generation,
    appointment_row.starts_at, appointment_row.ends_at, least(now() + interval '5 minutes', appointment_row.ends_at);
end;
$$;

revoke all on function public.get_direct_webrtc_session_access(uuid, uuid) from public, anon, authenticated;
grant execute on function public.get_direct_webrtc_session_access(uuid, uuid) to service_role;
