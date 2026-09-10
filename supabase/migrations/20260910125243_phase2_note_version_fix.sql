-- The Phase 2 note function's table return column `appointment_id` can shadow
-- an unqualified column reference inside PL/pgSQL. Qualify note-table columns
-- so correction versioning is unambiguous.
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
