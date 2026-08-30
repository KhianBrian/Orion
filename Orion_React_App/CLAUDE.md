# Orion React App — Claude Code Guide

> This is the Claude Code-compatible entry point for this workspace, mirroring `agent.md` in this
> same folder. Claude Code auto-loads `CLAUDE.md` from the working directory at session start;
> `agent.md` is not part of that auto-load convention, so without this file Claude Code would miss
> these rules unless something else surfaced `agent.md` directly. Keep the two in sync — if you edit
> one, edit the other.

Read this file before planning, modifying, reviewing, testing, or releasing the Orion React application.

The authoritative rules live in [`../Knowledge-base`](../Knowledge-base/README.md). Orion is planned for a controlled real-market pilot with real clients and psychiatrists. The current source is a prototype; mocked auth, local persistence, public Jitsi, and hardcoded appointment data are not production patterns.

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

## Before handoff

Run relevant unit, RLS, and Playwright tests, then `npm run lint` and `npm run build`. Update the appropriate knowledge-base decision, policy, or audit entry whenever a durable boundary changes.
