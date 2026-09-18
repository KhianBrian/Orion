# Orion React App — Agent Guide

Read this file before planning, modifying, reviewing, testing, or releasing the Orion React application.

The authoritative rules live in [`../Knowledge-base`](../Knowledge-base/README.md). Orion is planned for a controlled real-market pilot with real clients and psychiatrists. The current source is a prototype; mocked auth, local persistence, public Jitsi, and hardcoded appointment data are not production patterns.

For Claude/Codex coordination, also read [`../Knowledge-base/engineering/ai-agent-coordination.md`](../Knowledge-base/engineering/ai-agent-coordination.md). Phase 16 and later remain planning-gated until all required decisions and prerequisites are documented and approved.

## Required reading by task

| Task | Read first |
| --- | --- |
| Feature, navigation, copy, or scope | [`product/product-scope.md`](../Knowledge-base/product/product-scope.md), [`product/production-service-charter.md`](../Knowledge-base/product/production-service-charter.md), [`product/pilot-decision-register.md`](../Knowledge-base/product/pilot-decision-register.md) |
| Appointment, cancellation, reschedule, availability, time | [`product/appointment-lifecycle.md`](../Knowledge-base/product/appointment-lifecycle.md) |
| Eligibility, clinician workflow, consent, crisis, or emergency | [`product/clinical-safety-and-telepsychiatry-policy.md`](../Knowledge-base/product/clinical-safety-and-telepsychiatry-policy.md) |
| Data, auth, Supabase, role, RLS, API, or audit | [`architecture/database-and-rbac.md`](../Knowledge-base/architecture/database-and-rbac.md), [`architecture/access-control-and-audit-policy.md`](../Knowledge-base/architecture/access-control-and-audit-policy.md) |
| Video, Jitsi, Daily, LiveKit, or tokens | [`architecture/video-provider-decision-record.md`](../Knowledge-base/architecture/video-provider-decision-record.md) |
| Personal data, consent, vendors, retention, privacy notice | [`governance/privacy-governance.md`](../Knowledge-base/governance/privacy-governance.md), [`governance/data-classification-and-data-dictionary.md`](../Knowledge-base/governance/data-classification-and-data-dictionary.md) |
| Code, refactor, dependency, or review | [`engineering/engineering-conventions.md`](../Knowledge-base/engineering/engineering-conventions.md) |
| Routes, clicks, QA, tests, or release verification | [`engineering/qa-and-playwright.md`](../Knowledge-base/engineering/qa-and-playwright.md), [`engineering/test-strategy-and-test-data-policy.md`](../Knowledge-base/engineering/test-strategy-and-test-data-policy.md) |
| Environments, deployment, secrets, outage, or incident | [`operations/environment-release-and-secrets.md`](../Knowledge-base/operations/environment-release-and-secrets.md), [`operations/operations-and-incident-response.md`](../Knowledge-base/operations/operations-and-incident-response.md) |
| Ordering work or release progress | [`engineering/delivery-plan.md`](../Knowledge-base/engineering/delivery-plan.md) |
| Historical implementation behavior | [`audit-trail/README.md`](../Knowledge-base/audit-trail/README.md) |

## Non-negotiable rules

- Never infer roles from email, client state, editable metadata, or URLs.
- Never use `localStorage`, Redux persistence, logs, analytics, screenshots, URLs, or test artifacts for sensitive client/appointment data.
- Never put service keys, provider secrets, or credentials in `VITE_*`, browser code, Git, or fixtures.
- Never use public Jitsi, static/public room URLs, or client-created rooms for real sessions.
- RLS and protected server functions are authoritative; route guards only improve navigation.
- Do not add a second booking flow, duplicate client, or new dependency before applying the minimal implementation ladder.
- Do not guess clinical, privacy/legal, retention, vendor, or emergency policy. Escalate it to the named owner.
- Use synthetic data in all tests and non-production environments.

## Phase-status synchronization

When planning status changes, update the canonical `../Knowledge-base/engineering/phase-status.json`
registry and automatically run `npm run phase-status:sync` followed by `npm run phase-status:check`.
Fix every stale or conflicting indexed Markdown reference before handoff. This is an AI workflow
requirement; the user should not have to run the check manually. New phase documents must be
registered in the canonical file; the verifier checks for unregistered, unindexed, and conflicting
phase records.

## Before handoff

Run relevant unit, RLS, and Playwright tests, then `npm run lint` and `npm run build`. Update the appropriate knowledge-base decision, policy, or audit entry whenever a durable boundary changes.
