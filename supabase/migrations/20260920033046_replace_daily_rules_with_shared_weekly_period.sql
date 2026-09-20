-- Temporary Phase 18 test-path UX: one recurring period applies to every day
-- of the week. The later scheduling redesign may replace this representation.
create or replace function public.save_weekly_schedule_period(
  target_starts_local time, target_ends_local time, actor_profile_id uuid
)
returns public.psychiatrist_schedule_rules
language plpgsql security definer set search_path = pg_catalog, public
as $$
declare
  save_psychiatrist_id uuid;
  saved public.psychiatrist_schedule_rules;
begin
  perform private.assert_service_role();
  select id into save_psychiatrist_id
  from public.psychiatrists
  where profile_id = actor_profile_id and is_active;

  if save_psychiatrist_id is null or target_starts_local < time '08:00'
     or target_ends_local > time '17:00' or target_ends_local <= target_starts_local
     or target_ends_local - target_starts_local < interval '45 minutes'
     or extract(minute from target_starts_local)::integer % 15 <> 0
     or extract(minute from target_ends_local)::integer % 15 <> 0 then
    raise exception 'invalid_schedule' using errcode = '22023';
  end if;

  -- Replace the seven derived weekday rows atomically. If a future booked
  -- appointment falls outside the requested period, refresh raises
  -- schedule_conflict and the transaction rolls back without moving it.
  delete from public.psychiatrist_schedule_rules
  where psychiatrist_id = save_psychiatrist_id;

  insert into public.psychiatrist_schedule_rules (psychiatrist_id, weekday, starts_local, ends_local)
  select save_psychiatrist_id, weekday, target_starts_local, target_ends_local
  from generate_series(1, 7) as weekdays(weekday);

  select * into saved
  from public.psychiatrist_schedule_rules
  where psychiatrist_id = save_psychiatrist_id and weekday = 1;

  perform private.refresh_psychiatrist_availability(save_psychiatrist_id);
  insert into public.audit_events (actor_id, event_code, target_type, target_id, outcome, correlation_id)
  values (actor_profile_id, 'schedule_rule_saved', 'schedule_rule', saved.id, 'success', saved.id);
  return saved;
exception when unique_violation then
  raise exception 'schedule_conflict' using errcode = 'P0001';
end;
$$;

revoke all on function public.save_weekly_schedule_period(time, time, uuid) from public, anon, authenticated;
grant execute on function public.save_weekly_schedule_period(time, time, uuid) to service_role;
