# Threat Model and Security Architecture

## Trust boundaries

The browser is untrusted. Supabase Auth establishes a session; RLS protects data reads; private server functions decide privileged reads and all sensitive state changes; the video provider accepts only short-lived credentials issued after server authorisation.

## Principal threats and controls

| Threat | Required control | Verification |
| --- | --- | --- |
| Cross-client/clinician data access | relationship-scoped RLS and server checks | direct RLS allow/deny tests |
| Fake role or privilege escalation | protected server-managed role records; no metadata/email role inference | role-change and JWT tests |
| Double booking/retry | locked transaction, constraints, idempotency key | concurrent request test |
| Leaked video access | private provider room and short-lived participant token | unrelated/expired-token deny test |
| Secret exposure | server-only secret manager, scanning, no `VITE_*` secrets | CI secret scan/access review |
| Admin/support misuse | least privilege, MFA, reasoned break-glass, immutable audit | access review/audit test |
| Sensitive observability leak | ID-only/redacted logs and short artifact retention | log/artifact review |
| Vendor or platform outage | kill switches, incident runbooks, backups/restore | tabletop and restore drill |

## Security rules

No security claim is based on obscurity, UI guards, a route, or a hidden identifier. Every feature adds its threat/abuse case, authoritative control, test, owner, and rollback/disable path before release.
