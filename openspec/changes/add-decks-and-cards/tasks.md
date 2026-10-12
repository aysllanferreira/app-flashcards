## 1. Design prototype and system design (issue #61, AC 1 to 4)

- [x] 1.1 Cut `feat/decks-and-cards` from `dev`, commit this change's artifacts as `chore(openspec): propose add-decks-and-cards` and push the branch, so the integration branch exists before the first sub-PR. Before committing, run `find . -name "* [0-9].*" -not -path "*/node_modules/*" -not -path "*/.git/*" -not -path "*/.next/*"` and remove any sync duplicates. Verify that `git ls-remote --heads origin feat/decks-and-cards` prints the same SHA as `git rev-parse feat/decks-and-cards`.
- [x] 1.2 Read #60 and #61 with `gh issue view`, report any conflict with these artifacts, then cut `docs/decks-design` from `feat/decks-and-cards`. Verify that `git merge-base --is-ancestor origin/feat/decks-and-cards HEAD` exits 0.
- [x] 1.3 Load the `artifact-design` skill, then build `design/decks-and-cards/prototype.html` as one self-contained page (design.md, decision 15):
  - `:root` and `.dark` token blocks: background, foreground, card, muted, border, primary and primary-foreground, due (terracotta), new (green), destructive, ring, radius and the Fraunces, Geist and Geist Mono families;
  - the deck list, deck page, note editor (pickers, rich-text fields with bold, italic, underline and the cloze action, tags, live preview of each card) and card browser (dense table with Geist Mono numbers; stacked rows at phone width);
  - each screen in a 375 px frame and a 1280 px frame, each frame with its own light/dark switch;
  - empty, loading, error and delete-confirmation states;
  - how the card preview looks in the dark theme (design.md, Open Questions).

  Verify by opening it in the built-in browser: no console errors, and screenshots of each screen at both widths in both themes show the content without horizontal scrolling inside the frames.
- [x] 1.4 Publish the prototype as a private artifact and post its link in a comment on #61. Verify that `gh issue view 61 --comments` shows the link and that `grep -c "deck-list\|deck-page\|note-editor\|card-browser" design/decks-and-cards/prototype.html` prints a number of at least 4. Tick #61 AC 1.
- [x] 1.5 Stop and ask the user to review the prototype. Apply requested changes to the same file and republish to the same URL until the user approves. Then post a comment on #61 that quotes the user's approval. Verify that the comment exists. Tick #61 AC 2.
- [x] 1.6 Read the Excalidraw+ diagram format guide (`read_diagram_format`), list the `app-flashcards` collection's scenes with `list_collection_scenes`, and read `08-api-structure` with `get_scene_content`. With `edit_scene_content`:
  - move `decks`, `notes`, `cards` and `note-types` from the planned modules to the built ones;
  - add a `packages/card-templates` box (render, cloze, cards-for, sanitize) with arrows from the `notes` module and from `apps/web`.

  Check it with `take_screenshot` and fix any overlap. Verify that the screenshot shows the four modules as built and the `card-templates` box with both arrows.
- [x] 1.7 Export the pair through the shell, never hand-editing or rendering it locally: `system-design/08-api-structure.excalidraw` from `get_scene_content` and `system-design/08-api-structure.png` from `take_screenshot`. Verify that:
  - `jq empty` passes on the `.excalidraw`;
  - `file` reports the `.png` as PNG image data;
  - `grep -c "card-templates" system-design/08-api-structure.excalidraw` and the same for `note-types` each print a number above 0;
  - `git diff --stat origin/feat/decks-and-cards -- 'system-design/0[1234567]-*' 'system-design/09-*'` prints nothing.

  Tick #61 AC 3.
- [x] 1.8 Update `system-design/README.md`:
  - the 08 description names the built deck, note, card and note-type modules and the shared `card-templates` package;
  - a "Shared code" decision row (workspace packages under `packages/`, pure, built by `tsc`, tested once and imported by both apps);
  - a "Web UI" decision row (Tailwind v4 and shadcn/ui, light / dark / system, Paper tokens from the approved prototype, 375 px and 1280 px, calls to the API only from the Next.js server);
  - a "Note content" decision row (notes as the authoring unit, card generation rules, the sanitized HTML allowlist, template HTML rendered only in a sandboxed iframe).

  Verify that `grep -n "| Shared code |\|| Web UI |\|| Note content |" system-design/README.md` prints three lines. Tick #61 AC 4.
- [x] 1.9 Check for sync duplicates as in 1.1, commit with a Conventional Commit message (no Claude attribution) and push `docs/decks-design`. Open a PR into `feat/decks-and-cards` titled like #61, with `Refs #61` and no `Closes` line in the body. Verify that `gh pr view --json baseRefName,body` shows `feat/decks-and-cards` and `Refs #61`.
- [x] 1.10 Post a progress comment on #61 (criteria verified, tasks completed, the PR link).
- [x] 1.11 Stop until the user confirms the #61 PR is merged. Verify that `gh pr view <n> --json state` shows `MERGED`, then `git switch feat/decks-and-cards && git pull --ff-only`.

## 2. Web foundation: Tailwind, shadcn, theme, shell, typed client and Playwright (issue #62, AC 1 to 6)

- [x] 2.1 Read #60 and #62, report any conflict, then cut `feat/web-foundation` from the updated `feat/decks-and-cards`. Verify the merge base as in 1.2.
- [x] 2.2 Add Tailwind v4 to `apps/web` (`tailwindcss`, `@tailwindcss/postcss`, `postcss.config.mjs`). Rewrite `app/globals.css` with:
  - `@import "tailwindcss"`;
  - `@custom-variant dark (&:where(.dark, .dark *))`;
  - the prototype's `:root` and `.dark` token blocks copied unchanged;
  - an `@theme inline` block that maps them to Tailwind colors, radius and fonts.

  Load Fraunces, Geist and Geist Mono with `next/font/google` as CSS variables in `app/layout.tsx` (design.md, decision 11). Verify that `pnpm --filter web build` exits 0, and that `diff` of the `:root` and `.dark` blocks extracted from the prototype and from `globals.css` prints nothing.
- [x] 2.3 Initialize shadcn/ui (`components.json` with the `ui` alias `@/components/ui`) and add the components from design.md, decision 11. Verify that `jq -r .aliases.ui apps/web/components.json` prints `@/components/ui`, the component files exist under `apps/web/components/ui/`, and `pnpm --filter web lint` exits 0.
- [x] 2.4 Add `next-themes`: a `ThemeProvider` in the root layout (`attribute="class"`, `defaultTheme="system"`, `enableSystem`), `suppressHydrationWarning` on `<html>`, and a theme toggle (light, dark, system) built on the dropdown-menu component. Verify with `pnpm --filter web dev`, in the built-in browser, that each choice applies and survives a reload.
- [x] 2.5 Build the app shell (design.md, decision 11):
  - a header on every page with the brand, the theme toggle and the auth controls (`<UserButton>` signed in, "Sign in" and "Sign up" signed out);
  - navigation links to `/decks` and `/cards`, visible in a sidebar from 1024 px and behind a menu button opening a `Sheet` below it;
  - minimal placeholder pages at `/decks` and `/cards` that #65 replaces.

  Verify in the built-in browser at 375 px and 1280 px that the navigation behaves as described and that the existing header tests in `apps/web/__tests__` still pass.
- [x] 2.6 Theme Clerk with `appearance` (`cssLayerName: 'clerk'` and `variables` from the tokens), and center the `/sign-in` and `/sign-up` pages in the shell. Verify in the built-in browser that the sign-in form uses the card color and the app fonts in both themes.
- [x] 2.7 Remove the template: `app/page.module.css`, `app/_components/*.module.css` and the template images in `public/`. Rebuild `/` with Tailwind and shadcn as a signed-out landing page (heading, one-line pitch, sign-up action), keeping the restyled account summary for signed-in users until #65. Update `__tests__/page.test.tsx` and `account-summary.test.tsx` to the new markup. Verify that `find apps/web -name '*.module.css' -not -path '*/node_modules/*'` prints nothing, `test -f apps/web/components.json` succeeds, and `pnpm --filter web test` exits 0. Tick #62 AC 1.
- [x] 2.8 Add the typed API client (design.md, decision 10):
  - `openapi-typescript` (dev) and `openapi-fetch`;
  - a `generate:api` script that writes `app/_lib/api-types.ts` from `../api/openapi.json`;
  - a typed client in `app/_lib/api.ts` built on the existing `apiFetch` (same base URL and bearer token, still `server-only`);
  - the account summary typed with the generated `MeResponse` schema type;
  - `__tests__/api-types.test.ts`, which regenerates the types in memory and compares them with the committed file.

  Verify that:
  - `pnpm --filter web test` passes;
  - deleting a line from `api-types.ts` makes it fail, and restoring the line makes it pass;
  - `grep -rn "interface Me" apps/web/app` prints nothing.

  Tick #62 AC 5.
- [x] 2.9 Add Playwright (design.md, decision 14):
  - `@playwright/test` and `@axe-core/playwright` (dev);
  - `playwright.config.ts` with `phone` (375 x 812) and `desktop` (1280 x 800) projects and a `webServer` that builds and starts the web app;
  - a `test:e2e` script;
  - a `test:e2e` turbo task with `cache: false`;
  - the Playwright output folders in `.gitignore`;
  - the e2e folder excluded from Vitest.

  Install Chromium with `pnpm --filter web exec playwright install chromium`. Verify that `pnpm --filter web test:e2e --list` lists tests for both projects and `pnpm --filter web test` doesn't run them.
- [ ] 2.10 Add `e2e/theme.spec.ts`:
  - choose light, dark and system through the toggle, reloading after each, and check the class on `html`;
  - with dark stored, check that `html` has `dark` at `DOMContentLoaded`;
  - with system and an emulated dark color scheme, check the dark theme.

  Verify that `pnpm --filter web test:e2e e2e/theme.spec.ts` passes. Tick #62 AC 2.
- [x] 2.11 Add `e2e/layout.spec.ts`. For `/`, `/sign-in` and `/sign-up`, in both projects and both themes, it asserts that `document.documentElement.scrollWidth <= document.documentElement.clientWidth`, that the navigation is behind the menu button in `phone`, and that it's visible in `desktop`. Verify that it passes. Tick #62 AC 3.
- [x] 2.12 Capture screenshots of `/` and `/sign-in` in both projects and both themes into `design/decks-and-cards/screenshots/web-foundation/` (eight PNGs) with a Playwright script that runs on demand and isn't part of `test:e2e`. Commit them so the PR body can embed them. Verify that `ls design/decks-and-cards/screenshots/web-foundation/*.png | wc -l` prints `8`.
- [x] 2.13 Verify that `pnpm turbo run lint test build --filter=web` and `pnpm --filter web test:e2e` each exit 0. Tick #62 AC 6.
- [ ] 2.14 Check for sync duplicates as in 1.1, commit and push `feat/web-foundation`, and open a PR into `feat/decks-and-cards` titled like #62. The body has `Refs #62`, no `Closes` line, and the eight screenshots embedded from the pushed branch. Verify that `gh pr view --json baseRefName,body` shows `feat/decks-and-cards`, `Refs #62` and eight image links, and that the images load on the PR page. Tick #62 AC 4.
- [ ] 2.15 Post a progress comment on #62 (criteria verified, tasks completed, the PR link).
- [ ] 2.16 Stop until the user confirms the #62 PR is merged. Verify `MERGED` as in 1.11, then update `feat/decks-and-cards`.

## 3. API: decks (issue #63, AC 1 to 7)

- [ ] 3.1 Read #60 and #63, report any conflict, then cut `feat/api-decks` from the updated `feat/decks-and-cards`. Verify the merge base as in 1.2.
- [ ] 3.2 Extend `ApiErrorResponses` with `notFound` (404) and `conflict` (409), with `ErrorResponse` bodies (design.md, decision 8). Verify that the unit tests pass and that `pnpm --filter api openapi` leaves `openapi.json` unchanged, since no route uses them yet.
- [ ] 3.3 Add the decks DTOs in `src/modules/decks/dto/`:
  - `DeckCountsSchema` (`new`, `due`, `total`);
  - `DeckSchema` (`id`, `parentId`, `name`, `description`, `own`, `subtree`) with `.meta({ id: 'Deck' })`;
  - `DeckDetailSchema` (`Deck` plus `deleteImpact` with `subdecks`, `cards` and `notes`), `DeckListResponseSchema` (`{ decks }`), `CreateDeckBodySchema` and `UpdateDeckBodySchema` (trimmed, non-blank `name`, at least one field on update), each with an `id`;
  - `DeckIdParamSchema` (uuid) with no `id`.

  Verify that `pnpm --filter api exec tsc --noEmit -p tsconfig.json` exits 0.
- [ ] 3.4 Add `decks.service.ts` (design.md, decisions 6 and 7):
  - `list` with own and subtree counts at one `$now`;
  - `get` with `deleteImpact`;
  - `create` using the caller's "Default" preset;
  - `update` with the per-user advisory lock, the ancestor-walk cycle check (400) and 23505 mapped to 409;
  - `remove`, which collects the subtree and its note ids, deletes the deck and then the notes left with no cards, in one transaction.

  Every lookup is scoped by `user_id`, and an unknown or foreign id is 404. Add `decks.controller.ts` with the five routes, each with:
  - `@ApiTags('decks')`;
  - `@ApiOperation({ summary })`;
  - `@ApiResponseSchema` (200, 201 or 204);
  - `@ApiErrorResponses` with the flags from the decision 8 table.

  Wire both in `DecksModule`. Verify that the architecture test passes.
- [ ] 3.5 Add `test/db/decks.db-spec.ts` (the database e2e pattern of `me.db-spec.ts`). It calls each of the five routes with a signed token and parses each success body with its schema, and calls each without a token and expects 401. Verify that `pnpm --filter api test:db` passes. Tick #63 AC 1.
- [ ] 3.6 In the same file: user X's `GET`, `PATCH` and `DELETE` on user Y's deck, and a `POST` with Y's deck as `parentId`, each return 404 with an `ErrorResponse` body, and Y's deck is unchanged. Verify that it passes. Tick #63 AC 2.
- [ ] 3.7 Add tests:
  - creating a duplicate top-level name, renaming to a sibling's name, and moving next to a same-named sibling each return 409 and change nothing;
  - `"   "` returns 400;
  - `Verbs` under two different parents returns 201 twice.

  Verify that they pass. Tick #63 AC 3.
- [ ] 3.8 Add tests where moving A under itself or under its subdeck B returns 400 and both decks are unchanged. Also add a test where two concurrent opposite moves (A under B, B under A, with `Promise.all`) leave no cycle: a recursive query from each deck reaches a root. Verify that they pass. Tick #63 AC 4.
- [ ] 3.9 Add a database test for the delete scenario in the `deck-management` spec: A with subdeck B, note N1 only in A and B, note N2 in A and C, and review logs on the deleted cards. After `DELETE`, A, B, their cards and N1 are gone, N2 remains with its card in C, and the logs remain with `card_id` and `deck_id` null. Verify that it passes. Tick #63 AC 5.
- [ ] 3.10 Add a database test with cards in every state (new, learning due now, review due an hour ago, review due tomorrow, suspended, buried until tomorrow), spread over A and its subdeck B. It asserts the own and subtree counts from the "Counts for a deck with a subdeck" and "Buried card is not due" scenarios, and the `deleteImpact` from the "Delete impact" scenario. Verify that it passes. Tick #63 AC 6.
- [ ] 3.11 Run `pnpm --filter api openapi` and commit `openapi.json`. Verify that:
  - `jq '.paths["/decks/{id}"].patch.responses | keys' apps/api/openapi.json` includes `404` and `409`;
  - `jq '.paths["/decks"].get.responses | keys'` includes neither;
  - running `pnpm --filter api openapi` again leaves `git status` clean;
  - `pnpm turbo run lint test build --filter=api` exits 0.

  Tick #63 AC 7.
- [ ] 3.12 Check for sync duplicates, commit, push `feat/api-decks` and open a PR into `feat/decks-and-cards` titled like #63, with `Refs #63` and no `Closes`. Verify with `gh pr view --json baseRefName,body`.
- [ ] 3.13 Post a progress comment on #63 (criteria verified, tasks completed, the PR link).
- [ ] 3.14 Stop until the user confirms the #63 PR is merged. Verify `MERGED`, then update `feat/decks-and-cards`.

## 4. API: notes, card generation, browsing and `packages/card-templates` (issue #64, AC 1 to 8)

- [ ] 4.1 Read #60 and #64, report any conflict, then cut `feat/api-notes` from the updated `feat/decks-and-cards`. Verify the merge base as in 1.2.
- [ ] 4.2 Create `packages/card-templates` (design.md, decision 1):
  - `package.json` with name `card-templates`, `"type": "module"`, `exports` pointing at `dist`, and scripts `build` (`tsc`), `dev` (`tsc --watch`), `lint` (`oxlint src` and `tsc --noEmit`) and `test` (`vitest run`);
  - dependencies `htmlparser2`, `domhandler` and `entities`;
  - `tsconfig.json` (ESM, declarations, `outDir` `dist`) and `dist` in `.gitignore`.

  Add `packages/*` to `pnpm-workspace.yaml`, and `"dependsOn": ["^build"]` to `build`, `test` and `lint` in `turbo.json`. Verify that `pnpm install` exits 0, `pnpm turbo ls` lists `card-templates`, and `pnpm build` shows the `card-templates#build` task finishing before `api#build` and `web#build`.
- [ ] 4.3 Implement `sanitizeFieldHtml` and `toPlainText` (design.md, decision 4), with Vitest tests for every scenario of "Sanitizing field HTML" in the `card-templates` spec: allowed and dropped markup, paragraphs becoming line breaks, idempotence, `<img onerror>`, `javascript:` URLs, and `<script>` and `<style>` content. Verify that `pnpm --filter card-templates test` passes.
- [ ] 4.4 Implement `clozeNumbers` and `render` (design.md, decision 2), with tests for the "Rendering templates" and "Cloze numbers" scenarios, including a hint (`{{c1::Madrid::capital}}` showing `[capital]`) and unknown and empty fields rendering empty. Verify that the tests pass.
- [ ] 4.5 Implement `cardsFor` and `clozeFields`, with tests for the "Cards a note produces" scenarios and Basic giving 1 card. Verify that `pnpm --filter card-templates test` passes and covers every case in #64 AC 1. Tick #64 AC 1.
- [ ] 4.6 Add `"card-templates": "workspace:*"` to `apps/api` and `apps/web`. Verify that `pnpm turbo ls --filter=...card-templates` lists `card-templates`, `api` and `web`, and that `node -e "import('card-templates').then(m => console.log(typeof m.cardsFor))"` run from `apps/api` prints `function`.
- [ ] 4.7 Add the note types HTTP layer:
  - `dto/note-type.dto.ts` (`NoteTypeSchema` with fields and templates, `NoteTypeListResponseSchema`);
  - `note-types.service.ts`, which lists the caller's note types with fields in `ord` order and templates in `ord` order;
  - `note-types.controller.ts` with `GET /note-types` and its decorators.

  Add a database e2e test where a newly provisioned user gets Basic, Basic (and reversed card) and Cloze, parsed with the schema, and a call without a token gets 401. Verify that `pnpm --filter api test:db` passes.
- [ ] 4.8 Add the notes DTOs (`NoteSchema`, `NoteWithCardsSchema`, `CardSummarySchema`, `CreateNoteBodySchema`, `UpdateNoteBodySchema` and a param schema), and `notes.service.ts` `create` (design.md, decision 5): load the caller's note type (404), check the deck (404), sanitize, compute `cardsFor` (400 when empty), then insert the note and its cards with one shared `position`, in one transaction. Add `POST /notes` to `notes.controller.ts`. Add database e2e tests:
  - Basic (and reversed card) with both fields returns 2 cards;
  - with an empty Back, it returns 1 card;
  - Cloze `c1`/`c2` returns 2 cards;
  - an empty Basic Front returns 400, and a cloze-less Cloze returns 400 with no note stored;
  - every body is parsed.

  Verify that they pass. Tick #64 AC 2.
- [ ] 4.9 Add a test where a field sent as `<img src=x onerror=alert(1)><b>hi</b>` comes back as `<b>hi</b>`, and is stored that way in `notes.fields`, and where `<b>hola</b> amigo` gives the sort field `hola amigo`. Verify that it passes. Tick #64 AC 4.
- [ ] 4.10 Add `GET /notes/{id}` and `PATCH /notes/{id}` (sanitize, update the sort field, insert missing cards with `ON CONFLICT DO NOTHING` into the deck of the earliest card, never touch existing cards). Add the tests:
  - adding `{{c3::...}}` to a 2-card cloze note gives 3 cards, the first two keeping their ids, `state`, `due_at`, `stability`, `difficulty`, `reps` and `lapses`;
  - removing `c2` afterwards still leaves 3 cards.

  Verify that they pass. Tick #64 AC 3.
- [ ] 4.11 Add `DELETE /notes/{id}` (204) and a database test where the note and its cards are gone and their review logs remain with `card_id` null. Verify that it passes. Tick #64 AC 5.
- [ ] 4.12 Add the cards DTOs (`CardRowSchema`, `CardListResponseSchema` with `nextCursor`, a query schema with no `id` for `deckId`, `q`, `sort`, `order`, `cursor` and `limit`, and `MoveCardBodySchema`), and `cards.service.ts` (design.md, decision 9):
  - `list` with the joins, the subtree filter, the escaped `ILIKE`, keyset ordering on `(key, id)` and the base64url cursor, with 400 for a malformed or mismatched cursor;
  - `move`, which checks the target deck (404) and leaves the scheduling alone.

  Add `cards.controller.ts` with `GET /cards` and `PATCH /cards/{id}`. Add tests:
  - 250 cards followed through `nextCursor` at `limit=100` come back in pages of 100, 100 and 50, each card once, for `sort=sortField` with many equal sort fields and for `sort=dueAt&order=desc`;
  - `deckId` includes the subdeck's cards;
  - `q=HOLA` matches `Hola amigo`;
  - a move keeps `state` and `due_at`.

  Verify that they pass. Tick #64 AC 6.
- [ ] 4.13 Add one database test file that covers the ownership scenario in the `note-management` spec. Every new route returns 404 with an `ErrorResponse` body for user Y's note, card, deck or note type, both as the subject and in a body or query, and leaves Y's data unchanged. Every route returns 401 without a token. Verify that it passes. Tick #64 AC 7.
- [ ] 4.14 Run `pnpm --filter api openapi` and commit `openapi.json`. Verify that:
  - `pnpm --filter api db:seed` exits 0;
  - running `pnpm --filter api openapi` again leaves `git status` clean;
  - `pnpm turbo run lint test build --filter=api --filter=card-templates` exits 0;
  - `pnpm lint` and `pnpm test` at the root show `card-templates` tasks.

  Tick #64 AC 8.
- [ ] 4.15 Check for sync duplicates, commit, push `feat/api-notes` and open a PR into `feat/decks-and-cards` titled like #64, with `Refs #64` and no `Closes`. Verify with `gh pr view --json baseRefName,body`.
- [ ] 4.16 Post a progress comment on #64 (criteria verified, tasks completed, the PR link).
- [ ] 4.17 Stop until the user confirms the #64 PR is merged. Verify `MERGED`, then update `feat/decks-and-cards`.

## 5. Web: deck list, deck page, note editor and card browser (issue #65, AC 1 to 6)

- [ ] 5.1 Read #60 and #65, report any conflict, then cut `feat/web-decks` from the updated `feat/decks-and-cards`. Verify the merge base as in 1.2. Run `pnpm --filter web generate:api` so the client knows the new routes, and verify that `pnpm --filter web test` passes.
- [ ] 5.2 Protect the app routes in `proxy.ts` with `createRouteMatcher` and `auth.protect()` (design.md, decision 12). Make `/` redirect signed-in users to `/decks`, and remove the account summary, its component and its test, as the `web-authentication` delta specifies. Add `e2e/redirects.spec.ts`: signed out, each of `/decks`, `/decks/<uuid>`, `/notes/new`, `/notes/<uuid>/edit` and `/cards` lands on `/sign-in`, and `/` renders with status 200. Verify that it passes. Tick #65 AC 1.
- [ ] 5.3 Build `/decks` (design.md, decision 10), replacing the placeholder:
  - a Server Component that loads `GET /decks` and renders the tree with subtree new, due and total counts (due in terracotta, new in green, numbers in Geist Mono);
  - a create-deck dialog (name and optional parent) backed by a Server Action;
  - the empty state, a `loading.tsx` skeleton, and an error state with a retry action when the API fails.

  Verify against the prototype in the built-in browser at 375 px and 1280 px in both themes, with `pnpm dev` and the seeded database, and with the API stopped for the error state.
- [ ] 5.4 Build `/decks/[id]`:
  - name, description, counts and subdecks;
  - its cards from `GET /cards?deckId=`;
  - rename and move dialogs that show a 409 or 400 reason while keeping the input;
  - an "Add note" link to `/notes/new?deckId=`;
  - a delete alert-dialog stating `deleteImpact` (subdecks, cards, notes) before calling `DELETE`.

  Verify each action in the built-in browser against the prototype, including a duplicate-name rename.
- [ ] 5.5 Build the editor pieces (design.md, decisions 3 and 13):
  - `FieldEditor` (Tiptap with `StarterKit` reduced to paragraphs, hard breaks, bold and italic, plus `Underline`, and a toolbar);
  - the cloze action, shown only for `clozeFields`;
  - `CardPreview`, which renders each side of each card from `cardsFor` and `render` in an `<iframe sandbox="" srcdoc>` with the note type's CSS, debounced;
  - a tags input.

  Build `/notes/new` (note type and deck pickers, deck preselected from `?deckId`) and `/notes/[id]/edit`, both saving through Server Actions that sanitize first and show the API's 400 reason when no card would be produced. Verify in the built-in browser that a Basic (and reversed card) note previews 2 cards before saving and that the saved note opens in the editor.
- [ ] 5.6 Add a Vitest component test for the cloze action: selecting `Madrid` and applying it gives `{{c1::Madrid}}`, then selecting `Spain` gives `{{c2::Spain}}`. Verify that `pnpm --filter web test` passes. Tick #65 AC 3.
- [ ] 5.7 Build `/cards`:
  - search, deck filter and sort controls kept in the URL's search params;
  - a dense table from 768 px and stacked rows below it;
  - "Load more" following `nextCursor`;
  - per-row actions: open in the editor, move to a deck (select dialog), and delete the note behind an alert-dialog that states its card count from `GET /notes/{id}`.

  Verify in the built-in browser at both widths and in both themes against the prototype.
- [ ] 5.8 Set up the signed-in Playwright suite (design.md, decision 14):
  - `@clerk/testing` (dev), with `clerkSetup()` in a global setup and a `signIn` fixture reading `E2E_CLERK_USER_USERNAME` and `E2E_CLERK_USER_PASSWORD` from `apps/web/.env.test.local` (git-ignored; names documented in `.env.example`);
  - `test.skip` when they're missing;
  - a `webServer` entry for the API;
  - a per-run deck prefix with cleanup in `afterAll`.

  Ask the user to add the test user and keys; never enter them yourself. Verify that without the variables `pnpm --filter web test:e2e` reports the signed-in tests as skipped and passes.
- [ ] 5.9 Add `e2e/decks-flow.spec.ts` for the full flow in #65 AC 2:
  1. create a deck and a subdeck;
  2. fill a Basic (and reversed card) note and see 2 preview cards before saving;
  3. add a Cloze note with `c1` and `c2`;
  4. find 4 cards in the browser;
  5. edit a note;
  6. move a card to the other deck;
  7. delete a note;
  8. delete the deck.

  It checks the deck list counts after each step. Verify that it passes with the user's test keys set. Tick #65 AC 2.
- [ ] 5.10 Add `e2e/screens.spec.ts`: for each new route, in both projects and both themes, signed in with seeded content, it checks that there's no horizontal overflow and runs an axe scan with no serious or critical violations. Also add a keyboard-only pass over the deck list and the editor (tab to each action, activate with Enter). Verify that it passes. Tick #65 AC 4.
- [ ] 5.11 Capture screenshots of the four screens in both projects and both themes into `design/decks-and-cards/screenshots/web-screens/` (16 PNGs) with the on-demand script from 2.12. Verify that `ls design/decks-and-cards/screenshots/web-screens/*.png | wc -l` prints `16`.
- [ ] 5.12 Verify that `pnpm turbo run lint test build --filter=web` and `pnpm --filter web test:e2e` each exit 0. Tick #65 AC 6.
- [ ] 5.13 Check for sync duplicates, commit, push `feat/web-decks` and open a PR into `feat/decks-and-cards` titled like #65. The body has `Refs #65`, no `Closes`, the 16 screenshots embedded and the prototype link. Verify with `gh pr view --json baseRefName,body`.
- [ ] 5.14 Stop and ask the user to review the screenshots against the prototype. Fix what they ask for (re-capturing the screenshots), then post a PR comment quoting their review. Verify that the comment exists. Tick #65 AC 5.
- [ ] 5.15 Post a progress comment on #65 (criteria verified, tasks completed, the PR link).
- [ ] 5.16 Stop until the user confirms the #65 PR is merged. Verify `MERGED`, then update `feat/decks-and-cards`.

## 6. Web UI, design and shared-package conventions (issue #66, AC 1 to 4)

- [ ] 6.1 Read #60 and #66, report any conflict, then cut `docs/web-conventions` from the updated `feat/decks-and-cards`. Verify the merge base as in 1.2.
- [ ] 6.2 Add a `## Web (apps/web)` section to `CLAUDE.md`, after the API section. It covers:
  - Tailwind and shadcn/ui only (`components/ui`, no CSS modules, colors only from tokens);
  - every screen checked at 375 px and 1280 px in both themes;
  - API types only from the generated client, with `pnpm --filter web generate:api` after any contract change;
  - Server Components and Server Actions, with no API calls from the browser;
  - Playwright and the Clerk testing-token exception;
  - field HTML rendered only through the `card-templates` sanitizer, and template HTML only in a sandboxed iframe.

  Add a "Design" note (UI work starts from an approved prototype under `design/<change>/`, with screenshots next to it) and a "Shared packages" note (`packages/*` are pure, built by `tsc`, tested, and imported by both apps). Verify that `grep -n "^## Web (apps/web)" CLAUDE.md` prints one line, that the section contains `components/ui`, `375`, `1280`, `generate:api` and `card-templates`, and that `grep -n "design/" CLAUDE.md` and `grep -n "packages/" CLAUDE.md` each print at least one line. Tick #66 AC 1 and 2.
- [ ] 6.3 In `openspec/config.yaml`:
  - add a proposal rule: "State the UI impact: write "UI: no change", or list the screens the change adds or changes";
  - add a tasks rule: UI changes include the prototype, its approval, the 375 px and 1280 px light and dark Playwright checks and the screenshots.

  Verify that `grep -n "UI: no change" openspec/config.yaml` prints at least one line and `openspec validate --specs --strict` still exits 0. Tick #66 AC 3.
- [ ] 6.4 Rewrite `apps/web/README.md`: what the app is, `pnpm --filter web dev`, `test`, `test:e2e` (and the `.env.test.local` variables), `generate:api`, how to add a shadcn component (`pnpm --filter web dlx shadcn@latest add <name>`), and where the tokens come from. Verify that `grep -n "test:e2e\|generate:api\|shadcn" apps/web/README.md` matches all three. Tick #66 AC 4.
- [ ] 6.5 Check for sync duplicates, commit, push `docs/web-conventions` and open a PR into `feat/decks-and-cards` titled like #66, with `Refs #66` and no `Closes`. Verify with `gh pr view --json baseRefName,body`.
- [ ] 6.6 Post a progress comment on #66 (criteria verified, tasks completed, the PR link).
- [ ] 6.7 Stop until the user confirms the #66 PR is merged. Verify `MERGED`, then update `feat/decks-and-cards`.

## 7. Integration, final PR and wiki (issue #60, AC 1 to 7)

- [ ] 7.1 If `dev` moved, merge `origin/dev` into `feat/decks-and-cards` (no rebase) and push. With `docker compose up -d --wait db` run first, verify that `pnpm install --frozen-lockfile`, `pnpm lint`, `pnpm test` and `pnpm build` at the repo root each exit 0. Tick #60 AC 2.
- [ ] 7.2 Verify that `jq -r '.paths | keys[]' apps/api/openapi.json` prints exactly `/cards`, `/cards/{id}`, `/decks`, `/decks/{id}`, `/health`, `/me`, `/note-types`, `/notes`, `/notes/{id}` and `/webhooks/clerk`. Tick #60 AC 3.
- [ ] 7.3 Verify that `pnpm --filter api db:generate` reports no schema changes and `git diff dev...feat/decks-and-cards -- apps/api/drizzle` prints nothing. Tick #60 AC 4.
- [ ] 7.4 Verify that `gh issue view <n> --json body --jq .body | grep -c '^- \[ \]'` prints `0` for each of #61 to #66. Tick #60 AC 1.
- [ ] 7.5 Open the PR from `feat/decks-and-cards` into `dev`. Its title is `feat(decks): create, edit, delete and list decks and notes in the API and the web app`, and its body has `Closes #60` and `Closes #61` through `Closes #66`, with no Claude attribution. Verify that `gh pr view --json baseRefName,body` shows `dev` and all seven `Closes` lines. Tick #60 AC 5.
- [ ] 7.6 Run `openspec validate add-decks-and-cards --strict`, then sync the deltas with `/opsx:sync`. Verify that:
  - `openspec list --specs` lists `deck-management`, `note-management`, `card-templates`, `web-ui-foundation` and `web-deck-screens`;
  - `openspec/specs/web-authentication/spec.md` has "Public pages stay public" and no "All routes stay public";
  - `openspec validate --specs --strict` exits 0.

  Commit and push to `feat/decks-and-cards` (it lands in the open PR). Tick #60 AC 6.
- [ ] 7.7 Clone `https://github.com/aysllanferreira/app-flashcards.wiki.git` into the scratchpad and update:
  - `Status`: #60 in review, awaiting squash-merge, with the final PR and the six sub-PRs listed;
  - `Changelog`: a new top entry;
  - `Roadmap`: the Decks and cards item linked to #60 and in review;
  - `Architecture`: the 08 section updated, embedded from `https://raw.githubusercontent.com/aysllanferreira/app-flashcards/dev/system-design/08-api-structure.png`, plus a short note on the shared `card-templates` package;
  - `Decisions`: notes as the authoring unit; deck delete removing notes left with no cards; the shared `card-templates` package; Tailwind and shadcn/ui; the Paper direction and its prototype; API calls only from the Next.js server. Each is linked to #60.

  Each page keeps its purpose line and ends with `Last updated: <YYYY-MM-DD> by add-decks-and-cards (#60)`. Push with `docs(wiki): update for #60`. Verify that a fresh clone shows all five pages changed, and list them in a progress comment on #60. Stop any dev servers started during the change. Tick #60 AC 7.
