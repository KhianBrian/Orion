-- Phase 15 follow-up: protected support replies after the reply enum commits.

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
  existing_message public.support_ticket_messages%rowtype;
  created_message public.support_ticket_messages%rowtype;
begin
  perform private.assert_service_role();
  select profile.role into actor_role
  from public.profiles profile
  where profile.id = actor_profile_id;

  select ticket.requester_id into target_requester_id
  from public.support_tickets ticket
  where ticket.id = target_ticket_id;

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
  from public.support_ticket_messages
  where ticket_id = target_ticket_id
    and author_id = actor_profile_id
    and idempotency_key = request_id;
  if found then
    return query select existing_message.id, existing_message.author_role_code,
      existing_message.message_kind_code, existing_message.body, existing_message.created_at;
    return;
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
    from public.support_ticket_messages
    where ticket_id = target_ticket_id
      and author_id = actor_profile_id
      and idempotency_key = request_id;
    return query select existing_message.id, existing_message.author_role_code,
      existing_message.message_kind_code, existing_message.body, existing_message.created_at;
    return;
  end if;

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

revoke all on function public.send_support_ticket_message(uuid, uuid, uuid, text)
from public, anon, authenticated;
grant execute on function public.send_support_ticket_message(uuid, uuid, uuid, text)
to service_role;
