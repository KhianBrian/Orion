# Google Meet Decision Brief

**Date:** 2026-09-16 (Asia/Manila)

Google Meet has already been selected as the video provider. This document explains the two account
options for using it with Orion and recommends the best way to move forward.

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

## Recommended choice

Use **Option B — paid, company-controlled Google Workspace accounts** for real clinical sessions.

Use **Option A — free Gmail accounts** only for continued testing or for a limited pilot if you
explicitly accept the account-ownership risks and complete the applicable external-app approval.

## Proposed Orion experience

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

- Confirm whether Orion will use Option A or Option B.
- Name the person responsible for Google account administration, staff removal, and account
  recovery.
- Ask the privacy/DPO lead to review Google's handling of information.
- Ask the clinical lead to approve the session timing and accidental-end recovery process.
- Have the team build secure account connection, meeting creation, automatic ending, and restart.
- Have the team test phone/tablet browsers, internet interruptions, Google service outages, and
  support procedures.
