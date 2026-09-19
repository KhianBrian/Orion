-- Phase 18.5: synthetic/non-production Direct WebRTC + TURN control plane.
-- This migration is intentionally fail-closed. It never creates a provider room,
-- persists signaling payloads, or authorizes an admin/third participant.

alter table public.system_controls
  drop constraint if exists system_controls_known_key;

alter table public.system_controls
  add constraint system_controls_known_key
  check (control_key in ('booking_enabled', 'direct_webrtc_enabled'));

insert into public.system_controls (control_key, enabled)
values ('direct_webrtc_enabled', false)
on conflict (control_key) do nothing;

create type public.video_session_mode as enum ('direct_webrtc');
create type public.video_session_status as enum ('active', 'revoked', 'expired');

create table public.video_sessions (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null unique references public.appointments (id) on delete restrict,
  mode public.video_session_mode not null default 'direct_webrtc',
  status public.video_session_status not null default 'active',
  session_generation integer not null default 1 check (session_generation > 0),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint video_sessions_status_facts_check check (
    (status = 'active' and revoked_at is null)
    or (status = 'revoked' and revoked_at is not null)
    or (status = 'expired' and revoked_at is null)
  )
);

create index video_sessions_status_expires_at_idx
  on public.video_sessions (status, expires_at);

create trigger video_sessions_set_updated_at
before update on public.video_sessions
for each row execute function private.set_updated_at();

alter table public.video_sessions enable row level security;
revoke all on table public.video_sessions from anon, authenticated;
grant all on table public.video_sessions to service_role;

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
  current_time timestamptz := now();
begin
  perform private.assert_service_role();

  select role into actor_role
  from public.profiles
  where id = actor_profile_id;

  select enabled into direct_enabled
  from public.system_controls
  where control_key = 'direct_webrtc_enabled';

  select * into appointment_row
  from public.appointments
  where id = target_appointment_id
  for update;

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
      where id = appointment_row.psychiatrist_id
        and profile_id = actor_profile_id
        and is_active
    ))
  ) then
    insert into public.audit_events (actor_id, event_code, target_type, target_id, outcome, reason_code)
    values (actor_profile_id, 'direct_webrtc_access', 'appointment', target_appointment_id, 'denied', 'not_related');
    raise exception 'direct_webrtc_access_denied' using errcode = '42501';
  end if;

  if current_time < appointment_row.starts_at - interval '15 minutes' then
    insert into public.audit_events (actor_id, event_code, target_type, target_id, outcome, reason_code)
    values (actor_profile_id, 'direct_webrtc_access', 'appointment', target_appointment_id, 'denied', 'window_not_open');
    raise exception 'direct_webrtc_access_denied' using errcode = '42501';
  end if;

  if current_time >= appointment_row.ends_at then
    insert into public.audit_events (actor_id, event_code, target_type, target_id, outcome, reason_code)
    values (actor_profile_id, 'direct_webrtc_access', 'appointment', target_appointment_id, 'denied', 'window_expired');
    raise exception 'direct_webrtc_access_denied' using errcode = '42501';
  end if;

  select * into session_row
  from public.video_sessions
  where appointment_id = target_appointment_id
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

  return query
  select session_row.id,
    appointment_row.id,
    actor_role,
    session_row.session_generation,
    appointment_row.starts_at,
    appointment_row.ends_at,
    least(current_time + interval '5 minutes', appointment_row.ends_at);
end;
$$;

revoke all on function public.get_direct_webrtc_session_access(uuid, uuid) from public, anon, authenticated;
grant execute on function public.get_direct_webrtc_session_access(uuid, uuid) to service_role;

create or replace function public.set_direct_webrtc_enabled(
  next_enabled boolean,
  actor_profile_id uuid,
  request_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  previous_enabled boolean;
begin
  perform private.assert_service_role();
  if actor_profile_id is null or not exists (
    select 1 from public.profiles where id = actor_profile_id and role = 'admin'
  ) then
    raise exception 'direct_webrtc_control_not_permitted' using errcode = '42501';
  end if;

  select enabled into previous_enabled
  from public.system_controls
  where control_key = 'direct_webrtc_enabled'
  for update;

  update public.system_controls
  set enabled = next_enabled, updated_by = actor_profile_id, updated_at = now()
  where control_key = 'direct_webrtc_enabled';

  insert into public.audit_events (
    actor_id, event_code, target_type, target_id, outcome, reason_code, correlation_id, metadata
  ) values (
    actor_profile_id, 'direct_webrtc_kill_switch_changed', 'system_control', null, 'success',
    case when next_enabled then 'enabled' else 'disabled' end, request_id,
    jsonb_build_object('previous_enabled', previous_enabled, 'next_enabled', next_enabled)
  );
  return next_enabled;
end;
$$;

revoke all on function public.set_direct_webrtc_enabled(boolean, uuid, uuid) from public, anon, authenticated;
grant execute on function public.set_direct_webrtc_enabled(boolean, uuid, uuid) to service_role;
