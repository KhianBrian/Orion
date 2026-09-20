-- Temporary Phase 18 test-path extension. The later scheduling redesign may
-- replace per-day rules with a different weekly-period model.
alter table public.psychiatrist_schedule_rules
  drop constraint if exists schedule_rules_weekday_check;

alter table public.psychiatrist_schedule_rules
  add constraint schedule_rules_weekday_check check (weekday between 1 and 7);

insert into public.psychiatrist_schedule_rules (psychiatrist_id, weekday, starts_local, ends_local)
select psychiatrist.id, weekdays.weekday, time '08:00', time '17:00'
from public.psychiatrists as psychiatrist
cross join generate_series(6, 7) as weekdays(weekday)
where psychiatrist.is_active
on conflict (psychiatrist_id, weekday, starts_local, ends_local) do nothing;

create or replace function public.save_schedule_rule(
  target_rule_id uuid, target_weekday smallint, target_starts_local time, target_ends_local time, actor_profile_id uuid
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

  if save_psychiatrist_id is null or target_weekday not between 1 and 7 or target_starts_local < time '08:00'
     or target_ends_local > time '17:00' or target_ends_local <= target_starts_local
     or target_ends_local - target_starts_local < interval '45 minutes'
     or extract(minute from target_starts_local)::integer % 15 <> 0
     or extract(minute from target_ends_local)::integer % 15 <> 0 then
    raise exception 'invalid_schedule' using errcode = '22023';
  end if;

  if target_rule_id is null then
    select * into saved
    from public.psychiatrist_schedule_rules
    where psychiatrist_id = save_psychiatrist_id
      and weekday = target_weekday
      and starts_local = target_starts_local
      and ends_local = target_ends_local;

    if not found then
      insert into public.psychiatrist_schedule_rules (psychiatrist_id, weekday, starts_local, ends_local)
      values (save_psychiatrist_id, target_weekday, target_starts_local, target_ends_local)
      returning * into saved;
    end if;
  else
    update public.psychiatrist_schedule_rules
    set weekday = target_weekday, starts_local = target_starts_local, ends_local = target_ends_local
    where id = target_rule_id and public.psychiatrist_schedule_rules.psychiatrist_id = save_psychiatrist_id
    returning * into saved;
    if not found then
      raise exception 'schedule_not_permitted' using errcode = '42501';
    end if;
  end if;

  perform private.refresh_psychiatrist_availability(save_psychiatrist_id);
  insert into public.audit_events (actor_id, event_code, target_type, target_id, outcome, correlation_id)
  values (actor_profile_id, 'schedule_rule_saved', 'schedule_rule', saved.id, 'success', saved.id);
  return saved;
exception when unique_violation then
  raise exception 'schedule_conflict' using errcode = 'P0001';
end;
$$;

revoke all on function public.save_schedule_rule(uuid, smallint, time, time, uuid) from public, anon, authenticated;
grant execute on function public.save_schedule_rule(uuid, smallint, time, time, uuid) to service_role;
