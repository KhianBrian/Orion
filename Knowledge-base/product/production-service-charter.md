# Production Service Charter

Amended 27 August 2026 to record the owner decisions in the
[pilot decision register](pilot-decision-register.md).

## Service boundary

Orion's first controlled pilot provides account access, psychiatrist discovery, 45-minute appointment
scheduling, authorised live-consultation admission, session notes written by the psychiatrist and
released to the patient, and account/appointment management.

It is not authorised to add diagnoses, prescriptions, recordings, transcripts, file uploads, chat,
payments, marketing analytics, free-text reasons for care, or any clinical record other than the
session note, without a separate approved decision.

Session notes were added to this boundary on 27 August 2026 by register question 6. They are readable
by the patient only after the psychiatrist releases them, and are never readable by the secretary.

## Launch gate

No real client, psychiatrist, or appointment may be accepted until all are true:

- A product owner, clinical lead, legal entity/PIC, DPO/privacy lead, security owner, and operations owner are named.
- Clinical safety, privacy, consent, retention, clinician-verification, and emergency procedures are approved by their owners.
- A private authenticated video provider is approved; public Jitsi is excluded.
- Authentication, RBAC/RLS, booking, cancellation, video admission, session-note access control, audit, backups, and incident procedures have passed their verification gates.
- Staging and production are separate; production contains no test fixtures or test accounts.
- The active-patient cap and its enforcement mechanism are in place and verified.
- No critical or high security finding remains open, and residual risks have written acceptance.

## Pilot constraints

- The first launch remains a **controlled pilot**. Patient registration is public, but the number of active patients is capped so that operational and clinical load stays reviewable. The cap value, its mechanism, and the approved geography sit with register question 1 and are still to be set.
- Psychiatrist and secretary accounts are invite/provision-only. A psychiatrist passes an approval period before becoming bookable.
- Named support hours and daily operational review apply, which is the reason the cap exists — unbounded registration cannot be reviewed daily.
- Use only the data in the [data dictionary](../governance/data-classification-and-data-dictionary.md) and only for the approved purpose.
- Stop bookings/video issuance immediately when a safety, privacy, or access-control incident is suspected.

## Pre-pilot demo mode

Before the controlled pilot, Orion may use five fixed synthetic accounts: two patients, two
psychiatrists, and one admin. Demo mode has no public registration, no real client/clinician
information, and no production data. It exists to verify the login, RBAC, booking, and appointment flow
before real-user approvals are complete.

Video in demo mode uses Daily, with public Jitsi permitted as a fallback **for the demo only**, in a
clearly labelled internal fake-data mode. This was decided on 27 August 2026 under register question 8
and supersedes this section's previous exclusion of any public Jitsi session. Public Jitsi remains
excluded from the launch gate above and is never a fallback for a real client call. The label must be
unmissable and must not be disableable from the client, because it is the only thing distinguishing a
permitted demo call from a prohibited real one.

Two items remain open: whether the demo account set expands to six to include a secretary, and whether
session notes appear in the demo at all.

## Decisions engineering cannot make

Product decides pilot scope, commercial terms, supported languages, and launch size. Clinical
leadership decides service eligibility, no-show, crisis, referral, and session policy. Legal/DPO
decides lawful basis, notices, retention, vendor terms, cross-border transfers, and registration.
Operations/security decides access owners, recovery objectives, on-call, and risk acceptance.

### Outstanding against this clause

The appointment transitions recorded on 27 August 2026 under register question 5 were decided by the
developer to unblock planning. Two of them fall inside this clause and need ratification by their
proper owner before Phase 4 is built:

- **No-show handling** is assigned to clinical leadership by the paragraph above. The recorded mechanism — the psychiatrist sets it after a grace period, never automatically — plus the grace-period value and the consequences of a no-show all require a clinical ruling.
- **Launch size and the active-patient cap** are assigned to product. The cap's existence is recorded; its value is not.
