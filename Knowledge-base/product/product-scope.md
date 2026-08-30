# Product Scope — Controlled Market Pilot

Amended 27 August 2026 to record the owner decisions in the
[pilot decision register](pilot-decision-register.md). Two changes widen the original scope: session
notes are now in scope, and patient registration is public without an active-patient cap.

## Outcome

Orion is a browser-based psychiatry booking site. A patient creates an account, books a 45-minute
session with a psychiatrist, sees the booking after refresh, joins the appointment video call, can
cancel only more than 24 hours before its start, and can read the psychiatrist's session note once the
psychiatrist releases it. A psychiatrist sees only their own upcoming sessions, and writes and releases
a note after each one.

## Users

- **Patient:** ages 30–60 as the design target; needs large, plain-language, low-choice screens. Adults only at eligibility.
- **Psychiatrist:** needs a simple upcoming-session list, a clear join action, and a note surface for authoring and releasing.
- **Secretary:** handles bookings and client questions. Sees appointments and contact details only, and never session notes.
- **Admin:** a controlled role for verified psychiatrist provisioning and approved availability.

## Pilot acceptance flow

1. A patient signs up and logs in with a real email and password.
2. The patient chooses a psychiatrist and an open 45-minute slot.
3. The booking persists after refresh.
4. The patient joins that appointment's unique video room from My appointments.
5. Cancellation fails inside 24 hours and succeeds outside it.
6. The psychiatrist signs in and sees only their assigned sessions.
7. After the session the psychiatrist writes a note and releases it; the patient can then read it, and the secretary cannot.

## Hard rules

- Every appointment lasts exactly 45 minutes.
- Only the server/database may decide whether a cancellation is allowed.
- A patient may cancel only when the start time is more than 24 hours away.
- A psychiatrist may cancel in the system only when the start time is more than 48 hours away; later cancellation is executed by a coordinator on their behalf with a recorded reason.
- One availability slot may have at most one active appointment.
- Each appointment receives a distinct meeting room.
- A session note is readable by the patient only after the psychiatrist releases it, and is never readable by the secretary.
- Registration is public with no active-patient cap; the pilot remains controlled through monitoring and launch governance.

Full appointment transitions are in the [appointment lifecycle](appointment-lifecycle.md).

## In scope

- Public home, real sign-in, public patient sign-up, password reset.
- Patient booking, My appointments, My account, and reading released session notes.
- Psychiatrist upcoming sessions, My account, and authoring and releasing session notes.
- Secretary appointment and contact management, excluding all note access.
- Minimal admin provisioning and seed availability.
- Supabase-backed data and an approved private, token-gated browser video provider.

## Out of scope

- Payments, billing, insurance/HMO, prescriptions, diagnoses, clinical records other than the session note, SMS/email reminders, native apps, a full hospital admin panel, and a custom video server. MFA is required for privileged roles before pilot launch.
- Session recordings, transcripts, file uploads, chat, and free-text reasons for care.
- Blog, portfolio, testimonials, career counseling, unrelated medical specialties, dashboard charts, duplicate booking flows, and the legacy `Orion/` static prototype.

## Product decisions still required

- Confirm Supabase as the project backend.
- Set the approved geography and operating-review cadence for the uncapped pilot. *Register Q1.*
- Approve a private video provider for real sessions after privacy, clinical, legal/DPO, security, and operations review. *Register Q8, deferred by the owners; Daily is approved for the demo only.*
- Approve retention, support, and launch-owner decisions before real-user use. *Register Q2, Q9, Q10, Q11.*

## Decisions recorded on 27 August 2026

- Clinician onboarding is invite/provision-only with an approval period before a psychiatrist becomes bookable. *Register Q1 and Q3; the approver and criteria are still outstanding.*
- `Asia/Manila` is the standard display timezone, per the [appointment lifecycle](appointment-lifecycle.md).
- Clinical safety, eligibility, consent, and emergency decisions are recorded against register Q4, Q6, and Q7.
