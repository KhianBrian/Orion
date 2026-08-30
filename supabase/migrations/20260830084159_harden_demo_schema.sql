-- Make the intentionally inaccessible audit log explicit to the RLS linter.
-- Demo application users never query audit events directly.
create policy audit_events_deny_client_reads
on public.audit_events for select to authenticated
using (false);

-- Keep extension objects out of the API-exposed public schema.
create schema if not exists extensions;
alter extension btree_gist set schema extensions;
