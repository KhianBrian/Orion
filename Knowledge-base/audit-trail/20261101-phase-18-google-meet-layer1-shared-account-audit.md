# 2026-11-01 Phase 18 Google Meet Layer 1 Shared-Account Test Audit

## Verdict

The non-production Layer 1 control-plane test provides evidence that the current Orion Google Meet
flow can reuse one Google authorization for repeated appointment meeting creation when requests are
spread out. A burst of 20 new-space requests reached a boundary at 10 successful creations, which
matches Google's published reduced `spaces.create` quota of 10 requests per minute per user.

This is provider/control-plane evidence only. It is not evidence of 20 simultaneous browser calls,
20 simultaneous audio/video sessions, production approval, or real-user launch readiness.

## Scope and environment

- **Environment:** non-production Supabase project `oanmjzynckycvvgnzlwk` and one non-production
  Google test account.
- **Data:** synthetic psychiatrist, patient, slot, and appointment records only.
- **Harness:** [`google-meet-layer1-load.mjs`](../../Orion_React_App/tools/google-meet-layer1-load.mjs).
- **Runtime path:** deployed `google-meet-session-access` Edge Function.
- **Account model:** the harness copied the active test refresh authorization into temporary
  synthetic psychiatrist profiles to model Orion's current shared-account arrangement. No token,
  email address, or meeting URI is recorded here.
- **Cleanup:** each harness run removed the temporary Orion users, connections, appointments, slots,
  meeting-space rows, and audit rows. Provider-created test spaces may remain as unused artifacts in
  the test Google account because the current Meet path has no normal provider-space delete step.

## Test results

| Test | Result | What was observed |
| --- | --- | --- |
| Stale-token recovery prerequisite | Recovered | The first attempt failed with repeated Google `invalid_grant` refresh errors. Reconnecting the test Google account produced a usable authorization. |
| 20-request concurrent burst | Partial: 10/20 | Ten requests created active spaces; ten returned Orion's generic `google_meet_unavailable` response. The audit output contained 10 `granted_created` and 10 `provider_unavailable` results. |
| 20 staggered creations | Pass: 20/20 | Twenty separate one-appointment runs, spaced by approximately seven seconds, each created one active unique space and returned the same existing space to its synthetic patient. |

The burst result is consistent with Google's published Meet REST API limit of 10 reduced write
requests per minute per user for `spaces.create`. The current Orion response intentionally hides
provider details behind `google_meet_unavailable`; the burst output did not independently record a
raw Google `429`, so the quota interpretation is a strong inference rather than a direct provider
status capture.

## Evidence labels

- **Observed:** the user-run terminal output showed 10/20 burst success and 20/20 staggered
  one-appointment runs passing; the supplied Supabase logs showed repeated token refresh
  `invalid_grant` errors during the earlier stale-token attempt.
- **Verified:** every successful staggered run reported `statusCounts: {"200": 1}`, one active
  space, one unique space name, one unique meeting URI, and one successful patient retrieval of the
  existing space.
- **Assumed:** the source connection and all temporary synthetic profiles represented the same
  Google account because the harness reused the source refresh authorization; the harness does not
  store or independently query the Google account email/subject.
- **Deferred:** a single run containing 20 synthetic profiles with delayed requests; simultaneous
  host/browser sessions; real audio/video concurrency; exact raw Google quota status capture; and
  provider-space cleanup.
- **Blocked:** real-user activation remains gated by production Google/Workspace policy, OAuth
  verification, privacy/vendor review, clinical approval, security review, operations ownership,
  and integrated release approval.

## What this proves

1. The refreshed shared Google authorization can create Meet spaces through Orion.
2. One account can support at least 20 repeated meeting creations when they are not concentrated
   into the same minute.
3. Orion creates one active provider space per appointment and reuses that space for the assigned
   synthetic patient.
4. The current burst behavior has a practical boundary around 10 new spaces per minute for one
   Google user.

## What this does not prove

- Twenty psychiatrists can be signed into or actively hosting Meet calls at the same time.
- Twenty simultaneous audio/video sessions will work on one computer or network.
- The current shared-account arrangement is suitable for real clinical operations.
- Google Workspace account recovery, offboarding, host admission, or clinical ownership policy is
  approved.

## Next action

Use this as Layer 1 control-plane evidence. The next separate test should be a small browser/media
smoke test with two to five synthetic calls; do not treat the staggered result as proof of
simultaneous live-call capacity.

## Commands and artifacts

- `node --check Orion_React_App/tools/google-meet-layer1-load.mjs` — passed locally.
- `git diff --check` — passed locally.
- `npm run test:load:google-meet` — the reusable harness command; remote executions were user-run in
  the non-production project and are represented above.
- Google Meet official quota reference:
  <https://developers.google.com/workspace/meet/api/guides/limits>
