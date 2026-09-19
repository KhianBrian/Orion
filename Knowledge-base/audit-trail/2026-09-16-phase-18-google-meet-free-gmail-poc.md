# 2026-09-16 Phase 18 Google Meet Free-Gmail POC Evidence

**Test date:** 2026-09-16 (Asia/Manila)

**Environment:** New Google Cloud project, free personal Gmail account, desktop browser,
non-production test only.

**Related test tool:**
[`google-meet-free-gmail-poc.mjs`](../../../Orion_React_App/tools/google-meet-free-gmail-poc.mjs)

## Purpose

Determine whether a free personal Gmail account can authorize Orion's isolated Google Meet
integration, create a meeting space through the Google Meet REST API, and support the basic
psychiatrist-host/patient-guest call flow.

## Configuration used

- Google Cloud project: `OrionGmailMeetTest`
- API: Google Meet REST API, enabled
- OAuth client: `Test1`, Desktop application
- OAuth app audience: External, Testing
- Gmail account: listed as an OAuth test user
- OAuth scope:
  `https://www.googleapis.com/auth/meetings.space.created`
- No service account
- No Calendar, Drive, recording, transcript, or other additional scope

Credentials were supplied through the current terminal session only. The test tool did not write
tokens, client secrets, or the meeting URI to disk.

## Testing status and production approval

This project was configured as an **External** Google OAuth application in **Testing** mode. That
allows only the Google accounts listed as test users to authorize it. It is appropriate for this
feasibility test, but it is not a production approval.

The tested `meetings.space.created` permission is classified by Google as **Sensitive**. If Orion
uses an external production application for broad access, the developer must submit that production
application for Google's review. Google checks the application's identity, website domain, privacy
policy, requested access, and a demonstration of how the access is used.

The review is completed once for Orion's production Google application, not separately by every
psychiatrist. The psychiatrist only connects their own Google account and approves Orion's access.
Patients do not need to complete Google Cloud or OAuth setup to join as guests.

This test did not submit the test project for Google's production review. It provides the technical
test result and can later support the production submission's demonstration video.

For production, the developer would publish the separate production application, complete Google's
branding check, open the Verification Center, declare the Meet permission, explain its use, provide
an unlisted demonstration video, and submit the application. Google may then ask questions through
the production project contacts. This is one Orion application review, not a setup process repeated
by every psychiatrist.

## Test history

The first API call returned `403 PERMISSION_DENIED` after OAuth authorization succeeded. The
Google Meet API was then confirmed enabled in the same project as the OAuth client, the Gmail
account was added as a test user, and the required Meet scope was confirmed. The test was rerun
after those changes.

## Results

| Check | Result | Evidence |
| --- | --- | --- |
| Gmail OAuth authorization | PASS | Google authorization completed and returned to the local test tool. |
| Create Meet space through REST API | PASS | The API returned a provider space and a Meet URI. |
| Host joins | PASS | The Gmail account that created the space joined in a normal browser. |
| Guest joins without Google sign-in | PASS | An incognito browser opened the URI and reached the guest waiting screen. |
| Guest admission | PASS | The host admitted the incognito guest. |
| Video and microphone | PASS | Two-party audio/video worked. |
| Guest leaves and rejoins | PASS | The guest could leave and rejoin while the host remained in the call. |
| Host management | PASS | Host management was enabled for the meeting. |
| End meeting for everyone | PASS | With host management enabled, the host used the end-call flow and the option to end the meeting for everyone was available and worked. |
| REST API `endActiveConference` request | PASS | The opt-in POC mode returned `PASS: Google Meet active conference ended through the REST API.` |
| Both participants disconnected after API end | PASS | After Enter was pressed, both the host and guest sessions ended. |
| Immediate rejoin after API end | PASS | After the API ended the call, neither the host nor guest could immediately rejoin the ended call. |

The meeting URI and provider space identifier are intentionally not recorded here because they
were live test artifacts and should not be reused for a real session.

## Conclusion

**POC status: PASS for the tested free Gmail account.**

The test demonstrates that a free Gmail account can authorize the Meet REST API, create a Meet
space, host a call, admit an unauthenticated guest, support audio/video and rejoin behavior, and
end the meeting for everyone through the Meet interface. A Google Workspace subscription was not
required for this tested flow.

This is feasibility evidence, not production approval. It does not yet establish that every
consumer Gmail account has identical settings, that Google/vendor/privacy requirements are
approved for clinical use, or that Orion can safely store and refresh each psychiatrist's OAuth
credentials.

## API end-test follow-up

The opt-in API test was run from `Orion_React_App`:

```sh
node tools/google-meet-free-gmail-poc.mjs --test-end-active-conference
```

The script created a fresh space, waited for the host and guest to be placed in an active call, and
returned a successful `endActiveConference` response after Enter was pressed. Both the host and
guest sessions ended, and neither could immediately rejoin. This tests the mechanism
Orion could use to enforce the scheduled session boundary and its 45-minute session rule
independently of the browser UI.

## Recovery gap discovered during API end test

Observed behavior: after the API ended the conference for everyone, neither the host nor the guest
could immediately rejoin the ended call. This is a material recovery case if a psychiatrist ends
the call accidentally before the scheduled appointment boundary.

Google's general Meet guidance says participants cannot join an ended meeting until the host
restarts it. The tested consumer-account/API flow should therefore be treated as requiring an
explicit Orion recovery path rather than relying on a raw provider link.

### Recommended Orion behavior — proposal, not yet approved

1. Require a confirmation before the psychiatrist selects **End session for everyone**, explaining
   that both participants will be disconnected.
2. Keep the appointment/session eligible for recovery while it remains inside the approved
   `[starts_at - 15 minutes, ends_at)` window.
3. Show the psychiatrist a **Restart session** action after an early accidental termination.
4. Have Orion create a fresh Meet space for the same appointment using the authorized host account,
   invalidate the old entry point in Orion, and issue the new entry point only through the normal
   admission decision.
5. Audit the termination and replacement-space events without storing the provider URI in ordinary
   logs.
6. Do not offer restart after `ends_at`; show the session-ended state and follow the approved
   support/reschedule process.

The replacement-space approach is safer than asking users to reuse a provider link that has already
been ended. The exact early-end, recovery, support, and rescheduling policy still requires clinical
and operations approval.

## Remaining production-oriented tests

- Confirm whether the host can restart the same space after the API-ended conference, or whether a
  replacement space is required for the tested consumer account.
- Test the proposed replacement-space recovery path before `ends_at`.
- Test space access and moderation configuration through the API, not only the Meet interface.
- Define secure OAuth refresh-token storage, revocation handling, account ownership, and provider
  outage behavior before production integration.

## Official references

- [Google Meet REST API overview](https://developers.google.com/workspace/meet/api/guides/overview)
- [Meet REST API authentication and scopes](https://developers.google.com/workspace/meet/api/guides/authenticate-authorize)
- [`spaces.endActiveConference` reference](https://developers.google.com/workspace/meet/api/reference/rest/v2/spaces/endActiveConference)
- [Google Meet host controls](https://support.google.com/a/users/answer/11989526)
- [Google sensitive-permission verification](https://developers.google.com/identity/protocols/oauth2/production-readiness/sensitive-scope-verification)
- [Google app verification FAQ](https://support.google.com/cloud/answer/13463817?hl=en)
