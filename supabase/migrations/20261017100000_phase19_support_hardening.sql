-- Phase 19 hardening (owner direction, 17 October 2026): rate limits, upload caps, and a way to attach
-- one of the requester's own recent calls (by its ID) to a support ticket.
--
-- Limits (rolling hour, patient and psychiatrist requesters; admins are exempt from the message limit):
--   * 5 new tickets
--   * 30 replies
--   * 3 attachments per ticket (server-side; previously enforced only in the browser) and 10 per hour
-- An over-limit request is refused with the generic code support_rate_limited. A repeated request that
-- carries the same idempotency key returns the earlier result and is never counted or refused.
-- Counting is serialised per person with a transaction-level advisory lock, so parallel requests from
-- one person cannot slip past a limit together.
-- Upload links: a signed upload URL is issued only after a reservation is recorded (10 per person per
-- rolling hour, and never when the ticket already has 3 registered attachments). Files uploaded but never
-- registered are therefore bounded at 10 per person per hour; removing such orphans belongs to the
-- retention work, which is not part of this change.
--
-- A call reference is informational. It grants no access to the call or its notes and changes no
-- appointment state. The requester may reference only their own appointment that started within the
-- last 14 days (or within the next hour) and was not cancelled.

alter table public.support_tickets
  add column related_appointment_id uuid references public.appointments (id) on delete set null;

create index support_tickets_related_appointment_idx
  on public.support_tickets (related_appointment_id)
  where related_appointment_id is not null;

-- Short, human-friendly call ID shown on tickets: the first 8 characters of the appointment ID.
create function private.call_reference(call_id uuid)
returns text
language sql
immutable
set search_path = pg_catalog
as $$
  select upper(substr(replace(call_id::text, '-', ''), 1, 8));
$$;
revoke all on function private.call_reference(uuid) from public, anon, authenticated;

-- True when the appointment is one the actor took part in and may report.
create function private.support_call_is_reportable(call_id uuid, actor_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.appointments appointment
    left join public.psychiatrists psychiatrist on psychiatrist.id = appointment.psychiatrist_id
    where appointment.id = call_id
      and appointment.status in ('booked', 'completed', 'no_show')
      and appointment.starts_at <= now() + interval '1 hour'
      and appointment.starts_at >= now() - interval '14 days'
      and (appointment.patient_id = actor_profile_id or psychiatrist.profile_id = actor_profile_id)
  );
$$;
revoke all on function private.support_call_is_reportable(uuid, uuid) from public, anon, authenticated;

-- The requester's own recent calls, for the picker on the new-ticket form.
create function public.get_my_recent_calls(actor_profile_id uuid)
returns table (
  call_id uuid,
  call_reference text,
  call_starts_at timestamptz,
  call_ends_at timestamptz,
  call_status public.appointment_status,
  counterpart_display_name text
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  perform private.assert_service_role();
  if actor_profile_id is null or not exists (
    select 1 from public.profiles profile
    where profile.id = actor_profile_id and profile.role in ('patient', 'psychiatrist')
  ) then
    raise exception 'support_ticket_not_permitted' using errcode = '42501';
  end if;

  return query
    select appointment.id,
      private.call_reference(appointment.id),
      appointment.starts_at,
      appointment.ends_at,
      appointment.status,
      case when appointment.patient_id = actor_profile_id
        then psychiatrist.display_name
        else patient.full_name end
    from public.appointments appointment
    join public.psychiatrists psychiatrist on psychiatrist.id = appointment.psychiatrist_id
    join public.profiles patient on patient.id = appointment.patient_id
    where (appointment.patient_id = actor_profile_id or psychiatrist.profile_id = actor_profile_id)
      and appointment.starts_at >= now() - interval '14 days'
      and appointment.starts_at <= now() + interval '1 hour'
      and private.support_call_is_reportable(appointment.id, actor_profile_id)
    order by appointment.starts_at desc
    limit 20;
end;
$$;

-- Create a ticket: validates the optional call reference and enforces the new-ticket limit.
drop function if exists public.create_support_ticket(uuid, uuid, text, text);
create function public.create_support_ticket(
  actor_profile_id uuid,
  request_id uuid,
  ticket_category_code text,
  message_body text,
  related_call_id uuid default null
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
       select 1 from public.profiles profile
       where profile.id = actor_profile_id and profile.role in ('patient', 'psychiatrist')
     ) then
    raise exception 'support_ticket_not_permitted' using errcode = '42501';
  end if;

  select * into existing_ticket
  from public.support_tickets ticket
  where ticket.requester_id = actor_profile_id and ticket.idempotency_key = request_id;
  if found then
    return query select existing_ticket.id, existing_ticket.status_code, existing_ticket.created_at;
    return;
  end if;

  if related_call_id is not null and not private.support_call_is_reportable(related_call_id, actor_profile_id) then
    raise exception 'support_ticket_invalid_related_call' using errcode = 'P0001';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('support_rate:' || actor_profile_id::text, 0));
  if (select count(*) from public.support_tickets ticket
      where ticket.requester_id = actor_profile_id and ticket.created_at > now() - interval '1 hour') >= 5 then
    raise exception 'support_rate_limited' using errcode = 'P0001';
  end if;

  insert into public.support_tickets (requester_id, category_code, idempotency_key, related_appointment_id)
  values (actor_profile_id, ticket_category_code, request_id, related_call_id)
  on conflict (requester_id, idempotency_key) do nothing
  returning * into created_ticket;

  if not found then
    select * into existing_ticket
    from public.support_tickets ticket
    where ticket.requester_id = actor_profile_id and ticket.idempotency_key = request_id;
    return query select existing_ticket.id, existing_ticket.status_code, existing_ticket.created_at;
    return;
  end if;

  insert into public.support_ticket_messages (
    ticket_id, author_id, author_role_code, message_kind_code, idempotency_key, body
  ) values (
    created_ticket.id, actor_profile_id,
    (select profile.role from public.profiles profile where profile.id = actor_profile_id),
    'initial_submission', request_id, message_body
  ) returning * into created_message;

  insert into public.audit_events (
    actor_id, event_code, target_type, target_id, outcome, reason_code, correlation_id, metadata
  ) values (
    actor_profile_id, 'support_ticket_created', 'support_ticket', created_ticket.id,
    'success', ticket_category_code, request_id,
    jsonb_strip_nulls(jsonb_build_object('message_id', created_message.id, 'related_appointment_id', related_call_id))
  );

  return query select created_ticket.id, created_ticket.status_code, created_ticket.created_at;
end;
$$;

-- Replies: a closed ticket accepts no messages, replying never changes status, and requesters are
-- limited to 30 replies per rolling hour. Admins are exempt from the limit.
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

  if actor_role <> 'admin' then
    perform pg_advisory_xact_lock(hashtextextended('support_rate:' || actor_profile_id::text, 0));
  end if;
  if actor_role <> 'admin' and (
    select count(*) from public.support_ticket_messages message
    where message.author_id = actor_profile_id
      and message.message_kind_code = 'reply'
      and message.created_at > now() - interval '1 hour'
  ) >= 30 then
    raise exception 'support_rate_limited' using errcode = 'P0001';
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

-- Attachments: at most 3 per ticket and 10 per uploader per rolling hour, enforced on the server.
create or replace function public.register_support_ticket_attachment(
  target_ticket_id uuid,
  actor_profile_id uuid,
  target_storage_path text,
  target_original_name text,
  target_mime_type text,
  target_size_bytes bigint
)
returns table (
  attachment_id uuid,
  storage_path text,
  original_name text,
  mime_type text,
  size_bytes bigint,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  actor_role public.app_role;
  created_attachment public.support_ticket_attachments%rowtype;
begin
  perform private.assert_service_role();
  select profile.role into actor_role
  from public.profiles profile
  where profile.id = actor_profile_id;

  if actor_role is null or not exists (
    select 1
    from public.support_tickets ticket
    where ticket.id = target_ticket_id
      and (
        ticket.requester_id = actor_profile_id
        or actor_role = 'admin'
      )
  ) or target_storage_path is null
    or target_storage_path not like target_ticket_id::text || '/%'
    or target_original_name is null
    or char_length(btrim(target_original_name)) not between 1 and 180
    or target_mime_type not in ('image/png', 'image/jpeg', 'application/pdf', 'text/plain')
    or target_size_bytes not between 1 and 10485760 then
    raise exception 'support_ticket_attachment_not_permitted' using errcode = '42501';
  end if;

  perform 1 from public.support_tickets ticket where ticket.id = target_ticket_id for update;
  perform pg_advisory_xact_lock(hashtextextended('support_rate:' || actor_profile_id::text, 0));
  if (select count(*) from public.support_ticket_attachments attachment
      where attachment.ticket_id = target_ticket_id) >= 3
     or (select count(*) from public.support_ticket_attachments attachment
         where attachment.uploader_id = actor_profile_id
           and attachment.created_at > now() - interval '1 hour') >= 10 then
    raise exception 'support_rate_limited' using errcode = 'P0001';
  end if;

  insert into public.support_ticket_attachments (
    ticket_id, uploader_id, storage_path, original_name, mime_type, size_bytes
  ) values (
    target_ticket_id, actor_profile_id, target_storage_path,
    btrim(target_original_name), target_mime_type, target_size_bytes
  )
  returning * into created_attachment;

  return query
    select created_attachment.id, created_attachment.storage_path,
      created_attachment.original_name, created_attachment.mime_type,
      created_attachment.size_bytes, created_attachment.created_at;
end;
$$;

-- Records that a signed upload URL is about to be issued. Refused when the ticket already has 3
-- registered attachments, or when this person has already reserved 10 uploads in the last hour.
create table public.support_upload_reservations (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets (id) on delete cascade,
  actor_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);
create index support_upload_reservations_actor_created_idx
  on public.support_upload_reservations (actor_id, created_at desc);
alter table public.support_upload_reservations enable row level security;
revoke all on table public.support_upload_reservations from anon, authenticated;
grant select, insert, delete on table public.support_upload_reservations to service_role;

create function public.reserve_support_upload(target_ticket_id uuid, actor_profile_id uuid)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  actor_role public.app_role;
begin
  perform private.assert_service_role();
  select profile.role into actor_role from public.profiles profile where profile.id = actor_profile_id;
  if actor_role is null or not exists (
    select 1 from public.support_tickets ticket
    where ticket.id = target_ticket_id
      and (ticket.requester_id = actor_profile_id or actor_role = 'admin')
  ) then
    raise exception 'support_ticket_attachment_not_permitted' using errcode = '42501';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('support_rate:' || actor_profile_id::text, 0));
  if (select count(*) from public.support_ticket_attachments attachment
      where attachment.ticket_id = target_ticket_id) >= 3
     or (select count(*) from public.support_upload_reservations reservation
         where reservation.actor_id = actor_profile_id
           and reservation.created_at > now() - interval '1 hour') >= 10 then
    raise exception 'support_rate_limited' using errcode = 'P0001';
  end if;

  insert into public.support_upload_reservations (ticket_id, actor_id) values (target_ticket_id, actor_profile_id);
  return true;
end;
$$;

-- Requester ticket list: now also returns the referenced call's short ID and start time.
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
  has_unread_reply boolean,
  related_call_reference text,
  related_call_starts_at timestamptz
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  perform private.assert_service_role();
  if actor_profile_id is null or not exists (
    select 1 from public.profiles profile
    where profile.id = actor_profile_id and profile.role in ('patient', 'psychiatrist')
  ) then
    raise exception 'support_ticket_not_permitted' using errcode = '42501';
  end if;

  return query
    select ticket.id,
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
      private.call_reference(related_call.id),
      related_call.starts_at
    from public.support_tickets ticket
    join public.profiles requester on requester.id = ticket.requester_id
    left join public.appointments related_call on related_call.id = ticket.related_appointment_id
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

-- Admin queue: now also returns the referenced call (full ID, short ID, time, status, and both
-- participants' names) so a call can be tracked from the ticket. Nothing from the call's notes.
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
  status_changed_at timestamptz,
  reply_after_resolution boolean,
  related_call_id uuid,
  related_call_reference text,
  related_call_starts_at timestamptz,
  related_call_status public.appointment_status,
  related_call_patient_name text,
  related_call_psychiatrist_name text
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
      ),
      related_call.id,
      private.call_reference(related_call.id),
      related_call.starts_at,
      related_call.status,
      call_patient.full_name,
      call_psychiatrist.display_name
    from public.support_tickets ticket
    join public.profiles requester on requester.id = ticket.requester_id
    left join public.appointments related_call on related_call.id = ticket.related_appointment_id
    left join public.profiles call_patient on call_patient.id = related_call.patient_id
    left join public.psychiatrists call_psychiatrist on call_psychiatrist.id = related_call.psychiatrist_id
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

revoke all on function public.get_my_recent_calls(uuid),
  public.create_support_ticket(uuid, uuid, text, text, uuid),
  public.send_support_ticket_message(uuid, uuid, uuid, text),
  public.register_support_ticket_attachment(uuid, uuid, text, text, text, bigint),
  public.reserve_support_upload(uuid, uuid),
  public.get_my_support_tickets(uuid),
  public.get_admin_support_tickets(uuid)
from public, anon, authenticated;
grant execute on function public.get_my_recent_calls(uuid),
  public.create_support_ticket(uuid, uuid, text, text, uuid),
  public.send_support_ticket_message(uuid, uuid, uuid, text),
  public.register_support_ticket_attachment(uuid, uuid, text, text, text, bigint),
  public.reserve_support_upload(uuid, uuid),
  public.get_my_support_tickets(uuid),
  public.get_admin_support_tickets(uuid)
to service_role;
