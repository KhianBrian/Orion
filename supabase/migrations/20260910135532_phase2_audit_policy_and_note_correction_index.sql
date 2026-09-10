-- Keep one selective audit read policy so patients and psychiatrists have no
-- matching SELECT policy, while admins can review metadata only.
drop policy if exists audit_events_deny_client_reads on public.audit_events;
drop policy if exists audit_events_admin_read on public.audit_events;

create policy audit_events_admin_read
on public.audit_events for select to authenticated
using (private.current_app_role() = 'admin');

-- Support correction-chain lookups and foreign-key maintenance.
create index if not exists session_notes_supersedes_note_id_idx
on public.session_notes (supersedes_note_id);
