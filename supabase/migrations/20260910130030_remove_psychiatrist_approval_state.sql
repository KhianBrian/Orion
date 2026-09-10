-- Clinicians are provisioned by an admin or developer through the backend.
-- There is therefore no separate pending/approved workflow: a created
-- psychiatrist is trusted, and is_active controls operational availability.

drop policy if exists psychiatrists_select_by_role on public.psychiatrists;
drop policy if exists availability_slots_select_by_role on public.availability_slots;
drop policy if exists appointments_select_by_relationship on public.appointments;

create policy psychiatrists_select_by_role
on public.psychiatrists for select to authenticated
using (
  (private.current_app_role() = 'patient' and is_active)
  or profile_id = (select auth.uid())
  or private.current_app_role() = 'admin'
);

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
    )
  )
);

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
      where id = locked_slot.psychiatrist_id and is_active
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
    and profile.role = 'psychiatrist';

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
    select 1
    from public.session_notes as superseded_note
    where superseded_note.id = superseded_note_id
      and superseded_note.appointment_id = target_appointment_id
      and superseded_note.author_psychiatrist_id = author_id
  ) then
    raise exception 'note_write_not_permitted' using errcode = '42501';
  end if;

  select coalesce(max(session_notes.version_number), 0) + 1 into next_version
  from public.session_notes
  where session_notes.appointment_id = target_appointment_id;

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
  select note.* into requested_note
  from public.session_notes as note
  where note.id = target_note_id;

  select profile.role into actor_role
  from public.profiles as profile
  where profile.id = actor_profile_id;

  if requested_note.id is not null and actor_role = 'patient' then
    allowed := requested_note.released_at is not null and exists (
      select 1
      from public.appointments as appointment
      where appointment.id = requested_note.appointment_id
        and appointment.patient_id = actor_profile_id
    );
  elsif requested_note.id is not null and actor_role = 'psychiatrist' then
    allowed := exists (
      select 1
      from public.psychiatrists
      join public.appointments
        on appointments.psychiatrist_id = psychiatrists.id
      where psychiatrists.id = requested_note.author_psychiatrist_id
        and psychiatrists.profile_id = actor_profile_id
        and appointments.id = requested_note.appointment_id
    );
  end if;

  insert into public.audit_events (
    actor_id, event_code, target_type, target_id, outcome, reason_code
  ) values (
    actor_profile_id, 'session_note_read', 'session_note', target_note_id,
    (case when allowed then 'success' else 'denied' end)::public.audit_outcome,
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

drop function public.provision_psychiatrist_approval(
  uuid, public.psychiatrist_approval_status, uuid, text
);

drop index if exists public.psychiatrists_approval_lookup_idx;

alter table public.psychiatrists
  drop column approval_status,
  drop column approved_at,
  drop column approved_by;

drop type public.psychiatrist_approval_status;
