# Deferred post-development work

This is the shared deferral register for work intentionally postponed while Orion's feature set is
being completed. These items are not silently cancelled. They remain required before real launch or
before the owner explicitly changes their disposition.

## Phase 2 — consent

- Add persistence and capture for the three approved consent categories: privacy acknowledgement,
  informed/telepsychiatry consent, and optional communications.
- Keep each consent history versioned and append-only. A withdrawal is a new event, not an overwrite.
- Add the final owner-, clinical-, and DPO/legal-approved wording and version identifiers before
  capturing real acknowledgements.
- Include the session-note rule in the approved wording: patients can read only the latest released
  note version, while superseded note bodies remain protected. Admins may review audit metadata but not
  clinical-note content.

## Phase 0 — governance decisions and approvals

- Identify the legal operating entity and formally appoint the DPO/privacy owner.
- Name the licensed clinical lead and record psychiatrist verification criteria and approval authority.
- Ratify the appointment lifecycle decisions and resolve the remaining clinical details for no-shows,
  late cancellation, session timing, emergency/referral handling, and the approved patient-facing
  note wording and visibility policy.
- Approve final privacy, terms, telepsychiatry, consent, parent/guardian, payment, support, and
  crisis/referral wording.
- Approve vendor and data-transfer terms for Supabase and the real video provider.
- Decide support hours, escalation contacts, incident communication, and who can stop bookings or
  video.
- Set the launch geography and operating-review cadence.
- Set retention and deletion rules for accounts, appointments, consent, notes, audit events, backups,
  and security logs. Until this is decided, no deletion path or retention value is invented.
- Confirm whether the synthetic demo scope expands and resolve consent/licensing for any identifiable
  people depicted in image assets.

## Phase 1 — secure platform baseline

- Complete the access register and dated least-privilege review.
- Complete CI/CD with lint, tests, build, dependency auditing, and secret scanning; define the
  promotion path from test to staging and eventually production.
- Complete environment separation beyond the current synthetic demo project and keep production
  provisioning behind the Phase 0 legal-entity, DPO, and vendor approvals.
- Complete the staging deployment from a green pipeline.
- Complete privacy-safe monitoring wiring and verify it against representative traffic without exposing
  client, appointment, or clinical-note content.
- Complete the non-production backup restore exercise and record recovery ownership and elapsed time.
- Assign authority for the independent booking and video kill switches and verify that each action is
  audited.
- Set backup and log retention/disposal after the Phase 0 retention decision.
- Revisit whether the current narrow static-analysis scope is sufficient if later work exposes gaps.

## Closure rule

Phase 2 is officially closed with its consent work recorded here as deferred. Phase 0 and Phase 1
remain independently open until their own owners accept the evidence and decisions listed above.
