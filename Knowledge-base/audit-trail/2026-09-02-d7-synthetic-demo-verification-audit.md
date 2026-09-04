# D7 synthetic-demo verification audit — 2 September 2026

## Scope and boundary

This audit records verification of Orion's five-account synthetic demo only. All database fixtures,
accounts, appointments, and browser activity used synthetic data. It does not authorise real users,
real appointments, or real video sessions, and it does not close any Phase 0–6 release gate.

## Automated coverage added

- Pure timing tests now verify the exact 45-minute duration, the strict `> 24 hours` patient
  cancellation boundary, and the D5 15-minute early-join-through-session-end window.
- A database booking test verifies idempotent retry and that concurrent requests for one slot yield
  exactly one booking and one `slot_unavailable` response.
- A database RLS test uses all five synthetic accounts and verifies appointment read allow/deny:
  the related patient and assigned psychiatrist can read, while the other patient, other
  psychiatrist, and admin cannot. It also verifies a patient cannot update `profiles.role`.
- Credentialed desktop and Pixel 5 scheduling tests now create per-project synthetic slots and
  remove the temporary slot, appointment, and related audit events after the run. This prevents
  parallel tests from sharing mutable demo data.
- The patient booking UI excludes open slots whose start time has already passed. The server remains
  authoritative for booking eligibility.

## Fresh verification evidence

| Command | Result | What it established |
| --- | --- | --- |
| `npm run test:unit` | 3 passed | Appointment duration, cancellation boundary, and meeting-window helper boundaries. |
| `npm run test:db:booking` | Passed | Idempotency and single-winner concurrent booking transaction behavior. |
| `npm run test:db:cancellation` | Passed | Ownership, 24-hour denial, cancellation idempotency, slot reopening, and audit behavior. |
| `npm run test:db:rls` | Passed | Appointment relationship RLS allow/deny and protected role field. |
| `RUN_SCHEDULING_E2E=1 npm run test:e2e:authenticated` | 4 passed | Patient booking, assigned-psychiatrist visibility, and cancellation on desktop Chromium and Pixel 5 with isolated fixtures. |
| `npm run test:e2e` | 10 passed, 4 credential-gated tests skipped | Public navigation and unauthenticated protected-route behavior across desktop and mobile. |
| `npm run lint` | Passed | Lint-clean source and test configuration. |
| `npm run build` | Passed | Production build completed; the existing bundle-size warning remains. |
| `git diff --check` | Passed | No whitespace errors in the working patch. |

## Video evidence

The two-browser desktop/mobile JaaS call, copied-room denial, leave/re-entry, full meeting-access
matrix, and issued-token leak inspection were completed for D5 and are recorded in the
[D5 completion audit](2026-09-02-d5-jaas-demo-video-completion-audit.md). D7 did not rerun live
camera/microphone verification because that check requires a human-controlled device and is already
valid D5 evidence for the same unchanged synthetic-video boundary.

## Human cancellation checks — 2 September 2026

The normal booking/cancellation and within-24-hour cancellation-denial checks were completed
successfully with the fixed synthetic accounts. They are now repeatable through
`npm run seed:human-checks` and the [synthetic human-check checklist](../engineering/repeatable-human-checks.md).
The command refreshes only its recorded synthetic fixtures.

## Deferred owner walkthrough

The five-account owner walkthrough is deliberately deferred until the frontend changes are accepted.
It remains a final showcase: a reviewer signs in as each fixed synthetic account, observes
role-correct navigation, booking and psychiatrist visibility, and joins the labelled two-person
synthetic call. It is not a dependency for D7 verification completion.

## Result

D7 is complete for the synthetic demo verification boundary. The owner walkthrough is deferred to
final frontend acceptance. Phase 5 remains blocked for real users pending the recorded clinical,
privacy, vendor, security, and operations approvals.
