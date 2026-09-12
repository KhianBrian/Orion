-- Phase 3 identity boundaries.
-- Patients may self-register. Psychiatrist accounts are created only by the
-- server-side admin provisioning path. There is deliberately no clinician
-- approval or pending state: is_active remains the operational visibility and
-- bookability switch from the Phase 2 model.

create or replace function private.create_patient_profile()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  insert into public.profiles (id, full_name, phone, role)
  values (
    new.id,
    left(trim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), 200),
    left(trim(coalesce(new.raw_user_meta_data ->> 'phone', '')), 32),
    'patient'
  );
  return new;
end;
$$;

create function public.provision_psychiatrist(
  target_user_id uuid,
  target_full_name text,
  target_display_name text,
  target_bio text,
  actor_profile_id uuid
)
returns table (profile_id uuid, psychiatrist_id uuid)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  target_role public.app_role;
  provisioned_psychiatrist_id uuid;
begin
  if coalesce(current_setting('request.jwt.claim.role', true), '') <> 'service_role' then
    raise exception 'provisioning_not_permitted' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.profiles
    where id = actor_profile_id and role = 'admin'
  ) then
    raise exception 'provisioning_not_permitted' using errcode = '42501';
  end if;

  if target_full_name is null or length(trim(target_full_name)) = 0
     or target_display_name is null or length(trim(target_display_name)) = 0 then
    raise exception 'invalid_provisioning_request' using errcode = '22023';
  end if;

  select role into target_role
  from public.profiles
  where id = target_user_id
  for update;

  if not found then
    raise exception 'profile_not_found' using errcode = 'P0002';
  end if;

  if target_role = 'admin' then
    raise exception 'provisioning_not_permitted' using errcode = '42501';
  end if;

  update public.profiles
  set role = 'psychiatrist',
      full_name = left(trim(target_full_name), 200)
  where id = target_user_id;

  insert into public.psychiatrists (
    profile_id, display_name, bio, is_active
  ) values (
    target_user_id, left(trim(target_display_name), 200), nullif(left(trim(coalesce(target_bio, '')), 2000), ''), true
  )
  on conflict (profile_id) do update
  set display_name = excluded.display_name,
      bio = excluded.bio,
      is_active = true
  returning id into provisioned_psychiatrist_id;

  insert into public.audit_events (
    actor_id, event_code, target_type, target_id, outcome, reason_code
  ) values (
    actor_profile_id, 'psychiatrist_provisioned', 'profile', target_user_id,
    'success', 'admin_provisioned'
  );

  return query select target_user_id, provisioned_psychiatrist_id;
end;
$$;

revoke all on function public.provision_psychiatrist(uuid, text, text, text, uuid)
  from public, anon, authenticated;
grant execute on function public.provision_psychiatrist(uuid, text, text, text, uuid)
  to service_role;
