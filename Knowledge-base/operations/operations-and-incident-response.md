# Operations and Incident Response

## Operational ownership

Name owners and contact paths for support, clinical escalation, privacy/DPO, security, production deployment, video provider, database, and executive risk acceptance. Define support hours and approved patient-facing outage language.

## Incident flow

1. Detect, record time/evidence, and classify the issue.
2. Contain: disable video-token issuance, bookings, accounts, or affected credentials as appropriate.
3. Escalate simultaneously to the relevant security, DPO, clinical, and operations owner.
4. Preserve privacy-safe evidence; do not paste sensitive data into tickets or chat.
5. Recover using the approved runbook; communicate only through approved channels.
6. Review cause, impact, corrective action, and any legal/privacy notification decision.

## Required exercises before pilot

- Database restore.
- Unauthorised access attempt and account/secret revocation.
- Video-provider outage and booking/video kill switch.
- Clinical crisis/escalation handoff owned by the clinical team.
- Privacy/security incident tabletop.

Monitor availability, errors, booking conflicts, auth/video admission denials, function cost/latency, backup results, and unusual privileged access. Logs must remain privacy-safe.
