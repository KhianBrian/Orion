-- Support attachments are private ticket evidence, not public media.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'support-attachments',
  'support-attachments',
  false,
  10485760,
  array['image/png', 'image/jpeg', 'application/pdf', 'text/plain']::text[]
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create table public.support_ticket_attachments (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets (id) on delete restrict,
  uploader_id uuid not null references public.profiles (id) on delete restrict,
  storage_path text not null unique,
  original_name text not null,
  mime_type text not null,
  size_bytes bigint not null,
  created_at timestamptz not null default now(),
  constraint support_ticket_attachments_name_check check (
    char_length(btrim(original_name)) between 1 and 180
  ),
  constraint support_ticket_attachments_type_check check (
    mime_type in ('image/png', 'image/jpeg', 'application/pdf', 'text/plain')
  ),
  constraint support_ticket_attachments_size_check check (
    size_bytes between 1 and 10485760
  )
);

create index support_ticket_attachments_ticket_created_at_idx
  on public.support_ticket_attachments (ticket_id, created_at asc);

alter table public.support_ticket_attachments enable row level security;
revoke all on table public.support_ticket_attachments from anon, authenticated;
grant all on table public.support_ticket_attachments to service_role;

create or replace function public.get_support_ticket_attachments(
  target_ticket_id uuid,
  actor_profile_id uuid
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
  ) then
    raise exception 'support_ticket_not_permitted' using errcode = '42501';
  end if;

  return query
    select attachment.id, attachment.storage_path, attachment.original_name,
      attachment.mime_type, attachment.size_bytes, attachment.created_at
    from public.support_ticket_attachments attachment
    where attachment.ticket_id = target_ticket_id
    order by attachment.created_at asc, attachment.id asc;
end;
$$;

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

revoke all on function public.get_support_ticket_attachments(uuid, uuid),
  public.register_support_ticket_attachment(uuid, uuid, text, text, text, bigint)
from public, anon, authenticated;
grant execute on function public.get_support_ticket_attachments(uuid, uuid),
  public.register_support_ticket_attachment(uuid, uuid, text, text, text, bigint)
to service_role;
