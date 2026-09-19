-- Phase 18: Google Meet provider boundary and server-authoritative admission.
-- The provider key and OAuth refresh tokens never enter browser code. The
-- google_meet_enabled control is off by default and must be enabled only by
-- an admin in the explicitly configured test/showcase environment.

alter table public.system_controls
  drop constraint if exists system_controls_known_key;

alter table public.system_controls
  add constraint system_controls_known_key
  check (control_key in ('booking_enabled', 'direct_webrtc_enabled', 'google_meet_enabled'));

insert into public.system_controls (control_key, enabled)
values ('google_meet_enabled', false)
on conflict (control_key) do nothing;

create table public.google_meet_connections (
  profile_id uuid primary key references public.profiles (id) on delete restrict,
  refresh_token text not null check (char_length(refresh_token) > 0),
  connected_at timestamptz not null default now(),
  revoked_at timestamptz,
  updated_at timestamptz not null default now()
);

create table public.google_meeting_spaces (
  appointment_id uuid primary key references public.appointments (id) on delete restrict,
  host_profile_id uuid not null references public.profiles (id) on delete restrict,
  status text not null default 'creating',
  space_name text,
  meeting_uri text,
  claim_token uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint google_meeting_spaces_status_check check (status in ('creating', 'active', 'ended', 'failed')),
  constraint google_meeting_spaces_active_fields_check check (
    (status = 'active' and space_name is not null and meeting_uri is not null)
    or status <> 'active'
  )
);

create index google_meeting_spaces_host_profile_idx
  on public.google_meeting_spaces (host_profile_id, status);

create trigger google_meet_connections_set_updated_at
before update on public.google_meet_connections
for each row execute function private.set_updated_at();

create trigger google_meeting_spaces_set_updated_at
before update on public.google_meeting_spaces
for each row execute function private.set_updated_at();

alter table public.google_meet_connections enable row level security;
alter table public.google_meeting_spaces enable row level security;
revoke all on table public.google_meet_connections, public.google_meeting_spaces from anon, authenticated;
grant all on table public.google_meet_connections, public.google_meeting_spaces to service_role;

create or replace function public.get_google_meet_connection_status(actor_profile_id uuid)
returns table (connected boolean, connected_at timestamptz)
language plpgsql security definer set search_path = pg_catalog, public
as $$
begin
  perform private.assert_service_role();
  if not exists (
    select 1 from public.profiles where id = actor_profile_id and role = 'psychiatrist'
  ) then
    raise exception 'google_meet_not_permitted' using errcode = '42501';
  end if;

  return query
  select (connection.revoked_at is null), connection.connected_at
  from public.google_meet_connections as connection
  where connection.profile_id = actor_profile_id;

  if not found then
    return query select false, null::timestamptz;
  end if;
end;
$$;

revoke all on function public.get_google_meet_connection_status(uuid) from public, anon, authenticated;
grant execute on function public.get_google_meet_connection_status(uuid) to service_role;

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
  from public.google_meeting_spaces
  where appointment_id = target_appointment_id;

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

create or replace function public.claim_google_meet_space(
  target_appointment_id uuid,
  target_host_profile_id uuid,
  requested_claim_token uuid
)
returns table (claim_granted boolean, meeting_status text, space_name text, meeting_uri text)
language plpgsql security definer set search_path = pg_catalog, public
as $$
declare
  meeting_row public.google_meeting_spaces%rowtype;
begin
  perform private.assert_service_role();
  select * into meeting_row
  from public.google_meeting_spaces
  where appointment_id = target_appointment_id
  for update;

  if found and meeting_row.status = 'active' then
    return query select false, meeting_row.status, meeting_row.space_name, meeting_row.meeting_uri;
    return;
  end if;

  if found and meeting_row.status = 'creating'
     and meeting_row.updated_at > now() - interval '2 minutes' then
    return query select false, meeting_row.status, meeting_row.space_name, meeting_row.meeting_uri;
    return;
  end if;

  if found then
    update public.google_meeting_spaces
    set host_profile_id = target_host_profile_id,
        status = 'creating',
        space_name = null,
        meeting_uri = null,
        claim_token = requested_claim_token,
        updated_at = now()
    where appointment_id = target_appointment_id
    returning * into meeting_row;
  else
    insert into public.google_meeting_spaces (appointment_id, host_profile_id, status, claim_token)
    values (target_appointment_id, target_host_profile_id, 'creating', requested_claim_token)
    returning * into meeting_row;
  end if;

  return query select true, meeting_row.status, meeting_row.space_name, meeting_row.meeting_uri;
end;
$$;

revoke all on function public.claim_google_meet_space(uuid, uuid, uuid) from public, anon, authenticated;
grant execute on function public.claim_google_meet_space(uuid, uuid, uuid) to service_role;

create or replace function public.complete_google_meet_space(
  target_appointment_id uuid,
  requested_claim_token uuid,
  provider_space_name text,
  provider_meeting_uri text
)
returns table (meeting_uri text)
language plpgsql security definer set search_path = pg_catalog, public
as $$
declare completed_uri text;
begin
  perform private.assert_service_role();
  if provider_space_name is null or provider_space_name !~ '^spaces/'
     or provider_meeting_uri is null or provider_meeting_uri !~ '^https://meet\.google\.com/' then
    raise exception 'google_meet_provider_response_invalid' using errcode = 'P0001';
  end if;

  update public.google_meeting_spaces
  set status = 'active', space_name = provider_space_name,
      meeting_uri = provider_meeting_uri, claim_token = null, updated_at = now()
  where appointment_id = target_appointment_id
    and claim_token = requested_claim_token
    and status = 'creating'
  returning google_meeting_spaces.meeting_uri into completed_uri;

  if completed_uri is null then
    raise exception 'google_meet_space_claim_invalid' using errcode = 'P0001';
  end if;
  return query select completed_uri;
end;
$$;

revoke all on function public.complete_google_meet_space(uuid, uuid, text, text) from public, anon, authenticated;
grant execute on function public.complete_google_meet_space(uuid, uuid, text, text) to service_role;

create or replace function public.fail_google_meet_space(
  target_appointment_id uuid,
  requested_claim_token uuid
)
returns void
language plpgsql security definer set search_path = pg_catalog, public
as $$
begin
  perform private.assert_service_role();
  update public.google_meeting_spaces
  set status = 'failed', claim_token = null, updated_at = now()
  where appointment_id = target_appointment_id
    and claim_token = requested_claim_token
    and status = 'creating';
end;
$$;

revoke all on function public.fail_google_meet_space(uuid, uuid) from public, anon, authenticated;
grant execute on function public.fail_google_meet_space(uuid, uuid) to service_role;

create or replace function public.set_google_meet_enabled(
  next_enabled boolean,
  actor_profile_id uuid,
  request_id uuid
)
returns boolean
language plpgsql security definer set search_path = pg_catalog, public
as $$
declare previous_enabled boolean;
begin
  perform private.assert_service_role();
  if not exists (select 1 from public.profiles where id = actor_profile_id and role = 'admin') then
    raise exception 'google_meet_control_not_permitted' using errcode = '42501';
  end if;
  select enabled into previous_enabled
  from public.system_controls
  where control_key = 'google_meet_enabled'
  for update;
  update public.system_controls
  set enabled = next_enabled, updated_by = actor_profile_id, updated_at = now()
  where control_key = 'google_meet_enabled';
  insert into public.audit_events (
    actor_id, event_code, target_type, target_id, outcome, reason_code, correlation_id, metadata
  ) values (
    actor_profile_id, 'google_meet_kill_switch_changed', 'system_control', null, 'success',
    case when next_enabled then 'enabled' else 'disabled' end, request_id,
    jsonb_build_object('previous_enabled', previous_enabled, 'next_enabled', next_enabled)
  );
  return next_enabled;
end;
$$;

revoke all on function public.set_google_meet_enabled(boolean, uuid, uuid) from public, anon, authenticated;
grant execute on function public.set_google_meet_enabled(boolean, uuid, uuid) to service_role;
