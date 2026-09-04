# Phase 8 UI system and application shell audit — 4 September 2026

## Scope and boundary

This audit records the final UI-system and shell implementation state for the synthetic Orion demo.
It does not approve real accounts, legal/support destinations, clinical workflow changes, or any
controlled-pilot gate. Navigation and footer content were retained or restored at the owner's
direction because their eventual product disposition remains undecided.

## As built

- The public shell contains Home, About, Contact, Services, Portfolio, Blog, and Sign in. Contact,
  Services, Portfolio, and Blog are active React routes again; their existing presentation remains
  available while the owner decides their final scope.
- The authenticated Phase 7 route boundary remains intact. It has a responsive header with the Orion
  logo, the restored public tabs, role-derived account links, skip navigation, and sign-out. It never
  puts a patient name in global navigation or the document title.
- The footer is restored in normal document flow for public and authenticated pages. It includes the
  existing copyright, Facebook/Instagram links, and legacy FAQ, Privacy Policy, Terms of Service,
  Careers, Support, and Sitemap controls. The latter controls remain visibly present but do not yet
  have approved destinations; their final treatment is an owner decision.
- `src/components/ui/` supplies the small shared button, status, and native-dialog system. Dialogs
  use `showModal`, a labelled close control, Escape handling, backdrop behaviour, and native focus
  restoration. Shared tokens include visible focus and reduced-motion handling.
- Login is a separate responsive authentication surface using the existing Orion background artwork
  and one fitted Orion logo inside the card. It has visible labels, 48px inputs, browser autocomplete
  hints, exact error status, stable busy submit state, and a keyboard-accessible show/hide control.
  Password visibility is presentation-only; the password remains in component state and is not placed
  in URLs or browser storage. The redundant logo tile and all `Synthetic demo` wording were removed
  from the sign-in surface at the owner's direction.
- A session-presentation defect was fixed after restoring public routes: the session itself persisted,
  but the public navbar always looked signed out. The navbar now reads the global auth state and shows
  Account, role links, and Sign out for signed-in users. Home's primary action likewise changes to
  `Go to your account` for a signed-in user.
- The older `Orion/` static prototype remains a repository artifact pending owner-directed archival
  because it includes binary assets and is outside the React build.

## Verification evidence

| Command or check | Result | What it established |
| --- | --- | --- |
| `npm run lint` | Passed | Source and tests are lint-clean. |
| `npm run test:unit` | 6 passed | Existing timing and in-memory cache boundaries remain valid. |
| `npm run build` | Passed | Production bundle builds; the pre-existing chunk-size warning remains. |
| `npm run test:e2e` | 12 passed, 8 credential-gated tests skipped | Chromium and Pixel 5 cover the restored public routes, invalid sign-in, protected redirects, and password visibility semantics. The credential-gated suite now includes signed-in traversal of every restored public route. |
| Browser visual check | Passed | The final sign-in screen renders one fitted Orion logo over the existing image treatment; the authenticated shell visibly contains the restored tabs and footer. The 393px mobile login had no horizontal overflow. |
| Direct signed-in browser check | Passed | Navigating from Account to Home retained Account and Sign out; Home showed `Go to your account`, not a sign-in action. |

## Remaining owner inputs

Approved final destinations for FAQ, Privacy Policy, Terms of Service, Careers, Support, and Sitemap
remain unresolved. They are currently retained as visible legacy controls at the owner's direction,
not as claims that the destinations are operational.
