# Phase 9 — Appointment Experience

## Outcome

Patients can book, review, and cancel appointments through clear responsive interactions, while a
psychiatrist sees the safe display name of the patient assigned to each booked time. Cancellation
confirmation and denial use accessible centered dialogs.

## Current State

- Psychiatrist cards display only `Assigned patient appointment`; the query never requests patient
  identity.
- `profiles_select_own` prevents a psychiatrist from reading a patient's profile directly.
- Cancellation confirmation is an inline section after the appointment grid, so it can appear below
  the viewport.
- A server denial becomes an inline message above the list while the confirmation section remains open.
- Appointment rows are presented as one undifferentiated grid containing booked, cancelled, past, and
  future entries.

## Non-Goals

- No patient email/phone, reason for care, secretary workflow, psychiatrist cancellation, rescheduling,
  no-show, session notes, or production data.
- No weakening of profile RLS and no client-side authority over cancellation eligibility.

## Decisions Needed

- Use `profiles.full_name` as the synthetic patient display name for the assigned psychiatrist. Return
  no email, phone, role, or unrelated profile row.

## Architecture Plan

- Add a narrowly scoped appointment projection/RPC that branches on the authenticated relationship
  and returns only fields required by the screen. A general `profiles` select policy is not acceptable.
- Keep appointment queries and mutations in `src/features/appointments/`.
- Compose the UI from appointment list, appointment card, status badge, join action, and cancellation
  dialog components.

## Data Model Impact

- Add one forward migration for the safe projection/RPC and its explicit grants.
- No table or appointment-history change.
- Add allow/deny tests proving an assigned psychiatrist receives the correct synthetic display name
  and unrelated psychiatrists/patients cannot obtain it.

Authority: psychiatrists may read their own assigned client appointments, while identifying
appointment metadata remains sensitive
([reader matrix](../../governance/data-classification-and-data-dictionary.md#readers),
[access control](../../architecture/access-control-and-audit-policy.md#roles)).

## API And Server Plan

- Authenticate inside the projection/RPC, resolve the current role from `profiles`, and constrain rows
  by patient ownership or psychiatrist assignment.
- Return stable fields such as appointment ID, starts/ends, status, permitted counterpart display name,
  and psychiatrist display name. Do not return contact data.
- Booking and cancellation still use their existing Edge Functions; the database clock remains
  authoritative ([appointment lifecycle](../../product/appointment-lifecycle.md#timing-rules)).

## UI/UX Plan

- Patient cards show psychiatrist, readable date/time, status badge, and one clear next action.
- Psychiatrist cards show the assigned patient's synthetic display name and time.
- Group or filter upcoming booked appointments separately from cancelled/past history.
- Rename the meeting CTA to `Join call` and render it as the shared primary button.
- Cancellation opens a centered destructive confirmation dialog with a labelled X close button,
  `Keep appointment`, and `Cancel appointment` actions.
- A `cancellation_not_permitted` response changes that dialog into a red error state with plain-language
  text and a single close/return action. It must not disclose server internals.
- Close and restore focus to the appointment card after dismissal; disable duplicate submission while
  preserving the existing idempotency key.

## Security, Privacy, And Abuse Controls

- Patient display names exist only in the assigned psychiatrist response and in-memory UI.
- No profile-table broadening, persistent cache, analytics, logs, URL parameters, or screenshots with
  real data.
- Server denial remains final even if the UI predicts cancellation eligibility.

## Quotas, Billing, Or Entitlements

None.

## Observability And Analytics

Use existing safe reason codes for automated assertions; do not log patient names or appointment data.

## Implementation Slices

1. Add and verify the safe appointment projection/RPC.
2. Move appointment data access into the feature module and connect query caching from Phase 7.
3. Build the reusable appointment card/list and status presentation.
4. Implement the centered cancellation confirmation dialog, X close, keyboard behavior, and denial state.
5. Add clock-driven `Join call` presentation and cache invalidation after mutations.

Likely areas: a new Supabase migration, RLS test script, `src/features/appointments/`,
`src/pages/Appointments.jsx`, shared UI primitives, and scheduling Playwright tests.

## Verification Plan

- Assigned psychiatrist sees the correct synthetic patient name; the other psychiatrist cannot.
- Patient never receives another patient's name.
- Cancellation dialog is centered on desktop/mobile and is reachable without scrolling.
- X, Escape, `Keep appointment`, success, server denial, retry, and double-click paths pass.
- `Join call` appears/disappears at boundaries without refresh; server still denies invalid direct access.
- Existing booking, cancellation, RLS, and meeting-access tests remain green.

## Rollout And Fallback

The new projection is additive. The current relationship-scoped appointment read remains available for
rollback until the new allow/deny suite passes, then the UI switches in one release.

## Documentation And Audit Updates

- Record the RPC contract and exact exposed fields in database/RBAC documentation.
- Add the new RLS matrix cases and Phase 9 as-built screenshots using synthetic data only.

## Open Questions

- Contact details and secretary access belong to later controlled-pilot phases and are not inferred here.
