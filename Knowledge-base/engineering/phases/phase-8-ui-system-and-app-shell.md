# Phase 8 — UI System and Application Shell

## Outcome

Building on Phase 7's persistent authenticated-shell route, Orion has responsive public and
authenticated shell variants and a small accessible component system for buttons, dialogs, statuses,
navigation, and page layout. Navigation reflects the approved psychiatry booking scope rather than
the legacy prototype.

## Current State

- The login page duplicates the main navbar and footer with separate styling.
- Fixed desktop/mobile navigation wraps into multiple rows, while a fixed footer can cover content.
- Button styling is spread across global, navbar, login, scheduling, and sidebar styles.
- Blog, portfolio, testimonials, career counseling, and inert footer controls remain visible despite
  being out of scope ([product scope](../../product/product-scope.md#out-of-scope)).
- There is no shared dialog, status message, focus-visible standard, skip link, or reduced-motion rule.

## Non-Goals

- No new product workflows, design animation library, marketing expansion, account settings, session
  notes, or production consent copy.
- No redesign of the embedded JaaS interface, which is provider-owned.

## Decisions Needed

1. Confirm that the frontend acceptance demo should show only Home/About, authentication, account,
   booking, appointments, administration placeholder, and meeting access.
2. Confirm whether approved Privacy/Terms/Support destinations exist. Until they do, do not render
   controls that imply working pages.

## Architecture Plan

- Keep route files focused on composition and move reusable presentation into `src/components/ui/`.
- Build the minimum primitives with React, semantic HTML, and CSS before adding a UI dependency
  ([engineering conventions](../engineering-conventions.md#minimal-implementation-ladder)).
- Define shared design tokens for color, typography, spacing, elevation, focus, and motion.
- Refine the Phase 7 authenticated shell into a responsive, accessible variant driven by the existing
  role navigation map, and add its public counterpart. Do not replace the protected routing or
  persistence boundary unless the Phase 7 as-built audit identifies a defect.

## Data Model Impact

None.

## API And Server Plan

None.

## UI/UX Plan

- Responsive header with compact mobile navigation; no multi-row link wall.
- Normal-flow footer, limited to approved and functioning destinations.
- Shared button variants: primary, secondary, danger, quiet, and icon button, including hover,
  focus-visible, disabled, and busy states with stable dimensions.
- Shared native-dialog-based modal with centered placement, backdrop, focus management, Escape support,
  labelled close `X`, and mobile-safe sizing.
- Shared status treatment for informative, success, warning, and destructive/error messages.
- One page container and card/list vocabulary; no nested cards.
- Use `appointment` consistently in application workflows and retain the unmissable synthetic-demo label.

### Login page design segment

Give login its own prominent, spacious authentication surface rather than treating it as a small
form inside the public navbar. Use a centered layout with a wide card (approximately 28–35rem on
desktop, full-width with safe side padding on mobile), generous vertical spacing, a clear Orion
heading, and one short service-boundary sentence. A secondary brand or reassurance panel may appear
on wide screens only; it must collapse away on mobile and must not introduce marketing claims or
out-of-scope content.

The form must use visible labels and large, touch-friendly controls (minimum 44px height):

- Email field with `autocomplete="email"` and an inline, field-specific error state.
- Password field with `autocomplete="current-password"` and a trailing show/hide eye button. The
  button is a real `type="button"`, has an accessible name that changes between “Show password” and
  “Hide password”, exposes `aria-pressed`, and never copies or persists the password.
- Primary “Sign in” button with stable dimensions and a busy state that prevents duplicate submits.
- A “Forgot password?” link only when the recovery route is implemented; otherwise do not render a
  dead control. A registration link follows the same rule.

Keep the eye control inside the password field's visual boundary without covering typed text, and
ensure it remains keyboard reachable. Preserve entered email on validation failure, but never place
the password in URLs, browser storage, logs, analytics, screenshots, or test artifacts. Support
keyboard-only use, screen readers, zoom, reduced motion, dark/high-contrast themes where available,
and clear focus-visible rings. Error, locked, network-failure, and signed-out states must be
understandable without relying on color alone.

## Security, Privacy, And Abuse Controls

- Do not expose a full patient name in global navigation or browser title.
- Remove fabricated contact details/testimonials and dead external controls.
- Do not put sensitive content into URLs, logs, analytics, or screenshots
  ([data dictionary](../../governance/data-classification-and-data-dictionary.md#classification)).

## Quotas, Billing, Or Entitlements

None.

## Observability And Analytics

No analytics added. Visual and accessibility assertions remain local and synthetic.

## Implementation Slices

1. Define tokens and shared button/status/dialog primitives.
2. Refine the Phase 7 authenticated shell and the public layout into responsive, accessible variants;
   migrate fixed navbar/footer behaviour without rebuilding the protected route boundary.
3. Rebuild the login page as the spacious responsive authentication surface described above, including
   the accessible password visibility toggle and loading/error states, without placing it inside
   protected navigation.
4. Remove out-of-scope public routes, testimonials, dead CTAs, and unreachable legacy source after an
   import/route inventory confirms no active dependency.
5. Add metadata, skip navigation, focus-visible, landmark, heading, and reduced-motion foundations.

Likely areas: `src/components/`, `src/components/ui/`, `src/routes/routeConfig.jsx`, `src/pages/Login.jsx`,
`src/pages/Home.jsx`, `src/index.css`, `src/App.css`, and `index.html`.

## Verification Plan

- Desktop and Pixel 5 navigation remain usable without wrapping over content.
- Header/footer never cover page controls; keyboard focus is always visible.
- Dialog opens centered, receives focus, traps tab navigation, closes by X and Escape, and restores focus.
- No visible control leads to a missing or inert destination.
- Login renders as a wide, responsive card; labels, focus order, error announcements, submit-busy
  behavior, and the password show/hide control work at desktop, Pixel 5, keyboard-only, and screen-
  reader-oriented checks.
- The password toggle changes only visibility, never the value, storage, URL, or submitted payload;
  its accessible name and `aria-pressed` state remain correct.
- Public-route Playwright tests assert the approved route set rather than legacy marketing pages.
- Lint, build, and relevant desktop/mobile tests pass.

## Rollout And Fallback

Implement primitives first, then migrate one surface at a time. Existing classes remain until their
last consumer is migrated; delete them in the same slice to avoid two permanent systems.

## Documentation And Audit Updates

- Record the approved navigation inventory and styling direction.
- Close or replace the 26 August prototype UX claims that conflict with current product scope.
- Add a Phase 8 visual/accessibility as-built audit entry.

## Open Questions

- Approved brand assets and final legal/support destinations remain owner inputs.
