# web-ui-foundation Specification

## Purpose

The visual and technical base every web screen is built on: one component library styled from the approved design tokens, light and dark themes the user can choose, a layout that works on phones and desktops, API types that come from the contract, and browser tests that check all of it.

## Requirements

### Requirement: One styling system from the design tokens
The web app SHALL be styled only with Tailwind CSS utilities and shadcn/ui components whose colors, fonts, radius and spacing come from CSS variables holding the tokens of the approved prototype, for both a light and a dark theme. The web app SHALL contain no CSS modules. Headings SHALL use Fraunces, body text Geist, and numeric table cells Geist Mono.

#### Scenario: No CSS modules
- **WHEN** `find apps/web -name '*.module.css' -not -path '*/node_modules/*'` is run
- **THEN** it prints nothing

#### Scenario: Component library configured
- **WHEN** `apps/web/components.json` is read
- **THEN** it exists and points shadcn/ui components at `components/ui`

### Requirement: Theme toggle
Every page SHALL offer a theme control with the choices light, dark and system. The choice SHALL be remembered across visits in the same browser, and system SHALL follow the operating system's preference. The page SHALL be rendered in the chosen theme from its first paint, with no flash of the other theme.

#### Scenario: Choice survives a reload
- **WHEN** a visitor chooses dark and reloads the page
- **THEN** the `html` element has the `dark` class

#### Scenario: No flash on load
- **WHEN** a visitor who chose dark loads any page
- **THEN** the `html` element has the `dark` class when `DOMContentLoaded` fires

#### Scenario: System preference
- **WHEN** a visitor chooses system while the browser prefers a dark color scheme
- **THEN** the page renders in the dark theme

### Requirement: Responsive app shell
Every page SHALL share one shell: the brand, the main navigation, the theme control and the auth controls. At widths of 1024 px and above, the navigation SHALL be visible; below 768 px, it SHALL sit behind a menu button that opens it in a sheet. At 375 px and at 1280 px, in both themes, no page SHALL scroll horizontally. The sign-in and sign-up forms SHALL use the app's fonts and theme colors in both themes.

#### Scenario: Phone width
- **WHEN** `/` is loaded at 375 px wide
- **THEN** the navigation links are hidden behind a menu button that opens them, and `document.documentElement.scrollWidth` is not greater than `document.documentElement.clientWidth`

#### Scenario: Desktop width
- **WHEN** `/` is loaded at 1280 px wide
- **THEN** the navigation links are visible without opening a menu

#### Scenario: Themed sign-in
- **WHEN** `/sign-in` is loaded in the dark theme
- **THEN** the sign-in form's background uses the dark theme's card color, not white

### Requirement: API types come from the contract
The web app SHALL type every API request and response with types generated from `apps/api/openapi.json`, and SHALL NOT declare its own interfaces for API bodies. `pnpm --filter web test` SHALL fail when the generated types are older than `apps/api/openapi.json`.

#### Scenario: Stale types
- **WHEN** `apps/api/openapi.json` gains an operation and the web types are not regenerated
- **THEN** `pnpm --filter web test` fails, and passes after the types are regenerated

### Requirement: Browser end-to-end tests
`pnpm --filter web test:e2e` SHALL run Playwright tests against the built web app at 375 px and 1280 px wide. Tests that need a signed-in user SHALL sign in through the identity provider's testing support with a test user of the development instance, and SHALL be skipped, not failed, when its keys are not configured. `pnpm --filter web test` SHALL NOT need a network connection or a running server.

#### Scenario: Without identity provider test keys
- **WHEN** `pnpm --filter web test:e2e` runs without the test keys configured
- **THEN** the signed-out tests run and pass, and the signed-in tests are reported as skipped

### Requirement: UI conventions are written down
`CLAUDE.md` SHALL describe the web conventions: Tailwind and shadcn/ui only, colors from tokens, every screen checked at 375 px and 1280 px in both themes, API types only from the generated client, Playwright for flows, field HTML only rendered after sanitizing, UI work starting from an approved prototype under `design/<change>/`, and shared code in `packages/` kept pure and tested. The project's rules SHALL make every proposal state its UI impact, either "UI: no change" or the screens it adds or changes, and SHALL make tasks for UI changes include the prototype, its approval, the browser checks and screenshots.

#### Scenario: Proposing a UI change
- **WHEN** a change that adds a screen is proposed
- **THEN** its `proposal.md` states the UI impact naming the screen, and its `tasks.md` includes a prototype approval task and a task that checks the screen at 375 px and 1280 px in both themes
