-- Phase 14: psychiatrist-managed availability.
-- Availability rows become derived 45-minute candidate starts. They may
-- overlap one another on the 15-minute grid; appointments remain the only
-- authoritative clinical conflict boundary.

alter table public.availability_slots drop constraint if exists availability_slots_no_overlaps;

create type public.schedule_override_kind as enum ('unavailable', 'available');
create type public.schedule_approval_status as enum ('approved', 'pending', 'rejected');

create table public.psychiatrist_schedule_rules (
  id uuid primary key default gen_random_uuid(),
  psychiatrist_id uuid not null references public.psychiatrists (id) on delete restrict,
  weekday smallint not null,
  starts_local time not null,
  ends_local time not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint schedule_rules_weekday_check check (weekday between 1 and 5),
  constraint schedule_rules_quarter_hour_check check (
    extract(minute from starts_local)::integer % 15 = 0 and extract(second from starts_local) = 0
    and extract(minute from ends_local)::integer % 15 = 0 and extract(second from ends_local) = 0
  ),
  constraint schedule_rules_normal_window_check check (
    starts_local >= time '08:00' and ends_local <= time '17:00' and ends_local > starts_local
    and ends_local - starts_local >= interval '45 minutes'
  )
);

create unique index psychiatrist_schedule_rules_unique_period
  on public.psychiatrist_schedule_rules (psychiatrist_id, weekday, starts_local, ends_local);
create index psychiatrist_schedule_rules_lookup
  on public.psychiatrist_schedule_rules (psychiatrist_id, weekday, starts_local);

create table public.psychiatrist_schedule_overrides (
  id uuid primary key default gen_random_uuid(),
  psychiatrist_id uuid not null references public.psychiatrists (id) on delete restrict,
  local_date date not null,
  starts_local time not null,
  ends_local time not null,
  kind public.schedule_override_kind not null,
  approval_status public.schedule_approval_status not null default 'pending',
  requested_by uuid not null references public.profiles (id) on delete restrict,
  approved_by uuid references public.profiles (id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint schedule_overrides_quarter_hour_check check (
    extract(minute from starts_local)::integer % 15 = 0 and extract(second from starts_local) = 0
    and extract(minute from ends_local)::integer % 15 = 0 and extract(second from ends_local) = 0
  ),
  constraint schedule_overrides_range_check check (ends_local > starts_local and ends_local - starts_local >= interval '45 minutes'),
  constraint schedule_overrides_decision_facts_check check (
    (approval_status = 'approved' and approved_at is not null and approved_by is not null)
    or (approval_status = 'pending' and approved_at is null and approved_by is null)
    or (approval_status = 'rejected')
  )
);

create index psychiatrist_schedule_overrides_lookup
  on public.psychiatrist_schedule_overrides (psychiatrist_id, local_date, approval_status);

create trigger psychiatrist_schedule_rules_set_updated_at
before update on public.psychiatrist_schedule_rules
for each row execute function private.set_updated_at();
create trigger psychiatrist_schedule_overrides_set_updated_at
before update on public.psychiatrist_schedule_overrides
for each row execute function private.set_updated_at();

alter table public.psychiatrist_schedule_rules enable row level security;
alter table public.psychiatrist_schedule_overrides enable row level security;
revoke all on table public.psychiatrist_schedule_rules, public.psychiatrist_schedule_overrides from anon, authenticated;
grant all on table public.psychiatrist_schedule_rules, public.psychiatrist_schedule_overrides to service_role;
-- Patients receive only the server-filtered projection below. This prevents a
-- browser from treating raw availability rows as an authoritative schedule.
revoke select on public.availability_slots from authenticated;

-- Existing active synthetic clinicians receive the documented default. This
-- is a data backfill, not a client-controlled role or availability change.
insert into public.psychiatrist_schedule_rules (psychiatrist_id, weekday, starts_local, ends_local)
select psychiatrist.id, weekdays.weekday, time '08:00', time '17:00'
from public.psychiatrists as psychiatrist
cross join generate_series(1, 5) as weekdays(weekday)
where psychiatrist.is_active;

create or replace function private.schedule_range_published(
  target_psychiatrist_id uuid,
  target_starts_at timestamptz,
  target_ends_at timestamptz
)
returns boolean
language sql stable
set search_path = pg_catalog, public
as $$
  with local_range as (
    select (target_starts_at at time zone 'Asia/Manila')::date as local_date,
      (target_starts_at at time zone 'Asia/Manila')::time as starts_local,
      (target_ends_at at time zone 'Asia/Manila')::time as ends_local
  )
  select (
    exists (
      select 1 from public.psychiatrist_schedule_rules rule, local_range
      where rule.psychiatrist_id = target_psychiatrist_id
        and rule.weekday = extract(isodow from local_range.local_date)::smallint
        and rule.starts_local <= local_range.starts_local and rule.ends_local >= local_range.ends_local
    )
    or exists (
      select 1 from public.psychiatrist_schedule_overrides override, local_range
      where override.psychiatrist_id = target_psychiatrist_id
        and override.local_date = local_range.local_date
        and override.kind = 'available' and override.approval_status = 'approved'
        and override.starts_local <= local_range.starts_local and override.ends_local >= local_range.ends_local
    )
  )
  and not exists (
    select 1 from public.psychiatrist_schedule_overrides override, local_range
    where override.psychiatrist_id = target_psychiatrist_id
      and override.local_date = local_range.local_date
      and override.kind = 'unavailable' and override.approval_status = 'approved'
      and override.starts_local < local_range.ends_local and override.ends_local > local_range.starts_local
  );
$$;

create or replace function private.refresh_psychiatrist_availability(target_psychiatrist_id uuid)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  day_offset integer;
  target_date date;
  period record;
  minute_offset integer;
  local_start time;
  local_end time;
  starts_at timestamptz;
  ends_at timestamptz;
begin
  if exists (
    select 1 from public.appointments appointment
    where appointment.psychiatrist_id = target_psychiatrist_id and appointment.status = 'booked'
      and appointment.starts_at >= now()
      and not private.schedule_range_published(target_psychiatrist_id, appointment.starts_at, appointment.ends_at)
  ) then
    raise exception 'schedule_conflict' using errcode = 'P0001';
  end if;

  delete from public.availability_slots
  where psychiatrist_id = target_psychiatrist_id and status = 'open' and starts_at >= now();

  for day_offset in 0..14 loop
    target_date := ((now() at time zone 'Asia/Manila')::date + day_offset);
    for period in
      select rule.starts_local, rule.ends_local
      from public.psychiatrist_schedule_rules rule
      where rule.psychiatrist_id = target_psychiatrist_id
        and rule.weekday = extract(isodow from target_date)::smallint
      union all
      select override.starts_local, override.ends_local
      from public.psychiatrist_schedule_overrides override
      where override.psychiatrist_id = target_psychiatrist_id
        and override.local_date = target_date and override.kind = 'available'
        and override.approval_status = 'approved'
    loop
      for minute_offset in 0..((extract(epoch from (period.ends_local - period.starts_local))::integer / 60) - 45) by 15 loop
        local_start := period.starts_local + make_interval(mins => minute_offset);
        local_end := local_start + interval '45 minutes';
        starts_at := ((target_date + local_start) at time zone 'Asia/Manila');
        ends_at := ((target_date + local_end) at time zone 'Asia/Manila');
        if starts_at > now() and starts_at <= now() + interval '14 days'
           and private.schedule_range_published(target_psychiatrist_id, starts_at, ends_at) then
          insert into public.availability_slots (psychiatrist_id, starts_at, ends_at, status)
          values (target_psychiatrist_id, starts_at, ends_at, 'open')
          on conflict (psychiatrist_id, starts_at) do nothing;
        end if;
      end loop;
    end loop;
  end loop;
end;
$$;
revoke all on function private.schedule_range_published(uuid, timestamptz, timestamptz) from public, anon, authenticated;
revoke all on function private.refresh_psychiatrist_availability(uuid) from public, anon, authenticated;

create or replace function private.seed_psychiatrist_schedule()
returns trigger
language plpgsql security definer set search_path = pg_catalog, public
as $$
begin
  if new.is_active then
    insert into public.psychiatrist_schedule_rules (psychiatrist_id, weekday, starts_local, ends_local)
    select new.id, weekday, time '08:00', time '17:00'
    from generate_series(1, 5) as weekdays(weekday)
    on conflict (psychiatrist_id, weekday, starts_local, ends_local) do nothing;
    perform private.refresh_psychiatrist_availability(new.id);
  end if;
  return new;
end;
$$;
revoke all on function private.seed_psychiatrist_schedule() from public, anon, authenticated;
create trigger psychiatrists_seed_default_schedule
after insert on public.psychiatrists
for each row execute function private.seed_psychiatrist_schedule();

-- Reschedule requests and replacement appointments use the Phase 4 public
-- functions. These triggers extend that workflow with the Phase 14 schedule
-- and horizon invariant without creating a second booking transaction.
create or replace function private.validate_reschedule_schedule()
returns trigger
language plpgsql security definer set search_path = pg_catalog, public
as $$
declare requested_slot public.availability_slots%rowtype;
begin
  select * into requested_slot from public.availability_slots where id = new.requested_slot_id;
  if not found or requested_slot.starts_at <= now() or requested_slot.starts_at > now() + interval '14 days'
     or not private.schedule_range_published(requested_slot.psychiatrist_id, requested_slot.starts_at, requested_slot.ends_at) then
    raise exception 'slot_unavailable' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
revoke all on function private.validate_reschedule_schedule() from public, anon, authenticated;
create trigger reschedule_requests_validate_schedule
before insert on public.reschedule_requests
for each row execute function private.validate_reschedule_schedule();

create or replace function private.validate_rescheduled_appointment_schedule()
returns trigger
language plpgsql security definer set search_path = pg_catalog, public
as $$
begin
  if new.rescheduled_from_id is not null and new.status = 'booked'
     and (new.starts_at > now() + interval '14 days'
       or not private.schedule_range_published(new.psychiatrist_id, new.starts_at, new.ends_at)) then
    raise exception 'slot_unavailable' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
revoke all on function private.validate_rescheduled_appointment_schedule() from public, anon, authenticated;
create trigger appointments_validate_rescheduled_schedule
before insert on public.appointments
for each row execute function private.validate_rescheduled_appointment_schedule();

create or replace function public.get_patient_availability(target_psychiatrist_id uuid, target_date date default null)
returns table (slot_id uuid, psychiatrist_id uuid, local_date date, starts_at timestamptz, ends_at timestamptz)
language sql stable security definer set search_path = pg_catalog, public
as $$
  select slot.id, slot.psychiatrist_id, (slot.starts_at at time zone 'Asia/Manila')::date, slot.starts_at, slot.ends_at
  from public.availability_slots slot
  join public.psychiatrists psychiatrist on psychiatrist.id = slot.psychiatrist_id and psychiatrist.is_active
  join public.profiles actor on actor.id = auth.uid() and actor.role = 'patient'
  where slot.status = 'open' and slot.starts_at > now() and slot.starts_at <= now() + interval '14 days'
    and slot.psychiatrist_id = target_psychiatrist_id
    and (target_date is null or (slot.starts_at at time zone 'Asia/Manila')::date = target_date)
    and private.schedule_range_published(slot.psychiatrist_id, slot.starts_at, slot.ends_at)
    and not exists (
      select 1 from public.appointments appointment
      where appointment.psychiatrist_id = slot.psychiatrist_id and appointment.status = 'booked'
        and tstzrange(appointment.starts_at, appointment.ends_at, '[)') && tstzrange(slot.starts_at, slot.ends_at, '[)')
    )
  order by slot.starts_at;
$$;
revoke all on function public.get_patient_availability(uuid, date) from public, anon;
grant execute on function public.get_patient_availability(uuid, date) to authenticated;

create or replace function public.get_my_schedule(actor_profile_id uuid)
returns table (record_type text, id uuid, weekday smallint, local_date date, starts_local time, ends_local time, kind public.schedule_override_kind, approval_status public.schedule_approval_status)
language sql stable security definer set search_path = pg_catalog, public
as $$
  select 'rule', rule.id, rule.weekday, null::date, rule.starts_local, rule.ends_local, null::public.schedule_override_kind, null::public.schedule_approval_status
  from public.psychiatrist_schedule_rules rule
  join public.psychiatrists psychiatrist on psychiatrist.id = rule.psychiatrist_id and psychiatrist.profile_id = actor_profile_id
  union all
  select 'override', override.id, null::smallint, override.local_date, override.starts_local, override.ends_local, override.kind, override.approval_status
  from public.psychiatrist_schedule_overrides override
  join public.psychiatrists psychiatrist on psychiatrist.id = override.psychiatrist_id and psychiatrist.profile_id = actor_profile_id
  order by record_type, local_date nulls first, weekday nulls first, starts_local;
$$;
revoke all on function public.get_my_schedule(uuid) from public, anon, authenticated;
grant execute on function public.get_my_schedule(uuid) to service_role;

create or replace function public.get_admin_schedule_overview(actor_profile_id uuid)
returns table (psychiatrist_id uuid, psychiatrist_display_name text, record_type text, weekday smallint, local_date date, starts_local time, ends_local time, kind public.schedule_override_kind, approval_status public.schedule_approval_status)
language sql stable security definer set search_path = pg_catalog, public
as $$
  select psychiatrist.id, psychiatrist.display_name, schedule.record_type, schedule.weekday, schedule.local_date,
    schedule.starts_local, schedule.ends_local, schedule.kind, schedule.approval_status
  from public.profiles actor
  join public.psychiatrists psychiatrist on true
  join lateral public.get_my_schedule(psychiatrist.profile_id) schedule on true
  where actor.id = actor_profile_id and actor.role = 'admin';
$$;
revoke all on function public.get_admin_schedule_overview(uuid) from public, anon, authenticated;
grant execute on function public.get_admin_schedule_overview(uuid) to service_role;

create or replace function public.save_schedule_rule(
  target_rule_id uuid, target_weekday smallint, target_starts_local time, target_ends_local time, actor_profile_id uuid
)
returns public.psychiatrist_schedule_rules
language plpgsql security definer set search_path = pg_catalog, public
as $$
declare save_psychiatrist_id uuid; saved public.psychiatrist_schedule_rules;
begin
  perform private.assert_service_role();
  select id into save_psychiatrist_id from public.psychiatrists where profile_id = actor_profile_id and is_active;
  if save_psychiatrist_id is null or target_weekday not between 1 and 5 or target_starts_local < time '08:00'
     or target_ends_local > time '17:00' or target_ends_local <= target_starts_local
     or target_ends_local - target_starts_local < interval '45 minutes'
     or extract(minute from target_starts_local)::integer % 15 <> 0
     or extract(minute from target_ends_local)::integer % 15 <> 0 then
    raise exception 'invalid_schedule' using errcode = '22023';
  end if;
  if target_rule_id is null then
    insert into public.psychiatrist_schedule_rules (psychiatrist_id, weekday, starts_local, ends_local)
    values (save_psychiatrist_id, target_weekday, target_starts_local, target_ends_local) returning * into saved;
  else
    update public.psychiatrist_schedule_rules set weekday = target_weekday, starts_local = target_starts_local, ends_local = target_ends_local
    where id = target_rule_id and public.psychiatrist_schedule_rules.psychiatrist_id = save_psychiatrist_id returning * into saved;
    if not found then raise exception 'schedule_not_permitted' using errcode = '42501'; end if;
  end if;
  perform private.refresh_psychiatrist_availability(save_psychiatrist_id);
  insert into public.audit_events (actor_id, event_code, target_type, target_id, outcome, correlation_id)
  values (actor_profile_id, 'schedule_rule_saved', 'schedule_rule', saved.id, 'success', saved.id);
  return saved;
exception when unique_violation then raise exception 'schedule_conflict' using errcode = 'P0001';
end;
$$;
revoke all on function public.save_schedule_rule(uuid, smallint, time, time, uuid) from public, anon, authenticated;
grant execute on function public.save_schedule_rule(uuid, smallint, time, time, uuid) to service_role;

create or replace function public.delete_schedule_rule(target_rule_id uuid, actor_profile_id uuid)
returns void language plpgsql security definer set search_path = pg_catalog, public
as $$
declare psychiatrist_id uuid;
begin
  perform private.assert_service_role();
  select psychiatrist.id into psychiatrist_id from public.psychiatrists psychiatrist join public.psychiatrist_schedule_rules rule on rule.psychiatrist_id = psychiatrist.id
  where rule.id = target_rule_id and psychiatrist.profile_id = actor_profile_id and psychiatrist.is_active;
  if psychiatrist_id is null then raise exception 'schedule_not_permitted' using errcode = '42501'; end if;
  delete from public.psychiatrist_schedule_rules where id = target_rule_id;
  perform private.refresh_psychiatrist_availability(psychiatrist_id);
  insert into public.audit_events (actor_id, event_code, target_type, target_id, outcome, correlation_id)
  values (actor_profile_id, 'schedule_rule_deleted', 'schedule_rule', target_rule_id, 'success', target_rule_id);
end;
$$;
revoke all on function public.delete_schedule_rule(uuid, uuid) from public, anon, authenticated;
grant execute on function public.delete_schedule_rule(uuid, uuid) to service_role;

create or replace function public.save_schedule_override(
  target_override_id uuid, target_date date, target_starts_local time, target_ends_local time,
  target_kind public.schedule_override_kind, actor_profile_id uuid
)
returns public.psychiatrist_schedule_overrides
language plpgsql security definer set search_path = pg_catalog, public
as $$
declare save_psychiatrist_id uuid; approval public.schedule_approval_status; saved public.psychiatrist_schedule_overrides;
begin
  perform private.assert_service_role();
  select id into save_psychiatrist_id from public.psychiatrists where profile_id = actor_profile_id and is_active;
  if save_psychiatrist_id is null or target_date < (now() at time zone 'Asia/Manila')::date
     or target_ends_local <= target_starts_local or target_ends_local - target_starts_local < interval '45 minutes'
     or extract(minute from target_starts_local)::integer % 15 <> 0 or extract(minute from target_ends_local)::integer % 15 <> 0 then
    raise exception 'invalid_schedule' using errcode = '22023';
  end if;
  approval := case when target_kind = 'available' and (target_starts_local < time '08:00' or target_ends_local > time '17:00') then 'pending' else 'approved' end;
  if target_override_id is null then
    insert into public.psychiatrist_schedule_overrides (psychiatrist_id, local_date, starts_local, ends_local, kind, approval_status, requested_by, approved_by, approved_at)
    values (save_psychiatrist_id, target_date, target_starts_local, target_ends_local, target_kind, approval, actor_profile_id,
      case when approval = 'approved' then actor_profile_id else null end, case when approval = 'approved' then now() else null end) returning * into saved;
  else
    update public.psychiatrist_schedule_overrides set local_date = target_date, starts_local = target_starts_local, ends_local = target_ends_local,
      kind = target_kind, approval_status = approval, requested_by = actor_profile_id,
      approved_by = case when approval = 'approved' then actor_profile_id else null end,
      approved_at = case when approval = 'approved' then now() else null end
    where id = target_override_id and public.psychiatrist_schedule_overrides.psychiatrist_id = save_psychiatrist_id returning * into saved;
    if not found then raise exception 'schedule_not_permitted' using errcode = '42501'; end if;
  end if;
  if approval = 'approved' then perform private.refresh_psychiatrist_availability(save_psychiatrist_id); end if;
  insert into public.audit_events (actor_id, event_code, target_type, target_id, outcome, reason_code, correlation_id)
  values (actor_profile_id, 'schedule_override_saved', 'schedule_override', saved.id, 'success', approval::text, saved.id);
  return saved;
exception when unique_violation then raise exception 'schedule_conflict' using errcode = 'P0001';
end;
$$;
revoke all on function public.save_schedule_override(uuid, date, time, time, public.schedule_override_kind, uuid) from public, anon, authenticated;
grant execute on function public.save_schedule_override(uuid, date, time, time, public.schedule_override_kind, uuid) to service_role;

create or replace function public.review_schedule_override(target_override_id uuid, approve boolean, actor_profile_id uuid)
returns public.psychiatrist_schedule_overrides
language plpgsql security definer set search_path = pg_catalog, public
as $$
declare saved public.psychiatrist_schedule_overrides; psychiatrist_id uuid;
begin
  perform private.assert_service_role();
  if not exists (select 1 from public.profiles where id = actor_profile_id and role = 'admin') then raise exception 'schedule_not_permitted' using errcode = '42501'; end if;
  select * into saved from public.psychiatrist_schedule_overrides where id = target_override_id for update;
  if not found or saved.approval_status <> 'pending' then raise exception 'schedule_not_permitted' using errcode = '42501'; end if;
  select id into psychiatrist_id from public.psychiatrists where id = saved.psychiatrist_id;
  update public.psychiatrist_schedule_overrides set approval_status = case when approve then 'approved' else 'rejected' end,
    approved_by = actor_profile_id, approved_at = case when approve then now() else null end
  where id = target_override_id returning * into saved;
  if approve then perform private.refresh_psychiatrist_availability(psychiatrist_id); end if;
  insert into public.audit_events (actor_id, event_code, target_type, target_id, outcome, reason_code, correlation_id)
  values (actor_profile_id, 'schedule_override_reviewed', 'schedule_override', target_override_id, 'success', case when approve then 'approved' else 'rejected' end, target_override_id);
  return saved;
end;
$$;
revoke all on function public.review_schedule_override(uuid, boolean, uuid) from public, anon, authenticated;
grant execute on function public.review_schedule_override(uuid, boolean, uuid) to service_role;

do $$
declare psychiatrist_id uuid;
begin
  for psychiatrist_id in select id from public.psychiatrists where is_active loop
    begin
      perform private.refresh_psychiatrist_availability(psychiatrist_id);
    exception when others then
      -- Existing booked appointments are preserved. A clinician must resolve
      -- any legacy conflict through the normal reschedule/cancellation path
      -- before the affected schedule can be refreshed.
      null;
    end;
  end loop;
end;
$$;

-- Revalidate the old booking transaction against published schedules and the
-- two-week horizon while preserving its Phase 4 signature and idempotency.
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
  exception when unique_violation then
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
