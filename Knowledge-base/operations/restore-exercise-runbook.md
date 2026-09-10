# Non-Production Restore Exercise Runbook

**Status:** Procedure prepared — exercise not yet executed.

**Purpose:** Demonstrate that a synthetic staging backup can be restored into an isolated scratch target
and used by Orion. A backup that has not been restored is not Phase 1 recovery evidence.

## Safety boundary

- Use staging or test data only; never use production data for this exercise.
- Restore into a separately named scratch target, never over the source project.
- Keep dump files outside Git and delete them according to the approved retention rule after verification.
- Do not paste connection strings, passwords, service keys, or database dumps into the audit document.

## Preconditions

- Name the restoration owner and an independent reviewer.
- Confirm the current Supabase plan's backup/snapshot capability and retention.
- Record the source environment, database version, migration revision, recovery objective, and acceptable
  data-loss window.
- Confirm the scratch target is isolated and has no application traffic.

## Procedure

1. Record the exercise start time and the source migration revision.
2. Create a backup using the approved Supabase plan mechanism. If the plan does not provide a usable
   backup, record that limitation and stop; do not substitute an unapproved production procedure.
3. Create or select an isolated scratch target with matching database compatibility.
4. Restore the backup using the provider's documented restore process or the approved CLI procedure.
5. Verify migration history, synthetic profiles, appointments, availability, RLS posture, and the
   application health/smoke path against the scratch target.
6. Record the end time, elapsed restore duration, result, defects, and any data-loss observation.
7. Remove the scratch target and temporary backup artifacts according to the approved retention rule.

## Evidence record

| Field | Value |
| --- | --- |
| Exercise date | YYYY-MM-DD |
| Source environment/project | Record without credentials |
| Scratch target | Record without credentials |
| Restoration owner | Name |
| Reviewer | Name |
| Source migration revision | Commit or migration identifier |
| Backup mechanism and plan | Record product/plan |
| Started / completed | Timestamp / timestamp |
| Elapsed time | Duration |
| Validation result | Pass / fail |
| Data-loss observation | None or describe without sensitive data |
| Follow-up | Owner and due date |

Attach provider output or screenshots only after redacting credentials, URLs containing secrets, personal
data, room identifiers, and consultation content.
