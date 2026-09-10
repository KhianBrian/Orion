# Phase 20 — Integrated Launch Verification and Controlled Release

**R1 mapping:** Completes the verification, operational-readiness, and release-control portion of R1.5
after Phases 15–19 have produced dated as-built evidence.

**Status:** Blocked — all prior numbered phase gates, production-baseline controls, named approvals,
and company-owner go/no-go inputs must exist before release.

## Outcome

The complete real-launch feature chain is verified with synthetic data against production-equivalent
controls, every unresolved risk is visible to its accountable owner, rollback and recovery are
exercised, and the company owner receives an evidence-backed go/no-go package. Phase completion does
not itself deploy, enable real registration, process a real payment, create a real consultation, or
authorise real personal data.

## Where implementation draws its basis

1. The [authority order](../../README.md#authority-order),
   [production service charter](../../product/production-service-charter.md),
   [clinical safety policy](../../product/clinical-safety-and-telepsychiatry-policy.md), and
   [privacy governance](../../governance/privacy-governance.md).
2. The baseline [delivery plan](../delivery-plan.md), [Phase 6 operations gate](phase-6-operations.md),
   [test strategy](../test-strategy-and-test-data-policy.md), and applicable Phase 1 security,
   environment, backup, monitoring, and deployment evidence.
3. [R1.0](../launch-readiness/r1.0-governance-and-change-control.md),
   [R1.1](../launch-readiness/r1.1-data-consent-and-audit-extension.md), and the exact dated as-built
   audits from Phases 15, 16, 17, 18, and 19.
4. Fresh production-equivalent inspection of deployed migrations, grants, RLS, functions, provider
   configuration, feature flags, secrets, logging, alerts, backups, restore, and current tests.
5. Written approvals and residual-risk decisions from the named product, clinical, PIC/DPO/legal,
   security, finance, operations, and vendor owners.

No phase plan, passing unit suite, demo walkthrough, or provider sandbox result substitutes for these
inputs. If the implemented system differs from an as-built audit, the deployed system is contained
and the evidence is corrected before testing continues.

## Scope

- One traceable requirement-to-evidence matrix for Phases 15–19 and the applicable baseline gates.
- Integrated adult and approved-minor onboarding, payment booking, Google Meet, note-timing, and
  administrative-ticket journeys.
- Cross-role/RLS/API security, privacy/redaction, accessibility, performance, resilience, restore,
  provider outage, reconciliation, and kill-switch verification.
- Operations rehearsal, residual-risk register, rollback/activation checklist, and approval package.
- Controlled activation only after an explicit company-owner release decision through the approved
  deployment process.

## Non-goals

- Implementing unfinished Phase 15–19 features inside the verification phase.
- Waiving a clinical, privacy, legal, security, vendor, retention, or operational blocker because the
  happy path works.
- Using real patient, guardian, clinician, payment, ticket, note, or consultation data in testing.
- Treating a test payment or Google Meet call as approval of commercial terms, lawful processing, or
  clinical operation.
- Enabling all flags at once without an approved order, observation window, stop owner, and rollback
  condition.
- Automatically declaring production launch from a passing pipeline.

## Required decisions and evidence

| Authority | Decision/evidence |
| --- | --- |
| Company owner/product | Launch scope, geography, audience, activation order, observation periods, success/stop thresholds, residual-risk acceptance, and final go/no-go. |
| Clinical lead | Minor eligibility/refusal, session timing, outcomes/no-show, note behavior, emergency/referral copy, and clinical rehearsal approval. |
| PIC/DPO/legal | Notices/consents/terms, guardian/payment/Google/ticket data flows, field retention/disposal/rights/legal hold, subprocessors/transfers, and privacy release approval. |
| Security/platform | Environment separation, access/MFA scope, secrets, RLS/function evidence, monitoring/redaction, incident response, backup/restore, rollback, and unresolved-finding disposition. |
| Finance/operations/vendors | PayMaya settlement/refund/reconciliation, Google Workspace operation/outage, support staffing/SLA, runbooks, escalation contacts, quotas, and production credentials/configuration. |

## Provisional Tier 2 implementation plan

### P20-0 — Freeze the candidate and assemble evidence

- Identify the immutable release candidate: commit/revision, migration set, Edge Functions, frontend
  build, environment/configuration versions, provider settings, and feature-flag defaults.
- Read every Phase 15–19 as-built audit and map each gate item to a reproducible test, manual check,
  query, configuration record, or named approval.
- Re-query deployed state and reconcile drift before running acceptance. Do not edit applied
  migrations or repair evidence by assertion.
- List every open decision, deferred control, failed/untested case, owner, due condition, and effect on
  release. A release-blocking item cannot be relabelled residual risk without its owning authority.

### P20-1 — Integrated feature journeys

- Verify adult registration/eligibility through slot selection, reservation, PayMaya checkout,
  verified webhook, `booked`, Google Meet admission, scheduled end/note-window display, and support.
- Verify a minor remains non-bookable until the approved guardian/reviewer sequence completes, then
  follows the same payment and meeting path without exposing guardian evidence.
- Verify pending, refused, withdrawn, superseded, expired, abandoned, failed, duplicated, late,
  cancelled, provider-unavailable, out-of-window, closed-ticket, and retry states.
- Verify appointment outcomes, cancellation, rescheduling, refunds, and corrections only where their
  separately approved Phase 13/17 contracts exist; otherwise record a launch blocker.

### P20-2 — Cross-role and security acceptance

- Run the full table, view, function, API, route, navigation, and direct-request allow/deny matrix for
  patient, assigned/unassigned psychiatrist, approved operator/admin, guardian context,
  anonymous caller, and infrastructure role.
- Test signup/recovery metadata, ID substitution, direct writes, replay, forged browser returns,
  duplicate/out-of-order webhooks, copied meeting data, clock manipulation, ticket content, CSRF/XSS,
  enumeration, rate limits, and privilege escalation.
- Review function ownership/search paths, grants, RLS enable/force state, secret placement/rotation,
  dependency and code findings, and MFA for every owner-selected privileged role.
- Require disposition of every critical/high finding under the approved release rule.

### P20-3 — Privacy, clinical, accessibility, and performance acceptance

- Use synthetic sentinels to prove guardian, ticket, note, payment, meeting, and identity content does
  not leak through logs, audit metadata, analytics, URLs, errors, traces, screenshots, reports, or
  browser persistence.
- Verify notices, document versions, consent evidence, minimum collection, readers, export/rights,
  retention/disposal, legal holds, and backup treatment against the final data dictionary.
- Run clinical timing boundaries and the approved minor/refusal, emergency/referral, no-show,
  outcome, note-release, late-note, and early-end cases without inventing missing behavior.
- Complete keyboard, focus, semantics, contrast, screen-reader, reduced-motion, desktop/mobile,
  supported-browser, network, and agreed performance-budget checks for the entire journey.

### P20-4 — Resilience and operations rehearsal

- Exercise PayMaya duplicate/out-of-order/delayed/missing events, reconciliation, provider outage,
  refund/chargeback as approved, and independent booking/payment/webhook kill switches.
- Exercise Google outage/admission failure, scheduled end, approved removal/end-session behavior, and
  independent meeting creation/admission kill switches without public-video fallback.
- Exercise eligibility/guardian intake and ticket mutation kill switches, abuse/rate-limit response,
  privacy request, security incident, clinical escalation, access review, and support escalation.
- Restore a production-equivalent backup to an isolated environment, verify protected records and
  controls, and document recovery point/time evidence and backup deletion constraints.
- Rehearse rollback with forward/compensating changes and flag disablement while preserving all
  appointment, consent, payment, ticket, note, and audit history.

### P20-5 — Activation and rollback package

- Define the exact deployment order, compatibility window, provider credential/configuration checks,
  flag activation order, observation windows, dashboards/alerts, stop thresholds, and named actors.
- Keep real-user flags off by default. Separate guardian intake, payment initiation, webhook
  transition, Google meeting creation/admission, and tickets so each can fail closed independently.
- Define rollback/containment for each activation step; never fall back to direct booking, public
  Jitsi, placeholder consent, client-trusted payment, or unaudited access.
- Prepare patient/clinician/operator communications and status/support messages using only approved
  wording and destinations.

### P20-6 — Approval, controlled release, and as-built closure

- Publish the evidence matrix, test results, exercise reports, open-risk register, configuration
  inventory, rollback package, and recommendation to every accountable owner.
- Obtain written clinical, PIC/DPO/legal, security, finance, operations, and vendor-readiness sign-off
  required by the governance record.
- Obtain the company owner's explicit go/no-go for the immutable candidate, scope, activation order,
  and accepted residual risks.
- If and only if the decision is “go,” execute the separately approved deployment/activation process,
  observe its defined windows, and stop/roll back at the recorded threshold.
- Write the Phase 20 dated as-built/release audit recording what was actually enabled, evidence,
  approvals, deviations, incidents, residual risks, and follow-up owners. If “no-go,” record the
  blockers without claiming completion or launch.

## Expected files and evidence changed during execution

- Test/evidence manifests and synthetic integration/E2E/security/privacy/accessibility/performance
  suites; only genuine defects return to their owning phase for code or forward migrations.
- Production-equivalent environment, access, provider, monitoring, alert, backup/restore, deployment,
  feature-flag, rollback, and incident evidence with secrets and sensitive data excluded.
- Operations, privacy, clinical, payment, video, support, recovery, and activation runbooks.
- Decision register, implementation status, delivery plan, Supabase/provider records, residual-risk
  register, approval package, and dated Phase 20 as-built/release audit.

## Gate

Phase 20 completes only when:

- every applicable Phase 15–19 and baseline requirement is linked to passing reproducible evidence or
  an explicit non-applicable decision from its authority;
- full adult and approved-minor journeys plus denial/failure/retry cases pass with synthetic data;
- cross-role security, privacy/redaction, clinical, accessibility, performance, outage, restore,
  rollback, and independent kill-switch checks pass;
- no unresolved critical/high finding or unowned clinical/privacy/legal/vendor/operations blocker
  remains;
- all required named authorities approve the immutable release candidate and residual risks;
- the company owner records an explicit go decision before any real-user activation; and
- the dated Phase 20 as-built/release audit accurately records the resulting state.

If the decision is no-go, Phase 20 remains open even if its test suites pass.

## Overall flow after feature creation is complete

```text
Phase 15 protected data/RLS/audit foundation
  -> Phase 16 verified patient eligibility and guardian approval
  -> Phase 17 reserved slot + payment_pending + verified PayMaya event -> booked
  -> Phase 18 booked/eligible/related/time-bounded Google Meet admission
  -> Phase 19 patient-owned administrative support + audited operations
  -> Phase 20 integrated synthetic acceptance + restore/rollback/runbook exercises
  -> named clinical/privacy/security/finance/operations approvals
  -> company-owner go/no-go for an immutable candidate
  -> controlled flag activation with observation and stop thresholds
  -> dated release audit and ongoing review
```

At runtime after launch, the user-facing path remains:

```text
Register -> determine adult/minor eligibility -> guardian review when required
  -> select available time -> reserve slot -> PayMaya checkout
  -> verified provider event marks appointment booked
  -> eligible assigned participant joins approved Google Meet in the server time window
  -> psychiatrist records/releases notes under the separate clinical contract
  -> patient may use administrative support without changing domain authority
```

## Inputs not yet available

- Dated Phase 15–19 as-built audits and closure of their gates.
- Final baseline Phase 1/6 production-environment, access, monitoring, restore, incident, and release
  evidence.
- Complete clinical, DPO/legal, security, finance, operations, vendor, and company-owner approvals.
- An immutable production-equivalent release candidate and approved activation/rollback thresholds.
