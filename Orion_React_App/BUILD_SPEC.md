# Orion Psychiatrist Booking — Legacy Prototype Build Spec

> **Production policy override — 2026-08-26:** Orion is now planned for a controlled real-market pilot with real clients and psychiatrists. This document records the original prototype intent; where it refers to a showcase, public Jitsi, demo-only accounts/data, or reduced operational safeguards, the [Knowledge-base](../Knowledge-base/README.md) is authoritative. In particular, do not accept real users until the [production service charter](../Knowledge-base/product/production-service-charter.md), [delivery plan](../Knowledge-base/engineering/delivery-plan.md), privacy/clinical approvals, secure environments, server-authoritative RBAC, and approved private video controls are satisfied.

**Target date:** End of September  
**Purpose:** One shared finish line for the showcase demo  
**Audience for this doc:** Client, project owner, and anyone building the product

---

## 1. What we are building

We are finishing an online website where patients can schedule appointments with psychiatrists and join those sessions by video call in the browser.

This is not a career counseling site. It is not a general hospital booking app with cardiologists and pediatricians. Every screen, label, and menu should speak to one product: book a psychiatry session, join the call, manage your appointment.

The goal for September is a working demo with a real database and backend. It does not need to scale to thousands of users yet. It needs to work end to end in front of a reviewer.

---

## 2. What “done” means

A reviewer can do all of the following without help:

1. Create a patient account and log in.
2. See a list of psychiatrists and open time slots.
3. Book a 45 minute session.
4. Refresh the page and still see that booking.
5. Join the video call from “My appointments.”
6. Try to cancel less than 24 hours before the session and be told they cannot.
7. Cancel more than 24 hours before and see the appointment marked cancelled.
8. Log in as a psychiatrist and see only their own upcoming sessions.

If any of those steps fail, the product is not done for the showcase.

---

## 3. Who uses it

**Patients (ages 30 to 60)**  
They need large text, simple words, and few choices. After login they should only see: Book a session, My appointments, My account.

**Psychiatrists**  
They need a clear list of upcoming sessions and a big button to join the call. They do not need marketing pages or blog tools.

**Admin (optional, small scope)**  
Only if needed to add psychiatrist profiles and seed availability for the demo. No full hospital admin panel for September.

---

## 4. Screens we will build

### Public (before login)

**Simple home**  
One short explanation of what the site does and a clear path to log in or sign up. No portfolio, testimonials, or blog on the critical path.

**Login**  
Real email and password. No fake role guessing from the email text.

**Sign up**  
Patient can create an account. Psychiatrist accounts are created by admin or invite for the demo.

### Patient (after login)

**Book a session**  
One page only. Pick a psychiatrist, pick a date, pick an open 45 minute slot, confirm. Show the rules on this page: sessions last 45 minutes. You can cancel until 24 hours before your appointment.

**My appointments**  
List of upcoming and past bookings. Each row shows date, time, psychiatrist name, status, and actions: Join call (when it is time) and Cancel (only if the 24 hour rule allows).

**My account**  
Name, email, phone, password change. Keep the form short.

### Psychiatrist (after login)

**My calendar / upcoming sessions**  
List of bookings for this psychiatrist only. Join call when the session window is open.

**My account**  
Basic profile. No need for a long settings form for the demo.

### Not in scope for September

Blog, portfolio, testimonials, submit a blog, dashboard charts, MFA, career counseling copy, duplicate booking pages (Doctor Availability vs Patient Appointment as two separate products), and the old static HTML folder in `Orion/`.

---

## 5. The two hard rules

These rules must be enforced on the server, not only shown as text on the screen. A user must not be able to cheat them from the browser.

### Rule 1: 45 minute sessions

Every appointment is exactly 45 minutes long.  
When the patient or psychiatrist joins the call, the app shows a countdown or timer for 45 minutes.  
When time is up, the app shows that the session has ended. The meeting room does not need to forcibly disconnect everyone for the demo, but the product must clearly treat the session as finished.

### Rule 2: 24 hour cancellation

A patient may cancel only if the appointment start time is more than 24 hours away.  
If they try to cancel inside that window, the app blocks it and explains in plain language: “You can only cancel more than 24 hours before your appointment.”  
Cancelled appointments stay in the list with status “Cancelled” so the history is visible.

---

## 6. Database (what we store)

Plain language model. Exact column names can be decided during build.

### Users

Everyone who can log in. Fields: id, email, password hash (handled by auth provider), full name, phone, role (patient, psychiatrist, or admin), created date.

### Psychiatrists

Linked to a user account. Fields: id, user id, display name, short bio, photo url (optional for demo), active yes or no.

### Availability slots

When a psychiatrist is open for booking. Fields: id, psychiatrist id, start time, end time (always 45 minutes from start), status (open or booked).  
Only “open” slots can be booked. Once booked, the slot is tied to one appointment.

### Appointments

The actual booking. Fields: id, patient user id, psychiatrist id, slot id, start time, end time, status (booked, cancelled, completed), meeting room id (unique string for Jitsi), created at, cancelled at (if applicable).

### Meeting rooms

Each appointment gets one unique room name, for example `orion-session-<appointment-id>`.  
Patient and psychiatrist both use the same room for that booking.  
Rooms are not shared across different appointments.

---

## 7. Technology choices

### Keep from the current project

The React app, Vite, and the general layout of booking cards, confirm modal, appointments list, and the idea of opening video in an overlay or full page.

### Add for the real product

**Backend and database: Supabase (recommended)**  
Supabase gives us user accounts, a Postgres database, and server-side logic for rules like cancellation and double booking.  
Appointments, time slots, and the 24 hour rule fit naturally in SQL.  
We can scale later without rewriting the whole product.

**Why not assume Firebase**  
The current codebase does not include Firebase. Nothing in this repo is wired to Firestore or Firebase Auth. If another Firebase project exists elsewhere, we can revisit, but the default plan is Supabase unless a Firebase project is already paid for and ready this week.

**Video: Jitsi**  
Keep browser-based video. No app install for patients.  
Use one unique Jitsi room per appointment. Public `meet.jit.si` is acceptable for the September showcase.  
Add a 45 minute timer in our app. A private Jitsi server is out of scope for now.

### What we remove or freeze

Unused service files until a real API exists. Duplicate Axios clients should become one. Mock arrays in React components should become API calls. Marketing navigation on logged-in pages should go away.

---

## 8. Readability (ages 30 to 60)

Body text at least 18px on booking and appointment screens.  
Buttons at least 18px. Labels at least 16px.  
High contrast: dark text on white cards. No gray text on blurred backgrounds for important information.  
Plain button labels: “Book session,” “Join call,” “Cancel appointment.”  
Spell out the 45 minute and 24 hour rules on the booking page and in the confirmation step.  
After login, three main destinations only for patients. Psychiatrists see an even simpler menu.

---

## 9. Five week path

### Week 1 — Lock the product

Pick Supabase (or confirm Firebase if a project is ready).  
Create the database tables.  
Rewrite copy so everything says psychiatry booking, not career counseling or hospital specialties.  
Write down the demo script: who logs in, which doctor, which slot, what the reviewer should see.

**Done when:** Written spec agreed. Empty Supabase project exists. Old confusing pages are marked cut or hidden.

### Week 2 — Real accounts and booking

Real sign up and login.  
Patient can book an open slot. Booking is saved in the database.  
My appointments loads from the database after refresh.

**Done when:** A test patient can book and see the appointment tomorrow after closing the browser.

### Week 3 — Rules and video

24 hour cancel enforced on the server. UI shows clear message when cancel is blocked.  
Unique Jitsi room per appointment.  
45 minute timer visible during the call.

**Done when:** Late cancel fails. Two browsers can join the same booking’s room. Timer runs for 45 minutes.

### Week 4 — Psychiatrist side and cleanup

Psychiatrist login sees only their sessions.  
Remove or hide blog, portfolio, duplicate booking pages, and marketing clutter from the logged-in app.  
Readability pass on font sizes and contrast.

**Done when:** Doctor and patient each have a clear, different home screen. Text is comfortable for older users.

### Week 5 — Demo ready

Seed two psychiatrists and a week of sample slots.  
Test the full flow on desktop and one phone size.  
Fix empty states (“No appointments yet”) and error messages.  
Rehearse the demo script twice.

**Done when:** You can walk a reviewer through book, join, cancel too late, and cancel in time without explaining hidden steps.

---

## 10. Out of scope (after September)

Payments and billing.  
Insurance or HMO integration.  
Prescriptions or medical records.  
SMS or email reminders (nice later, not required for first demo).  
Custom video server or HIPAA-grade telehealth compliance.  
Full admin dashboard for a hospital.  
Blog, content marketing, and portfolio sections.  
Native mobile apps.  
The legacy `Orion/` HTML prototype as a maintained product.

---

## 11. What we keep vs throw away from the handover

**Keep**  
React app structure, booking card layout, confirm booking modal pattern, appointments list layout, Jitsi iframe approach, Redux for session if useful, basic settings form idea.

**Throw away or freeze**  
Hardcoded doctor and counselor arrays. Alert-only booking confirmation. Fake login that assigns roles from email keywords. Shared public Jitsi URLs for every user. Career counseling and cardiologist copy. Second booking page that duplicates the first under a different name. CLIENT_PRESENTATION.md claims about MFA and live API until those are actually built.

---

## 12. Success checklist for the showcase

Use this list on demo day.

1. Patient account exists and logs in with a real password.
2. At least two psychiatrists appear with real open slots.
3. Booking saves and survives a page refresh.
4. Appointment shows correct date, time, and psychiatrist name.
5. Join call opens the correct unique room for that booking only.
6. Timer or clear messaging shows 45 minute session length.
7. Cancel works when more than 24 hours remain.
8. Cancel is blocked with a clear message when less than 24 hours remain.
9. Psychiatrist sees the same booking on their screen.
10. Site text is large enough and simple enough for a non-technical adult to use without help.

---

## 13. Open decisions (answer before Week 2)

1. Will psychiatrist accounts be created only by admin for the demo, or self-signup with approval?
2. Is Supabase approved, or must we use an existing Firebase project?
3. What timezone are appointments stored in (Philippines local time recommended)?
4. Who provides the list of real psychiatrist names and photos for the seed data?
5. Is public Jitsi acceptable for the showcase, or is a branded Jitsi domain required?

---

*This document is the single source of truth for the September showcase. Features not listed here are not part of “done” unless everyone agrees in writing to add them and move the date.*
