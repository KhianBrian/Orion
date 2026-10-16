-- Phase 19: support ticket lifecycle, assignment, history, and notification counts.
-- Owner decisions recorded 16 October 2026: only administrators change ticket status; a ticket is
-- handled by whichever developer (admin account) takes it; every admin sees every ticket.
-- All functions are service-role only. The Edge Function derives the actor from the JWT.

alter table public.support_tickets
  add column assigned_to uuid references public.profiles (id) on delete set null,
  add column status_changed_at timestamptz not null default now();

create index support_tickets_assigned_status_idx
  on public.support_tickets (assigned_to, status_code);

-- Append-only record of every status and assignment change. It carries IDs, codes, and database
-- time only; never message text, category, or attachment names.
create table public.support_ticket_history (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets (id) on delete cascade,
  actor_id uuid not null references public.profiles (id) on delete restrict,
  change_code text not null
    check (change_code in ('taken', 'released', 'reassigned', 'status_changed')),
  from_status public.support_ticket_status not null,
  to_status public.support_ticket_status not null,
  from_assignee uuid references public.profiles (id) on delete restrict,
  to_assignee uuid references public.profiles (id) on delete restrict,
  reason_code text
    check (reason_code is null or reason_code in ('abuse', 'duplicate', 'requester_confirmed', 'other')),
  created_at timestamptz not null default now()
);

create index support_ticket_history_ticket_created_idx
  on public.support_ticket_history (ticket_id, created_at);

alter table public.support_ticket_history enable row level security;
revoke all on table public.support_ticket_history from anon, authenticated;
grant select, insert on table public.support_ticket_history to service_role;

-- History rows can never be edited. service_role has no delete privilege on this table, so rows
-- leave only through the cascade from an approved ticket deletion.
create function private.support_ticket_history_append_only()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  raise exception 'support_ticket_history_is_append_only' using errcode = '42501';
end;
$$;
revoke all on function private.support_ticket_history_append_only() from public, anon, authenticated;

create trigger support_ticket_history_no_change
before update on public.support_ticket_history
for each row execute function private.support_ticket_history_append_only();

create function private.assert_support_admin(actor_profile_id uuid)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if actor_profile_id is null or not exists (
    select 1 from public.profiles where id = actor_profile_id and role = 'admin'
  ) then
    raise exception 'support_ticket_not_permitted' using errcode = '42501';
  end if;
end;
$$;
revoke all on function private.assert_support_admin(uuid) from public, anon, authenticated;

-- Allowed status moves. "Back to submitted" happens only through release_support_ticket.
create function private.support_ticket_transition_allowed(
  current_status public.support_ticket_status,
  next_status public.support_ticket_status
)
returns boolean
language sql
immutable
set search_path = pg_catalog
as $$
  select case current_status::text
    when 'submitted' then next_status::text in ('in_progress', 'closed')
    when 'in_progress' then next_status::text in ('awaiting_requester', 'resolved', 'closed')
    when 'awaiting_requester' then next_status::text in ('in_progress', 'resolved', 'closed')
    when 'resolved' then next_status::text in ('in_progress', 'closed')
    when 'closed' then next_status::text in ('in_progress')
    else false
  end;
$$;
revoke all on function private.support_ticket_transition_allowed(public.support_ticket_status, public.support_ticket_status)
  from public, anon, authenticated;

-- Take a ticket: the available admin claims it and an unstarted ticket becomes in progress.
create function public.take_support_ticket(target_ticket_id uuid, actor_profile_id uuid)
returns table (out_ticket_id uuid, out_status public.support_ticket_status, out_assigned_to uuid)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  current_ticket public.support_tickets%rowtype;
  next_status public.support_ticket_status;
begin
  perform private.assert_service_role();
  perform private.assert_support_admin(actor_profile_id);

  select * into current_ticket from public.support_tickets ticket
  where ticket.id = target_ticket_id for update;
  if not found then
    raise exception 'support_ticket_not_permitted' using errcode = '42501';
  end if;

  if current_ticket.assigned_to = actor_profile_id then
    return query select current_ticket.id, current_ticket.status_code, current_ticket.assigned_to;
    return;
  end if;
  if current_ticket.assigned_to is not null then
    raise exception 'support_ticket_already_taken' using errcode = 'P0001';
  end if;
  if current_ticket.status_code = 'closed' then
    raise exception 'support_ticket_closed' using errcode = 'P0001';
  end if;

  next_status := case when current_ticket.status_code = 'submitted'
    then 'in_progress'::public.support_ticket_status else current_ticket.status_code end;

  update public.support_tickets ticket
  set assigned_to = actor_profile_id,
      status_code = next_status,
      status_changed_at = case when next_status <> current_ticket.status_code then now() else ticket.status_changed_at end,
      updated_at = now()
  where ticket.id = current_ticket.id;

  insert into public.support_ticket_history (
    ticket_id, actor_id, change_code, from_status, to_status, from_assignee, to_assignee
  ) values (
    current_ticket.id, actor_profile_id, 'taken', current_ticket.status_code, next_status, null, actor_profile_id
  );
  insert into public.audit_events (actor_id, event_code, target_type, target_id, outcome, correlation_id, metadata)
  values (actor_profile_id, 'support_ticket_taken', 'support_ticket', current_ticket.id, 'success', gen_random_uuid(),
    jsonb_build_object('to_status', next_status));

  return query select current_ticket.id, next_status, actor_profile_id;
end;
$$;

-- Release a ticket back to the queue. The handler or any admin may release it.
create function public.release_support_ticket(target_ticket_id uuid, actor_profile_id uuid)
returns table (out_ticket_id uuid, out_status public.support_ticket_status, out_assigned_to uuid)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  current_ticket public.support_tickets%rowtype;
  next_status public.support_ticket_status;
begin
  perform private.assert_service_role();
  perform private.assert_support_admin(actor_profile_id);

  select * into current_ticket from public.support_tickets ticket
  where ticket.id = target_ticket_id for update;
  if not found then
    raise exception 'support_ticket_not_permitted' using errcode = '42501';
  end if;
  if current_ticket.status_code = 'closed' then
    raise exception 'support_ticket_closed' using errcode = 'P0001';
  end if;
  if current_ticket.assigned_to is null then
    return query select current_ticket.id, current_ticket.status_code, current_ticket.assigned_to;
    return;
  end if;

  next_status := case when current_ticket.status_code = 'in_progress'
    then 'submitted'::public.support_ticket_status else current_ticket.status_code end;

  update public.support_tickets ticket
  set assigned_to = null,
      status_code = next_status,
      status_changed_at = case when next_status <> current_ticket.status_code then now() else ticket.status_changed_at end,
      updated_at = now()
  where ticket.id = current_ticket.id;

  insert into public.support_ticket_history (
    ticket_id, actor_id, change_code, from_status, to_status, from_assignee, to_assignee
  ) values (
    current_ticket.id, actor_profile_id, 'released', current_ticket.status_code, next_status, current_ticket.assigned_to, null
  );
  insert into public.audit_events (actor_id, event_code, target_type, target_id, outcome, correlation_id, metadata)
  values (actor_profile_id, 'support_ticket_released', 'support_ticket', current_ticket.id, 'success', gen_random_uuid(),
    jsonb_build_object('to_status', next_status));

  return query select current_ticket.id, next_status, null::uuid;
end;
$$;

-- Reassign a ticket to another admin. Any admin may do this.
create function public.reassign_support_ticket(target_ticket_id uuid, actor_profile_id uuid, new_assignee_id uuid)
returns table (out_ticket_id uuid, out_status public.support_ticket_status, out_assigned_to uuid)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  current_ticket public.support_tickets%rowtype;
  next_status public.support_ticket_status;
begin
  perform private.assert_service_role();
  perform private.assert_support_admin(actor_profile_id);
  perform private.assert_support_admin(new_assignee_id);

  select * into current_ticket from public.support_tickets ticket
  where ticket.id = target_ticket_id for update;
  if not found then
    raise exception 'support_ticket_not_permitted' using errcode = '42501';
  end if;
  if current_ticket.status_code = 'closed' then
    raise exception 'support_ticket_closed' using errcode = 'P0001';
  end if;
  if current_ticket.assigned_to is not distinct from new_assignee_id then
    return query select current_ticket.id, current_ticket.status_code, current_ticket.assigned_to;
    return;
  end if;

  next_status := case when current_ticket.status_code = 'submitted'
    then 'in_progress'::public.support_ticket_status else current_ticket.status_code end;

  update public.support_tickets ticket
  set assigned_to = new_assignee_id,
      status_code = next_status,
      status_changed_at = case when next_status <> current_ticket.status_code then now() else ticket.status_changed_at end,
      updated_at = now()
  where ticket.id = current_ticket.id;

  insert into public.support_ticket_history (
    ticket_id, actor_id, change_code, from_status, to_status, from_assignee, to_assignee
  ) values (
    current_ticket.id, actor_profile_id, 'reassigned', current_ticket.status_code, next_status,
    current_ticket.assigned_to, new_assignee_id
  );
  insert into public.audit_events (actor_id, event_code, target_type, target_id, outcome, correlation_id, metadata)
  values (actor_profile_id, 'support_ticket_reassigned', 'support_ticket', current_ticket.id, 'success', gen_random_uuid(),
    jsonb_build_object('to_status', next_status));

  return query select current_ticket.id, next_status, new_assignee_id;
end;
$$;

-- Change status. Admin only; the transition must be allowed; reopening or starting work assigns
-- the actor when nobody holds the ticket.
create function public.set_support_ticket_status(
  target_ticket_id uuid,
  actor_profile_id uuid,
  new_status public.support_ticket_status,
  change_reason_code text
)
returns table (out_ticket_id uuid, out_status public.support_ticket_status, out_assigned_to uuid)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  current_ticket public.support_tickets%rowtype;
  next_assignee uuid;
begin
  perform private.assert_service_role();
  perform private.assert_support_admin(actor_profile_id);

  if new_status is null
     or (change_reason_code is not null and change_reason_code not in ('abuse', 'duplicate', 'requester_confirmed', 'other')) then
    raise exception 'support_ticket_invalid_request' using errcode = 'P0001';
  end if;

  select * into current_ticket from public.support_tickets ticket
  where ticket.id = target_ticket_id for update;
  if not found then
    raise exception 'support_ticket_not_permitted' using errcode = '42501';
  end if;
  if current_ticket.status_code = new_status then
    return query select current_ticket.id, current_ticket.status_code, current_ticket.assigned_to;
    return;
  end if;
  if not private.support_ticket_transition_allowed(current_ticket.status_code, new_status) then
    raise exception 'support_ticket_transition_not_allowed' using errcode = 'P0001';
  end if;

  -- Starting or restarting work assigns the actor when nobody holds the ticket; a reopen from
  -- resolved or closed always makes the reopening admin the handler.
  next_assignee := case
    when new_status = 'in_progress' and (current_ticket.assigned_to is null or current_ticket.status_code in ('resolved', 'closed'))
      then actor_profile_id
    else current_ticket.assigned_to end;

  update public.support_tickets ticket
  set status_code = new_status,
      assigned_to = next_assignee,
      status_changed_at = now(),
      updated_at = now()
  where ticket.id = current_ticket.id;

  insert into public.support_ticket_history (
    ticket_id, actor_id, change_code, from_status, to_status, from_assignee, to_assignee, reason_code
  ) values (
    current_ticket.id, actor_profile_id, 'status_changed', current_ticket.status_code, new_status,
    current_ticket.assigned_to, next_assignee, change_reason_code
  );
  insert into public.audit_events (actor_id, event_code, target_type, target_id, outcome, reason_code, correlation_id, metadata)
  values (actor_profile_id, 'support_ticket_status_changed', 'support_ticket', current_ticket.id, 'success',
    change_reason_code, gen_random_uuid(),
    jsonb_build_object('from_status', current_ticket.status_code, 'to_status', new_status));

  return query select current_ticket.id, new_status, next_assignee;
end;
$$;

-- Admin handlers available for reassignment: IDs and display names only.
create function public.list_support_handlers(actor_profile_id uuid)
returns table (handler_id uuid, handler_display_name text)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  perform private.assert_service_role();
  perform private.assert_support_admin(actor_profile_id);
  return query
    select profile.id, profile.full_name
    from public.profiles profile
    where profile.role = 'admin'
    order by profile.full_name asc, profile.id asc;
end;
$$;

-- Admin queue: now includes handler, status time, and an attention marker for a requester reply
-- that arrived after the ticket was marked resolved. Replaces the previous definition.
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
  has_unread_reply boolean,
  assigned_to uuid,
  assigned_to_display_name text,
  status_changed_at timestamptz,
  reply_after_resolution boolean
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  perform private.assert_service_role();
  perform private.assert_support_admin(actor_profile_id);

  return query
    select ticket.id,
      requester.full_name,
      requester.role,
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
      ),
      ticket.assigned_to,
      handler.full_name,
      ticket.status_changed_at,
      coalesce(
        ticket.status_code in ('resolved', 'closed')
        and last_message.created_at > ticket.status_changed_at
        and last_message.author_role_code <> 'admin',
        false
      )
    from public.support_tickets ticket
    join public.profiles requester on requester.id = ticket.requester_id
    left join public.profiles handler on handler.id = ticket.assigned_to
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

-- In-app notification counts. Counts only; no message text, category, or attachment data.
-- attention_tickets counts each ticket once even when it is both unread and unassigned.
create function public.get_support_notification_counts(actor_profile_id uuid)
returns table (unread_tickets integer, unassigned_tickets integer, attention_tickets integer)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  actor_role public.app_role;
begin
  perform private.assert_service_role();
  select profile.role into actor_role from public.profiles profile where profile.id = actor_profile_id;
  if actor_role is null then
    raise exception 'support_ticket_not_permitted' using errcode = '42501';
  end if;

  return query
    select
      count(*) filter (where flags.is_unread)::integer,
      count(*) filter (where flags.is_unassigned)::integer,
      count(*) filter (where flags.is_unread or flags.is_unassigned)::integer
    from (
      select
        coalesce(
          last_message.author_id <> actor_profile_id
          and (ticket_read.last_read_at is null or last_message.created_at > ticket_read.last_read_at),
          false
        ) as is_unread,
        (actor_role = 'admin'
          and ticket.assigned_to is null
          and ticket.status_code not in ('resolved', 'closed')) as is_unassigned
      from public.support_tickets ticket
      left join lateral (
        select message.created_at, message.author_id
        from public.support_ticket_messages message
        where message.ticket_id = ticket.id
        order by message.created_at desc, message.id desc
        limit 1
      ) last_message on true
      left join public.support_ticket_reads ticket_read
        on ticket_read.ticket_id = ticket.id and ticket_read.actor_id = actor_profile_id
      where actor_role = 'admin' or ticket.requester_id = actor_profile_id
    ) flags;
end;
$$;

-- Replies: a closed ticket accepts no further messages. Replying never changes status.
create or replace function public.send_support_ticket_message(
  target_ticket_id uuid,
  actor_profile_id uuid,
  request_id uuid,
  message_body text
)
returns table (message_id uuid, author_role_code public.app_role, message_kind_code public.support_ticket_message_kind, body text, created_at timestamptz)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  actor_role public.app_role;
  target_requester_id uuid;
  target_status public.support_ticket_status;
  existing_message public.support_ticket_messages%rowtype;
  created_message public.support_ticket_messages%rowtype;
begin
  perform private.assert_service_role();
  select profile.role into actor_role
  from public.profiles profile
  where profile.id = actor_profile_id;

  select ticket.requester_id, ticket.status_code into target_requester_id, target_status
  from public.support_tickets ticket
  where ticket.id = target_ticket_id
  for update;

  if actor_profile_id is null or request_id is null or message_body is null
     or length(btrim(message_body)) = 0 or char_length(message_body) > 2000
     or actor_role is null
     or not (
       actor_role = 'admin'
       or (actor_role in ('patient', 'psychiatrist') and target_requester_id = actor_profile_id)
     ) then
    raise exception 'support_ticket_not_permitted' using errcode = '42501';
  end if;

  select * into existing_message
  from public.support_ticket_messages message
  where message.ticket_id = target_ticket_id
    and message.author_id = actor_profile_id
    and message.idempotency_key = request_id;
  if found then
    return query select existing_message.id, existing_message.author_role_code,
      existing_message.message_kind_code, existing_message.body, existing_message.created_at;
    return;
  end if;

  if target_status = 'closed' then
    raise exception 'support_ticket_closed' using errcode = 'P0001';
  end if;

  insert into public.support_ticket_messages (
    ticket_id, author_id, author_role_code, message_kind_code, idempotency_key, body
  ) values (
    target_ticket_id, actor_profile_id, actor_role, 'reply', request_id, message_body
  )
  on conflict (ticket_id, author_id, idempotency_key) do nothing
  returning * into created_message;

  if not found then
    select * into existing_message
    from public.support_ticket_messages message
    where message.ticket_id = target_ticket_id
      and message.author_id = actor_profile_id
      and message.idempotency_key = request_id;
    return query select existing_message.id, existing_message.author_role_code,
      existing_message.message_kind_code, existing_message.body, existing_message.created_at;
    return;
  end if;

  update public.support_tickets ticket set updated_at = now() where ticket.id = target_ticket_id;

  insert into public.audit_events (
    actor_id, event_code, target_type, target_id, outcome, reason_code, correlation_id, metadata
  ) values (
    actor_profile_id, 'support_ticket_message_created', 'support_ticket', target_ticket_id,
    'success', 'reply', request_id, jsonb_build_object('message_id', created_message.id)
  );

  return query select created_message.id, created_message.author_role_code,
    created_message.message_kind_code, created_message.body, created_message.created_at;
end;
$$;

revoke all on function public.take_support_ticket(uuid, uuid),
  public.release_support_ticket(uuid, uuid),
  public.reassign_support_ticket(uuid, uuid, uuid),
  public.set_support_ticket_status(uuid, uuid, public.support_ticket_status, text),
  public.list_support_handlers(uuid),
  public.get_admin_support_tickets(uuid),
  public.get_support_notification_counts(uuid),
  public.send_support_ticket_message(uuid, uuid, uuid, text)
from public, anon, authenticated;
grant execute on function public.take_support_ticket(uuid, uuid),
  public.release_support_ticket(uuid, uuid),
  public.reassign_support_ticket(uuid, uuid, uuid),
  public.set_support_ticket_status(uuid, uuid, public.support_ticket_status, text),
  public.list_support_handlers(uuid),
  public.get_admin_support_tickets(uuid),
  public.get_support_notification_counts(uuid),
  public.send_support_ticket_message(uuid, uuid, uuid, text)
to service_role;
