# Repeatable synthetic human checks

Use this checklist after frontend changes that could affect booking, appointment display, cancellation,
errors, toasts, navigation, or pagination. It is strictly for Orion's non-production five-account
synthetic demo.

## Baseline result — 2 September 2026

The normal booking/cancellation check and the within-24-hour cancellation-denial check were both
completed successfully with the fixed synthetic accounts. Repeat this checklist after a relevant
frontend change; each run must use freshly seeded fixtures rather than a previously booked slot.

## Seed fresh fixtures

From `Orion_React_App`, run:

```bash
npm run seed:human-checks
```

The command requires the ignored local `.env` with `SUPABASE_URL` and
`SUPABASE_SERVICE_ROLE_KEY`. It removes only the slots, appointments, and related audit events that
its previous run recorded in the ignored `playwright/.human-check-fixtures.json` manifest. It then
creates two new 45-minute open slots:

1. A normal booking/cancellation slot at least 48 hours ahead: Alex Reyes with Dr. Maya Santos.
2. A cancellation-denial slot roughly 12 hours ahead: Sam Cruz with Dr. Luis Navarro.

The command prints the exact Manila times. Do not use other existing slots for this check.

## Accounts

| Role | Synthetic account | Email |
| --- | --- | --- |
| Patient | Alex Reyes | `patient.one@demo.orion.invalid` |
| Patient | Sam Cruz | `patient.two@demo.orion.invalid` |
| Psychiatrist | Dr. Maya Santos | `psychiatrist.one@demo.orion.invalid` |
| Psychiatrist | Dr. Luis Navarro | `psychiatrist.two@demo.orion.invalid` |
| Admin | Orion Demo Administrator | `admin@demo.orion.invalid` |

Passwords are local-only credentials in the ignored `.env`; never include them in documentation,
screenshots, or an audit entry.

## Check 1 — Normal booking and cancellation

1. Sign in as Alex Reyes.
2. Open **Book an appointment**, select the exact Dr. Maya Santos slot printed by the seed command,
   and confirm booking.
3. Verify the success message and the appointment under **My appointments**.
4. Sign in as Dr. Maya Santos and verify the appointment under **My appointments**.
5. Sign back in as Alex Reyes, cancel that same appointment, and verify the cancellation success
   message and cancelled status.

Expected result: booking, assigned-psychiatrist visibility, and cancellation all succeed.

## Check 2 — Cancellation denial

1. Sign in as Sam Cruz.
2. Open **Book an appointment**, select the exact Dr. Luis Navarro slot printed by the seed command,
   and confirm booking.
3. Open **My appointments**, select that same appointment, and attempt cancellation.

Expected result: the server denies the cancellation because the appointment is within 24 hours. The
appointment remains booked; do not interpret the UI state alone as the rule source.

## Record the outcome

For a frontend regression check, record the date, UI change under review, pass/fail result for both
checks, and any error/toast/copy issue found. Keep the evidence synthetic and do not capture local
credentials, service keys, room names, or JWTs.
