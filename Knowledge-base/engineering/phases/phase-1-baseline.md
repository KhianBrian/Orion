# Phase 1 — Secure Platform Baseline

**Tier 2 status:** Planned 27 August 2026, for non-production scope only. The implementation plan is below the charter.

## Purpose

Establish the environments, secret handling, delivery pipeline, migration process, monitoring,
backup and restore capability, and synthetic test-data policy that every later phase depends on
mechanically. Nothing in Phases 2–6 can be built safely, reviewed, or rolled back without this.

## Gate

The delivery plan sets verification rather than a policy gate: a secret scan, a least-privilege access
review, a staging deployment, and a non-production restore exercise all completed successfully.

## Consumes

Phase 0 register answers Q2 (legal entity and DPO) and Q9 (vendor and data-transfer terms) — but only
for **production** vendor accounts and production data. Test and staging environments with synthetic
data may be created now.

## Blocked by

- **Q2** — the legal entity and appointed DPO are required before production vendor accounts are opened in the operating entity's name. **Deferred by the owners on 27 August 2026**, so production provisioning stays behind this line indefinitely for now.
- **Q9** — vendor and data-transfer terms must be reviewed before production use of Supabase or any video provider. **Also deferred**, and now more consequential: the Q6 decision brings session notes into scope, so production Supabase use means storing health information.

Neither blocks non-production work. The implementation plan must draw this line explicitly and keep
production provisioning behind it. Because both are deferred rather than scheduled, the plan should
make the non-production scope self-sufficient rather than assuming production setup follows shortly.

## Deliverables

- Separate test, staging, and production environments with no shared credentials or data paths between them.
- An access register recording who holds which access to which environment, at least privilege.
- Secret management with no service key, provider secret, or credential in `VITE_*`, browser code, Git history, or fixtures.
- CI/CD covering lint, type checks, tests, and build, with a defined promotion path between environments.
- A documented, append-only migration process — authoring convention, review, application order, and rollback stance.
- Privacy-safe monitoring that captures operational signal without sensitive client or appointment data.
- A backup and restore plan, proven by a non-production restore exercise.
- A synthetic test-data policy and seed mechanism that all later phases use.

## Authoritative documents

- [Environment, release and secrets](../../operations/environment-release-and-secrets.md) — the primary authority for this phase.
- [Operations and incident response](../../operations/operations-and-incident-response.md) — monitoring and recovery expectations.
- [Engineering conventions](../engineering-conventions.md) — code, dependency, and review conventions.
- [Test strategy and test data policy](../test-strategy-and-test-data-policy.md) — synthetic data requirements.
- [Threat model and security architecture](../../architecture/threat-model-and-security-architecture.md) — the controls this baseline must implement.

## What this fixes for later phases

The migration process defined here determines how every Phase 2–5 schema change is authored, reviewed,
and applied — including whether migrations are branch-based or manually promoted. The secret
management approach determines how Phase 5 issues short-lived video participant tokens server-side.
Later implementation plans should reference this phase's as-built process rather than restating it.

## Constraints carried from policy

- Append-only migrations. Appointment, consent, and audit history is never deleted to roll back a release.
- Independent booking and video kill switches are part of the rollback design and should be provisioned here even though Phase 4 and 5 consume them.
- Synthetic data in all tests and non-production environments, without exception.

---

# Tier 2 — Implementation Plan

**Written:** 27 August 2026, from the workspace as inspected on that date. The charter's instruction
to make the non-production scope self-sufficient rather than assuming production follows shortly is
the organising principle of this plan, because both blocking questions were deferred rather than
scheduled.

## Verified starting state

| Checked | Finding |
| --- | --- |
| `git status` at the workspace root and in `Orion_React_App/` | **Not a git repository.** No version control exists. |
| Git history for secrets | Not applicable, and this is a fact worth using rather than reporting. There is no history to scan, so history can be kept clean by construction if the first commit is composed carefully. |
| `find` for `supabase/` | Absent. No project, no `config.toml`, no migrations, no seed. |
| `find` for `.github/` | Absent. No CI, no workflow, no secret scanning. |
| `Orion_React_App/.env` | Present, holding `VITE_API_BASE_URL` only. No secret. **Not listed in `.gitignore`.** |
| `.env.example` | Absent. [Environment, release and secrets](../../operations/environment-release-and-secrets.md#secrets) requires a committed example naming every variable with no values. |
| `package.json` scripts | `dev`, `build`, `lint`, `preview`, `test:e2e`, `test:e2e:ui`, `test:e2e:report`. No test runner beyond Playwright; no type-check script. |
| Toolchain | node 22.23.2, npm 12.0.2, git 2.50.1, Supabase CLI 2.109.1. **No container runtime installed**, so `supabase start` will not run locally as things stand. |
| `Orion_React_App/Orion/` | Roughly forty files of the legacy static prototype, which [product scope](../../product/product-scope.md#out-of-scope) places out of scope. Includes image files whose names suggest photographs of identifiable people. |

## The gate is not blocked

Worth stating early, because the charter's *Blocked by* section reads as though the whole phase is
waiting. The [delivery plan](../delivery-plan.md#phase-1--secure-platform-baseline) sets this phase's
verification as a secret scan, a least-privilege access review, a staging deployment, and a
non-production restore exercise. **All four are achievable entirely within non-production scope.**

What Q2 and Q9 block is one deliverable — provisioning production — not the phase's verification.
This plan therefore treats production as designed and documented but deliberately unprovisioned, and
expects the phase to reach its gate while that remains true.

## Relationship to the demo milestone

The [demo milestone](demo-milestone.md) is the immediate priority and consumes a small subset of this
phase: version control, an ignore list, a `.env.example`, one non-production Supabase project, and a
first migration. If the demo runs first, this phase formalises what the demo established rather than
repeating it — and the plan below is written to be read either way. Two consequences:

- The demo's single project becomes this phase's **staging** environment. It is not renamed or recreated; it is documented, added to the access register, and given a promotion path.
- Nothing the demo did is treated as evidence for this phase's gate. A working environment is not a secret scan, an access review, or a proven restore.

## Execution update — 30 August 2026

**Partially completed ✅** The demo has established a Git repository, an ignored local-secret pattern
with a value-free `.env.example`, one hosted non-production Supabase project, and append-only database
migrations. The project is Orion-scoped and contains synthetic-data-only schema; the setup is recorded
in [Supabase integration](../supabase.md).

This phase remains open. CI, secret scanning, a written access register, environment separation beyond
the single demo project, a staging deployment, monitoring, and a restore exercise have not been
completed. No production project or production data path exists.

## Work breakdown

### P1-1 — Version control and repository composition

1. Initialise the repository at the workspace root, so the knowledge base and the application move together and a policy change and the code change it authorises can appear in one reviewable commit.
2. Compose the first commit deliberately. `.gitignore` covers `.env`, `.env.*.local`, `node_modules`, `dist`, `playwright/.auth/`, `playwright-report/`, `test-results/`, Supabase CLI scratch directories, and `.DS_Store`. Verify the staged file list before committing rather than after — the absence of history is an advantage that exists exactly once.
3. Decide the legacy `Orion/` prototype. It is out of scope, it is not the product, and it contains images that appear to depict identifiable people. **Recommendation: keep it out of the repository entirely** and archive it separately. Confirm the consent and licensing position for any image of an identifiable person before it is committed or served, including the copies already under `public/images/`. This is a question to answer, not one this plan answers.
4. Add `.env.example` naming every variable with no values.

### P1-2 — Environments

Three environments, two of them real.

| Environment | Form | State after this phase |
| --- | --- | --- |
| Test | Ephemeral Supabase stack started per CI run | Provisioned. CI runners provide the container runtime the developer's machine lacks, which avoids both a local Docker install and a third vendor project. |
| Staging | The hosted non-production project the demo created | Provisioned, documented, and deployed to. |
| Production | Not created | Designed and documented. Held behind Q2 and Q9. |

No shared credentials and no data path between them, per [environment separation](../../operations/environment-release-and-secrets.md#environment-separation).
Staging holds synthetic data only. The line at which production may be provisioned is written into
the runbook so that it is a decision someone has to take rather than a step someone can drift into:
the operating entity identified, the DPO appointed, and the vendor terms reviewed.

### P1-3 — Secrets and the access register

- Only the project URL and the anon key may be `VITE_*`. Everything else — the service role key, any video-provider key — is held in the platform's server-side configuration and reaches nothing but an Edge Function. [Engineering conventions](../engineering-conventions.md#data-and-security-conventions) and the [threat model](../../architecture/threat-model-and-security-architecture.md#principal-threats-and-controls) both make this a hard line.
- Secret scanning runs in CI on every push and on the full history. With no prior history, a clean first result is meaningful rather than merely inherited.
- The access register records who holds which access to which environment, at what privilege, and when it was last reviewed. For a single-developer project it is a short document, and it still has to exist — [Phase 6](phase-6-operations.md) reviews it, and an access review with nothing to review is not a review.
- A rotation note: any secret that may have been exposed is rotated and the exposure recorded as an incident, per the same document.

### P1-4 — Migration process

This is the deliverable with the longest reach. The [phases index](README.md#two-tier-planning) notes
that the process defined here determines mechanically how every Phase 2–5 schema change is authored,
reviewed, and applied.

- Migrations live in `supabase/migrations/`, timestamped, one concern per file.
- **Append-only.** A migration that has been applied to any shared environment is never edited. A mistake is corrected by a new forward migration, per the [delivery plan's rollback stance](../delivery-plan.md#rollback).
- Every table migration carries its RLS, grants, policies, indexes, and tests in the same change, per [engineering conventions](../engineering-conventions.md#data-and-security-conventions).
- Application order is test, then staging, then — when it exists — production. A migration reaches staging only through CI, so the applied set is always reconstructible from the repository.
- Destructive operations against appointment, consent, note, or audit data are prohibited outright rather than discouraged. The [delivery plan](../delivery-plan.md#rollback) states that history is never deleted to roll back a release.
- The convention is written down as a short document in the repository, because Phase 2's plan is written against the process that actually exists.

### P1-5 — CI

CI runs on every push: lint, tests, build, dependency audit, and secret scan, against an ephemeral
test stack. The [environment, release and secrets](../../operations/environment-release-and-secrets.md#delivery)
document sets this list; two notes on making it real rather than nominal.

**On "type checks".** The codebase is plain JavaScript with no TypeScript and no type-check script.
The deliverable can be satisfied honestly in one of three ways: treat lint as the static-analysis
layer and record that decision; add a `jsconfig.json` with `checkJs` scoped initially to the pure
helpers in `src/lib/`; or migrate to TypeScript. **Recommendation: the second**, because it catches
real errors in exactly the code where a wrong result is a wrong cancellation decision, and it costs
one configuration file. A TypeScript migration is not proposed — the [minimal implementation
ladder](../engineering-conventions.md#minimal-implementation-ladder) does not support it here, and no
knowledge-base document requires it.

**On the test suites.** The Playwright suite exists and is prototype smoke coverage; the RLS and unit
layers do not exist yet and arrive with the demo milestone and Phase 2. CI should fail on a missing
suite rather than silently pass an empty run.

Promotion: a green run on the default branch deploys to staging. Production promotion is defined in
the runbook and is not wired up, because there is nothing to wire it to.

### P1-6 — Kill switches

The charter asks for these here even though Phase 4 and Phase 5 consume them, and the
[delivery plan](../delivery-plan.md#rollback) requires that they disable behaviour without deleting
history.

Implement as server-side state that the privileged functions read on each call — not as a client flag
and not as a build-time variable, since both would require a deploy to operate and neither is
available during an incident. Booking and video are **separate** switches, each operable without the
other, because the [incident flow](../../operations/operations-and-incident-response.md#incident-flow)
contains by disabling video-token issuance or bookings as appropriate, which presumes they are
independent. Each throw of a switch writes an audit event naming who threw it.

Who is permitted to throw them is register Q10, still open. Build the mechanism; leave the authority
assignable.

### P1-7 — Monitoring

Availability, errors, booking conflicts, authentication and video-admission denials, function latency
and cost, and backup results — the list in [operations and incident response](../../operations/operations-and-incident-response.md).
Identifiers and event codes only. No client name, no appointment detail, and — once Phase 2 exists —
no note content in any log, alert, or dashboard, per [data classification](../../governance/data-classification-and-data-dictionary.md#classification).

At this stage there is nothing real to observe, so the deliverable is the wiring and the redaction
discipline, verified by inspecting what the pipeline actually captures rather than by what it was
intended to capture.

### P1-8 — Backup and restore

Confirm what the chosen Supabase plan actually provides rather than assuming a backup exists. Then
perform the exercise the gate requires: take a backup of staging, restore it into a scratch target,
and verify the restored data. [Environment, release and secrets](../../operations/environment-release-and-secrets.md#recovery)
is unambiguous that a backup which has not been restored in a non-production exercise is not accepted
as verified recovery.

Record the recovery objectives, the named restoration owner, and the elapsed time the exercise
actually took — the last of these being the only honest input to a recovery objective.

### P1-9 — Synthetic seed mechanism

Generalise the demo's five-account seed into the mechanism all later phases use: deterministic,
re-runnable from an empty database, synthetic data only, and obviously synthetic on its face.
Credentials for seeded accounts live outside the repository and are named in `.env.example` only.
Required by the [test-data policy](../test-strategy-and-test-data-policy.md#test-data), which admits
no exception outside production — and, since production does not exist, admits none at all.

## Gate evidence

| Verification | Evidence |
| --- | --- |
| Secret scan | A clean CI scan across the working tree and the full history, with the scanner and its configuration committed |
| Least-privilege access review | The access register, reviewed and dated, with each entry justified |
| Staging deployment | A deploy from a green CI run, with the applied migration set reconstructible from the repository |
| Non-production restore exercise | A backup restored into a scratch target, verified, with the elapsed time recorded |

None of the four requires Q2 or Q9.

## Policy gaps this plan did not fill

| Gap | Owner | How this plan handles it |
| --- | --- | --- |
| Legal entity and DPO (Q2) | Company owners | Production stays unprovisioned. The line is written into the runbook rather than left to judgement. |
| Vendor and data-transfer terms (Q9) | Company owners with DPO or legal advice | No production vendor use. Non-production use of Supabase with synthetic data is explicitly permitted by the charter and is what this plan relies on. |
| Who may throw the kill switches (Q10) | Company owners | The mechanism is built; the authority is left assignable. |
| Retention, including of logs and backups (Q11) | Company owners with DPO advice | Backups and logs are created without a retention period being set. Note that this is itself an open item: a backup with no disposal rule is a retention decision made by default, and it should be recorded as pending rather than as settled. |
| Consent and licensing for images of identifiable people | Company owners | Flagged in P1-1. Not resolved, and not resolvable by inspecting the files. |

## Deferred simplifications to record on closure

| Area | Deferred | Close when |
| --- | --- | --- |
| Environments | Production designed but not provisioned | Q2 and Q9 answered |
| Static analysis | Type checking scoped to pure helpers rather than the whole codebase | Only if a later phase shows the narrower scope missing real defects |
| Monitoring | Wiring and redaction verified against synthetic traffic only | Phase 6, against real operational load |
| Backups | Retention and disposal of backups unset | Q11 |

## Inputs I did not have

1. **Which Supabase plan the project is on**, which determines what backup capability actually exists and therefore what the restore exercise can exercise.
2. **Whether the demo milestone has run**, and if so which project it created and who holds access. The plan assumes that project becomes staging; verify it exists before planning around it.
3. **Whether a container runtime is acceptable on the developer's machine.** The CI-only test environment is a way around its absence, not a preference — a local stack is materially better for iterating on migrations.
4. **Where the repository will be hosted**, which determines the CI provider, the secret-scanning tool, and whether the access register has a second system to describe.
5. **The consent and licensing position for the image assets**, which cannot be determined from the files.
6. **Whether an owner wants staging reachable by them**, which changes whether staging is protected by an access control or merely unadvertised. Unadvertised is not protection.
