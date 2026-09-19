# Phase 18.5 — Direct WebRTC + TURN Planning Review

**Status:** Implemented and verified — synthetic/non-production vertical slice.

This phase covers the implemented control-plane, dedicated signaling boundary, TURN credential
boundary, synthetic UI, and verification work described below. It remains disabled for real users,
production infrastructure, and production data.

**Prepared:** 18 September 2026

**As-built verification:** 19 September 2026

**Purpose:** Record the reviewable alternative to the current Phase 18 Google Meet direction for a
strictly one-to-one psychiatrist-to-patient video session, its implemented synthetic boundary, and
the remaining owner, clinical, privacy/DPO, security, and operations decisions for real-user release.

The current Phase 18 real-user provider authority remains unresolved. Direct WebRTC + TURN is the
authorized synthetic/non-production implementation direction because it fits Orion’s strict
one-to-one scope. This phase does not approve real patients, real payments, real clinical sessions,
or production infrastructure.

## Review basis and authority

This proposal was prepared from:

1. [Scale options](../../architecture/scale-options.md), including its Direct WebRTC + TURN option.
2. [Video provider decision record](../../architecture/video-provider-decision-record.md), which
   currently identifies Google Meet as proposed rather than approved.
3. [Phase 18 — Google Meet and session timing](phase-18-google-meet-and-session-timing.md).
4. [Phase 16 — Identity and minor eligibility](phase-16-identity-and-minor-eligibility.md).
5. [Phase 17 — PayMaya payment-authorised booking](phase-17-paymaya-payment-authorised-booking.md).
6. [Threat model and security architecture](../../architecture/threat-model-and-security-architecture.md)
   and [database/RBAC architecture](../../architecture/database-and-rbac.md).
7. [Clinical safety and telepsychiatry policy](../../product/clinical-safety-and-telepsychiatry-policy.md).
8. [Privacy governance](../../governance/privacy-governance.md) and the
   [data classification and data dictionary](../../governance/data-classification-and-data-dictionary.md).
9. [Operations and incident response](../../operations/operations-and-incident-response.md) and
   [environment, release, and secrets](../../operations/environment-release-and-secrets.md).

The infrastructure work packages and acceptance criteria are included in this document below.

The repository records Phase 16 as waiting for owner decisions after its meeting, Phase 17 as waiting
on the PayMaya API, and Phase 18 as blocked. Those production predecessor gaps do not block this
synthetic slice: it uses the existing synthetic `booked` appointment relationship as its control-plane
fixture and does not claim the future eligibility or payment contracts are complete.

## Proposed outcome for discussion

Adopt Direct WebRTC + TURN as the real-session media architecture, subject to recorded approval and
the gates in this document.

The proposed boundary is deliberately narrow:

- one patient and one assigned psychiatrist per appointment;
- browser-to-browser WebRTC media where possible;
- project-owned TURN only as a connectivity relay;
- a small authorised signaling service carrying setup messages only;
- no SFU, group-call, media-server, recording, transcription, chat, file, or screen-sharing feature;
- Existing video prototype code remains outside the real-session architecture and must not be used
  as a production fallback;
- no unapproved provider or public-room fallback.

This architecture provides admission control and encrypted media transport, but it cannot prevent a
deliberately malicious participant from recording or continuing an already-established peer
connection after ignoring client controls. That limitation must be accepted explicitly or this
architecture is not suitable for the approved service boundary.

## High-level model

```text
Patient browser ───── encrypted WebRTC media ───── Psychiatrist browser
       │                                               │
       └── signaling: SDP/ICE only ── Orion gateway ───┘

If a direct path cannot be established:

Patient browser ───── encrypted WebRTC media ───── TURN relay ───── Psychiatrist browser
```

Signaling and TURN are separate control and transport services. Neither becomes a group-call or
media-server architecture.

## Proposed authorization contract

The browser calls one protected `video-session-access` operation. The server, not the browser,
derives and verifies:

- authenticated Supabase identity;
- server-held application role;
- patient ownership or assigned psychiatrist relationship;
- Phase 16 eligibility/admission predicate;
- Phase 17 provider-verified `booked` state;
- appointment status and immutable appointment relationship;
- database-authoritative window `[starts_at - 15 minutes, ends_at)`;
- video admission kill switch and session revocation state.

Admins, unrelated patients, unrelated psychiatrists, cancelled appointments, payment-pending
appointments, expired appointments, and out-of-window requests are denied even if they know an
appointment ID or a signaling/session identifier.

The operation creates or retrieves exactly one opaque video session for an appointment. It returns
only a short-lived signaling join token, signaling endpoint, TURN credentials, and server-derived
expiry boundaries. It never returns a reusable public room URL, provider secret, service-role key,
TURN shared secret, or client-supplied relationship data.

## Proposed one-to-one session model

The eventual implementation should use a forward-only migration with a minimal current-state record:

- one `video_sessions` row per appointment, enforced by a unique appointment key;
- an explicit `direct_webrtc` mode/provider value;
- opaque session identifier and session-generation/revocation state;
- created, revoked, and expiry facts only where the approved data dictionary requires them;
- no persisted SDP, ICE candidates, media metadata, or room name containing personal meaning.

The signaling gateway must enforce the participant invariant:

- one patient slot and one psychiatrist slot;
- no admin or third participant;
- no client-supplied sender identity;
- one active connection lease per participant/session, with a bounded reconnect grace period;
- bounded and schema-checked signaling messages;
- no signaling history or media payload persistence.

The exact table names, grants, lease storage, and audit fields remain implementation-plan decisions
after Phase 16/17 re-grounding and the infrastructure review.

## Signaling decision to review

### Proposed choice: dedicated narrow WebSocket signaling gateway

The gateway would authenticate a short-lived Orion-signed join token, authorize the session, hold
ephemeral participant connections, forward only SDP/ICE setup messages, enforce the two-participant
limit, and close connections on expiry or revocation.

This is preferred for a strict one-to-one contract because it can enforce connection leases,
message-size limits, heartbeat, replay handling, and immediate session revocation more directly than
a client-only channel.

### Controlled showcase alternative: Supabase Realtime signaling

For the controlled Open Relay showcase, Supabase Realtime is the planned signaling option. It must
prove all of the following in the target configuration before the showcase is presented:

- private channel authorization by the exact appointment participants;
- rejection of a third participant and duplicate active connections;
- bounded SDP/ICE payloads and abuse controls;
- reliable expiry, revocation, heartbeat, and reconnect behavior;
- no persistence or leakage of signaling payloads;
- acceptable regional processing, retention, outage, and support terms.

The showcase implementation uses one signaling path only. If those controls cannot be demonstrated,
the showcase is stopped rather than adding an unreviewed fallback.

## Controlled Open Relay showcase plan

This is a **non-production, synthetic-data showcase plan** for Phase 18.5. It is not a real-user
launch decision and does not override the later provider, privacy, clinical, security, or operations
gates.

### Planned service split

- **Supabase:** Orion login, appointment checks, short-lived access, and private connection
  messages between the two browsers.
- **Open Relay Project:** the backup route for audio/video only when the browsers cannot connect
  directly. Its advertised free allowance is 20 GB per month.
- **Vercel:** the existing free frontend hosting plan; it does not host the backup video route.

The protected `video-session-access` operation must obtain temporary Open Relay connection details
on the server and return only the short-lived browser configuration. The Open Relay API key must not
be placed in browser code, `VITE_*` variables, Git, test fixtures, logs, or screenshots.

### Evidence plan and limits

1. Run 50 short synthetic two-person calls without the backup route across genuinely varied
   home, mobile, office, browser, and device combinations. A connection passes only when both
   people receive audio and video within the approved time; record connection time and failure
   class without personal data.
2. Treat any no-backup failure as evidence that the fallback is required. Treat 50 successes as a
   useful sample, not proof that all future networks will connect directly.
3. Enable Open Relay in the controlled environment, repeat the network matrix, and record direct
   versus fallback use. Use browser connection statistics and the provider dashboard for aggregate
   evidence only.
4. Reserve 5 GB of the advertised 20 GB allowance as a safety margin. Pause the showcase path at
   15 GB, investigate the usage, and do not rely on the free allowance after it is exhausted.
5. Disable Direct WebRTC admission if Open Relay is unavailable, the allowance is exhausted, or
   security/privacy review rejects the service. There is no automatic provider fallback.

At an illustrative normal video rate, 20 GB covers roughly 22 one-hour calls if every call needs
the fallback, or roughly 110 total one-hour calls if 20% need it. This is an estimate, not a
capacity commitment: quality and provider billing rules affect the actual figure.

Open Relay's public terms say the service has no warranty and may go down without notice. It must
not be represented as a permanent or real-user clinical service. The provider's handling of fallback
traffic and metadata also requires privacy/DPO review before any real-user proposal.

## TURN and hosting proposal

Use project-owned `coturn` infrastructure, separate from the frontend, database, and signaling
service. The target design is:

- one isolated staging relay and a production relay pool sized by tested concurrent sessions;
- UDP plus TLS/TCP fallback for restrictive networks;
- HMAC REST credentials with short expiry, scoped to the participant/session, and never static
  browser credentials;
- relay quotas, allocation limits, abuse controls, health checks, and an independent TURN kill switch;
- minimal logs with IP, allocation, and credential data retention controlled by approved policy;
- an approved hosting region and processor/subprocessor review before provisioning;
- separate staging and production credentials, networks, and dashboards.

The signaling gateway may require a shared ephemeral lease store when horizontally scaled. Any Redis,
database, or hosted coordination service is a new processor/data flow and requires the same review;
it must not be introduced merely as an unrecorded implementation convenience.

## Timing, expiry, and revocation proposal

- Admission opens at `starts_at - 15 minutes`.
- Admission, new signaling joins, reconnects, and new TURN credentials close at `ends_at`.
- Signaling join tokens expire no later than the appointment end and should be much shorter-lived.
- TURN credentials expire no later than the appointment end and should normally be rotated during a
  long connection window.
- The signaling gateway requires periodic heartbeat and closes an expired or revoked lease.
- The browser closes the peer connection on `session_expired` or `session_revoked`.
- A kill switch stops new admission and credential issuance and instructs the gateway to close
  active signaling connections.
- Scheduled expiry does not automatically complete an appointment, set no-show, lock a note, or
  release a note.

The hard-expiry limitation for a hostile browser must be recorded in the threat model and accepted
by the security and clinical owners. Direct WebRTC cannot remotely destroy media already flowing
between two cooperating or compromised endpoints.

## Reconnect and negotiation proposal

- Use deterministic perfect-negotiation roles to avoid offer collisions.
- Reuse the same authorised session; never create a second appointment room on reconnect.
- Re-authorize before reconnecting and reissue only short-lived credentials.
- Use bounded exponential backoff with jitter and a maximum retry period.
- Trigger ICE restart after network change, mobile handoff, or failed connectivity checks.
- Preserve local UI state without persisting sensitive signaling or media data.
- Surface distinct states for permission failure, direct-path failure, TURN failure, remote leave,
  session expiry, revocation, and service outage.

## Browser and mobile behavior for review

Proposed initial support is the latest two versions of Chrome, Edge, Firefox, and Safari on desktop,
plus Safari on iOS and Chrome on Android. The implementation plan must verify the actual support
matrix before release.

The proposed client behavior is:

- camera and microphone preflight initiated by an explicit user action;
- clear permission-denied and device-unavailable recovery guidance;
- no silent camera/microphone capture before the meeting screen;
- no background-call guarantee on mobile; suspension enters a reconnect state;
- no screen sharing, recording, chat, file transfer, or transcript controls;
- camera-off/audio-only entry remains a clinical decision, not an engineering default.

The clinical lead must decide whether both camera and microphone are required for session admission,
whether temporary camera-off is acceptable, and what patient-facing guidance applies when a device
cannot provide video.

## Privacy, clinical, and security boundaries

The media stream is not stored by Orion, but the system still processes personal data through Auth,
appointment authorization, signaling metadata, TURN relay metadata, IP/network information, audit,
metrics, and incident evidence.

Before real use, the DPO/legal owner must approve:

- legal entity, DPO, lawful basis, notice and telepsychiatry-consent wording;
- Supabase, signaling-host, TURN-host, and coordination-service terms;
- data regions, subprocessors, cross-border transfers, breach support, deletion/return, and retention;
- whether connection and relay telemetry is personal data and how long it is retained;
- data-subject access, correction, deletion, legal-hold, and incident processes.

The clinical owner must approve:

- the 15/45/15 timing contract;
- early ending and late joining;
- camera/audio requirements;
- no-show and clinical escalation behavior;
- emergency/referral wording and first-session consent presentation.

Recording, transcription, chat, attachments, and screen sharing remain prohibited without a new
approved decision.

## Privacy-safe observability

The implementation should measure only what is necessary to operate the service:

- authorization success/denial by coarse reason code;
- signaling connection and heartbeat health;
- time to connected;
- direct versus relay transport type;
- reconnect and ICE-restart counts;
- coarse browser/platform class;
- aggregate failure, latency, and bandwidth metrics;
- TURN capacity, allocation, and error rates.

Do not log or persist note content, media, SDP, ICE candidates, raw IP addresses, device labels,
tokens, credentials, or full user-agent strings. Audit events should contain safe IDs, event codes,
outcomes, reason codes, correlation IDs, and database timestamps only.

## Operational ownership and incident controls

The following owners must be named before implementation is approved:

| Area | Required owner and decision |
| --- | --- |
| Clinical safety | Clinical lead owns timing, camera/audio policy, no-show, emergency/referral, and clinical escalation. |
| Privacy | DPO/privacy owner approves data flows, vendor terms, notices, retention, rights, and breach handling. |
| Security | Security owner controls secrets, abuse prevention, access disablement, and evidence preservation. |
| Video operations | Named operator owns signaling/TURN health, capacity, upgrades, and incident response. |
| Support | Operations owner defines support hours and approved outage communications. |
| Stop authority | Owners record who may disable video admission, TURN issuance, or the entire service. |
| Residual risk | Company owners approve or reject the remaining Direct WebRTC risks. |

Required exercises include TURN outage, signaling outage, kill-switch activation, unauthorized
connection attempt, credential replay, duplicate participant attempt, restore/recovery, secret
rotation, and clinical escalation. All exercises use synthetic data and avoid retaining sensitive
artifacts.

## Rollout and rollback proposal

1. Keep the feature disabled by default behind an independent Direct WebRTC admission flag.
2. Validate the full synthetic two-party path in local/staging environments.
3. Validate direct connectivity, restrictive-network TURN relay, mobile handoff, reconnect, expiry,
   revocation, duplicate connection denial, and outage behavior.
4. Complete security, privacy, clinical, operations, and hosting reviews.
5. Conduct a controlled non-production release and document fresh evidence.
6. Obtain the company-owner go/no-go decision before any real-user activation.

Rollback disables admission, signaling joins, and TURN credential issuance. It does not delete
appointments, consent, notes, audit history, session history, or incident evidence. There is no
fallback to an unapproved provider. The prototype video path remains outside the production
architecture and is not a fallback.

## Future full implementation plan

Production hardening and real-user activation still require a separate approval package built from
current as-built evidence. That package must include:

The executable 30-user launch profile and evidence matrix are maintained in the [Phase 18.5
production-readiness track](phase-18.5-production-readiness.md).

- approved decisions and resolved policy gaps;
- exact Phase 16/17 predecessor contracts and deployed-state inspection;
- final schema, RLS, grants, functions, secrets, and migration sequence;
- signaling gateway protocol, lease storage, capacity, and deployment design;
- coturn configuration, credential derivation, quotas, health checks, and rotation;
- frontend route, preflight, connection, reconnect, expiry, and error-state design;
- feature flags, kill switches, rollout, rollback, and operational runbooks;
- a complete QA protocol and exit criteria;
- a dated as-built audit after implementation.

The synthetic implementation branch, migrations, functions, tests, and local boundary configuration
are implemented under this phase status. Production infrastructure provisioning, remote deployment,
real-user activation, and production configuration remain prohibited until the real-user gate closes.

## QA protocol retained for real-user hardening

The later implementation plan must define and pass, at minimum:

### Authorization and data boundaries

- patient and assigned psychiatrist allow paths;
- unrelated patient/psychiatrist denial;
- admin denial;
- pending-payment, non-booked, cancelled, no-show, expired, and out-of-window denial;
- forged appointment/session/participant identifiers;
- copied or replayed signaling and TURN credentials;
- duplicate participant and third-participant denial;
- RLS, protected-function, grant, audit, and redaction checks.

### Timing and lifecycle

- just before, exactly at, and just after early-open;
- just before, exactly at, and just after `ends_at`;
- credential expiry and session revocation;
- kill-switch activation;
- no automatic outcome, no-show, note lock, or note release;
- retry and concurrent session creation behavior.

### WebRTC and network behavior

- two-browser desktop call with direct connectivity;
- restrictive-network call using TURN;
- UDP failure with TLS/TCP fallback;
- camera/microphone permission and device failures;
- ICE restart and reconnect after network change;
- offer collision and renegotiation handling;
- mobile foreground/background and network handoff;
- signaling, TURN, and browser failure states;
- bandwidth, allocation, and connection-capacity limits.

### Repository verification

The applicable repository checks must pass with fresh evidence, including lint, build, unit tests,
affected database/RLS tests, migration lint, public and authenticated Playwright tests, desktop and
mobile two-party checks, security/secret scanning, and the required outage/recovery exercises. A
passing UI demo alone is not sufficient evidence.

## Open decisions for discussion

| Decision | Current state | Required authority |
| --- | --- | --- |
| Supersede Google Meet with Direct WebRTC + TURN | Not approved | Company owners, security, operations, DPO/legal |
| Dedicated signaling gateway versus Supabase Realtime | Proposed gateway; not validated | Security, operations, hosting owner |
| Hosting provider, regions, HA, and budget | Not selected | Operations, DPO/legal, company owners |
| TURN logging and telemetry retention | Q11-related policy gap | DPO/legal and operations |
| Camera/audio admission and audio-only behavior | Not decided | Clinical lead |
| Exact early-end, no-show, and clinical escalation rules | Open in current authorities | Clinical lead and company owners |
| Signaling lease/reconnect semantics | Proposed, not approved | Security and operations |
| Kill-switch owner and patient-facing outage copy | Not named | Operations, clinical, company owners |
| Approved notices and telepsychiatry consent | Not finalized | DPO/legal and clinical lead |
| Phase 16/17 as-built evidence | Phase 16 waiting for owner decisions; Phase 17 waiting on PayMaya API | Engineering predecessor gates |

## Gate

### Synthetic implementation gate — satisfied

The synthetic/non-production implementation gate is satisfied. The implemented scope is limited to
current synthetic booked appointments, local or staging-only control-plane records, a dedicated
signaling boundary, short-lived TURN credential issuance, and disabled-by-default admission.

### Real-user activation gate — still required

Real-user activation remains prohibited until:

- the open decisions are resolved and recorded in the authoritative Knowledge Base documents;
- the provider decision record explicitly records the approved direction;
- Phase 16 and Phase 17 predecessor gates are closed with dated as-built evidence;
- named clinical, privacy/DPO, security, hosting, operations, and owner approvals exist;
- the production implementation plan and QA protocol are written and approved; and
- a separate real-user go/no-go is recorded.

### 30-user launch profile — not yet launch-cleared

The requested initial launch profile is 30 synthetic users, exercised in two waves of 10
simultaneous two-party calls (20 peak active participants). The local signaling load harness now
passes that profile across 30 unique identities, including large SDP/answer frames and heartbeats.
That evidence proves gateway behavior only; it does not replace staging relay, browser/device,
outage, failover, observability, approval, or production-capacity evidence. The complete executable
matrix is maintained in the [Phase 18.5 production-readiness track](phase-18.5-production-readiness.md).

## Consolidated infrastructure plan

This section is the implementation detail for the six infrastructure concerns. It authorizes only
synthetic/non-production code and local or staging verification; it does not authorize production
provisioning or real-user activation.

### 1. Dedicated signaling service

Use a separate horizontally scalable WebSocket gateway, not the database and not a long-lived
Supabase database connection. The gateway will accept only short-lived Orion-signed join tokens,
verify the appointment participant, allow one patient and one psychiatrist, forward only bounded SDP
and ICE setup messages, enforce heartbeats/rate limits, and close connections on expiry, revocation,
or the kill switch. Signaling data remains in memory and is not persisted.

### 2. TURN relay servers

Deploy project-owned coturn separately from the frontend, Supabase database, and signaling service.
Use isolated staging and production pools, UDP normally, TLS/TCP fallback, controlled relay ports,
bandwidth/allocation limits, health checks, and approved minimal logs. Start with multiple production
relay nodes before real-user activation and size them using measured concurrent sessions and relay
bandwidth.

### 3. Short-lived TURN credentials

The protected video-session-access operation verifies identity, role, relationship, eligibility,
payment, appointment state, and the time window before issuing credentials. Credentials use the
approved short-lived TURN REST/HMAC pattern, are session/participant scoped where supported, expire
no later than `ends_at`, and are never stored in URLs, browser storage, logs, analytics, or database
records. Reconnects receive new credentials only after reauthorization.

### 4. Connection and reconnect handling

Use an explicit client/gateway state machine: authorizing, connecting, connected, reconnecting,
expired, revoked, failed, or remote-left. Reauthorize before reconnecting, use bounded exponential
backoff with jitter, trigger ICE restart after network changes, preserve only non-sensitive UI state,
and reuse the same appointment session. Never create a second session during reconnect.

### 5. Capacity monitoring and testing

Measure active sessions, signaling connections, direct-versus-relay ratio, TURN allocations,
relay bandwidth, time to connect, reconnects, ICE restarts, failed joins, and gateway/TURN latency.
Do not collect media, SDP, ICE candidates, raw IP addresses, tokens, credentials, or full user-agent
strings.

The capacity exercise must cover:

- 100 concurrent sessions as the initial baseline;
- 250 concurrent sessions as the growth target;
- 1,000 concurrent sessions as an architecture-ceiling exercise;
- 20%, 50%, and 100% TURN-relayed traffic;
- two-times reconnect storms;
- signaling gateway restart;
- regional TURN-node loss.

The target must pass with approved headroom, not merely avoid immediate failure.

### 6. TURN failover

Before connection, admission selects a healthy relay from the approved pool. During setup, the
client may try another approved relay candidate. If an active relay fails, the client reauthorizes,
obtains fresh credentials, and performs a new ICE connection while retaining the same appointment
and opaque session. Failover must never extend the appointment window or use a public/unapproved
relay.

### 7. Outage controls and kill switches

Provide independently auditable server-side controls for all admission, signaling joins/reconnects,
TURN credential issuance, individual relay regions, and the entire real-session feature. When
disabled, new joins are denied, new credentials are not issued, active gateway sessions are closed
where possible, and appointments, payment, consent, notes, and audit history remain unchanged.
There is no automatic provider fallback.

### Rollout order

1. Approve Direct WebRTC + TURN as the provider direction.
2. Name clinical, privacy, security, video-operations, support, and stop-authority owners.
3. Approve regions, vendors, data flows, retention, and subprocessors.
4. Build a synthetic local/staging signaling and TURN environment.
5. Implement the server admission and credential contract.
6. Implement the signaling and reconnect state machines.
7. Run two-party, restrictive-network, mobile-handoff, outage, failover, and concurrency tests.
8. Complete security, privacy, clinical, hosting, and operations review.
9. Release disabled by default in non-production.
10. Obtain a separate company-owner go/no-go decision before real-user activation.

### Infrastructure exit criteria

Phase 18.5 synthetic implementation is ready because the repository records the signaling protocol,
TURN topology, credential contract, fail-closed admission, failover behavior, kill-switch boundary,
observability redaction, secret-rotation boundary, rollback procedure, and explicit implementation
authorization. Capacity headroom, production ownership, vendor terms, and real-user go/no-go remain
release gates rather than prerequisites for this synthetic slice.
