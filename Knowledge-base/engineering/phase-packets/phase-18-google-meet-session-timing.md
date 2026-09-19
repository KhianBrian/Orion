# Phase 18 — Google Meet and Server-Authoritative Session Timing

**Packet purpose:** Record the Phase 18 decisions, implementation boundary, and handoff for the
real Google Meet test path and server-authoritative session timing.
**Last updated:** 2026-09-20
**Status:** Implemented — test path; real-user launch blocked
**Recommended next action:** Configure the test Google OAuth environment and run the two-account
manual call check; do not deploy or enable real-user access.

## Authority map

- **Phase plan:** [Google Meet and session timing](../phases/phase-18-google-meet-and-session-timing.md)
- **Product/provider authority:** [Product scope](../../product/product-scope.md),
  [production service charter](../../product/production-service-charter.md), and
  [video provider decision record](../../architecture/video-provider-decision-record.md)
- **Timing/lifecycle authority:** [Appointment lifecycle](../../product/appointment-lifecycle.md)
- **Safety/privacy authority:** [Clinical safety policy](../../product/clinical-safety-and-telepsychiatry-policy.md),
  [privacy governance](../../governance/privacy-governance.md), and
  [data classification](../../governance/data-classification-and-data-dictionary.md)
- **Historical evidence:** [Free-Gmail Google Meet POC](../../audit-trail/2026-09-16-phase-18-google-meet-free-gmail-poc.md)
- **Implementation evidence:** [Phase 18 test-path audit](../../audit-trail/2026-09-20-phase-18-google-meet-test-path-audit.md)
- **Canonical status:** [`phase-status.json`](../phase-status.json)

## Current snapshot

- **Repository/branch/worktree:** `Verified` — implementation branch
  `codex/phase-18-planning-gate` in the isolated Orion worktree. Phase 18 test-path source,
  migration, Edge Functions, UI, and regression-test changes are present.
- **Environment/database:** `Observed` — the repository has synthetic Supabase test infrastructure;
  no Google production project, OAuth client, provider deployment, or live secret was used here.
- **Scope boundary:** `Verified` — this packet prepares the approved Google Meet admission and
  server-authoritative 15/45/15 timing work. It does not approve real users, production deployment,
  provider credentials, payments, eligibility policy, or clinical policy by itself.

## Two implementation lanes

There are two different outcomes being discussed:

1. **Tomorrow's test path:** The video call itself is a real Google Meet call created through the
   Google API. Only the booking/data path is synthetic: a test booking can be marked `booked`
   without payment so the call can be demonstrated. This is test/showcase behavior only and must
   be isolated by environment/configuration.
2. **Later real-user service:** payment must be confirmed before an appointment becomes `booked` and
   before meeting access is issued. Production Google OAuth, privacy, clinical, security, and
   operations gates still apply.

The first lane is authorized for implementation preparation by the owner's instruction in this
conversation. It must not be described as real-user or production readiness.

## Decision register — plain-English questions

These questions decide what we are allowed to build and how it must behave. The proposed answers are
defaults based on the existing Phase 18 plan; they are not approvals. You can answer directly in chat
using `D1: ...`, `D2: ...`, and so on. If a decision belongs to someone else, name that person and
mark it **pending** rather than guessing.

### Provider and launch boundary

#### D1 — Is Google Meet definitely the video provider for Phase 18?

**What this means:** We need to know whether Phase 18 should build a real Google Meet connection,
or whether the provider choice is still open.

**Why it matters:** The provider determines the server integration, OAuth permissions, meeting
controls, outage behavior, testing plan, and data/privacy review. The existing JaaS demo and public
Jitsi rooms cannot be quietly reused as the production path.

**Decision recorded:** Google Meet is the current frontrunner and the chosen provider for this
implementation. JaaS and Jitsi are no longer active options.

**Implementation consequence:** Remove active JaaS/Jitsi code paths, routes, dependencies, provider
functions, flags, and tests. Keep historical audits and decision documents as historical evidence;
do not present them as supported runtime behavior. There is no automatic fallback to another video
provider.

#### D2 — What exactly is allowed for tomorrow's showcase?

**What “the result” means:** It means what the implementation will let people do after the code is
changed—not a claim that the whole product is ready for launch. The choice is between a synthetic
demonstration, a named internal pilot, or real clients and psychiatrists.

**Why it matters:** Tomorrow's meeting needs a working call without accidentally enabling real-user
booking, payment bypass, or production access.

**Decision recorded:** Tomorrow's result is a real two-party Google Meet call using test accounts
and the test Google project. The booking and account data are synthetic/test data. It is not an
internal or real-user pilot.

**Implementation consequence:** Any automatic booking confirmation exists only in the synthetic
showcase environment and is blocked from the later payment-authorized path.

#### D3 — Which Google account creates and owns each meeting?

**What this means:** Decide whether every psychiatrist connects their own Google account, or whether
Orion uses one shared host account for all appointments.

**Why it matters:** The host account controls who can create, moderate, end, and recover a meeting.
It also determines how offboarding, account revocation, audit records, and outages work.

**Decision recorded:** Use the free-account option from the [owner decision brief](../launch-readiness/google-meet-owner-decision-brief.md): each psychiatrist connects their own Gmail account. A
patient joins as a guest and does not connect Google.

**Implementation consequence:** The connected psychiatrist's account creates the meeting. If that
account is disconnected, revoked, or unavailable, that psychiatrist's future meetings cannot be
created until the account is reconnected. Company-managed Workspace accounts remain a future,
stronger account-control option, not tomorrow's setup.

#### D4 — What Google organisation and meeting rules apply?

**What this means:** Identify the Google organisation/domain, Workspace edition or account type,
approved host identity, and the rules for guest entry, waiting rooms, admission, and removal.

**Why it matters:** The free Gmail proof of concept showed that the basic API flow can work, but it
does not prove that the chosen organisation has the same controls or that its settings are suitable
for clinical sessions.

**Decision recorded:** For tomorrow, use the same free Gmail/test arrangement used by the proof of
concept: a test Google Cloud project, a Gmail account listed as an OAuth test user, and guest access
for the patient. Do not put credentials in this packet.

**Implementation consequence:** This arrangement is limited to listed test accounts and must remain
clearly labeled non-production. The future real-user choice between personal Gmail and company
Workspace accounts remains a separate owner decision.

#### D5 — What OAuth setup is authorized?

**What this means:** Google OAuth is the “Allow Orion to use this Google account” step. The test we
already ran proved that one Gmail account could approve Orion, and that Orion could then create a
Google Meet space. It used a Google Cloud test project, the Meet API, a Desktop OAuth client, an
external app in Testing mode, one Gmail test user, and the sensitive
`meetings.space.created` permission. No service account was used.

For the Orion website, the Desktop client cannot simply be placed in browser code. The website needs
a Web application OAuth client with an approved callback address. The server receives and protects
the long-lived refresh permission; the browser receives neither the client secret nor the refresh
token.

**Why it matters:** OAuth is how Orion receives permission to create meetings for a psychiatrist.
The permission already tested is sensitive, so the client type, redirect addresses, consent screen,
verification, token storage, and revocation behavior must be deliberate.

**Recommended answer for tomorrow:** Use the same test project and test Gmail account, add a Web
application OAuth client for the Orion callback, keep the app in Testing mode, and request only
`meetings.space.created`. This is the web version of the flow already proven by the local test tool;
it is not production OAuth approval.

**Still needed from you:** Confirm that tomorrow may use the same test project with a Web OAuth client
and a listed Gmail test user. Never paste client secrets here.

### Predecessor contracts and timing

#### D6 — Must Phase 17 payment evidence be complete first?

**What this means:** Decide whether the real Phase 18 admission path may treat an appointment as
booked now, or whether it must wait until Phase 17 proves the payment-authorized `booked` state.

**Why it matters:** Meeting access must not be granted for a payment-pending, cancelled, invalid, or
otherwise ineligible appointment. If Phase 18 implements against the wrong appointment state, the
meeting boundary will have to be rebuilt later.

**Decision recorded:** There are two rules. Later, payment must be received and confirmed before the
appointment becomes `booked` and before meeting access is issued. For tomorrow's test path,
booking may automatically become `booked` so the call can be demonstrated.

**Implementation consequence:** The auto-confirm behavior must be a server-side, non-production
configuration with a fail-closed production default. It must not be a browser flag that a user can
change, and it must not be described as the Phase 17 payment flow.

#### D7 — Confirm the 15/45/15 timing rule.

**What this means:** Confirm when joining opens, when it closes, how long the clinical session is,
and what the following note-writing period means.

**Why it matters:** The database—not a user's computer clock—must decide whether access is allowed.
These boundaries also drive the UI, provider end behavior, no-show handling, and note permissions.

**Decision recorded:** Confirmed. Join opens 15 minutes before `starts_at`; the scheduled session is
45 minutes; admission closes at `ends_at`; the following 15 minutes are only a note-writing/display
window and do not extend the call.

#### D8 — What should happen for late joins, patient no-shows, and early endings?

**What this means:** Decide the user-visible guidance and business handling when someone is late,
the patient never enters, or the psychiatrist ends before the scheduled end.

**Why it matters:** The video screen must not silently mark an appointment completed, no-show, or
cancelled. Those outcomes belong to the approved appointment workflow and clinical policy.

**What the existing docs already decided:** The [appointment lifecycle](../../product/appointment-lifecycle.md#no-show)
says no-show is set by the psychiatrist, never automatically, after a clinical grace period. The
same document says the scheduled call ends at `ends_at`, the following 15 minutes are for notes, and
the system does not automatically complete, lock, or release a note. It also says the clinical lead
still owns the exact late grace period and early-end/late-note edges.

**Decision recorded for tomorrow:** Do not add automatic no-show, completion, note lock, or note
release behavior to the video showcase. A late participant may still join while the server window is
open. The call screen reports the session state; Phase 4 handles any later appointment outcome.

**Still open for the later real-user flow:** the clinical grace-period value and the consequences of
a no-show. These are not needed to demonstrate tomorrow's call, but must be resolved before real use.

#### D9 — Can the psychiatrist end the meeting for everyone, and can it be restarted?

**What this means:** Decide whether a psychiatrist may disconnect both participants, whether Orion
must ask for confirmation, and what happens if the action was accidental.

**Why it matters:** The POC showed that ending a Google conference can prevent immediate re-entry.
The implementation therefore needs an explicit recovery policy rather than assuming a closed link
can simply be reused.

**Plan created:**

1. For tomorrow's first showcase, do not expose an “end for everyone” control unless it is needed for
   the demonstration. A participant leaving normally ends only their own browser session.
2. For the real Google Meet flow, only the assigned psychiatrist may request “End session for
   everyone.” Show a confirmation explaining that both people will be disconnected.
3. A protected server operation checks the appointment, psychiatrist relationship, current time, and
   Google authorization before calling Google's conference-end operation. It records a privacy-safe
   audit event.
4. If the session was ended accidentally while the appointment is still inside its join window,
   “Restart session” creates a new Google Meet space for the same appointment, invalidates the old
   Orion entry point, and sends both people through normal admission again.
5. After `ends_at`, restart is unavailable. The screen shows that the session ended and directs the
   user to the approved support/reschedule process.

This plan follows the tested POC behavior that an ended conference may not accept immediate re-entry.

### Privacy, security, and operations

#### D10 — What Google information may Orion store, and for how long?

**What this means:** Decide how psychiatrist authorization tokens, Google meeting identifiers,
provider events, connection records, and audit data are stored, accessed, and deleted.

**Why it matters:** A meeting link or refresh token can grant access or reveal sensitive operational
information. Google, Supabase, and Orion may also process location, account, and connection metadata.

**Suggested approach:**

- Keep each psychiatrist's Google refresh permission only on the server, encrypted/protected at rest,
  and accessible only to the Google integration function.
- Keep the provider account identity and the minimum provider resource identifier needed to create,
  retrieve, end, or replace a meeting in a protected server table.
- Do not put refresh tokens, client secrets, meeting links, or raw Google responses in browser code,
  logs, screenshots, analytics, or audit text.
- Revoke and delete the refresh permission when a psychiatrist disconnects or is offboarded.
- Retain the provider resource/audit record only for the approved appointment-support and legal
  retention period, then delete it according to the approved policy.

For tomorrow, use synthetic test data and the existing ignored environment only. The DPO/legal owner
still needs to approve the exact retention period and Google data-flow terms before real users.

#### D11 — What happens when Google is unavailable or authorization fails?

**What this means:** Decide what users see when Google is down, a token is revoked, a host account is
missing, the API denies a request, or meeting creation fails.

**Why it matters:** The unsafe response is to expose a reusable link, bypass appointment checks, or
silently switch to an unapproved provider. Users and support staff need a predictable failure state.

**Decision recorded:** Do not design a planned fallback because Google is expected to be available.
The implementation must still have a safe error path for an unexpected API, account, network, or
Google failure: preserve the appointment, issue no meeting access, and show a generic unavailable
message. It must not bypass authorization or silently switch to JaaS, Jitsi, WebRTC, or another
provider.

#### D12 — Who controls the meeting admission kill switch?

**What this means:** Name the person or role allowed to stop new meeting access during a security,
privacy, provider, or clinical incident, and define how access is restored.

**Why it matters:** A kill switch must be usable quickly and independently of a code deployment. It
must also avoid creating confusion about whether existing meetings are ended or merely new joins are
blocked.

**Decision recorded:** The admin role controls the Phase 18 meeting-admission kill switch through a
protected, audited action. It blocks new meeting admission and provider calls; it does not grant an
admin permission to join a consultation or browse patient content. Restoration remains an explicit
admin/owner action after review.

#### D13 — What do we audit and what telemetry do we retain?

**What this means:** Choose the minimum operational record needed to investigate access decisions,
provider failures, account revocation, meeting replacement, early ending, and kill-switch actions.

**Why it matters:** We need enough evidence to protect users and operate the service, but not raw
meeting links, tokens, clinical content, or detailed provider payloads that create unnecessary risk.

**Suggested audit set:** record the appointment ID, actor ID, event type, outcome, safe reason code,
server timestamp, and correlation ID for:

- meeting admission allowed or denied;
- psychiatrist Google account connected, disconnected, revoked, or unavailable;
- meeting created, replaced, or ended for everyone;
- Google/provider failure;
- admin kill-switch enabled or disabled.

Do not record tokens, client secrets, meeting URLs, raw Google payloads, video/audio data, or clinical
notes. Keep operational metrics coarse and short-lived unless an approved retention policy says more
is needed. This is the recommended minimum for tomorrow's synthetic path; security/DPO can later
approve the production retention and reader list.

#### D14 — Who authorizes implementation?

**What this means:** Identify the people who can say that the above decisions are settled and that
engineering may begin changing source code and migrations.

**Why it matters:** A technical POC or a passing test is not permission to create real meetings or
use real client data. This authorization is the boundary between planning and implementation.

**Plain-English meaning:** This is not asking for a second permission after you have told me to
implement. It records what your instruction authorizes so nobody later mistakes tomorrow's synthetic
showcase for permission to launch real clinical sessions.

**Decision recorded:** Your instruction authorizes implementation of the real Google Meet test path
for tomorrow, within these limits: test accounts, test Google project, auto-confirmed test bookings,
no payment bypass in production, no real client data, no JaaS/Jitsi runtime, and no deployment or
real-user activation without a separate explicit instruction.

## Implementation plan after authorization

1. **Retire old video code:** remove active JaaS/Jitsi pages, routes, dependencies, functions, flags,
   and tests while retaining historical audits and documents.
2. **Build the test lane:** use the tested Google project with a Web OAuth client, test Gmail
   account, server-held authorization, and a server-side test auto-book confirmation.
3. **Admission authority:** keep the assigned patient/psychiatrist and server-time window checks;
   use `booked` for the showcase and preserve the later payment-confirmed contract.
4. **Google boundary:** create/retrieve one meeting under the connected psychiatrist account and
   return only the minimum entry information needed by the authorized browser.
5. **Session timing/UI:** implement join-open/join-close, unavailable/session-ended states, and the
   confirmed 15/45/15 display without automatic outcome or note transitions.
6. **Admin and audit controls:** add the protected admin kill switch and the minimum privacy-safe
   event set described above.
7. **Verification:** run unit, RLS/admission, OAuth/provider-boundary, redaction, desktop/mobile,
   and regression checks using synthetic data.
8. **Handoff:** update this packet and the dated Phase 18 audit. Do not claim production
   readiness or deploy without a separate instruction.

## Evidence and blockers

- **Verified:** the isolated free-Gmail POC created a Meet space, admitted a guest, supported
  two-party audio/video, and ended an active conference; it is feasibility evidence only.
- **Decided:** Google Meet only; real Google Meet using test accounts tomorrow; free Gmail per
  psychiatrist; test-project configuration; test auto-confirmed booking; confirmed 15/45/15 timing; no
  automatic no-show/completion/note transitions; admin-controlled kill switch; and user-authorized
  test implementation.
- **Observed:** the POC used a Desktop OAuth client. The Orion website still needs a Web OAuth client
  and callback configuration; no production Google project or Phase 16/17 as-built evidence is
  recorded in this worktree.
- **Deferred:** production payment-authorized booking, production OAuth verification, exact clinical
  no-show grace/consequences, provider data-retention approval, and real-user testing.
- **Blocked for real users:** Phase 17 payment state, Google production setup/verification,
  privacy/legal/security, clinical edge decisions, and operations approval remain required. The
  test path is separately authorized and must remain non-production.

## Handoff

- **Changed files:** Google Meet migration and Edge Functions, shared OAuth helper, Google Meet
  connection/session UI, route and appointment updates, JaaS/Jitsi runtime removal, environment
  example, public-navigation test, package lock, and this packet. No secrets were added.
- **Commands and results:** `npm run lint`, `npm run test:unit`, `npm run build`,
  `npm run check:env-examples`, `supabase db lint --local`, `npm run phase-status:sync`,
  `npm run phase-status:check`, and `git diff --check` passed. Public E2E had 48 passes and 10
  environment-dependent failures because local auth configuration is absent; no Google OAuth E2E
  was attempted without test credentials.
- **Remote actions:** none. No Google, Supabase, Vercel, provider, deployment, or credential action
  was performed.
- **Untouched scope:** all Phase 18.5 implementation, all live environments, and all user-owned
  changes remain untouched.
