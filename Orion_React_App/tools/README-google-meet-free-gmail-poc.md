# Google Meet free-Gmail proof of concept

This is an isolated, non-production feasibility test. It must use a new Google
Cloud project and a test Gmail account only. Do not use patient data, the Orion
Supabase project, the JaaS demo path, or an existing unrelated OAuth client.

This tool does not represent the production Orion authorization flow. The Google
Cloud project, OAuth consent screen, and Desktop OAuth client are created by the
developer for this test only. A production Orion application would use a separate
Google Cloud project and a Web OAuth client.

## Official references

- [Google Meet REST API overview](https://developers.google.com/workspace/meet/api/guides/overview)
- [Google Meet `spaces.create`](https://developers.google.com/workspace/meet/api/reference/rest/v2/spaces/create)
- [Google Meet authentication](https://developers.google.com/workspace/meet/api/guides/authenticate-authorize)
- [Google Meet usage limits and pricing](https://developers.google.com/workspace/meet/api/guides/limits)
- [Google guidance for joining without a Google Account](https://support.google.com/meet/answer/9303069)

## Google Cloud setup

1. Create a new Google Cloud project, for example `orion-google-meet-poc`.
2. Enable the Google Meet API for that project.
3. Configure OAuth consent as **External** because the test account is a free Gmail account.
4. Add the test Gmail address as a test user.
5. Create an OAuth client of type **Desktop app**.
6. Copy the client ID and client secret locally. Do not commit them, paste them into chat, or put them in a `VITE_*` variable.

## What happens once versus per psychiatrist

The developer completes the Google Cloud and OAuth application setup once for Orion. Each
psychiatrist later connects their own Google account to Orion and approves access once. They do not
create a Google Cloud project, enable APIs, or create OAuth credentials themselves. Patients do not
need to authorize the Meet API to join as guests.

The current test project is in External/Testing mode. It is suitable for the listed test users and
does not establish production approval. If Orion is opened to many external users, the production
application will need Google's review for the Sensitive Meet permission used by this test. That
review applies to Orion's production application, not separately to every psychiatrist.

The production review requires a public Orion homepage and privacy policy, a verified website domain,
an explanation of the requested Meet access, and a demonstration video of the account connection and
meeting flow. Keep the testing project separate from that future production submission.

## Run the test

From this directory, set the values only in the current terminal session:

```sh
export GOOGLE_MEET_POC_CLIENT_ID='your-client-id'
export GOOGLE_MEET_POC_CLIENT_SECRET='your-client-secret'
node tools/google-meet-free-gmail-poc.mjs
```

The script requests only `meetings.space.created`, creates one empty Meet
space, prints the URI, and writes no token or meeting URI to disk.

## Test server-side conference ending

Use this opt-in mode for the next test:

```sh
node tools/google-meet-free-gmail-poc.mjs --test-end-active-conference
```

The script creates a fresh test space, prints its URI, and waits in the terminal. Open the URI as
the host, open it in an incognito window as the guest, admit the guest, and keep both browsers in
the call. Return to the terminal and press Enter. The script then calls Google's
`spaces.endActiveConference` operation using the in-memory OAuth token.

The expected result is a `PASS` message. Verify manually that both browser sessions are
disconnected and that the meeting cannot be rejoined until the host restarts it. This tests the
mechanism Orion could use for its scheduled session cutoff; it does not modify the Orion app or
use patient data.

## If the test returns `403 PERMISSION_DENIED`

First confirm that the **Google Meet API** is enabled in the same Google Cloud
project that owns the OAuth client. Also confirm that the Gmail account is
listed as an OAuth test user and that the authorization scope shown by Google
includes `meetings.space.created`. Re-run after changing those settings so the
script can show Google's more specific error reason.

This error is not evidence of a failed OAuth login: Google may accept the OAuth
grant and still reject the Meet API operation because the API, account, or
project is not eligible for that operation.

## Manual acceptance checks

Use the test space only:

1. Join as the Gmail host.
2. Open the URI in a private/incognito window without signing into Google.
3. Confirm the guest can request entry.
4. Confirm the Gmail host can admit the guest.
5. Leave and rejoin during the same call.
6. Confirm the host can end the call.
7. Inspect whether the free Gmail account exposes the access and moderation controls Orion needs.

A successful API call proves only that this Gmail account can create a Meet
space. It does not approve consumer Gmail for real patient sessions.
