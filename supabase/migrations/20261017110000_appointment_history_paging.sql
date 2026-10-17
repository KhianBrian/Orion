-- Appointment list paging: the appointments page used get_my_appointments_detailed, which returns every
-- appointment a person has ever had, and the browser did the filtering. These functions let the database
-- do the narrowing and hand over one page at a time.
--
--   get_my_upcoming_appointments()      booked appointments that have not ended, soonest first
--   get_my_appointment_counts()         how many upcoming / history appointments the caller has
--   get_my_appointment_history_page()   history, newest first, filtered, 25 rows per page by default
--
-- Access is unchanged from get_my_appointments_detailed: a patient sees only their own appointments and a
-- psychiatrist only the appointments assigned to them (decided from auth.uid(), never from a parameter).
-- get_my_appointments_detailed is left in place; nothing else is dropped.
--
-- Performance notes
--   * Each function resolves the caller to one patient_id or one psychiatrist_id first, so Postgres can use
--     appointments_patient_starts_at_idx / appointments_psychiatrist_starts_at_idx (both from the first
--     migration) instead of an OR join across all appointments.
--   * Paging is keyset ("rows older than the last one I saw"), not OFFSET, so page 40 costs the same as
--     page 1. The cursor is (starts_at, id); id breaks ties between identical start times.
--   * The date filter is written as a range on starts_at (not a cast of the column) so it stays indexable.
--     Dates are Asia/Manila calendar days, inclusive at both ends.
--   * Name search is a case-insensitive substring match applied after the index has narrowed the rows to
--     one person's appointments, so it needs no extra index at pilot scale. If one account ever holds tens
--     of thousands of appointments, add a pg_trgm index on profiles.full_name / psychiatrists.display_name.

create or replace function public.get_my_upcoming_appointments()
returns table (
  id uuid, starts_at timestamptz, ends_at timestamptz, status public.appointment_status,
  counterpart_display_name text, cancelled_by public.cancellation_party, cancellation_reason_code text,
  rescheduled_from_id uuid, replacement_appointment_id uuid
)
language plpgsql stable security definer set search_path = pg_catalog, public
as $$
#variable_conflict use_column
declare caller_role public.app_role; caller_psychiatrist_id uuid;
begin
  select p.role into caller_role from public.profiles p where p.id = auth.uid();
  if caller_role is null or caller_role not in ('patient', 'psychiatrist') then return; end if;
  if caller_role = 'psychiatrist' then
    select psy.id into caller_psychiatrist_id from public.psychiatrists psy where psy.profile_id = auth.uid();
  end if;
  return query
  select a.id, a.starts_at, a.ends_at, a.status,
    case when caller_role = 'patient' then psy.display_name else patient.full_name end,
    a.cancelled_by, a.cancellation_reason_code, a.rescheduled_from_id,
    (select replacement.id from public.appointments replacement where replacement.rescheduled_from_id = a.id limit 1)
  from (
    select s.* from public.appointments s where caller_role = 'patient' and s.patient_id = auth.uid()
    union all
    select s.* from public.appointments s where caller_role = 'psychiatrist' and s.psychiatrist_id = caller_psychiatrist_id
  ) a
  join public.psychiatrists psy on psy.id = a.psychiatrist_id
  join public.profiles patient on patient.id = a.patient_id
  where a.status = 'booked' and a.ends_at >= now()
  order by a.starts_at asc, a.id asc;
end;
$$;
revoke all on function public.get_my_upcoming_appointments() from public, anon;
grant execute on function public.get_my_upcoming_appointments() to authenticated;

create or replace function public.get_my_appointment_counts()
returns table (upcoming_count bigint, history_count bigint)
language plpgsql stable security definer set search_path = pg_catalog, public
as $$
#variable_conflict use_column
declare caller_role public.app_role; caller_psychiatrist_id uuid;
begin
  select p.role into caller_role from public.profiles p where p.id = auth.uid();
  if caller_role is null or caller_role not in ('patient', 'psychiatrist') then
    return query select 0::bigint, 0::bigint;
    return;
  end if;
  if caller_role = 'psychiatrist' then
    select psy.id into caller_psychiatrist_id from public.psychiatrists psy where psy.profile_id = auth.uid();
  end if;
  return query
  select count(*) filter (where a.status = 'booked' and a.ends_at >= now()),
         count(*) filter (where not (a.status = 'booked' and a.ends_at >= now()))
  from (
    select s.status, s.ends_at from public.appointments s where caller_role = 'patient' and s.patient_id = auth.uid()
    union all
    select s.status, s.ends_at from public.appointments s where caller_role = 'psychiatrist' and s.psychiatrist_id = caller_psychiatrist_id
  ) a;
end;
$$;
revoke all on function public.get_my_appointment_counts() from public, anon;
grant execute on function public.get_my_appointment_counts() to authenticated;

create or replace function public.get_my_appointment_history_page(
  search_text text default null,
  from_date date default null,
  to_date date default null,
  status_filter public.appointment_status default null,
  cursor_starts_at timestamptz default null,
  cursor_id uuid default null,
  page_size integer default 25
)
returns table (
  id uuid, starts_at timestamptz, ends_at timestamptz, status public.appointment_status,
  counterpart_display_name text, cancelled_by public.cancellation_party, cancellation_reason_code text,
  rescheduled_from_id uuid, replacement_appointment_id uuid, total_count bigint
)
language plpgsql stable security definer set search_path = pg_catalog, public
as $$
#variable_conflict use_column
declare
  caller_role public.app_role;
  caller_psychiatrist_id uuid;
  limit_rows integer := least(greatest(coalesce(page_size, 25), 1), 100);
  name_pattern text;
  range_start timestamptz;
  range_end timestamptz;
begin
  if (cursor_starts_at is null) <> (cursor_id is null) then
    raise exception 'invalid_cursor' using errcode = '22023';
  end if;
  select p.role into caller_role from public.profiles p where p.id = auth.uid();
  if caller_role is null or caller_role not in ('patient', 'psychiatrist') then return; end if;
  if caller_role = 'psychiatrist' then
    select psy.id into caller_psychiatrist_id from public.psychiatrists psy where psy.profile_id = auth.uid();
  end if;
  -- Escape LIKE wildcards so a typed % or _ is matched literally; cap the length of what is searched.
  if nullif(btrim(search_text), '') is not null then
    name_pattern := '%' || replace(replace(replace(left(btrim(search_text), 100), '\', '\\'), '%', '\%'), '_', '\_') || '%';
  end if;
  if from_date is not null then range_start := from_date::timestamp at time zone 'Asia/Manila'; end if;
  if to_date is not null then range_end := (to_date + 1)::timestamp at time zone 'Asia/Manila'; end if;

  return query
  with matching as (
    select a.id, a.starts_at, a.ends_at, a.status,
      case when caller_role = 'patient' then psy.display_name else patient.full_name end as counterpart_display_name,
      a.cancelled_by, a.cancellation_reason_code, a.rescheduled_from_id
    from (
      select s.* from public.appointments s where caller_role = 'patient' and s.patient_id = auth.uid()
      union all
      select s.* from public.appointments s where caller_role = 'psychiatrist' and s.psychiatrist_id = caller_psychiatrist_id
    ) a
    join public.psychiatrists psy on psy.id = a.psychiatrist_id
    join public.profiles patient on patient.id = a.patient_id
    where not (a.status = 'booked' and a.ends_at >= now())
      and (status_filter is null or a.status = status_filter)
      and (range_start is null or a.starts_at >= range_start)
      and (range_end is null or a.starts_at < range_end)
      and (name_pattern is null
        or (case when caller_role = 'patient' then psy.display_name else patient.full_name end) ilike name_pattern escape '\')
  ), counted as (
    select m.*, count(*) over () as total_count from matching m
  ), page as (
    select c.* from counted c
    where cursor_starts_at is null or (c.starts_at, c.id) < (cursor_starts_at, cursor_id)
    order by c.starts_at desc, c.id desc
    limit limit_rows
  )
  select pg.id, pg.starts_at, pg.ends_at, pg.status, pg.counterpart_display_name, pg.cancelled_by,
    pg.cancellation_reason_code, pg.rescheduled_from_id,
    (select replacement.id from public.appointments replacement where replacement.rescheduled_from_id = pg.id limit 1),
    pg.total_count
  from page pg
  order by pg.starts_at desc, pg.id desc;
end;
$$;
revoke all on function public.get_my_appointment_history_page(text, date, date, public.appointment_status, timestamptz, uuid, integer) from public, anon;
grant execute on function public.get_my_appointment_history_page(text, date, date, public.appointment_status, timestamptz, uuid, integer) to authenticated;
