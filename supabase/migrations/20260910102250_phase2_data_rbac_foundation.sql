-- Phase 2 data/RBAC foundation.
-- Provider-neutral: Google Meet, payment, consent capture, and provider-specific
-- admission are owned by later phases. This migration adds only the protected
-- appointment/clinician/note contracts that those phases consume.

create type public.psychiatrist_approval_status as enum (
  'pending',
  'approved',
  'rejected',
  'revoked'
);

create type public.no_show_party as enum ('patient', 'psychiatrist');

alter table public.psychiatrists
  add column approval_status public.psychiatrist_approval_status not null default 'pending',
  add column approved_at timestamptz,
  add column approved_by uuid references public.profiles (id) on delete set null;

-- Existing active synthetic demo clinicians are the already-reviewed demo
-- fixtures. Future clinicians remain pending until the protected backend flow
-- approves them.
update public.psychiatrists
set approval_status = 'approved',
    approved_at = coalesce(approved_at, created_at)
where is_active;

alter table public.psychiatrists
  add constraint psychiatrists_approval_facts_consistent
  check (
    (approval_status = 'approved' and approved_at is not null)
    or (approval_status <> 'approved' and approved_at is null)
  );

alter table public.appointments
  add column no_show_party public.no_show_party,
  add column rescheduled_from_id uuid references public.appointments (id) on delete restrict;

alter table public.appointments
  add constraint appointments_no_show_facts_consistent
  check (
    (status = 'no_show' and no_show_party is not null)
    or (status <> 'no_show' and no_show_party is null)
  ),
  add constraint appointments_not_self_rescheduled
  check (rescheduled_from_id is null or rescheduled_from_id <> id);

create unique index appointments_one_reschedule_per_original
  on public.appointments (rescheduled_from_id)
  where rescheduled_from_id is not null;

create index psychiatrists_approval_lookup_idx
  on public.psychiatrists (approval_status, is_active);

create table public.session_notes (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references public.appointments (id) on delete restrict,
  author_psychiatrist_id uuid not null references public.psychiatrists (id) on delete restrict,
  version_number integer not null default 1,
  supersedes_note_id uuid references public.session_notes (id) on delete restrict,
  body text not null,
  released_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint session_notes_positive_version check (version_number > 0),
  constraint session_notes_not_self_superseded check (
    supersedes_note_id is null or supersedes_note_id <> id
  ),
  constraint session_notes_release_time_consistent check (released_at is null or released_at >= created_at)
);

create unique index session_notes_appointment_version_key
  on public.session_notes (appointment_id, version_number);

create index session_notes_appointment_created_at_idx
  on public.session_notes (appointment_id, created_at desc);

create index session_notes_author_created_at_idx
  on public.session_notes (author_psychiatrist_id, created_at desc);

create function private.session_notes_set_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger session_notes_set_updated_at
before update on public.session_notes
for each row execute function private.session_notes_set_updated_at();

create function private.prevent_released_note_mutation()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  if old.released_at is not null
     and coalesce(current_setting('request.jwt.claim.role', true), '') in ('anon', 'authenticated') then
    raise exception 'released_note_immutable' using errcode = '55000';
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create trigger session_notes_prevent_released_update
before update on public.session_notes
for each row execute function private.prevent_released_note_mutation();

create trigger session_notes_prevent_released_delete
before delete on public.session_notes
for each row execute function private.prevent_released_note_mutation();

-- The browser never receives direct note-table access. Backend functions below
-- perform the relationship check and write the audit event in the same call.
alter table public.session_notes enable row level security;
revoke all on table public.session_notes from anon, authenticated;
grant all on table public.session_notes to service_role;

create policy session_notes_deny_client_reads
on public.session_notes for select to authenticated
using (false);

create policy session_notes_deny_client_inserts
on public.session_notes for insert to authenticated
with check (false);

create policy session_notes_deny_client_updates
on public.session_notes for update to authenticated
using (false)
with check (false);

create policy session_notes_deny_client_deletes
on public.session_notes for delete to authenticated
using (false);

-- Existing direct reads must reflect clinician approval. The synthetic active
-- rows were backfilled above, so existing demo behavior remains available.
drop policy if exists psychiatrists_select_by_role on public.psychiatrists;
create policy psychiatrists_select_by_role
on public.psychiatrists for select to authenticated
using (
  (private.current_app_role() = 'patient' and is_active and approval_status = 'approved')
  or profile_id = (select auth.uid())
  or private.current_app_role() = 'admin'
);

drop policy if exists availability_slots_select_by_role on public.availability_slots;
create policy availability_slots_select_by_role
on public.availability_slots for select to authenticated
using (
  (
    private.current_app_role() = 'patient'
    and status = 'open'
    and exists (
      select 1
      from public.psychiatrists
      where psychiatrists.id = availability_slots.psychiatrist_id
        and psychiatrists.is_active
        and psychiatrists.approval_status = 'approved'
    )
  )
  or (
    private.current_app_role() = 'psychiatrist'
    and exists (
      select 1
      from public.psychiatrists
      where psychiatrists.id = availability_slots.psychiatrist_id
        and psychiatrists.profile_id = (select auth.uid())
    )
  )
  or private.current_app_role() = 'admin'
);

drop policy if exists appointments_select_by_relationship on public.appointments;
create policy appointments_select_by_relationship
on public.appointments for select to authenticated
using (
  (private.current_app_role() = 'patient' and patient_id = (select auth.uid()))
  or (
    private.current_app_role() = 'psychiatrist'
    and exists (
      select 1
      from public.psychiatrists
      where psychiatrists.id = appointments.psychiatrist_id
        and psychiatrists.profile_id = (select auth.uid())
        and psychiatrists.approval_status = 'approved'
    )
  )
);

-- Role and clinician provisioning is a backend/developer operation. The
-- browser must not be able to invoke the legacy demo provisioning function.
revoke all on function public.provision_demo_profile(uuid, public.app_role, text, uuid)
  from public, anon, authenticated;
grant execute on function public.provision_demo_profile(uuid, public.app_role, text, uuid)
  to service_role;

create or replace function public.provision_psychiatrist_approval(
  target_psychiatrist_id uuid,
  next_status public.psychiatrist_approval_status,
  actor_profile_id uuid default null,
  reason_code text default null
)
returns public.psychiatrist_approval_status
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  result_status public.psychiatrist_approval_status;
begin
  if actor_profile_id is not null and not exists (
    select 1 from public.profiles
    where id = actor_profile_id and role = 'admin'
  ) then
    raise exception 'approval_not_permitted' using errcode = '42501';
  end if;

  update public.psychiatrists
  set approval_status = next_status,
      approved_at = case when next_status = 'approved' then now() else null end,
      approved_by = case when next_status = 'approved' then actor_profile_id else null end
  where id = target_psychiatrist_id
  returning approval_status into result_status;

  if not found then
    raise exception 'psychiatrist_not_found' using errcode = 'P0002';
  end if;

  insert into public.audit_events (
    actor_id, event_code, target_type, target_id, outcome, reason_code
  ) values (
    actor_profile_id, 'psychiatrist_approval_changed', 'psychiatrist',
    target_psychiatrist_id, 'success', reason_code
  );

  return result_status;
end;
$$;

revoke all on function public.provision_psychiatrist_approval(uuid, public.psychiatrist_approval_status, uuid, text)
  from public, anon, authenticated;
grant execute on function public.provision_psychiatrist_approval(uuid, public.psychiatrist_approval_status, uuid, text)
  to service_role;

create or replace function public.get_my_appointments()
returns table (
  id uuid,
  starts_at timestamptz,
  ends_at timestamptz,
  status public.appointment_status,
  counterpart_display_name text
)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select
    appointment.id,
    appointment.starts_at,
    appointment.ends_at,
    appointment.status,
    case
      when actor.role = 'patient' then psychiatrist.display_name
      when actor.role = 'psychiatrist' then patient.full_name
    end as counterpart_display_name
  from public.profiles as actor
  join public.appointments as appointment
    on (
      (actor.role = 'patient' and appointment.patient_id = actor.id)
      or (
        actor.role = 'psychiatrist'
        and exists (
          select 1
          from public.psychiatrists as assigned_psychiatrist
          where assigned_psychiatrist.id = appointment.psychiatrist_id
            and assigned_psychiatrist.profile_id = actor.id
            and assigned_psychiatrist.approval_status = 'approved'
        )
      )
    )
  join public.psychiatrists as psychiatrist
    on psychiatrist.id = appointment.psychiatrist_id
  join public.profiles as patient
    on patient.id = appointment.patient_id
  where actor.id = (select auth.uid())
    and actor.role in ('patient', 'psychiatrist')
  order by appointment.starts_at asc;
$$;

revoke all on function public.get_my_appointments() from public, anon, authenticated;
grant execute on function public.get_my_appointments() to authenticated;

create or replace function public.book_appointment_for_patient(
  requested_slot_id uuid,
  request_id uuid,
  actor_profile_id uuid
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
  locked_slot public.availability_slots%rowtype;
  existing_appointment public.appointments%rowtype;
begin
  if actor_profile_id is null or not exists (
    select 1 from public.profiles
    where id = actor_profile_id and role = 'patient'
  ) then
    raise exception 'booking_not_permitted' using errcode = '42501';
  end if;

  select * into existing_appointment
  from public.appointments
  where patient_id = actor_profile_id and idempotency_key = request_id;

  if found then
    return query select existing_appointment.id, existing_appointment.slot_id,
      existing_appointment.starts_at, existing_appointment.ends_at, existing_appointment.status;
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
      select 1 from public.psychiatrists
      where id = locked_slot.psychiatrist_id
        and is_active
        and approval_status = 'approved'
    ) then
    raise exception 'slot_unavailable' using errcode = 'P0001';
  end if;

  begin
    insert into public.appointments (
      patient_id, psychiatrist_id, slot_id, starts_at, ends_at, idempotency_key
    ) values (
      actor_profile_id, locked_slot.psychiatrist_id, locked_slot.id,
      locked_slot.starts_at, locked_slot.ends_at, request_id
    ) returning * into existing_appointment;
  exception when unique_violation then
    select * into existing_appointment
    from public.appointments
    where patient_id = actor_profile_id and idempotency_key = request_id;

    if found then
      return query select existing_appointment.id, existing_appointment.slot_id,
        existing_appointment.starts_at, existing_appointment.ends_at, existing_appointment.status;
      return;
    end if;
    raise exception 'slot_unavailable' using errcode = 'P0001';
  end;

  update public.availability_slots set status = 'booked' where id = locked_slot.id;

  insert into public.audit_events (
    actor_id, event_code, target_type, target_id, outcome, correlation_id
  ) values (
    actor_profile_id, 'appointment_booked', 'appointment', existing_appointment.id,
    'success', request_id
  );

  return query select existing_appointment.id, existing_appointment.slot_id,
    existing_appointment.starts_at, existing_appointment.ends_at, existing_appointment.status;
end;
$$;

revoke all on function public.book_appointment_for_patient(uuid, uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.book_appointment_for_patient(uuid, uuid, uuid)
  to service_role;

create or replace function public.create_session_note(
  target_appointment_id uuid,
  note_body text,
  actor_profile_id uuid,
  superseded_note_id uuid default null
)
returns table (note_id uuid, appointment_id uuid, version_number integer, released_at timestamptz)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  author_id uuid;
  locked_appointment public.appointments%rowtype;
  next_version integer;
  created_note public.session_notes%rowtype;
begin
  select psychiatrist.id into author_id
  from public.psychiatrists as psychiatrist
  join public.profiles as profile on profile.id = psychiatrist.profile_id
  where psychiatrist.profile_id = actor_profile_id
    and profile.role = 'psychiatrist'
    and psychiatrist.approval_status = 'approved';

  if author_id is null then
    raise exception 'note_write_not_permitted' using errcode = '42501';
  end if;

  select * into locked_appointment
  from public.appointments
  where id = target_appointment_id
    and psychiatrist_id = author_id
    and status in ('booked', 'completed')
  for update;

  if not found then
    raise exception 'note_write_not_permitted' using errcode = '42501';
  end if;

  if superseded_note_id is not null and not exists (
    select 1 from public.session_notes
    where id = superseded_note_id
      and appointment_id = target_appointment_id
      and author_psychiatrist_id = author_id
  ) then
    raise exception 'note_write_not_permitted' using errcode = '42501';
  end if;

  select coalesce(max(version_number), 0) + 1 into next_version
  from public.session_notes
  where appointment_id = target_appointment_id;

  insert into public.session_notes (
    appointment_id, author_psychiatrist_id, version_number, supersedes_note_id, body
  ) values (
    target_appointment_id, author_id, next_version, superseded_note_id, note_body
  ) returning * into created_note;

  insert into public.audit_events (
    actor_id, event_code, target_type, target_id, outcome
  ) values (
    actor_profile_id, 'session_note_created', 'session_note', created_note.id, 'success'
  );

  return query select created_note.id, created_note.appointment_id,
    created_note.version_number, created_note.released_at;
end;
$$;

revoke all on function public.create_session_note(uuid, text, uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.create_session_note(uuid, text, uuid, uuid) to service_role;

create or replace function public.release_session_note(
  target_note_id uuid,
  actor_profile_id uuid
)
returns timestamptz
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  released_time timestamptz;
begin
  update public.session_notes as note
  set released_at = now()
  from public.psychiatrists as psychiatrist
  join public.appointments as appointment
    on appointment.psychiatrist_id = psychiatrist.id
  where note.id = target_note_id
    and note.author_psychiatrist_id = psychiatrist.id
    and appointment.id = note.appointment_id
    and psychiatrist.profile_id = actor_profile_id
    and psychiatrist.approval_status = 'approved'
    and note.released_at is null
  returning note.released_at into released_time;

  if released_time is null then
    raise exception 'note_release_not_permitted' using errcode = '42501';
  end if;

  insert into public.audit_events (
    actor_id, event_code, target_type, target_id, outcome
  ) values (
    actor_profile_id, 'session_note_released', 'session_note', target_note_id, 'success'
  );

  return released_time;
end;
$$;

revoke all on function public.release_session_note(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.release_session_note(uuid, uuid) to service_role;

create or replace function public.read_session_note(
  target_note_id uuid,
  actor_profile_id uuid
)
returns table (
  id uuid,
  appointment_id uuid,
  author_psychiatrist_id uuid,
  version_number integer,
  supersedes_note_id uuid,
  body text,
  released_at timestamptz,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  requested_note public.session_notes%rowtype;
  actor_role public.app_role;
  allowed boolean := false;
begin
  select * into requested_note from public.session_notes where session_notes.id = target_note_id;
  select role into actor_role from public.profiles where id = actor_profile_id;

  if requested_note.id is not null and actor_role = 'patient' then
    allowed := requested_note.released_at is not null and exists (
      select 1 from public.appointments
      where id = requested_note.appointment_id and patient_id = actor_profile_id
    );
  elsif requested_note.id is not null and actor_role = 'psychiatrist' then
    allowed := exists (
      select 1
      from public.psychiatrists
      join public.appointments
        on appointments.psychiatrist_id = psychiatrists.id
      where psychiatrists.id = requested_note.author_psychiatrist_id
        and psychiatrists.profile_id = actor_profile_id
        and psychiatrists.approval_status = 'approved'
        and appointments.id = requested_note.appointment_id
    );
  end if;

  insert into public.audit_events (
    actor_id, event_code, target_type, target_id, outcome, reason_code
  ) values (
    actor_profile_id, 'session_note_read', 'session_note', target_note_id,
    case when allowed then 'success' else 'denied' end,
    case when allowed then null else 'not_entitled' end
  );

  if not allowed then
    return;
  end if;

  return query select requested_note.id, requested_note.appointment_id,
    requested_note.author_psychiatrist_id, requested_note.version_number,
    requested_note.supersedes_note_id, requested_note.body,
    requested_note.released_at, requested_note.created_at;
end;
$$;

revoke all on function public.read_session_note(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.read_session_note(uuid, uuid) to service_role;
