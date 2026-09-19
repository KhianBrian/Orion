# Orion AI delivery and verification workflow

## Purpose

This is the repeatable process for implementing an approved Orion phase. It is written for an AI
working in the shared repository. The phase document and the Knowledge Base authority order remain
the source of truth; this runbook defines how to work safely, test the result, integrate it, and
publish it.

The normal flow is:

```text
approved phase
  -> inspect repository and authority documents
  -> isolated worktree and branch
  -> implementation with forward-only migrations
  -> local Docker/Supabase startup
  -> complete QA, including public and credentialed Playwright flows
  -> fix and re-verify
  -> merge verified worktrees into local main
  -> final verification on main
  -> explicitly authorized push to origin/main
  -> stop services and remove temporary worktrees/branches
```

All feature work stays synthetic and non-production unless the owners have explicitly approved a
different environment. A passing demo does not authorize real users or real clinical data.

The durable paper trail for each workstream has three layers: governing phase/authority documents,
one living phase packet under [`phase-packets/`](phase-packets/README.md), and a dated append-only
entry under [`../audit-trail/`](../audit-trail/README.md). The packet holds current state and the
handoff; the audit holds completed milestone history. Update the packet at a material checkpoint or
before handoff, not after routine exploration or every command. Do not rely on conversation history
as the handoff record.

## 1. Pre-flight and authority check

Before changing files:

1. Check the current branch, commit, worktrees, and repository status.
2. Record any existing user changes. Preserve them; do not stage, rewrite, or commit them as part of
   the phase.
3. Read the approved phase document, `delivery-plan.md`, `implementation-status.md`, and the
   relevant product, lifecycle, architecture, database/RBAC, QA, Supabase, governance, and audit
   documents.
4. Inspect applied local and linked migration history, deployed functions, route configuration,
   existing tests, and the current implementation before choosing a design.
5. Confirm the work is in scope and identify any unresolved clinical, privacy, retention, vendor, or
   owner decision. Stop if a missing decision would change the implementation or release boundary.
6. Confirm whether the user authorizes remote database migration, Edge Function deployment, Git push,
   or cleanup. Local implementation and testing do not automatically authorize those actions.
7. Open or create the relevant phase packet. Record the starting branch, worktree, current database
   target, and known uncommitted changes before editing.

Useful read-only checks:

```sh
git status --short --branch
git branch --show-current
git log -1 --oneline --decorate
git worktree list
supabase migration list --local
supabase migration list --linked
```

## 2. Isolated development worktrees

Create one branch and worktree per phase from the current local `main`:

```sh
git worktree add ../Orion-phase-N \
  -b codex/phase-N-description \
  main
```

Rules:

- Never implement a phase directly in the main worktree.
- Every phase starts from the current `main` commit.
- Keep each worktree scoped to one phase and one owner.
- Do not share mutable synthetic accounts between parallel tests.
- Do not merge or push an unverified branch.
- If a later phase depends on an earlier phase, complete and merge the earlier phase first, then
  rebase the later branch onto the updated local `main` before merging it.
- If rebase requires temporarily stashing user changes, verify they are identical in the main
  worktree, stash them with a clear temporary message, rebase, and restore them immediately.

## 3. Implementation rules

Implement the smallest complete vertical slice that satisfies the approved phase.

- Follow existing Orion architecture, UI tokens, route guards, feature patterns, and error handling.
- Keep browser calculations advisory only. Authorization, ownership, availability, conflict, and
  lifecycle rules must be enforced server-side.
- Use one server-authoritative workflow per domain. Do not create a competing booking or scheduling
  path.
- Use forward-only migrations. Never edit an applied migration; create a new timestamped migration
  for a correction.
- Preserve appointment, note, audit, consent, payment, and other history. Do not silently delete or
  move records to make a test pass.
- Add or update audit events, idempotency, concurrency protection, RLS, grants, and protected
  function boundaries whenever the phase changes a sensitive mutation.
- Do not add secrets, service-role keys, real identities, or production data to source, browser
  configuration, test artifacts, or Git.
- Record assumptions and intentional deferrals in the phase audit entry.

## 4. Environment and credentials

Use the ignored local environment file at:

`Orion_React_App/.env`

Use these tracked files only as variable-name templates:

- `Orion_React_App/.env.example`
- `Orion_React_App/.env.test.example`

Before QA, confirm the required variable names exist without printing their values. Current tests use
the browser Supabase URL and publishable/anonymous key, synthetic `DEMO_*` account passwords, and a
local-only `SUPABASE_SERVICE_ROLE_KEY` for database scripts. The service-role key must never be a
`VITE_*` variable or appear in browser code.

Authenticated Playwright testing is opt-in and must fail clearly when credentials are missing:

```sh
RUN_SCHEDULING_E2E=1 npm run test:e2e:authenticated
```

Do not paste credentials into chat or command output. Keep Playwright authentication state in the
ignored `playwright/.auth/` directory and never commit it.

Playwright output is consolidated under `Orion_React_App/test-artifacts/playwright/`. The HTML report
is in `report/`; traces, screenshots, videos, and per-test files are in `results/`. These generated
artifacts are ignored by Git and should be removed after diagnosis unless a short-lived review copy is
specifically needed.

## 5. Start local services automatically

Local integration QA may start services as part of the workflow:

1. Check Docker with `docker info`.
2. If Docker is unavailable, start Docker Desktop and wait until `docker info` succeeds.
3. Start the local Supabase stack:

   ```sh
   supabase start
   supabase status
   ```

4. Start local Edge Functions when the integration path needs them:

   ```sh
   supabase functions serve
   ```

5. Let Playwright start Vite automatically, or start the Vite server for a manual browser check.
6. Confirm the expected local ports and services before running tests.

This startup sequence is local-only. It does not apply migrations or deploy functions to the linked
remote project.

## 6. Complete QA, not only authorization QA

Playwright coverage is split by credential requirement, but the full suite must run:

- Public Playwright tests run without credentials and cover public routes, accessibility, responsive
  layout, navigation, and public failure states.
- Credentialed Playwright tests use the synthetic patient, psychiatrist, and admin accounts and cover
  authenticated routes, complete user journeys, and authorization allow/deny behavior.
- Both groups are part of the full Playwright run. Credentialed tests must not replace public tests.

Run focused checks first, then the complete relevant set:

```sh
npm run lint
npm run build
npm run test:unit
npm run test:db:booking
npm run test:db:cancellation
npm run test:db:rls
npm run test:db:phase2
npm run test:db:phase4
npm run test:db:phase14
supabase db lint --local
RUN_SCHEDULING_E2E=1 npm run test:e2e:authenticated
npm run test:e2e
```

Only run database scripts that exist and are relevant to the current phase, but always run the
affected database, RLS, and concurrency checks. A phase that changes a route or user journey needs
desktop and mobile Playwright coverage.

For every changed workflow, verify:

- success, loading, empty, error, retry, and conflict states;
- real accessible clicks and form submissions;
- desktop and mobile behavior where the route is patient-facing;
- authenticated allow and deny paths for every sensitive action;
- database ownership and RLS allow/deny behavior;
- idempotent retries and concurrent requests where state can race;
- audit event creation and safe error messages;
- migration lint, function grants, and protected service boundaries.

If a test fails, inspect the trace, screenshot, HTML report, database output, or service logs. Classify
the cause before changing code. Fix the smallest relevant issue, rerun the focused check, then rerun
the affected layer and the full relevant suite. Do not hide failures with arbitrary waits, force
clicks, disabled tests, or silent retries.

## 7. Merge verified worktrees into local main

After a phase passes its checks:

```sh
git status --short --branch
git diff --check
git log -1 --oneline --decorate
```

Merge into local `main` in dependency order:

```sh
git merge --no-ff codex/phase-N-description \
  -m "Merge Phase N description"
```

When several worktrees exist, merge the foundation first. Rebase dependent branches after each
earlier merge so shared commits are not duplicated. Preserve uncommitted user changes in the main
worktree; they are not part of the phase merge.

The website is always deployed from verified `main`. A feature worktree may run local verification,
but it must not be used as the website deployment source. Signaling and TURN are separately deployed
runtime services and their endpoints/secrets must be recorded in the phase packet without
recording secret values.

## 8. Final check on local main

Before publishing:

```sh
git fetch origin main
git status --short --branch
git log --oneline origin/main..main
git diff --check origin/main..main
npm run lint
npm run build
npm run test:unit
supabase db lint --local
npm run test:e2e
```

Also confirm that expected migrations exist, no secret is staged, the remote migration state is
understood, and all user-owned uncommitted files remain untouched.

## 9. Remote actions and publishing

Remote Supabase actions and Git publishing are separate approvals.

Only after the user confirms the target Supabase project and authorizes deployment:

```sh
supabase db push --linked --yes
supabase migration list --linked
supabase functions deploy <function-name>
supabase functions list
```

Only after the user authorizes Git publishing and the final main checks pass:

```sh
git push origin main
git status --short --branch
git log -1 --oneline --decorate
git ls-remote origin refs/heads/main
```

The local `main` commit and remote `origin/main` commit must match. Never assume that code-push
authorization also authorizes a remote database or function deployment.

## 10. Cleanup

After a successful push, remove temporary worktrees and fully merged local branches only after
checking that they contain no unique user changes:

```sh
git worktree list
git -C ../Orion-phase-N status --short
git worktree remove --force ../Orion-phase-N
git branch -d codex/phase-N-description
```

Stop local Vite, Playwright, Edge Functions, Supabase, and Docker services when requested. Confirm
that no Orion processes or expected local ports remain. Local Supabase volumes may be retained for a
future run unless the user explicitly requests data removal.

## Completion record

Every completed phase must leave an audit entry containing:

- date, branch, worktree, merge commit, and final environment;
- approved scope and any assumptions or deferrals;
- user-visible flow and server/database flow;
- migrations, functions, routes, tests, and security boundaries changed;
- exact verification commands and results;
- remote deployment status, if authorized;
- remaining risks and items deliberately not performed.

The phase packet must also be updated with the final branch, merge commit, remote push result,
current deployment state, and the single next handoff action.
