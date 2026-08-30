-- Orion's synthetic five-account demo foundation.
-- Authority: Knowledge-base/engineering/phases/demo-milestone.md,
-- Knowledge-base/architecture/database-and-rbac.md, and
-- Knowledge-base/product/appointment-lifecycle.md.
-- This migration deliberately supports only patient, psychiatrist, and admin.

create extension if not exists btree_gist;
create extension if not exists pgcrypto;

create schema private;
revoke all on schema private from public;

create type public.app_role as enum ('patient', 'psychiatrist', 'admin');
create type public.slot_status as enum ('open', 'booked');
create type public.appointment_status as enum (
  'booked',
  'cancelled',
  'completed',
  'no_show'
);
create type public.cancellation_party as enum ('patient', 'psychiatrist', 'admin');
create type public.audit_outcome as enum ('success', 'denied');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  phone text,
  role public.app_role not null default 'patient',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.psychiatrists (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles (id) on delete restrict,
  display_name text not null,
  bio text,
  photo_url text,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.availability_slots (
  id uuid primary key default gen_random_uuid(),
  psychiatrist_id uuid not null references public.psychiatrists (id) on delete restrict,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status public.slot_status not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint availability_slots_exactly_45_minutes
    check (ends_at = starts_at + interval '45 minutes'),
  constraint availability_slots_valid_range check (ends_at > starts_at),
  constraint availability_slots_no_overlaps
    exclude using gist (
      psychiatrist_id with =,
      tstzrange(starts_at, ends_at, '[)') with &&
    )
);

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles (id) on delete restrict,
  psychiatrist_id uuid not null references public.psychiatrists (id) on delete restrict,
  slot_id uuid not null references public.availability_slots (id) on delete restrict,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status public.appointment_status not null default 'booked',
  video_room_id uuid not null unique default gen_random_uuid(),
  idempotency_key uuid not null,
  cancelled_at timestamptz,
  cancelled_by public.cancellation_party,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint appointments_exactly_45_minutes
    check (ends_at = starts_at + interval '45 minutes'),
  constraint appointments_valid_range check (ends_at > starts_at),
  constraint appointments_cancellation_facts_together
    check (
      (status = 'cancelled' and cancelled_at is not null and cancelled_by is not null)
      or (status <> 'cancelled' and cancelled_at is null and cancelled_by is null)
    )
);

create unique index appointments_patient_idempotency_key
  on public.appointments (patient_id, idempotency_key);

create unique index appointments_one_booked_appointment_per_slot
  on public.appointments (slot_id)
  where status = 'booked';

create unique index availability_slots_psychiatrist_starts_at_idx
  on public.availability_slots (psychiatrist_id, starts_at);

create index availability_slots_open_lookup_idx
  on public.availability_slots (starts_at, psychiatrist_id)
  where status = 'open';

create index appointments_patient_starts_at_idx
  on public.appointments (patient_id, starts_at);

create index appointments_psychiatrist_starts_at_idx
  on public.appointments (psychiatrist_id, starts_at);

create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles (id) on delete set null,
  event_code text not null,
  target_type text not null,
  target_id uuid,
  outcome public.audit_outcome not null,
  reason_code text,
  correlation_id uuid,
  created_at timestamptz not null default now()
);

create index audit_events_actor_created_at_idx
  on public.audit_events (actor_id, created_at desc);

create index audit_events_target_created_at_idx
  on public.audit_events (target_type, target_id, created_at desc);

create function private.set_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function private.set_updated_at();

create trigger psychiatrists_set_updated_at
before update on public.psychiatrists
for each row execute function private.set_updated_at();

create trigger availability_slots_set_updated_at
before update on public.availability_slots
for each row execute function private.set_updated_at();

create trigger appointments_set_updated_at
before update on public.appointments
for each row execute function private.set_updated_at();

create function private.create_patient_profile()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  insert into public.profiles (id, role)
  values (new.id, 'patient');
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function private.create_patient_profile();

create function private.current_app_role()
returns public.app_role
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select role
  from public.profiles
  where id = (select auth.uid());
$$;

-- This function is callable only by the service role used by the local synthetic-data
-- provisioner. Application users can never assign themselves a role.
create function public.provision_demo_profile(
  target_profile_id uuid,
  target_role public.app_role,
  target_full_name text,
  actor_profile_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  update public.profiles
  set role = target_role,
      full_name = target_full_name
  where id = target_profile_id;

  if not found then
    raise exception 'profile_not_found' using errcode = 'P0002';
  end if;

  insert into public.audit_events (
    actor_id, event_code, target_type, target_id, outcome, reason_code
  ) values (
    actor_profile_id, 'demo_profile_provisioned', 'profile', target_profile_id,
    'success', 'synthetic_demo'
  );
end;
$$;

alter table public.profiles enable row level security;
alter table public.psychiatrists enable row level security;
alter table public.availability_slots enable row level security;
alter table public.appointments enable row level security;
alter table public.audit_events enable row level security;

revoke all on table public.profiles, public.psychiatrists,
  public.availability_slots, public.appointments, public.audit_events
  from anon, authenticated;

revoke all on function public.provision_demo_profile(uuid, public.app_role, text, uuid)
  from public, anon, authenticated;

revoke all on function private.set_updated_at(), private.create_patient_profile(),
  private.current_app_role() from public, anon, authenticated;

grant execute on function public.provision_demo_profile(uuid, public.app_role, text, uuid)
  to service_role;

grant usage on schema private to authenticated;
grant execute on function private.current_app_role() to authenticated;

grant select on public.profiles, public.psychiatrists,
  public.availability_slots, public.appointments to authenticated;

grant update (full_name, phone) on public.profiles to authenticated;

grant all on table public.profiles, public.psychiatrists,
  public.availability_slots, public.appointments, public.audit_events
  to service_role;

create policy profiles_select_own
on public.profiles for select to authenticated
using ((select auth.uid()) = id);

create policy profiles_update_own_non_privileged_fields
on public.profiles for update to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

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
