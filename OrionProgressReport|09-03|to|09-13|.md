# Orion — Progress Report

**Reporting period:** 3–13 September 2026
**Status:** Major synthetic and non-production implementation work completed; real-user launch and production clinical use are not yet approved

---

## Important boundary

All work in this report was completed using synthetic accounts and synthetic data in a non-production
environment. It does not authorise real patient information, real appointments, real payments, real
clinical consultations, or production video sessions.

The work completed during this period improves the application and prepares foundations for a possible
future launch. The JaaS video demonstration remains limited to the five synthetic accounts. Google
Meet is only a proposed provider for future real use and has not been approved or implemented.

---

## Executive summary

- Orion is now a much more complete and usable application on both desktop and mobile screens.
- Patients can create accounts, confirm their email, recover their password, and safely return to the
  page they were using after a refresh.
- The appointment experience now covers booking, cancellation, rescheduling, appointment outcomes,
  session notes, and clearer appointment history.
- Psychiatrists can manage their available days and times. Patients can choose a psychiatrist, date,
  and available time within the two-week booking period.
- Patients and psychiatrists can send administrative or software questions through Support, and an
  admin can reply through the application.
- The system now includes stronger protection for patient, psychiatrist, appointment, note, and
  support information.
- A future launch plan was documented for adult and minor eligibility, guardian consent, PayMaya,
  Google Meet, support operations, and the 15/45/15 session timing.
- Testing passed across the main application, database, sign-in, appointment, availability, support,
  accessibility, desktop, and mobile flows.
- This is still a controlled demonstration and development environment, not a live healthcare service.

---

## Delivery timeline

| Delivery | Date | What was completed |
| --- | --- | --- |
| **Phase 7 — Frontend state foundation** |  3 Sep | Made sign-in, refresh, sign-out, and page-to-page behavior more consistent. |
| **Phase 8 — UI system and application shell** | 4 Sep | Rebuilt the shared public and signed-in layout, navigation, footer, dialogs, buttons, and login screen. |
| **Phase 9 — Appointment experience** | 5 Sep | Improved appointment lists, booking confirmation, cancellation, history, and meeting-window actions. |
| **R1.0/R1.1 — Future launch planning** |    6 Sep | Documented the owners' updated direction and the work required before a real-user launch. |
| **Phase 1 — Secure baseline** |   7 Sep | Added project safety checks and preparation for future access, deployment, and recovery processes. |
| **Phase 2 — Data and access foundation** |   8 Sep | Added protected session notes, appointment outcomes, rescheduling information, and clearer role boundaries. |
| **Phase 3 — Identity** |   9 Sep | Added patient registration, email confirmation, password recovery, and protected psychiatrist setup. |
| **Phase 11 — Frontend acceptance** |   10 Sep | Completed the automated review of the frontend across public, signed-in, desktop, and mobile journeys. |
| **Phase 4 — Appointment workflow** |   11 Sep | Completed the full appointment workflow from booking through cancellation, outcomes, notes, and rescheduling. |
| **Phase 14 — Psychiatrist availability** | 12 Sep | Added psychiatrist-managed schedules and patient time selection. |
| **Phase 15 — Support and future data foundation** | 13 Sep | Added the first in-app support flow and prepared protected foundations for future eligibility and payment work. |

---

## Phase-by-phase progress

### Phase 7 — Frontend state foundation

The application now behaves more reliably when people sign in, refresh the page, move between pages,
sign out, or switch accounts.

- A signed-in user can refresh the page without unexpectedly losing their place.
- Signing out clears private appointment information from the current browser session.
- Booking and cancellation now update the visible appointment information correctly.
- Meeting availability updates at the right time without storing private meeting information in the
  browser.

This work made the existing synthetic demo more stable and prepared it for the improved screens that
followed.

### Phase 8 — UI system and application shell

The main Orion layout and login experience were rebuilt so the application is easier to understand and
use.

- Public pages now share a consistent header, navigation, and footer.
- Signed-in users see the correct account links for their role and can sign out easily.
- The login page has clearer labels, larger fields, better error messages, and an accessible
  show/hide password option.
- Common buttons, messages, and confirmation windows now look and behave consistently.
- The layout works across desktop and mobile screen sizes.
- The existing Orion visual direction was retained.
- Existing public links such as Blog, Contact, Services, and Portfolio remain visible while their
  final product direction is decided.

The older static prototype remains in the repository as a separate historical file set. It was not
removed because its future treatment still needs to be decided.

### Phase 9 — Appointment experience

Appointment information is now easier for patients and psychiatrists to read and act on.

- Appointments are separated into upcoming and past appointments.
- Booking ends with a clear confirmation showing the psychiatrist, date, time, and next action.
- Cancellation uses a clear confirmation window and prevents accidental repeated submissions.
- If cancellation is no longer allowed, the application explains the 24-hour rule in plain language.
- A past appointment no longer shows a cancellation option.
- The appointment screen now shows the correct counterpart's name for the signed-in user.
- The option to join a call appears only during the approved meeting period.

### R1.0 and R1.1 — Future launch planning

The owners' updated direction was organised into a separate launch-readiness plan. This gives the team
a clear order for future work without turning future ideas into active product features.

The documented direction includes:

- Adults aged 18 or older may self-register.
- People under 18 require a parent or guardian consent process and cannot book simply because a form
  was submitted.
- Real sessions are intended to use PayMaya payment confirmation.
- Google Meet is the proposed provider for real sessions because the JaaS allowance is limited.
- Patients and psychiatrists may use in-app support for administrative or software questions.
- The intended session timing is 15 minutes of early joining, a 45-minute consultation, and a further
  15-minute note-writing period for the psychiatrist.
- No separate support account is planned; operational support remains an admin responsibility.

The future sequence is planned as eligibility and consent, payment, real-session video and timing,
support operations, and final launch verification. These steps remain subject to the required owner,
clinical, privacy, legal, vendor, and operations approvals.

### Phase 1 — Secure baseline

The first part of the project safety foundation was completed.

- Added checks that help identify unsafe information in environment-example files.
- Added templates for recording who has access to the project and for documenting a recovery exercise.
- Updated project dependencies where safe updates were available.
- Documented that hosted automated deployment will be added after feature work and before any real
  release decision.

This phase is not fully closed. Access records, deployment, monitoring, recovery testing, and named
operational ownership are still required before production readiness can be considered.

### Phase 2 — Data and access foundation

The application now has a stronger foundation for handling different kinds of information and keeping
each role within its intended responsibilities.

- Psychiatrists can be made active or inactive, which controls whether patients can find and book them.
- Appointment records now support outcomes, no-show information, and rescheduling history.
- Psychiatrists can write session notes, release them to patients, and make corrections without
  erasing the earlier record.
- Patients can see only the latest note that has been released to them.
- Admins can review activity information but cannot read the content of session notes.
- Patients, psychiatrists, admins, and signed-out visitors have clearly separated access.

The three planned consent agreements are still not captured in the application. Their implementation
remains deferred until the wording and related decisions are approved.

### Phase 3 — Identity

The sign-in experience now supports the main account actions needed for the synthetic application.

- Patients can register an account.
- Users can confirm their email by code or link.
- Users can request password recovery and set a new password.
- New patient accounts receive the patient role automatically.
- Psychiatrists can be set up only through the protected admin process.
- Users who have not confirmed their email cannot book an appointment.
- The email process was tested locally using Mailpit, so test messages stayed inside the development
  environment.

The hosted email service has not yet been customised for a broader real-user rollout. That work remains
deferred.

### Phase 11 — Frontend acceptance

The frontend passed its automated acceptance review across the main public and signed-in journeys.

- Refreshing a page keeps the signed-in user in the expected place.
- The meeting page has a focused layout without the standard application header and footer.
- The initial application load was kept within the agreed size target.
- Public images and less frequently used areas load more efficiently.
- Desktop and mobile checks cover navigation, accessibility, sign-in, booking, cancellation, history,
  meeting access, and error states.

The remaining manual owner walkthrough and the two-person synthetic video check are demonstration
activities, not missing automated implementation work.

### Phase 4 — Appointment workflow

The appointment process now covers the full agreed scheduling workflow.

- Patients can book an available appointment.
- Patients can cancel more than 24 hours before the appointment.
- Psychiatrists can cancel their own appointments more than 48 hours ahead and must give a reason.
- Admins can cancel appointments for operational reasons and must give a reason.
- Psychiatrists can record completed, cancelled, or no-show outcomes.
- Psychiatrists can write and correct session notes through the protected workflow.
- Patients and psychiatrists can request a new appointment time.
- An authorised reviewer can approve or reject a rescheduling request.
- The application safely handles repeated requests and two people trying to book the same time.
- Admins can temporarily stop new booking through a separate booking control.

Existing appointments are not silently moved or deleted. The same appointment workflow will be used by
later payment and real-video phases.

### Phase 14 — Psychiatrist-managed availability

Psychiatrists can now manage when patients may book them.

- Psychiatrists manage their regular weekday availability.
- They can add one-time available or unavailable dates.
- Patients select a psychiatrist first, then a date, then an available time.
- Available times are shown in Manila time and are offered in 15-minute increments.
- Each appointment remains a 45-minute clinical session.
- Patients can book within the next two weeks.
- Availability outside the normal working hours requires admin approval.
- A schedule change is stopped if it would conflict with an existing appointment.
- Existing appointments are preserved when future availability changes.

This work uses the existing appointment process and does not create a second way to book.

### Phase 15 — Support and future data foundation

The first in-app support flow is now available for the synthetic application.

- Patients and psychiatrists can submit an administrative or software-support request.
- The Support page warns users not to include emergency information, diagnoses, treatment details,
  session notes, payment credentials, or attachments.
- Requesters can see only their own submitted requests.
- Admins can view the support queue and reply.
- Requesters can see replies and a `New reply` indicator.
- Repeated submissions and replies are handled safely.

The phase also prepared protected storage for future eligibility, guardian-consent, and payment
records. Those structures do not activate minor access or payment collection. Closing and reopening
tickets, escalation, attachments, email notifications, emergency handling, and clinical support remain
outside this completed slice.

---

## Verification summary

The completed work was checked with automated tests, browser checks, local testing, and the linked
synthetic non-production project.

| Area checked | Result | What it confirmed |
| --- | --- | --- |
| Application quality | Passed | The application builds successfully and the changed work is clean. |
| Core behavior | Passed | Appointment timing, sign-in state, page refresh, and browser data handling work as intended. |
| Public and signed-in screens | Passed | Navigation, sign-in, booking, cancellation, appointment history, and error states work on desktop and mobile. |
| Access protection | Passed | Patients, psychiatrists, admins, and signed-out visitors receive only the information and actions intended for them. |
| Appointment workflow | Passed | Booking, cancellation, outcomes, notes, rescheduling, schedule changes, repeated requests, and conflicts were checked. |
| Support workflow | Passed | Patient and psychiatrist requests, admin replies, ownership, and unread replies were checked. |
| Email flow | Passed locally | Registration confirmation and recovery messages were tested without sending test mail externally. |
| Accessibility and responsive layout | Passed | The main screens work across desktop and mobile sizes and include the required accessibility checks. |
| Non-production deployment | Passed | The latest approved changes were applied to the linked synthetic `Orion-demo` project. |

These results confirm that the implemented work functions within the synthetic, non-production scope.
They do not confirm that Orion is ready for real patients or real clinical activity.

---

## Current implementation status

| Area | Status | What remains |
| --- | --- | --- |
| Five-account synthetic demo | Completed ✅ | Complete the owner walkthrough when scheduled. |
| Frontend improvements | Completed and verified ✅ | Review the final public-page and footer direction. |
| Identity and account access | Completed for synthetic use ✅ | Prepare hosted email infrastructure before broader account use. |
| Data and access foundation | Completed for synthetic use ✅ | Add approved consent capture later. |
| Appointment workflow | Completed and verified ✅ | Keep it as the single scheduling foundation. |
| Psychiatrist availability | Completed and verified ✅ | Continue using the protected schedule and booking rules. |
| Support foundation | Completed and verified ✅ | Define the full support and incident operation before launch. |
| Secure production baseline | Partially completed | Finish access, deployment, monitoring, recovery, and operational ownership. |
| Minor eligibility and guardian consent | Planned, not started | Need Template for Consent for under 18 users            |
| PayMaya payment booking | Planned, not started | Need Paymaya API Obtain provider information and approve payment policies. |
| Google Meet and real timing | Planned, not started | Approve the provider, Workspace setup, vendor terms, and clinical timing. |
| Final launch verification | Planned, not started | Complete all earlier work, approvals, and the owner go/no-go decision. |

Phase 10 meeting-specific work was superseded by the updated launch direction. Reusable meeting
improvements can be carried into the future Google Meet phase. Phase 12 MFA remains deferred and is
not required for the current launch sequence.

---

## Not included or approved for real use

The current implementation does **not** include or authorise:

- Real patient or psychiatrist data, real identities, real appointments, real payments, or real
  clinical consultations.
- A live minor or guardian-consent process.
- PayMaya checkout, payment confirmation, refunds, or chargebacks.
- Google Meet setup or real-session admission.
- Final privacy, terms, telepsychiatry, parent/guardian, payment, support, emergency, or referral
  wording.
- Final retention, deletion, export, or data-request processes for real information.
- Complete support hours, escalation rules, incident communications, or support email.
- Automatic no-show decisions, automatic appointment completion, or automatic note release.
- Production release approval.

---

## Recommended next steps

1. Complete the five-account owner walkthrough and record the demonstration outcome.
3. Complete the remaining secure production-baseline work, including access records, deployment,
   monitoring, recovery testing, and operational ownership.
4. Continue future implementation only in the documented order: eligibility, payment, real-session
   video and timing, support operations, and final launch verification.
