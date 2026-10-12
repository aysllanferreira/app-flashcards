Issue: #60
Sub-issues: #61, #62, #63, #64, #65, #66

## Why

Users can sign in (#48), but they can't do anything yet. The API has no route for decks, notes or cards, and the web app is still the create-next-app template: CSS modules, no theme toggle and no phone layout. Every later roadmap item (study session, media, imports, reminders) needs decks and cards first.

In this data model users write notes, and cards are derived from the note type's templates. So "cards" means notes plus card generation, and the study session and imports will need the same generation rules.

## What Changes

Delivered in six sub-issues, each a PR into the integration branch `feat/decks-and-cards`, then one PR into `dev`:

- **#61 Design and system design:**
  - an HTML prototype in the "Paper" direction, committed as `design/decks-and-cards/prototype.html`, published as a private page and approved by the user before any screen is built. It covers the deck list, deck page, note editor and card browser at 375 px and 1280 px in light and dark, plus empty, loading, error and delete-confirmation states, and defines the design tokens;
  - `08-api-structure` shows decks, notes, cards and note-types as built modules, and `packages/card-templates` as a package shared by the API and the web app;
  - `system-design/README.md` gains the "Shared code", "Web UI" and "Note content" decision rows.
- **#62 Web foundation:**
  - Tailwind v4 and shadcn/ui with the prototype's tokens, and Fraunces, Geist and Geist Mono;
  - a light / dark / system theme toggle, remembered and with no flash on load;
  - a responsive app shell (sidebar on wide screens, menu sheet on phones) and Clerk components themed from the tokens;
  - the template home page and every CSS module removed;
  - a typed API client generated from `apps/api/openapi.json`, with a staleness test;
  - Playwright end-to-end tests at 375 px and 1280 px.
- **#63 API decks:**
  - list, create, read, update and delete decks, with new / due / total counts, both the deck's own and including its subdecks;
  - reparenting that refuses cycles;
  - 404 for other users' decks and 409 for a duplicate sibling name;
  - deck delete also removes notes left with no cards.
- **#64 API notes and cards:**
  - the workspace gains `packages/*`, and a new `packages/card-templates` package renders templates, finds cloze numbers, decides which cards a note produces and sanitizes field HTML;
  - `GET /note-types` (read-only);
  - notes CRUD, generating cards on create and adding cards on edit without ever deleting one;
  - a cursor-paginated card browser;
  - moving a card to another deck.
- **#65 Web screens:**
  - `/decks`, `/decks/[id]`, `/notes/new`, `/notes/[id]/edit` and `/cards`, signed-in only, matching the approved prototype;
  - a Tiptap note editor with bold, italic, underline and a cloze button, and a live preview of each generated card;
  - Playwright flows signed in with `@clerk/testing`, overflow checks at both widths and themes, and axe scans.
- **#66 Conventions:**
  - a "Web (apps/web)" section and "Design" and "Shared packages" notes in `CLAUDE.md`;
  - OpenSpec rules for the UI impact and the UI tasks;
  - a rewritten `apps/web/README.md`.

API contract (every endpoint authenticated; every operation also documents 400, 401, 404 or 409 where it applies, with `ErrorResponse`):
- adds `GET /decks`, `POST /decks`, `GET /decks/{id}`, `PATCH /decks/{id}`, `DELETE /decks/{id}`;
- adds `GET /note-types`;
- adds `POST /notes`, `GET /notes/{id}`, `PATCH /notes/{id}`, `DELETE /notes/{id}`;
- adds `GET /cards`, `PATCH /cards/{id}`;
- `GET /health`, `GET /me` and `POST /webhooks/clerk` are unchanged.

Data model: no change. Every endpoint reads and writes existing tables and columns. The card browser needs no new index at the expected scale (design.md, decision 9), so there is no migration.

System design:
- **Update `08-api-structure`:** decks, notes, cards and note-types move from planned to built modules, and a shared `packages/card-templates` box is used by the `notes` module and by `apps/web`.
- **`system-design/README.md`:**
  - the 08 description is updated;
  - new decision rows "Shared code", "Web UI" and "Note content".
- **No change to `01`, `02`, `03`, `04`, `05`, `06`, `07` or `09`.** Diagram 06 already holds every table and index this change uses. Diagram 03 shows the browser calling `api.*`; this change keeps API calls on the Next.js server (the existing `web-authentication` rule), which 03 already allows for SSR.

## Capabilities

### New Capabilities
- `deck-management`: listing decks with their new, due and total counts, creating, renaming, moving and deleting decks, and what a deck delete removes.
- `note-management`: the read-only note types, creating, reading, editing and deleting notes, card generation from templates and cloze numbers, sanitized field content, the card browser and moving cards.
- `card-templates`: the shared workspace package that renders templates, finds cloze numbers, decides which cards a note produces and sanitizes field HTML, used by both apps.
- `web-ui-foundation`: Tailwind and shadcn/ui with the Paper tokens, the theme toggle, the responsive app shell, the typed API client and the Playwright checks.
- `web-deck-screens`: the deck list, deck page, note editor with live preview and card browser, signed-in only, on phones and desktops in both themes.

### Modified Capabilities
- `web-authentication`: the new app routes require sign-in, so "All routes stay public" becomes "Public pages stay public" (`/`, `/sign-in` and `/sign-up`). A signed-in user on `/` is sent to `/decks`, so the account section on `/` is replaced by the deck list. The deck list keeps the "page still renders when the API is down" behavior.
- `monorepo-workspace`: install, lint, test and build cover the `packages/*` workspace packages as well as both apps.
- `api-openapi-contract`: `ErrorResponse` responses for 404 and 409 can be documented, and the "Every operation is fully documented" requirement lists them.

## Impact

- **Code (`apps/api`):**
  - new `decks`, `notes` and `cards` module HTTP layers (controller, service, `dto/`), and a `note-types` controller and service;
  - `ApiErrorResponses` gains `notFound` and `conflict`;
  - `openapi.json` regenerated;
  - e2e and database tests.
- **Code (`packages/card-templates`, new):** renderer, cloze parser, card plan and sanitizer, with Vitest tests.
- **Code (`apps/web`):**
  - Tailwind, shadcn/ui, `next-themes`, the app shell, Clerk theming and the generated API types;
  - Playwright with the axe scanner;
  - Tiptap;
  - the new routes and the sign-in protection in `proxy.ts`;
  - template files and CSS modules removed.
- **Repo root:** `pnpm-workspace.yaml` gains `packages/*`, and `turbo.json` gains the `test:e2e` task.
- **Dependencies:**
  - web: `tailwindcss`, `@tailwindcss/postcss`, the shadcn/ui runtime (`radix-ui`, `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`), `next-themes`, `@tiptap/react` with its starter kit and underline extension, `openapi-typescript` (dev), `@playwright/test` (dev), `@axe-core/playwright` (dev) and `@clerk/testing` (dev);
  - card-templates: one sanitizer library (design.md, decision 4).
- **Configuration outside the repo:** to run the signed-in Playwright flows, the repo owner adds a test user to the Clerk development instance and its keys to the uncommitted `apps/web/.env.test.local`. Without them those flows are skipped.
- **Repo docs and rules:** `CLAUDE.md`, `openspec/config.yaml` and `apps/web/README.md`.
- **Design:** new `design/decks-and-cards/prototype.html`.
- **System design:** `08-api-structure` re-exported from its scene, and `system-design/README.md`.
- **Specs:**
  - new `deck-management`, `note-management`, `card-templates`, `web-ui-foundation` and `web-deck-screens`;
  - `web-authentication`, `monorepo-workspace` and `api-openapi-contract` modified.
- **Versioning:** a change under `packages/card-templates` marks both `api` and `web` affected, so both get a dev tag. Only `apps/` packages are ever tagged (`tooling/versioning/src/cli.ts` filters on `apps/`).
- **Wiki:** Status, Changelog, Roadmap, Architecture and Decisions.
- **Out of scope** (from #60):
  - studying and review scheduling;
  - daily limits in counts;
  - editing deck presets;
  - creating or editing note types;
  - media in fields;
  - bulk card actions;
  - cleaning up empty cards;
  - tag management beyond a plain tag list on a note.
