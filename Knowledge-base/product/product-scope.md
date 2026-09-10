# Product Scope — Controlled Market Pilot

Amended 8 September 2026 to record the current owner direction in the
[pilot decision register](pilot-decision-register.md). The active scope includes session notes,
payment-authorised booking, a gated minor-consent pathway, in-app support tickets, and a coming-soon
blog surface. This does not approve real-user processing before the register's launch gates close.

## Outcome

Orion is a browser-based psychiatry booking site. A patient creates an account, selects a 45-minute
session with a psychiatrist, completes the required PayMaya payment flow, and receives a confirmed
appointment only after Orion verifies payment server-side. The patient can join 15 minutes early, sees
the call end at the scheduled session end, and can read the psychiatrist's session note once the
psychiatrist manually releases it. A psychiatrist sees only their own upcoming sessions and has a
15-minute post-session note window.

## Users

- **Patient:** ages 30–60 as the design target; needs large, plain-language, low-choice screens. A patient aged 18 or over self-registers. A minor requires a parent/guardian-consent pathway and cannot book until its clinical and legal/DPO-approved acceptance conditions are met.
- **Psychiatrist:** needs a simple upcoming-session list, a clear join action, and a note surface for authoring and releasing.
- **Admin:** a controlled role for verified psychiatrist provisioning and approved availability.

## Pilot acceptance flow

1. A patient signs up and logs in with a real email and password.
2. The patient chooses a psychiatrist and an open 45-minute slot; Orion creates a payment-pending appointment and PayMaya checkout server-side.
3. PayMaya redirects the patient to checkout; Orion confirms the outcome through a provider-verified result, not the browser return alone.
4. The paid appointment persists after refresh and the patient joins its Google Meet session from My appointments.
5. Cancellation fails inside 24 hours and succeeds outside it; refund treatment is applied only once approved policy exists.
6. The psychiatrist signs in and sees only their assigned sessions.
7. The patient may join 15 minutes before the appointment; the call ends after 45 minutes; the psychiatrist has a further 15 minutes to write a note and manually releases it when ready. Admin cannot read it by default.

## Hard rules

- Every appointment lasts exactly 45 minutes.
- Only the server/database may decide whether a cancellation is allowed.
- A patient may cancel only when the start time is more than 24 hours away.
- A psychiatrist may cancel in the system only when the start time is more than 48 hours away; later cancellation is executed by a coordinator on their behalf with a recorded reason.
- One availability slot may have at most one active appointment.
- A payment-pending appointment is not a confirmed appointment and never grants meeting admission. Only a server-verified payment may confirm it.
- Each confirmed appointment receives a distinct Google Meet meeting space; the production provider is still subject to vendor and configuration approval.
- A session note is readable by the patient only after the psychiatrist releases it, and is not readable by admin by default.
- A patient may enter the call window 15 minutes early; the scheduled consultation remains exactly 45 minutes; note release is never automatic.
- Registration is public with no active-patient cap; the pilot remains controlled through monitoring and launch governance.

Full appointment transitions are in the [appointment lifecycle](appointment-lifecycle.md).

## In scope

- Public home, real sign-in, public patient sign-up, password reset.
- Adult sign-up and a gated minor/guardian-consent submission pathway; neither permits real use until approved legal and clinical conditions are met.
- Payment-authorised patient booking, PayMaya checkout/return status, My appointments, My account, and reading released session notes.
- Psychiatrist upcoming sessions, My account, and authoring and releasing session notes.
- In-app support tickets for patients and a least-privilege administrative queue; no support email or notification channel yet.
- Minimal admin provisioning, payment/ticket operational visibility, and seed availability.
- Supabase-backed data and Google Meet as the proposed private browser-video direction, pending approval.
- A non-interactive blog coming-soon surface; no blog CMS, submissions, testimonials, or marketing claims.

## Out of scope

- Insurance/HMO, prescriptions, diagnoses, clinical records other than the session note, SMS/email reminders, support-email notifications, native apps, a full hospital admin panel, and a custom video server. MFA is required for privileged roles before pilot launch.
- Session recordings, transcripts, file uploads, chat, and free-text reasons for care.
- Blog CMS/submissions, portfolio, testimonials, career counseling, unrelated medical specialties, dashboard charts, duplicate booking flows, and the legacy `Orion/` static prototype.

## Product decisions still required

- Confirm Supabase as the project backend.
- Set the approved geography and operating-review cadence for the uncapped pilot. *Register Q1.*
- Approve Google Meet for real sessions after Google Workspace configuration, privacy, clinical, legal/DPO, security, and operations review. *Register Q8/Q9; JaaS remains demo-only.*
- Approve guardian-consent, payment/refund, support, retention, and launch-owner decisions before real-user use. *Register Q2, Q4, Q9, Q10, Q11 and the 8 September amendment.*

## Decisions recorded on 27 August 2026

- Clinician onboarding is invite/provision-only with an approval period before a psychiatrist becomes bookable. *Register Q1 and Q3; the approver and criteria are still outstanding.*
- `Asia/Manila` is the standard display timezone, per the [appointment lifecycle](appointment-lifecycle.md).
- Clinical safety, eligibility, consent, and emergency decisions are recorded against register Q4, Q6, and Q7.
