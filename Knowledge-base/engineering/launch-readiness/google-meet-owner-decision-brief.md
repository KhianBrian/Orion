# Orion Video Provider Decision Brief

**Date:** 2026-09-19 (Asia/Manila)

Partners/owners need to choose one video option before Orion activates video calls for real use.
This is a decision brief, not a technical deployment guide. Orion already has the Direct WebRTC
call code on `main`, but no Direct WebRTC services have been deployed yet.

## Option A — Free Gmail accounts + Google Meet

### How it works

Each psychiatrist connects their own Gmail account to Orion once. For every confirmed appointment,
Orion creates a Google Meet link using that psychiatrist's account. The psychiatrist joins as the
host. The patient joins as a guest and does not need a Google account.

Orion decides when the Join button is available. It can create a replacement meeting link if a call
is ended accidentally while the appointment is still active.

### What's needed

- Each psychiatrist needs an active Gmail account and must connect it to Orion.
- Orion needs one company-managed Google setup and approval process; see the shared checklist
  below.
- A named person must help when a psychiatrist loses access to their Gmail account or leaves the
  service.
- The clinical team must approve the appointment timing, ending, and restart rules.

### Pros

- No monthly Google account fee for psychiatrists.
- Patients do not need to create or pay for a Google account.
- The basic Orion-to-Google-Meet flow has already been tested successfully.
- Google runs the video service, so Orion does not need to run its own video servers.

### Cons

- The psychiatrist, rather than the company, owns the account used to create meetings.
- A psychiatrist changing account settings, disconnecting Orion, or losing account access can stop
  their meetings from working.
- The company has less control over account recovery and removing access when staff leave.
- This is the weakest long-term account-control option for clinical sessions.

### Pricing

- **Google account cost:** $0 per psychiatrist per month for Gmail.
- **New video-server cost for Orion:** $0; Google operates the call service.
- **Existing Orion hosting:** no new cost from this option. Orion will continue using its paid
  Supabase plan and free Vercel plan.

Google may change its product limits or terms in the future. There is no separate Google Meet API
charge for the basic meeting flow used here.

## Option B — Company Google Workspace accounts + Google Meet

### How it works

The company gives every psychiatrist a company-managed Google Workspace account. Orion creates
Google Meet links through that account in the same way as Option A. The psychiatrist hosts the
meeting, and the patient joins as a guest without needing a paid Google account.

The appointment timing and replacement-link behavior are the same as Option A, but the company
controls the psychiatrist accounts.

### What's needed

- The company needs to buy and manage one Google Workspace account for each psychiatrist who hosts
  sessions.
- A named company administrator must create accounts, remove former staff, and recover accounts.
- Orion needs the company Google setup and approval process; see the shared checklist below.
- The clinical team must approve the appointment timing, ending, and restart rules.

### Pros

- The company owns the accounts used for clinical meetings.
- It is easier to remove access when a psychiatrist leaves.
- It is easier to recover an account or move a patient to another psychiatrist.
- The company can use the same account settings for every psychiatrist.
- This is the stronger Google Meet option for a real clinical service.

### Cons

- The company pays for each psychiatrist account every month.
- Someone must manage the Google Workspace accounts.
- Orion still depends on Google to operate the video service.
- The company still needs privacy review of Google's data handling and terms.

### Pricing

Google list prices checked on 2026-09-18, before tax:

| Google Workspace plan | Price per psychiatrist | Example: 30 psychiatrists |
| --- | ---: | ---: |
| Business Starter | **$7/month** | **$210/month** |
| Business Standard | **$14/month** | **$420/month** |

Only psychiatrists who host appointments need a paid account. Patients can join as guests. These are
Google's USD list prices; local pricing, tax, and promotions may differ. See
[Google Workspace pricing](https://workspace.google.com/pricing.html) for current pricing.

- **New video-server cost for Orion:** $0; Google operates the call service.
- **Existing Orion hosting:** no new cost from this option. Orion will continue using its paid
  Supabase plan and free Vercel plan.

## Option C — Orion Direct WebRTC + TURN

### How it works

The video call happens inside Orion instead of opening Google Meet. The patient and psychiatrist
open Orion's call page. Orion checks that they are the assigned people and that it is the correct
appointment time before allowing them into the call.

The two browsers try to send video and audio directly to each other. If their home, office, or mobile
network does not allow that direct connection, Orion sends the call through its own secure backup
route. Patients and psychiatrists do not need Google accounts or a separate video-provider account.

### What's needed

- The Direct WebRTC call code is already implemented on Orion's `main` branch.
- Orion must run its own always-on video services online. They connect the two browsers and provide
  the secure backup route when a direct call is not possible.
- For a controlled technical pilot, one small cloud server can run both jobs. For real-user launch,
  Orion should use separate servers so that one server problem does not take down every call.
- A named technical owner must manage the servers, security, spending, outages, and emergency call
  disable switch.
- Orion must complete real two-person tests on desktop, phone, home internet, office internet, and
  mobile data before real-user activation.
- The privacy and clinical leads must approve the call rules, data handling, support process, and
  what happens when a call drops or ends early.

### Pros

- The call stays inside Orion and can be designed around Orion's appointment rules.
- Patients and psychiatrists do not need Google accounts or a Google Meet interface.
- The company controls the call experience, access rules, and future video features.
- When two browsers connect directly, Orion does not pay for the video traffic between them.
- Orion is not dependent on Google to operate the core call experience.

### Cons

- Orion must pay for and operate its own video services at all times.
- Orion becomes responsible for reliability, security updates, outages, monitoring, and support.
- Some calls will use Orion's backup route, creating an additional usage cost.
- A one-server pilot has one point of failure and is not the recommended real-user setup.
- This option is implemented in code but cannot be activated until the services, security review,
  operating owner, and real two-person testing are complete.

### Pricing

The figures below are Orion's **new video-service costs**. They do not include Orion's existing
paid Supabase plan, because that plan is already in use. They also add **$0** for Vercel because the
current plan is free; Vercel hosts Orion's website but does not run the video services.

| Operating level | What Orion runs | Estimated new monthly video cost | Suitable for |
| --- | --- | ---: | --- |
| Controlled technical pilot | One small cloud server | **$12–$18/month** | Internal testing or a limited, supervised pilot only |
| Initial real-user setup | Three small video servers, so one problem does not stop every call | **about $48/month** | First real-user launch, subject to privacy and operational approval |
| More resilient setup | Four small video servers | **about $60+/month** | Higher availability, before extra monitoring and backup services |

DigitalOcean prices checked on 2026-09-19 list a small 2 GB server at **$12/month** or **$18/month**
depending on capacity. The initial real-user estimate uses one $12 server and two $18 servers. These
are monthly maximums; short technical use is billed only for the time the server runs. Each server
includes a large monthly amount of call data. If Orion exceeds that included amount, extra data sent
through the backup route costs **$0.01 per GB**. The first real-user launch should track this cost
monthly because it depends on how many calls need the backup route and the quality of each call.

The estimate excludes tax, domains, backups, monitoring, support, compliance work, and any future
provider price changes. See [DigitalOcean pricing](https://www.digitalocean.com/pricing/droplets)
and [bandwidth billing](https://docs.digitalocean.com/platform/billing/bandwidth/).

For a controlled non-production showcase, Orion is also evaluating Open Relay Project: its published
free tier includes 20 GB per month of fallback-call traffic and free connection messaging. This can
avoid a new server bill for a small, measured showcase, but it is not a permanent service choice:
the provider gives no uptime warranty and may interrupt the service without notice. Orion will stop
the controlled path at 15 GB, use only synthetic data, and keep the real-user provider decision
open. See [Open Relay](https://www.metered.ca/tools/openrelay/) and its
[terms](https://www.metered.ca/tools/openrelay/terms-and-conditions/).

## Shared prerequisite: Google OAuth production approval

This section applies only to Options A and B. Option C does not use Google accounts.

### Step-by-step external-app verification process

1. Decide whether Orion will allow personal Gmail accounts or only company Google Workspace
   accounts.
2. Create or choose the company production Google Cloud project; do not use the test project.
3. Prepare Orion's public homepage, privacy-policy page, support email, and terms page.
4. Prove that the company owns Orion's website domain.
5. Set up the production Google connection with Orion's real website address.
6. Request only the Google permissions Orion needs to create and manage meetings.
7. If personal or external Google accounts can connect, submit Orion to Google for the required
   external-app review. If only company Workspace accounts can connect, confirm the company
   administrator's approval requirements.
8. Prepare a short recording showing a psychiatrist connecting their account and Orion creating a
   meeting with test data.
9. Answer any Google questions, then test the approved setup with a new psychiatrist account before
   real-user activation.

Google review timing and requirements can change. See [Google's production-readiness guidance](https://developers.google.com/identity/protocols/oauth2/production-readiness/overview)
and [verification requirements](https://support.google.com/cloud/answer/13464321) before starting.

## Decision needed

Partners/owners need to select **Option A, B, or C**.

- Choose **Option A** for the lowest account cost, accepting psychiatrist-owned accounts.
- Choose **Option B** for company-controlled Google accounts and predictable per-psychiatrist cost.
- Choose **Option C** for an Orion-owned call experience, accepting ongoing video-service cost and
  operational responsibility.

No option should be activated for real users until the selected option's requirements, privacy
review, clinical rules, and real two-person testing are complete.
