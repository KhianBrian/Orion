-- Phase 15 follow-up: support participation, replies, and per-user unread state.
-- Requesters may be patients or psychiatrists. Administrators can review and reply.

alter type public.support_ticket_message_kind add value if not exists 'reply';

alter table public.support_tickets
  rename column patient_id to requester_id;

alter index public.support_tickets_patient_idempotency_key
  rename to support_tickets_requester_idempotency_key;
alter index public.support_tickets_patient_created_at_idx
  rename to support_tickets_requester_created_at_idx;

alter table public.support_ticket_messages
  add column idempotency_key uuid;

update public.support_ticket_messages
set idempotency_key = gen_random_uuid()
where idempotency_key is null;

alter table public.support_ticket_messages
  alter column idempotency_key set not null;

create unique index support_ticket_messages_ticket_author_idempotency_key
  on public.support_ticket_messages (ticket_id, author_id, idempotency_key);

create table public.support_ticket_reads (
  ticket_id uuid not null references public.support_tickets (id) on delete restrict,
  actor_id uuid not null references public.profiles (id) on delete restrict,
  last_read_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (ticket_id, actor_id)
);

alter table public.support_ticket_reads enable row level security;
revoke all on table public.support_ticket_reads from anon, authenticated;
grant all on table public.support_ticket_reads to service_role;

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
       select 1 from public.profiles
       where id = actor_profile_id and role in ('patient', 'psychiatrist')
     ) then
    raise exception 'support_ticket_not_permitted' using errcode = '42501';
  end if;

  select * into existing_ticket
  from public.support_tickets
  where requester_id = actor_profile_id and idempotency_key = request_id;
  if found then
    return query select existing_ticket.id, existing_ticket.status_code, existing_ticket.created_at;
    return;
  end if;

  insert into public.support_tickets (requester_id, idempotency_key)
  values (actor_profile_id, request_id)
  on conflict (requester_id, idempotency_key) do nothing
  returning * into created_ticket;

  if not found then
    select * into existing_ticket
    from public.support_tickets
    where requester_id = actor_profile_id and idempotency_key = request_id;
    return query select existing_ticket.id, existing_ticket.status_code, existing_ticket.created_at;
    return;
  end if;

  insert into public.support_ticket_messages (
    ticket_id, author_id, author_role_code, message_kind_code, idempotency_key, body
  ) values (
    created_ticket.id, actor_profile_id,
    (select role from public.profiles where id = actor_profile_id),
    'initial_submission', request_id, message_body
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

drop function if exists public.get_my_support_tickets(uuid);
create function public.get_my_support_tickets(actor_profile_id uuid)
returns table (
  ticket_id uuid,
  requester_role_code public.app_role,
  category_code text,
  status_code public.support_ticket_status,
  created_at timestamptz,
  updated_at timestamptz,
  last_message_at timestamptz,
  last_message_author_role_code public.app_role,
  has_unread_reply boolean
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  perform private.assert_service_role();
  if actor_profile_id is null or not exists (
    select 1 from public.profiles
    where id = actor_profile_id and role in ('patient', 'psychiatrist')
  ) then
    raise exception 'support_ticket_not_permitted' using errcode = '42501';
  end if;

  return query
    select ticket.id,
      profile.role,
      ticket.category_code,
      ticket.status_code,
      ticket.created_at,
      ticket.updated_at,
      last_message.created_at,
      last_message.author_role_code,
      coalesce(
        last_message.author_id <> actor_profile_id
        and (ticket_read.last_read_at is null or last_message.created_at > ticket_read.last_read_at),
        false
      )
    from public.support_tickets ticket
    join public.profiles profile on profile.id = ticket.requester_id
    left join lateral (
      select message.created_at, message.author_id, message.author_role_code
      from public.support_ticket_messages message
      where message.ticket_id = ticket.id
      order by message.created_at desc, message.id desc
      limit 1
    ) last_message on true
    left join public.support_ticket_reads ticket_read
      on ticket_read.ticket_id = ticket.id and ticket_read.actor_id = actor_profile_id
    where ticket.requester_id = actor_profile_id
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
    select 1
    from public.support_tickets ticket
    join public.profiles profile on profile.id = ticket.requester_id
    where ticket.id = target_ticket_id
      and ticket.requester_id = actor_profile_id
      and profile.role in ('patient', 'psychiatrist')
  ) then
    raise exception 'support_ticket_not_permitted' using errcode = '42501';
  end if;

  insert into public.support_ticket_reads (ticket_id, actor_id, last_read_at)
  values (target_ticket_id, actor_profile_id, now())
  on conflict (ticket_id, actor_id) do update
    set last_read_at = excluded.last_read_at, updated_at = now();

  insert into public.audit_events (
    actor_id, event_code, target_type, target_id, outcome, correlation_id
  ) values (
    actor_profile_id, 'support_ticket_read', 'support_ticket', target_ticket_id, 'success', gen_random_uuid()
  );

  return query
    select message.id, message.author_role_code, message.message_kind_code, message.body, message.created_at
    from public.support_ticket_messages message
    where message.ticket_id = target_ticket_id
    order by message.created_at asc, message.id asc;
end;
$$;

drop function if exists public.get_admin_support_tickets(uuid);
create function public.get_admin_support_tickets(actor_profile_id uuid)
returns table (
  ticket_id uuid,
  requester_display_name text,
  requester_role_code public.app_role,
  category_code text,
  status_code public.support_ticket_status,
  created_at timestamptz,
  updated_at timestamptz,
  last_message_at timestamptz,
  last_message_author_role_code public.app_role,
  has_unread_reply boolean
)
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
    select ticket.id,
      profile.full_name,
      profile.role,
      ticket.category_code,
      ticket.status_code,
      ticket.created_at,
      ticket.updated_at,
      last_message.created_at,
      last_message.author_role_code,
      coalesce(
        last_message.author_id <> actor_profile_id
        and (ticket_read.last_read_at is null or last_message.created_at > ticket_read.last_read_at),
        false
      )
    from public.support_tickets ticket
    join public.profiles profile on profile.id = ticket.requester_id
    left join lateral (
      select message.created_at, message.author_id, message.author_role_code
      from public.support_ticket_messages message
      where message.ticket_id = ticket.id
      order by message.created_at desc, message.id desc
      limit 1
    ) last_message on true
    left join public.support_ticket_reads ticket_read
      on ticket_read.ticket_id = ticket.id and ticket_read.actor_id = actor_profile_id
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

  insert into public.support_ticket_reads (ticket_id, actor_id, last_read_at)
  values (target_ticket_id, actor_profile_id, now())
  on conflict (ticket_id, actor_id) do update
    set last_read_at = excluded.last_read_at, updated_at = now();

  insert into public.audit_events (
    actor_id, event_code, target_type, target_id, outcome, correlation_id
  ) values (
    actor_profile_id, 'support_ticket_read', 'support_ticket', target_ticket_id, 'success', gen_random_uuid()
  );

  return query
    select message.id, message.author_role_code, message.message_kind_code, message.body, message.created_at
    from public.support_ticket_messages message
    where message.ticket_id = target_ticket_id
    order by message.created_at asc, message.id asc;
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
