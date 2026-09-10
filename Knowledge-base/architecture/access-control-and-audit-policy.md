# Access Control and Audit Policy

## Roles

- **Patient:** own profile and own appointments only; may book and cancel only under server policy.
- **Psychiatrist:** own profile, approved own availability, and assigned appointments only.
- **Admin:** clinician provisioning and approved availability administration; no default consultation admission or unrestricted patient-data browsing.
- **Support tickets:** are an R1 feature, not a new role. Their reader/writer matrix must be defined
  by R1.1/R1.5 before implementation; ticket access does not grant appointment, payment, or note access.

Roles are created and changed only by protected server processes. Self-assignment, email-based inference, editable metadata claims, browser state, and URL parameters are prohibited. Privileged users require MFA before pilot launch.

## Break-glass

Emergency elevated access is exceptional: declared reason, minimal time limit, named approver, full audit event, automatic expiry, and post-access review. It must not be used as routine support.

## Audit events

Record security login/denial, role/provisioning change, clinician activation/deactivation,
availability/appointment mutation, cancellation, consent change, video-token issue/deny,
export/data request, break-glass, and admin action. When R1 features are implemented, add
guardian-consent acceptance, payment state/reconciliation, and ticket access/state events. Store IDs,
event type, outcome, reason code, timestamp, and correlation ID—never free text, credentials, room
identifiers, card/wallet data, or clinical content.

Audit storage is append-only for application users. Retention, readers, export, and periodic review are owned by operations/DPO.
