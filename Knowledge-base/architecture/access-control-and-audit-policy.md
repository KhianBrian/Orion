# Access Control and Audit Policy

## Roles

- **Patient:** own profile and own appointments only; may book and cancel only under server policy.
- **Psychiatrist:** own profile, approved own availability, and assigned appointments only.
- **Admin:** clinician provisioning and approved availability administration; no default consultation admission or unrestricted patient-data browsing.
- **Support:** not created until a separate policy approves a minimum-data support model.

Roles are created and changed only by protected server processes. Self-assignment, email-based inference, editable metadata claims, browser state, and URL parameters are prohibited. Privileged users require MFA before pilot launch.

## Break-glass

Emergency elevated access is exceptional: declared reason, minimal time limit, named approver, full audit event, automatic expiry, and post-access review. It must not be used as routine support.

## Audit events

Record security login/denial, role/provisioning change, clinician activation/deactivation, availability/appointment mutation, cancellation, consent change, video-token issue/deny, export/data request, break-glass, and admin action. Store IDs, event type, outcome, reason code, timestamp, and correlation ID—never free text, credentials, room identifiers, or clinical content.

Audit storage is append-only for application users. Retention, readers, export, and periodic review are owned by operations/DPO.
