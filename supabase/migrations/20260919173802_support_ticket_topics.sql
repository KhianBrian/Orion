-- Support topic taxonomy keeps triage explicit without putting sensitive
-- clinical content into the support surface.
alter table public.support_tickets
  drop constraint if exists support_tickets_category_check;

alter table public.support_tickets
  add constraint support_tickets_category_check check (
    category_code in (
      'technical_issue',
      'account_access',
      'booking_scheduling',
      'payment_billing',
      'clinician_or_user_concern',
      'privacy_or_data',
      'other'
    )
  );

drop function if exists public.create_support_ticket(uuid, uuid, text);

create function public.create_support_ticket(
  actor_profile_id uuid,
  request_id uuid,
  ticket_category_code text,
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
  if actor_profile_id is null or request_id is null
     or ticket_category_code is null
     or ticket_category_code not in (
       'technical_issue', 'account_access', 'booking_scheduling',
       'payment_billing', 'clinician_or_user_concern', 'privacy_or_data', 'other'
     )
     or message_body is null or length(btrim(message_body)) = 0
     or char_length(message_body) > 2000
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

  insert into public.support_tickets (requester_id, category_code, idempotency_key)
  values (actor_profile_id, ticket_category_code, request_id)
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
    'success', ticket_category_code, request_id,
    jsonb_build_object('message_id', created_message.id)
  );

  return query select created_ticket.id, created_ticket.status_code, created_ticket.created_at;
end;
$$;

revoke all on function public.create_support_ticket(uuid, uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.create_support_ticket(uuid, uuid, text, text)
  to service_role;
