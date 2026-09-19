# Google Meet and Direct WebRTC Decision Brief

**Date:** 2026-09-16 (Asia/Manila)

Partners/owners have not yet selected Orion's video provider. This document compares the two Google
Meet account options with the implemented Direct WebRTC + TURN alternative, including the operating
cost and implementation responsibility of each option.

## One-time Orion setup

The developer completes the Google Cloud and OAuth setup once for Orion. Psychiatrists do not create
Google Cloud projects or configure Google APIs themselves. Each psychiatrist only connects their
own Google account to Orion once and approves the requested access. Patients do not need to connect
a Google account to join a session.

## What the small test showed

We tested a free personal Gmail account from start to finish. The test showed that:

- Orion could connect to the Gmail account and create a new Google Meet link.
- The psychiatrist could join as host.
- A patient could join as a guest without signing into Google.
- The host could admit the guest.
- Video, microphone, leaving, and rejoining worked.
- The host could end the meeting for everyone.
- Orion could also end the meeting automatically, and both people were disconnected.

**Test result:web successful.** Free Gmail can technically support the basic Orion meeting flow.

One limitation was found: after a meeting is ended for everyone, the old meeting cannot be
immediately reused in the tested flow. If a psychiatrist ends the call by accident, Orion should
offer a way to create a new meeting link while the appointment is still active.

## Option A — Use free Gmail accounts

### How it works

Each psychiatrist connects their own free Gmail account to Orion. When a patient books an
appointment, Orion asks Google to create a meeting for that psychiatrist. The psychiatrist joins
as host, and the patient joins through Orion as a guest. The patient does not need to create a
Google account.

Orion controls when the Join button appears. The psychiatrist receives a warning 10 minutes before
the 45-minute session ends. At the scheduled end, Orion ends the Google Meet call automatically.
If the psychiatrist ends the call accidentally, Orion can create a new meeting link while the
appointment is still active.

### How Orion would implement it

- The psychiatrist connects their Gmail account once.
- Orion keeps the connection securely on the server; it is never placed in the browser.
- Orion creates one meeting for each confirmed appointment.
- Orion controls who may join and when they may join.
- Orion records that a meeting was created, ended, or replaced, but does not record the meeting
  conversation.

### Pros

- No monthly Google Workspace payment.
- The small test already passed.
- Patients do not need a Google account.
- Simple for psychiatrists who already use Gmail.

### Cons

- Each psychiatrist owns the account, not the company.
- If a psychiatrist loses access, changes settings, or disconnects Orion, their meetings may stop
  working.
- It is harder for the company to manage accounts, remove access, and recover from incidents.
- Account settings may differ between psychiatrists.
- It is not the strongest long-term choice for handling clinical sessions.

### Cost

- No Google Workspace license is required.
- Google currently provides ordinary use of the meeting service without an additional API charge.
- Google limits usage, and its pricing or limits may change.

## Option B — Use paid Google Workspace accounts

### How it works

The company gives each psychiatrist a company-controlled Google Workspace account. Orion connects
to that account in the same way as Option A. Google creates the meeting, the psychiatrist hosts it,
and the patient joins as a guest without needing a paid Google account.

The meeting timing, guest admission, automatic ending, and accidental-end recovery work the same way
as Option A.

### How Orion would implement it

- The company creates and manages the psychiatrists' Google accounts.
- Each psychiatrist connects their company account to Orion.
- Orion securely keeps the connection on the server.
- Orion creates one meeting for each confirmed appointment.
- The company manages account recovery, staff removal, and account changes.

### Pros

- The company owns the accounts and meeting setup.
- Easier to remove access when a psychiatrist leaves.
- Easier to recover an account or replace a psychiatrist.
- The company can use consistent settings for all psychiatrists.
- Better suited to a real clinical service.

### Cons

- The company must pay for each psychiatrist's account.
- The company must manage Google Workspace administration.
- The company still needs to approve Google's privacy, data handling, and support terms.
- Psychiatrists would need to use their company Google account for Orion sessions.

### Cost

Google's listed prices checked on 2026-09-18 were:

- Business Starter: **$7 per user per month** before tax.
- Business Standard: **$14 per user per month** before tax.

These are USD list prices and local pricing may differ. Google may also offer time-limited
promotions. Only the psychiatrist host accounts need licenses; patients do not need paid Workspace
accounts to join as guests. See [Google Workspace pricing](https://workspace.google.com/pricing.html)
for current pricing and promotions.

#### Estimated launch cost for 30 psychiatrists

| Plan | Monthly estimate | Annual estimate |
| --- | ---: | ---: |
| Business Starter — $7 per user/month | **$210/month** | **$2,520/year** |
| Business Standard — $14 per user/month | **$420/month** | **$5,040/year** |

These estimates cover 30 psychiatrist host accounts and exclude tax, local-currency pricing,
promotions, and any additional Workspace users. Patients do not need paid Workspace accounts.

## Option C — Build and operate Direct WebRTC + TURN

### How it works

Orion can provide its own browser-to-browser video calling instead of creating a Google Meet link.
The patient and psychiatrist open the Orion call page. Orion checks the appointment, the assigned
people, the approved time window, and the feature kill switch before issuing short-lived access.

The two browsers exchange connection setup messages through an Orion signaling service. Video and
audio then travel directly between the browsers whenever their networks allow it. If a firewall,
mobile network, or restrictive office network prevents that direct connection, coturn relays the
media through an Orion-operated TURN service. The TURN service does not record calls.

This is not just a Vercel or Supabase feature. The Direct WebRTC option adds two always-running
backend services alongside the Orion website:

- **Signaling gateway:** starts and recovers calls; it forwards only connection setup messages, not
  video or audio.
- **TURN relay:** is available for every call but carries media only when a direct browser-to-browser
  connection cannot be made.

Vercel continues to host the Orion website. Supabase continues to handle sign-in, appointment access,
and short-lived credentials. Neither service carries the call media in this design.

### How Orion would implement it

- Orion's protected `video-session-access` operation checks the booked appointment, assigned
  participant, time window, and kill switch before returning a short-lived signaling token and TURN
  credentials.
- The browser asks for camera and microphone permission only after the user selects **Continue**.
- The browser connects to a dedicated WebSocket signaling gateway for offer, answer, and ICE setup
  messages. The gateway permits one patient and one psychiatrist for each appointment session.
- Browser media uses direct WebRTC first and the approved coturn relay only when required.
- The browser reauthorizes before bounded reconnect attempts, queues ICE candidates safely, handles
  duplicate offers deterministically, and shows an explicit unavailable, expired, revoked, or failed
  state when a call cannot continue.
- Orion records access and operational events but does not record the conversation, chat, or media.

The Phase 18.5 code provides this application boundary, but its signaling gateway and coturn relay
are not yet deployed. Until those services and their secrets are configured, the Direct WebRTC route
correctly returns that the call is unavailable.

### Deployment and operating process

1. **Choose the operating level.** A one-server setup is sufficient for a controlled partner
   showcase. It is not the resilient topology required for real-user launch.
2. **Provision the runtime.** Deploy the signaling gateway and coturn relay on public infrastructure
   with a domain, HTTPS for signaling, TURN/TLS, restricted firewall rules, health checks, and secure
   secret storage. Vercel does not host coturn.
3. **Set the four Supabase runtime values.** Configure the signaling WebSocket URL, TURN URLs, TURN
   shared secret, and signaling signing secret as Supabase Edge Function secrets. Deploy the
   `video-session-access` function to the intended project.
4. **Deploy the Orion website.** Configure the existing public Supabase URL and publishable key in
   Vercel. Set `VITE_DIRECT_WEBRTC_UI=true` only after the server-side runtime has passed testing.
   Never put the service-role key, TURN secret, or signaling secret in Vercel browser variables.
5. **Run a real two-party test.** Use two synthetic accounts, separate browser contexts or devices,
   and verify desktop and mobile behavior, audio/video, permission denial, join-window enforcement,
   and call end.
6. **Run relay-path tests.** Test direct media, forced TURN relay, blocked UDP, TURN/TLS over TCP,
   credential expiry, signaling restart, and mobile/network interruption recovery.
7. **Monitor and operate it.** Record gateway and relay health, error rate, relay bandwidth, and
   secret rotation. Name a person who can disable calls through the kill switch.
8. **Scale only from measured use.** Increase TURN nodes based on simultaneous relayed calls and
   observed media bitrate. Do not assume all calls will stay direct.

### Pros

- Orion owns the call experience, join timing, admission rules, and reconnect behavior.
- Patients do not need Google accounts or a Google Meet interface.
- Direct calls use no Orion media-relay bandwidth when peer-to-peer networking succeeds.
- The UI and future calling features can be designed specifically for Orion.

### Cons

- Orion must operate and pay for signaling and TURN infrastructure continuously.
- Call reliability now depends partly on Orion's own server, networking, certificate, firewall, and
  on-call practices instead of Google's video platform.
- Media relay bandwidth becomes a cost when direct connections fail.
- Real-user deployment requires separate TURN relay nodes, monitoring, outage procedures, and
  privacy/security review; it is not equivalent to deploying a static Vercel site.

### Cost and billing

DigitalOcean prices checked on 2026-09-19 list a 2 vCPU / 2 GB Droplet at **$18/month** with 3 TB
of outbound transfer, and a 1 vCPU / 2 GB Droplet at **$12/month** with 2 TB. These are monthly
maximums, not an upfront one-day charge: DigitalOcean bills Droplets per second, with a minimum
charge of $0.01. A 24-hour run is approximately **$0.64** for the $18 server or **$0.43** for the
$12 server, before tax. The server must be deleted after the showcase to stop the recurring charge.

Extra outbound transfer is **$0.01 per GiB**. Inbound transfer is free. See
[DigitalOcean Droplet pricing](https://www.digitalocean.com/pricing/droplets) and
[bandwidth billing](https://docs.digitalocean.com/platform/billing/bandwidth/).

| Operating level | WebRTC infrastructure | New WebRTC monthly base | Total monthly baseline if Vercel Pro and Supabase Pro are also needed |
| --- | --- | ---: | ---: |
| Partner showcase only | One 2 vCPU / 2 GB server runs signaling and coturn together | **$18** | **about $63** |
| Initial real-user topology | One signaling server ($12) and two separate TURN servers ($18 each) | **about $48** | **about $93** |
| More resilient topology | Two signaling servers ($12 each) and two TURN servers ($18 each), before routing, backups, and monitoring | **about $60+** | **about $105+** |

The total column uses Vercel Pro at $20/month and Supabase Pro at $25/month. It excludes a domain,
tax, backups, load balancing, monitoring/log-retention add-ons, support, compliance work, and any
provider price changes. See [Vercel pricing](https://vercel.com/pricing) and
[Supabase pricing](https://supabase.com/pricing).

#### Cost of tomorrow's showcase

| Showcase choice | Extra cost for tomorrow | What Orion demonstrates | Important limit |
| --- | ---: | --- | --- |
| Free Gmail + Google Meet | **$0** beyond any existing Orion hosting | The already tested appointment, join-window, host/guest, and automatic-end flow | Google operates the call; this does not demonstrate Orion-owned WebRTC |
| Orion Direct WebRTC, 2 GB / 1 vCPU server for 24 hours | **about $0.43** | Orion's own call page, signaling, access rules, and TURN fallback | A small single-server demo, not the launch topology |
| Orion Direct WebRTC, 2 GB / 2 vCPU server for 24 hours | **about $0.64** | The same Direct WebRTC flow with more capacity headroom | A small single-server demo, not the launch topology |

The free Google Meet choice has no new video-infrastructure bill because Google runs the meeting
platform. It is the lowest-cost choice for a one-day partner demonstration. Direct WebRTC has no
dependable zero-cost remote option: it needs a publicly reachable signaling service and TURN relay
to work reliably across partners' home, office, and mobile networks. A personal computer or an
unverified free cloud offer may be technically possible, but it is not a dependable or appropriate
choice for private partner calls. Vercel Hobby can technically serve the static site, but it is
intended for personal, non-commercial use; use the appropriate Vercel plan for a business showcase.

For Orion's current synthetic launch profile—10 simultaneous two-party calls, across two 45-minute
waves—a deliberately conservative all-relay estimate is about **12.6–31.4 GiB** of TURN outbound
traffic at 1–2.5 Mbps per participant. At the $18 server's included 3 TB, that is roughly 97–244
such full two-wave test profiles per month before transfer overage. This is an estimate, not a
guarantee: browser quality adapts to the network and the actual share of calls using TURN must be
measured. Direct browser-to-browser calls add almost no media bandwidth cost to Orion.

### Showcase versus real use

For a one-day partner showcase, a single $18 server is technically sufficient after a real two-party
test has passed. It is still a single point of failure and should be described as a showcase or pilot,
not a production-ready real-user service.

If the only goal is to demonstrate Orion tomorrow, the already tested free-Gmail Google Meet flow is
the lowest-cost and lowest-risk path. It needs no Orion-run signaling or TURN server because Google
operates the video infrastructure.

If the goal is specifically to demonstrate Orion-owned Direct WebRTC tomorrow, use the one-server
showcase level, run the two-party test first, and delete the server after the demonstration. Do not
present this as the real-user production topology. A later real-user launch needs the separate TURN
nodes, monitoring, recovery procedures, and named operational ownership described above.

## Shared prerequisite: Google OAuth production approval

The free-Gmail test was done in Google's testing mode. That is enough for development and a small
approved test group, but it is not approval for broad production use.

The approval requirement depends on who connects a Google account to Orion:

- **Option A:** Plan for Google's external-app review because psychiatrists may connect personal
  Gmail accounts.
- **Option B:** Google's OAuth verification may not be required if only company-controlled Google
  Workspace accounts connect and the app is restricted to that company's Workspace organization.
  The Workspace administrator must still approve and manage the app.
- External patients do not create this OAuth requirement because they join as guests and do not
  connect Google accounts.

If Orion will allow any external or personal Google account to connect, complete the following
production process once for Orion. It is not repeated by every psychiatrist.

### Step-by-step external-app verification process

1. **Confirm the audience and account model.** Decide whether Orion will be an external app that
   accepts personal or outside-organization Google accounts, or an internal app limited to the
   company's Workspace organization. Record this decision before configuring Google Cloud.
2. **Create or select the production Google Cloud project.** Keep production OAuth credentials and
   configuration separate from the testing project. Add the appropriate Orion team members and
   protect the project with strong administrator access controls.
3. **Configure the OAuth consent screen.** Set Orion's verified product name, support email,
   developer contact, application homepage, privacy-policy URL, and any required terms URL. These
   pages must be public, accurate, and hosted on a domain Orion controls.
4. **Verify Orion's website domain.** Add the production domain to Google Search Console or use
   Google's requested domain-verification method. Make sure the verified domain matches the
   homepage, privacy policy, redirect URIs, and OAuth branding details.
5. **Register the production OAuth client.** Configure the exact production redirect URIs and keep
   the client secret on the server. Do not place the secret in browser code or in `VITE_*`
   variables.
6. **Request the minimum Google scopes.** Request only the Google Meet and identity access Orion
   actually needs. Remove unused Calendar, Gmail, Drive, or other scopes. Record why each requested
   scope is necessary and how Orion uses the resulting data.
7. **Publish the production app for review.** Move the external app from testing toward production
   only after the homepage, privacy policy, domain, scopes, consent text, redirect URIs, and
   account-security controls are complete. Testing mode remains limited and may show an unverified
   warning.
8. **Submit the verification request.** In Google Cloud, submit the app for the applicable brand,
   sensitive-scope, or restricted-scope review. Provide the requested application details, scope
   justification, privacy-policy information, domain evidence, and support contacts.
9. **Record a reviewer walkthrough.** Prepare a short video showing the complete flow: opening
   Orion, connecting a Google account, reviewing the consent screen, creating a meeting, and using
   the meeting in the approved appointment flow. Use synthetic accounts and data.
10. **Respond to Google's questions.** Monitor the developer and support email addresses, answer
    requests promptly, and update the application or scope list if Google identifies a mismatch.
11. **Complete any additional security review.** If Google classifies a requested scope as
    restricted, plan for the additional security assessment and its longer review timeline.
12. **Verify production behavior after approval.** Confirm that a new psychiatrist can connect,
    that revoked access is handled safely, that token refresh works, and that Orion does not request
    scopes outside the approved set. Keep evidence of the approval and configuration in the launch
    record.

Google's published estimates are not guarantees: sensitive-scope review is commonly listed as up
to 10 business days, while restricted-scope review can take substantially longer and may require a
security assessment. Do not schedule real clinical use until the required approval, privacy review,
and production account controls are complete. See [Google's OAuth app guidance](https://developers.google.com/identity/protocols/oauth2/production-readiness/overview)
and [verification requirements](https://support.google.com/cloud/answer/13464321) for the current
requirements.

## Current decision status

The partner/owner provider decision is pending: choose either Google Meet or Direct WebRTC + TURN
before activating either video path for use. Direct WebRTC is implemented on `main`, but its runtime
is intentionally not deployed while this decision remains open.

For a one-day showcase, free Gmail + Google Meet remains the lowest-cost and lowest-risk option.
For future real clinical sessions, paid, company-controlled Google Workspace accounts remain the
preferred Google Meet account model if Google Meet is selected.

Direct WebRTC + TURN is a valid future product direction only if the company accepts the additional
always-running infrastructure, relay-bandwidth cost, operational responsibility, and separate
real-user launch requirements. It is not the lowest-risk choice for tomorrow's showcase.

## If Google Meet is selected — proposed Orion experience

1. A confirmed appointment receives one Google Meet meeting.
2. The patient and psychiatrist see Join only during the approved appointment window.
3. The psychiatrist receives a warning 10 minutes before the 45-minute session ends.
4. Orion ends the call automatically at the scheduled end.
5. Ending the call early requires confirmation.
6. If the call is ended accidentally, the psychiatrist can select **Restart session** before the
   appointment ends. Orion creates a new meeting and gives both people the new Join option.
7. After the appointment ends, restarting is not allowed; the user is directed to support.
8. Recording, transcription, chat, file sharing, and screen sharing remain off unless separately
   approved.

## Decisions and approvals needed from you

- Partners/owners must choose Google Meet or Direct WebRTC + TURN as Orion's video provider.
- If Google Meet is selected, confirm whether Orion will use Option A or Option B.
- If Direct WebRTC is selected, approve a showcase-only or real-user operating budget and name the
  technical owner for signaling, TURN, certificates, monitoring, and incident response.
- Name the person responsible for Google account administration, staff removal, and account
  recovery.
- Ask the privacy/DPO lead to review Google's handling of information.
- Ask the clinical lead to approve the session timing and accidental-end recovery process.
- Have the team build secure account connection, meeting creation, automatic ending, and restart.
- Have the team test phone/tablet browsers, internet interruptions, Google service outages, and
  support procedures.
