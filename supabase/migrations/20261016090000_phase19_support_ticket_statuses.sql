-- Phase 19: support ticket lifecycle statuses.
-- New enum values are added on their own so the following migration can use them
-- after this transaction commits.

alter type public.support_ticket_status add value if not exists 'in_progress';
alter type public.support_ticket_status add value if not exists 'awaiting_requester';
alter type public.support_ticket_status add value if not exists 'resolved';
alter type public.support_ticket_status add value if not exists 'closed';
