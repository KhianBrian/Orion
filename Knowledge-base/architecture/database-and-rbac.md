# Database and RBAC

## Roles

The sole application roles are `patient`, `psychiatrist`, and `admin`. Roles live in the protected `profiles` table. They must never be inferred from email text or editable user metadata.

| Capability | Patient | Psychiatrist | Admin |
| --- | --- | --- | --- |
| Read/update own profile | Yes | Yes | Yes |
| Browse active psychiatrists and open slots | Yes | No | Yes |
| Create appointment | Yes | No | No by default |
| Read appointment | Own only | Assigned only | No unrestricted access |
| Cancel appointment | Own, only >24h | Only under approved clinical policy | Exceptional, audited policy only |
| Join appointment room | Own, in session window | Assigned, in session window | No default |
| Create availability | No | Own only after activation | Approved administration only |
| Provision psychiatrists | No | No | Yes |

## Core model

| Table | Purpose | Important fields |
| --- | --- | --- |
| `profiles` | Application user record linked one-to-one to `auth.users`. | `id`, `full_name`, `phone`, `role`, timestamps |
| `psychiatrists` | Public psychiatrist profile. | `id`, `profile_id`, `display_name`, `bio`, `photo_url`, `is_active` |
| `availability_slots` | A bookable 45-minute period. | `id`, `psychiatrist_id`, `starts_at`, `ends_at`, `status` |
| `appointments` | A confirmed or historical booking. | `id`, `patient_id`, `psychiatrist_id`, `slot_id`, derived `starts_at`/`ends_at`, `status`, provider room reference, cancellation timestamps |
| `consent_events` | Versioned evidence of approved notice/consent choices. | `id`, `actor_id`, `document_version`, `choice`, `created_at` |
| `audit_events` | Security-relevant privileged actions. | `id`, `actor_id`, `action`, `target_type`, `target_id`, `metadata`, `created_at` |

All times use `timestamptz`; the user interface displays `Asia/Manila`. Database constraints enforce `ends_at = starts_at + interval '45 minutes'` for slots and appointments.

## Security design

- Enable RLS on every exposed table.
- Revoke default `anon` and `authenticated` grants, then grant only required operations.
- Write separate `select`, `insert`, `update`, and `delete` policies. Each policy must include a row ownership or assignment predicate.
- Add an allow and deny RLS test for each table and each relevant role.
- Keep admin privilege changes inside a server-side function and audit them.
- Issue a short-lived provider participant token only after server-side participant validation; never return a reusable public meeting URL.

Supabase Auth's database role (`authenticated`) confirms sign-in; it does not provide application authorization by itself. RLS must still restrict rows according to the role and relation to the appointment.

## Sensitive commands

### Book appointment

The `book-appointment` Edge Function validates the caller is a patient, validates slot time/status, locks the requested slot, derives appointment time from the slot, creates the appointment, and marks the slot booked in one database transaction. An idempotency key and database constraints prevent retry and concurrency errors.

If two patients attempt the same slot, exactly one booking succeeds. The other receives a conflict response and refreshes availability.

### Cancel appointment

The `cancel-appointment` Edge Function validates ownership, verifies `starts_at > now() + interval '24 hours'`, changes status to `cancelled`, records the timestamp, and applies the approved rebooking policy. It returns a plain-language denial reason when blocked.

### Join meeting

The `get-meeting-access` function validates that the caller is the patient or assigned psychiatrist and that the appointment is in its allowed join window before issuing a short-lived provider token.

## Indexes and integrity

- Index availability by `(psychiatrist_id, starts_at)` and open-slot lookup fields.
- Index appointments by `(patient_id, starts_at)` and `(psychiatrist_id, starts_at)`.
- Foreign keys link all actor and appointment relationships.
- Use an enum or checked values for roles, slot status, and appointment status.
- Prevent overlapping active slots and appointments for each psychiatrist.
- Do not hard-delete appointments; retain cancelled records for history.
