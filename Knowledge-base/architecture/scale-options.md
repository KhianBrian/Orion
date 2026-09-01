# Scale Options

## Purpose

Capture technologies and architecture options Orion may consider as the service grows. Each option
should be evaluated against privacy, security, operational ownership, cost, and the approved product
boundary before implementation.

The current entry records Jitsi as a Service (JaaS), Orion's selected D5 synthetic-demo provider,
and Direct WebRTC + TURN, a possible future self-operated video-infrastructure path. Additional
scale options can be added here as separate sections.

## Status

JaaS is selected for the synthetic demo because its free developer allowance supports 25 monthly
active users without a payment card. It does not approve JaaS for real consultations: real-launch
vendor, privacy, clinical, security, and operations approval remains required.

## Option: Jitsi as a Service (JaaS)

### Plain-language summary

JaaS is 8x8's managed, hosted version of Jitsi. Orion does not operate video servers or TURN
infrastructure. Instead, Orion's Edge Function creates a short-lived signed JWT for the booked
patient or assigned psychiatrist; JaaS requires that token before admitting the participant.

This is materially safer than public `meet.jit.si`: a copied room URL alone does not grant access.
The signing private key remains server-side, while the public key is registered with the JaaS
application.

### Orion fit

- **Current D5 demo:** Selected. The free developer allowance covers 25 monthly active users (MAUs),
  which fits the planned 10–20 synthetic users when each normally joins from one device.
- **Scale path:** Managed infrastructure, JWT-controlled room access, participant permissions, and
  no Orion-owned TURN or media-server operations.
- **Real launch:** Requires the normal provider, privacy, data-transfer, clinical, and operational
  approvals. JaaS selection for D5 is not production approval.

### Pricing and plans

Published pricing is MAU-based rather than call-minute-based: standard calls are not charged by
minutes or hours. An MAU is a participant device that joins at least one call with another participant
in a billing month. The same person on a laptop and phone can count as two MAUs.

| Plan | Included MAUs/month | Published monthly price |
| --- | ---: | ---: |
| Developer | 25 | Free |
| Basic | 300 | US$99 / £90 |
| Standard | 1,500 | US$499 / £450 |
| Business | 3,000 | US$999 / £950 |
| Enterprise | 5,000+ | Contact sales |

The published overage rate is US$0.99 per additional MAU. Published add-ons include recordings and
RTMP streaming at US$0.01/minute, PSTN outbound at one MAU plus US$0.03/minute, SIP inbound/outbound
at US$0.06/minute, and transcription at US$0.06/minute. Orion keeps all add-ons disabled unless
separately approved. Recheck prices, terms, data regions, and payment requirements before any paid
commitment because provider pricing can change.

Sources: [JaaS pricing](https://cpaas.8x8.com/en/products/jitsi-jaas-video-sdk/) and
[JaaS FAQ](https://developer.8x8.com/jaas/docs/faq/).

### Security boundary

- The browser requests meeting access from Orion; it never creates the room or signs its own token.
- The Edge Function validates Supabase identity, appointment relationship, state, and join window.
- It signs a short-lived JWT scoped to one JaaS room and one participant identity.
- JaaS verifies the JWT before the participant can join. A copied room URL without a valid JWT fails.
- Keep the private signing key in Supabase secrets, never in `VITE_*`, Git, or browser code.
- Disable recording, transcription, streaming, chat, file transfer, and screen sharing unless their
  separate privacy and clinical reviews are approved.

A participant can still intentionally share their currently valid token or displayed call content.
Short expiry, participant-specific identities, server-side reissue checks, and JaaS removal controls
reduce that risk; no meeting system can make a deliberately authorized participant unable to share
what they can access.

### When to scale

Monitor the JaaS Activity dashboard by MAU, not minutes. Before approaching 25 MAUs, decide whether
to obtain a project-owned billing method and move to a paid plan, or evaluate a self-hosted path.
Use separate development, staging, and production JaaS applications before real launch.

## Option: Direct WebRTC + TURN

### Plain-language summary

Direct WebRTC lets two browsers send live camera and microphone media to one another without Daily,
Google Meet, or another hosted video platform. Orion would still need a small coordination service
to help the browsers find each other and agree on how to connect.

TURN is the fallback relay. When two browsers cannot connect directly because of a firewall, router,
or mobile network, each browser sends its encrypted media to a TURN server, which forwards it to the
other browser.

```text
Patient browser ─── direct encrypted media ─── Psychiatrist browser

If a direct path is unavailable:
Patient browser ─── TURN relay ─── Psychiatrist browser
```

### How a session would work

1. Orion authenticates the participant and verifies that they belong to the appointment.
2. Orion creates a private meeting session and opens a signaling channel for the two browsers.
3. The browsers exchange connection details through signaling. Signaling carries setup data, not
   the camera or microphone stream.
4. STUN helps each browser discover a usable public network path.
5. If a direct path works, WebRTC sends the media between the browsers.
6. If it does not, WebRTC uses short-lived TURN credentials and relays the media through Orion's
   TURN server.
7. Orion expires the session and credentials at the appointment boundary and records only the
   minimum operational audit facts required by policy.

Supabase could provide authentication, appointment authorization, and signaling support. It should
not be used as the media transport. WebRTC and the TURN server handle the media path.

### Required Orion components

- A browser WebRTC client with camera, microphone, device-check, reconnect, and failure handling.
- A signaling channel, potentially using a narrowly scoped Supabase Realtime channel or a small
  server endpoint.
- STUN configuration for public-address discovery.
- A project-owned TURN server, preferably with time-limited credentials and rate limits.
- An Edge Function that checks appointment ownership/assignment before issuing session credentials.
- A session-expiry and revocation mechanism.
- Monitoring for connection success, relay usage, bandwidth, failures, and abuse.

The service-role key, TURN credential secret, and any server-side signing material must remain out
of browser code and out of `VITE_*` variables.

### Advantages

- No Daily, Zoom, or Google Meet account is required for the media layer.
- No video-provider API key or provider billing account is required.
- Orion can keep appointment authorization as the source of truth.
- Room names and participant identity do not need to be exposed as public meeting links.
- The architecture can scale independently from a hosted provider, if Orion is willing to operate
  the infrastructure.

### Costs and tradeoffs

The software can be open source, but the service is not cost-free. TURN consumes bandwidth and needs
reliable hosting. A direct connection reduces relay cost, but real users cannot be assumed to have a
working direct path.

Orion would own browser compatibility, mobile behavior, firewall traversal, reconnection, abuse
prevention, incident response, upgrades, and capacity planning. WebRTC also does not make Orion
healthcare-compliant by itself; governance, vendor or hosting review, privacy controls, and clinical
operations still apply.

### Security boundary

Appointment authorization must happen in Orion before signaling or TURN credentials are issued.
Client-side route guards are not sufficient. Credentials should be short-lived, scoped to one
appointment and participant, and unusable after expiry or revocation.

TURN is a relay, not an authorization system. It must not accept unrestricted relay traffic or
long-lived shared credentials. Apply quotas, abuse controls, logging minimization, and a kill switch.

Recording, transcription, chat, screen sharing, and file transfer remain disabled unless separately
approved and designed.

### When to consider this option

Revisit Direct WebRTC + TURN when one or more of these become true:

- hosted-provider pricing or terms materially limit the product;
- Orion needs tighter control over participant admission or media routing;
- usage volume justifies operating dedicated video infrastructure;
- a project-owned hosting budget and operations owner exist;
- the team can fund browser, mobile, security, load, and outage testing.

Before adoption, prove two-party desktop and mobile calls, restrictive-network behavior through
TURN, reconnection, expiry, copied-credential denial, bandwidth limits, and an operational recovery
exercise using synthetic data.

### Current decision

Do not replace D5 with this option yet. D5 uses JaaS for the synthetic demonstration. Direct WebRTC +
TURN remains a scale-path architecture record for a later provider or infrastructure decision and
must be reviewed alongside the video-provider decision record, privacy governance, threat model, and
Phase 6 operations requirements.
