# Engineering Conventions

## Core principles

- Prefer the smallest clear implementation that satisfies the approved scope.
- Reduce lines by deleting duplication and dead code, not by sacrificing names, tests, validation, or readability.
- One source of truth per domain; do not duplicate routes, API clients, role checks, mock arrays, or business rules.
- Keep each function responsible for one named action. Extract a helper when logic has a stable name or is reused.
- Browser code is untrusted. Server/database rules are authoritative.

## Minimal implementation ladder

Before introducing code, a component, a dependency, or an abstraction, stop at the first option that safely satisfies the requirement:

1. **Does this need to exist?** If it is out of scope, duplicated, or unused, do not build it.
2. **Is it already in this codebase?** Reuse or improve the existing feature, component, helper, or pattern.
3. **Can the language or platform do it?** Prefer standard JavaScript, browser controls, HTML semantics, CSS, and PostgreSQL constraints.
4. **Can an installed dependency do it?** Use an existing package correctly before adding another one.
5. **Is a small helper enough?** Prefer a focused, named function over a framework or generic abstraction.
6. **Build the minimum that works.** Add only the code needed for the approved behavior and its verification.

This ladder never removes trust-boundary validation, data protection, authorization, error handling, accessibility, tests, or auditability. Fewer lines are a result of less duplication and less unnecessary machinery—not code golfing.

### Orion examples

| Need | Default choice | Do not add prematurely |
| --- | --- | --- |
| Patient selects a date | Native `<input type="date">` with validation | A date-picker library and wrapper component |
| User session | Supabase Auth session management | Custom access-token refresh and Redux token persistence |
| Role-aware navigation | One route/role map plus shared route guard | Separate role checks hardcoded in every page |
| 45-minute rule | Database constraint and server validation | Duplicated client-side calculations as the source of truth |
| Booking a slot | One atomic Edge Function/transaction | A second booking page or client-only slot update |
| Shared UI | Existing component when it fits | A new component for a one-use variation |

## Code organization

- Use feature folders for domain logic and UI; do not place domain APIs in generic page files.
- Pages compose feature components; they should not contain hardcoded production data or privileged business decisions.
- Use `constants/roles.js` and `constants/routes.js` instead of repeating role or path strings.
- Put pure date, validation, authorization-display, and error-mapping helpers in `lib/` with tests.
- Use one Supabase client and one error-handling pattern. Delete a replaced abstraction in the same change when safe.

## React conventions

- Use functional components and hooks.
- Keep state close to where it is used; do not add global state unless two independent features need it.
- Every async screen has loading, empty, success, error, and retry/next-action states.
- Route guards improve the experience but do not replace RLS or server checks.
- Accessibility is required: semantic controls, associated labels, keyboard operation, visible focus, readable contrast, and 18px body text on booking/appointment screens.

## Data and security conventions

- No service keys or secrets in `VITE_*` variables.
- No application role from email, `localStorage`, query parameters, or editable metadata.
- No sensitive data in logs, toast messages, analytics, or client-side storage.
- Every table migration includes RLS, grants, policies, indexes, and tests as applicable.
- Every privileged mutation validates authentication, role, ownership/assignment, input, time rule, and expected state.

## Testing and verification

Every change runs the smallest relevant tests, plus `npm run lint` and `npm run build` before handoff. Changes to database authorization must also run RLS tests. Changes to booking must test the conflict and cancellation boundaries. Real-market work follows [test strategy and test-data policy](test-strategy-and-test-data-policy.md): synthetic data only outside production, and no sensitive data in artifacts.

Any changed route, click path, or browser workflow must have relevant Playwright coverage as defined in [QA and Playwright](qa-and-playwright.md). End-to-end tests verify user behavior; they complement rather than replace unit and database/RLS tests.

Use clear tests named for the behavior they protect, such as `patient_cannot_read_another_patients_appointment` and `booking_same_slot_allows_exactly_one_request`.

## Change workflow

1. Read `agent.md` and the relevant Knowledge-base document.
2. Confirm the requested work is in product scope.
3. Apply the minimal implementation ladder and record an intentional deferral in the audit trail when needed.
4. Identify the authority boundary and smallest implementation slice.
5. Make migrations and tests before or alongside UI changes for data features.
6. Verify, document any new decision, and remove obsolete code in the same scoped change.

Do not introduce a new dependency, provider, major state library, payment flow, video vendor, or database pattern without recording an architecture decision first.
