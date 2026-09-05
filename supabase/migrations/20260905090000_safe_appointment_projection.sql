-- Phase 9 appointment screen projection. This is intentionally narrower than a
-- profiles policy: callers receive only appointments they are related to and one
-- permitted display name for each row.

create function public.get_my_appointments()
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
