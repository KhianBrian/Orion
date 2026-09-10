-- Phase 2 note visibility correction and audit evidence access.
-- Patients may read only the latest released version of their own note.
-- Admins may read audit metadata, but never clinical note content.

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
    allowed := requested_note.released_at is not null
      and exists (
        select 1
        from public.appointments as appointment
        where appointment.id = requested_note.appointment_id
          and appointment.patient_id = actor_profile_id
      )
      and not exists (
        select 1
        from public.session_notes as newer_note
        where newer_note.appointment_id = requested_note.appointment_id
          and newer_note.version_number > requested_note.version_number
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

-- Audit metadata is operational evidence. It contains no note body, and admins
-- receive SELECT only; all application-role mutations remain denied by grants.
grant select on public.audit_events to authenticated;

create policy audit_events_admin_read
on public.audit_events for select to authenticated
using (private.current_app_role() = 'admin');
