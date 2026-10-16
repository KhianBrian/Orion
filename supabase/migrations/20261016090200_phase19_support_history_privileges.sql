-- Phase 19 correction: Supabase grants service_role full rights on new public tables by default,
-- so the earlier "grant select, insert" did not remove update and delete. Make the history table
-- genuinely append-only for the service role. Rows still leave with their ticket through the
-- foreign-key cascade, which runs as the table owner and needs no service-role privilege.
revoke all on table public.support_ticket_history from service_role;
grant select, insert on table public.support_ticket_history to service_role;
