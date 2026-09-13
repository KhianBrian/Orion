-- Phase 15: data, consent, audit, and the approved administrative support slice.
-- All new records remain synthetic/non-production. Provider calls, guardian review,
-- retention/deletion, and real-user activation remain outside this migration.

alter type public.appointment_status add value if not exists 'payment_pending';
alter type public.slot_status add value if not exists 'reserved';

alter table public.appointments
  add column if not exists booking_authorisation_basis text not null default 'synthetic_demo';

alter table public.appointments
  add constraint appointments_booking_authorisation_basis_check
  check (booking_authorisation_basis in ('synthetic_demo', 'verified_payment'));

drop index if exists public.appointments_one_booked_appointment_per_slot;
alter table public.appointments
  drop constraint if exists appointments_no_overlapping_booked_sessions;

create unique index appointments_identity_key
  on public.appointments (id, patient_id, psychiatrist_id);

create type public.patient_eligibility_status as enum ('pending', 'eligible', 'ineligible');
create type public.patient_pathway_code as enum ('adult', 'minor');
create type public.guardian_case_status as enum ('pending', 'submitted', 'accepted', 'rejected');
create type public.guardian_consent_event_code as enum ('submitted', 'accepted', 'rejected');
create type public.payment_attempt_status as enum ('pending', 'succeeded', 'failed', 'cancelled', 'expired');
create type public.support_ticket_status as enum ('submitted');
create type public.support_ticket_message_kind as enum ('initial_submission');

create table public.patient_eligibility (
  patient_id uuid primary key references public.profiles (id) on delete restrict,
  pathway_code public.patient_pathway_code not null,
  status_code public.patient_eligibility_status not null default 'pending',
  decision_reason_code text,
  decided_by uuid references public.profiles (id) on delete set null,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint patient_eligibility_decision_facts_check check (
    (status_code = 'pending' and decided_by is null and decided_at is null)
    or (status_code in ('eligible', 'ineligible') and decided_by is not null and decided_at is not null)
  )
);

create table public.guardian_consent_cases (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null unique references public.profiles (id) on delete restrict,
  status_code public.guardian_case_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.guardian_consent_events (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.guardian_consent_cases (id) on delete restrict,
  event_code public.guardian_consent_event_code not null,
  actor_id uuid references public.profiles (id) on delete set null,
  document_version text,
  created_at timestamptz not null default now()
);

create index guardian_consent_events_case_created_at_idx
  on public.guardian_consent_events (case_id, created_at desc);

create table public.payment_attempts (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null,
  patient_id uuid not null,
  psychiatrist_id uuid not null,
  provider_code text,
  provider_attempt_reference text,
  amount_minor bigint,
  currency text,
  status_code public.payment_attempt_status not null default 'pending',
  idempotency_key uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payment_attempts_appointment_identity_fkey
    foreign key (appointment_id, patient_id, psychiatrist_id)
    references public.appointments (id, patient_id, psychiatrist_id) on delete restrict,
  constraint payment_attempts_amount_check check (amount_minor is null or amount_minor >= 0),
  constraint payment_attempts_currency_check check (currency is null or currency ~ '^[A-Z]{3}$')
);

create unique index payment_attempts_appointment_idempotency_key
  on public.payment_attempts (appointment_id, idempotency_key);
create unique index payment_attempts_provider_reference_key
  on public.payment_attempts (provider_code, provider_attempt_reference)
  where provider_code is not null and provider_attempt_reference is not null;
create index payment_attempts_patient_created_at_idx
  on public.payment_attempts (patient_id, created_at desc);

create table public.payment_events (
  id uuid primary key default gen_random_uuid(),
  payment_attempt_id uuid not null references public.payment_attempts (id) on delete restrict,
  provider_event_reference text not null,
  normalized_status public.payment_attempt_status not null,
  received_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create unique index payment_events_attempt_provider_reference_key
  on public.payment_events (payment_attempt_id, provider_event_reference);
create index payment_events_received_at_idx
  on public.payment_events (received_at desc);

create table public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles (id) on delete restrict,
  category_code text not null default 'administrative_help',
  status_code public.support_ticket_status not null default 'submitted',
  idempotency_key uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint support_tickets_category_check check (category_code = 'administrative_help')
);

create unique index support_tickets_patient_idempotency_key
  on public.support_tickets (patient_id, idempotency_key);
create index support_tickets_status_created_at_idx
  on public.support_tickets (status_code, created_at desc);
create index support_tickets_patient_created_at_idx
  on public.support_tickets (patient_id, created_at desc);

create table public.support_ticket_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets (id) on delete restrict,
  author_id uuid not null references public.profiles (id) on delete restrict,
  author_role_code public.app_role not null,
  message_kind_code public.support_ticket_message_kind not null default 'initial_submission',
  body text not null,
  created_at timestamptz not null default now(),
  constraint support_ticket_messages_body_check check (char_length(btrim(body)) between 1 and 2000)
);

create index support_ticket_messages_ticket_created_at_idx
  on public.support_ticket_messages (ticket_id, created_at asc);

create trigger patient_eligibility_set_updated_at
before update on public.patient_eligibility
for each row execute function private.set_updated_at();
create trigger guardian_consent_cases_set_updated_at
before update on public.guardian_consent_cases
for each row execute function private.set_updated_at();
create trigger payment_attempts_set_updated_at
before update on public.payment_attempts
for each row execute function private.set_updated_at();
create trigger support_tickets_set_updated_at
before update on public.support_tickets
for each row execute function private.set_updated_at();

alter table public.patient_eligibility enable row level security;
alter table public.guardian_consent_cases enable row level security;
alter table public.guardian_consent_events enable row level security;
alter table public.payment_attempts enable row level security;
alter table public.payment_events enable row level security;
alter table public.support_tickets enable row level security;
alter table public.support_ticket_messages enable row level security;

revoke all on table public.patient_eligibility,
  public.guardian_consent_cases,
  public.guardian_consent_events,
  public.payment_attempts,
  public.payment_events,
  public.support_tickets,
  public.support_ticket_messages
from anon, authenticated;

grant all on table public.patient_eligibility,
  public.guardian_consent_cases,
  public.guardian_consent_events,
  public.payment_attempts,
  public.payment_events,
  public.support_tickets,
  public.support_ticket_messages
to service_role;

create or replace function public.create_support_ticket(
  actor_profile_id uuid,
  request_id uuid,
  message_body text
)
returns table (ticket_id uuid, status_code public.support_ticket_status, created_at timestamptz)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  existing_ticket public.support_tickets%rowtype;
  created_ticket public.support_tickets%rowtype;
  created_message public.support_ticket_messages%rowtype;
begin
  perform private.assert_service_role();
  if actor_profile_id is null or request_id is null or message_body is null
     or length(btrim(message_body)) = 0 or char_length(message_body) > 2000
     or not exists (
       select 1 from public.profiles where id = actor_profile_id and role = 'patient'
     ) then
    raise exception 'support_ticket_not_permitted' using errcode = '42501';
  end if;

  select * into existing_ticket
  from public.support_tickets
  where patient_id = actor_profile_id and idempotency_key = request_id;
  if found then
    return query select existing_ticket.id, existing_ticket.status_code, existing_ticket.created_at;
    return;
  end if;

  insert into public.support_tickets (patient_id, idempotency_key)
  values (actor_profile_id, request_id)
  on conflict (patient_id, idempotency_key) do nothing
  returning * into created_ticket;

  if not found then
    select * into existing_ticket
    from public.support_tickets
    where patient_id = actor_profile_id and idempotency_key = request_id;
    return query select existing_ticket.id, existing_ticket.status_code, existing_ticket.created_at;
    return;
  end if;

  insert into public.support_ticket_messages (
    ticket_id, author_id, author_role_code, body
  ) values (
    created_ticket.id, actor_profile_id, 'patient', message_body
  ) returning * into created_message;

  insert into public.audit_events (
    actor_id, event_code, target_type, target_id, outcome, reason_code, correlation_id, metadata
  ) values (
    actor_profile_id, 'support_ticket_created', 'support_ticket', created_ticket.id,
    'success', 'administrative_help', request_id,
    jsonb_build_object('message_id', created_message.id)
  );

  return query select created_ticket.id, created_ticket.status_code, created_ticket.created_at;
end;
$$;

create or replace function public.get_my_support_tickets(actor_profile_id uuid)
returns table (ticket_id uuid, category_code text, status_code public.support_ticket_status, created_at timestamptz, updated_at timestamptz)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  perform private.assert_service_role();
  if actor_profile_id is null or not exists (
    select 1 from public.profiles where id = actor_profile_id and role = 'patient'
  ) then
    raise exception 'support_ticket_not_permitted' using errcode = '42501';
  end if;
  return query
    select ticket.id, ticket.category_code, ticket.status_code, ticket.created_at, ticket.updated_at
    from public.support_tickets ticket
    where ticket.patient_id = actor_profile_id
    order by ticket.created_at desc;
end;
$$;

create or replace function public.read_my_support_ticket(target_ticket_id uuid, actor_profile_id uuid)
returns table (message_id uuid, author_role_code public.app_role, message_kind_code public.support_ticket_message_kind, body text, created_at timestamptz)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  perform private.assert_service_role();
  if actor_profile_id is null or target_ticket_id is null or not exists (
    select 1 from public.support_tickets
    where id = target_ticket_id and patient_id = actor_profile_id
  ) then
    raise exception 'support_ticket_not_permitted' using errcode = '42501';
  end if;

  insert into public.audit_events (
    actor_id, event_code, target_type, target_id, outcome, correlation_id
  ) values (
    actor_profile_id, 'support_ticket_read', 'support_ticket', target_ticket_id, 'success', gen_random_uuid()
  );

  return query
    select message.id, message.author_role_code, message.message_kind_code, message.body, message.created_at
    from public.support_ticket_messages message
    where message.ticket_id = target_ticket_id
    order by message.created_at asc;
end;
$$;

create or replace function public.get_admin_support_tickets(actor_profile_id uuid)
returns table (ticket_id uuid, patient_display_name text, category_code text, status_code public.support_ticket_status, created_at timestamptz, updated_at timestamptz)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  perform private.assert_service_role();
  if actor_profile_id is null or not exists (
    select 1 from public.profiles where id = actor_profile_id and role = 'admin'
  ) then
    raise exception 'support_ticket_not_permitted' using errcode = '42501';
  end if;
  return query
    select ticket.id, profile.full_name, ticket.category_code, ticket.status_code, ticket.created_at, ticket.updated_at
    from public.support_tickets ticket
    join public.profiles profile on profile.id = ticket.patient_id
    order by ticket.created_at asc;
end;
$$;

create or replace function public.read_admin_support_ticket(target_ticket_id uuid, actor_profile_id uuid)
returns table (message_id uuid, author_role_code public.app_role, message_kind_code public.support_ticket_message_kind, body text, created_at timestamptz)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  perform private.assert_service_role();
  if actor_profile_id is null or target_ticket_id is null or not exists (
    select 1 from public.profiles where id = actor_profile_id and role = 'admin'
  ) then
    raise exception 'support_ticket_not_permitted' using errcode = '42501';
  end if;
  if not exists (select 1 from public.support_tickets where id = target_ticket_id) then
    raise exception 'support_ticket_not_permitted' using errcode = '42501';
  end if;

  insert into public.audit_events (
    actor_id, event_code, target_type, target_id, outcome, correlation_id
  ) values (
    actor_profile_id, 'support_ticket_read', 'support_ticket', target_ticket_id, 'success', gen_random_uuid()
  );

  return query
    select message.id, message.author_role_code, message.message_kind_code, message.body, message.created_at
    from public.support_ticket_messages message
    where message.ticket_id = target_ticket_id
    order by message.created_at asc;
end;
$$;

revoke all on function public.create_support_ticket(uuid, uuid, text),
  public.get_my_support_tickets(uuid),
  public.read_my_support_ticket(uuid, uuid),
  public.get_admin_support_tickets(uuid),
  public.read_admin_support_ticket(uuid, uuid)
from public, anon, authenticated;
grant execute on function public.create_support_ticket(uuid, uuid, text),
  public.get_my_support_tickets(uuid),
  public.read_my_support_ticket(uuid, uuid),
  public.get_admin_support_tickets(uuid),
  public.read_admin_support_ticket(uuid, uuid)
to service_role;
