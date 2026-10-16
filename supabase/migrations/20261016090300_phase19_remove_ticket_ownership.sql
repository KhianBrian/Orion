-- Phase 19 correction (owner decision, 16 October 2026): support tickets have no owner.
-- Every admin sees every ticket, replies to it, and changes its status. There is no taking,
-- releasing, reassigning, or handler. This removes the ownership surface added earlier today.

drop function if exists public.take_support_ticket(uuid, uuid);
drop function if exists public.release_support_ticket(uuid, uuid);
drop function if exists public.reassign_support_ticket(uuid, uuid, uuid);
drop function if exists public.list_support_handlers(uuid);
drop function if exists public.set_support_ticket_status(uuid, uuid, public.support_ticket_status, text);
drop function if exists public.get_admin_support_tickets(uuid);
drop function if exists public.get_support_notification_counts(uuid);

drop index if exists public.support_tickets_assigned_status_idx;
alter table public.support_tickets drop column if exists assigned_to;

-- History now records only status changes. Existing rows are not re-checked.
alter table public.support_ticket_history
  drop column if exists from_assignee,
  drop column if exists to_assignee;
alter table public.support_ticket_history
  drop constraint if exists support_ticket_history_change_code_check;
alter table public.support_ticket_history
  add constraint support_ticket_history_change_code_check
  check (change_code = 'status_changed') not valid;

-- Change status. Admin only; the move must be allowed. Any admin may do it on any ticket.
create function public.set_support_ticket_status(
  target_ticket_id uuid,
  actor_profile_id uuid,
  new_status public.support_ticket_status,
  change_reason_code text
)
returns table (out_ticket_id uuid, out_status public.support_ticket_status)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  current_ticket public.support_tickets%rowtype;
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
    return query select current_ticket.id, current_ticket.status_code;
    return;
  end if;
  if not private.support_ticket_transition_allowed(current_ticket.status_code, new_status) then
    raise exception 'support_ticket_transition_not_allowed' using errcode = 'P0001';
  end if;

  update public.support_tickets ticket
  set status_code = new_status,
      status_changed_at = now(),
      updated_at = now()
  where ticket.id = current_ticket.id;

  insert into public.support_ticket_history (
    ticket_id, actor_id, change_code, from_status, to_status, reason_code
  ) values (
    current_ticket.id, actor_profile_id, 'status_changed', current_ticket.status_code, new_status, change_reason_code
  );
  insert into public.audit_events (actor_id, event_code, target_type, target_id, outcome, reason_code, correlation_id, metadata)
  values (actor_profile_id, 'support_ticket_status_changed', 'support_ticket', current_ticket.id, 'success',
    change_reason_code, gen_random_uuid(),
    jsonb_build_object('from_status', current_ticket.status_code, 'to_status', new_status));

  return query select current_ticket.id, new_status;
end;
$$;

-- Admin queue: every ticket, with a marker for a requester reply that arrived after resolution.
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
      ticket.status_changed_at,
      coalesce(
        ticket.status_code in ('resolved', 'closed')
        and last_message.created_at > ticket.status_changed_at
        and last_message.author_role_code <> 'admin',
        false
      )
    from public.support_tickets ticket
    join public.profiles requester on requester.id = ticket.requester_id
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

-- In-app notification count: tickets with a message the person has not read. Admins are counted
-- across every ticket; requesters across their own. A number only: no message text or category.
create function public.get_support_notification_counts(actor_profile_id uuid)
returns table (unread_tickets integer)
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
    select count(*)::integer
    from public.support_tickets ticket
    join lateral (
      select message.created_at, message.author_id
      from public.support_ticket_messages message
      where message.ticket_id = ticket.id
      order by message.created_at desc, message.id desc
      limit 1
    ) last_message on true
    left join public.support_ticket_reads ticket_read
      on ticket_read.ticket_id = ticket.id and ticket_read.actor_id = actor_profile_id
    where (actor_role = 'admin' or ticket.requester_id = actor_profile_id)
      and last_message.author_id <> actor_profile_id
      and (ticket_read.last_read_at is null or last_message.created_at > ticket_read.last_read_at);
end;
$$;

revoke all on function public.set_support_ticket_status(uuid, uuid, public.support_ticket_status, text),
  public.get_admin_support_tickets(uuid),
  public.get_support_notification_counts(uuid)
from public, anon, authenticated;
grant execute on function public.set_support_ticket_status(uuid, uuid, public.support_ticket_status, text),
  public.get_admin_support_tickets(uuid),
  public.get_support_notification_counts(uuid)
to service_role;
