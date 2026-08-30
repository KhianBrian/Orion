# Architecture

## Decision

Use React and Vite in the browser, Supabase Auth and Postgres for identity and data, Supabase Edge Functions for privileged operations, and an approved private, token-gated video provider for live consultation.

Supabase is the approved recommendation because the product depends on relational data, atomic booking, server-enforced time rules, and correct behavior under concurrent booking attempts. PostgreSQL satisfies these needs without a separate custom backend for the controlled pilot, provided the production controls in Operations and Governance are implemented.

## Authority boundaries

```text
React UI -> Supabase client -> RLS-protected reads
React UI -> Edge Function -> validated transaction -> Postgres
                                   |
                                   -> audit event
React meeting screen -> authorised room lookup -> approved private video provider
```

- **React UI:** displays data, gathers input, handles loading and errors. It must not decide roles, booking success, cancellation eligibility, or meeting authorization.
- **CASL in the React UI:** derives an in-memory ability from the authenticated user's server-held profile role to keep navigation, controls, and route presentation consistent. It is a usability layer only; it never grants data access or replaces RLS or Edge Function checks.
- **Supabase Auth:** owns sign-up, sign-in, reset-password, and browser session lifecycle.
- **Postgres:** owns profiles, psychiatrists, availability, appointments, constraints, and RLS.
- **Edge Functions:** own booking, cancellation, psychiatrist provisioning, meeting-room authorization, and other privileged workflows.
- **Video provider:** provides the video layer only. Appointment authorisation is Orion's responsibility.

## Frontend structure

```text
src/
  app/          providers, routes, guards
  components/   shared presentational UI
  features/     auth, appointments, psychiatrists, meetings, profile
  lib/          Supabase client, date helpers, validation, error mapping
  constants/    roles, route paths, domain constants
```

Feature modules own their query/mutation functions and local UI. Shared code belongs in `components`, `lib`, or `constants` only after it is genuinely reused by more than one feature.

## API direction

- Use one configured Supabase client. Remove duplicate Axios clients and placeholder API services as each feature migrates.
- Use one CASL ability factory after authentication is implemented; derive it from the role read from `profiles`, never from email text, editable metadata, or a browser-stored role.
- Use direct RLS-protected reads only for low-risk, read-only data such as active psychiatrist summaries and authorized appointment lists.
- Use Edge Functions for every operation that changes appointment state or needs elevated authority.
- Never put a Supabase `service_role` key, database password, or video-provider secret in browser code.

## Scale path

The first release does not need real-time subscriptions. A refresh/reload after booking is sufficient. Add Supabase Realtime later only if the UI must immediately reflect slot changes from another browser.

Postgres with an indexed availability table and atomic booking transaction supports many simultaneous appointment requests. When volume grows, measure function latency, database connection use, and video-provider capacity before introducing queues, caching, or additional services.

## Privacy boundary

Public Jitsi is allowed only in an internal, non-production, synthetic-data mode to prove UI wiring. Real sessions require an approved private provider, server-authorised short-lived participant access, vendor review, and the controls in [the video decision record](video-provider-decision-record.md).
