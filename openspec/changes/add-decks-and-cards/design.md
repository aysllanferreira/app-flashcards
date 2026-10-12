## Context

See proposal.md (Why) for the motivation. The state this design starts from:

- **Data layer (#36):** every table this change needs already exists.
  - `decks` nest through a composite `(parent_id, user_id)` foreign key that cascades to subdecks.
  - `cards` cascade from `decks` and `notes`.
  - `review_logs.card_id` and `review_logs.deck_id` are single-column `SET NULL` keys.
  - `decks_user_id_parent_id_name_unique` (NULLS NOT DISTINCT) enforces sibling names.
  - **Notes have no `deck_id`.** A note's decks are the decks of its cards, so a cascade from `decks` leaves notes with no cards behind.
- **API (#23, #48):**
  - feature modules with Zod DTOs, `@ApiResponseSchema` and `@ApiErrorResponses({ badRequest, unauthorized })`;
  - a global Clerk guard and `@CurrentUser()`;
  - `createTestApp()` and `signSessionToken()` for e2e tests, and `useTestDatabase()` for database tests.
  - The `decks`, `cards`, `notes` and `note-types` modules exist but hold only `schema/` (and `stock-note-types.ts`).
  - The API is ESM (`"type": "module"`, `nodenext`) and built by `nest build`.
- **Web (#13, #52):**
  - the create-next-app template with CSS modules, Clerk 7 and `proxy.ts` running `clerkMiddleware()` with no protection;
  - a server-only `apiFetch` that sends the session token;
  - the `web-authentication` spec says the web app calls the API only from the server;
  - Vitest with jsdom; no Tailwind, no component library and no browser tests.
- **Workspace:**
  - `pnpm-workspace.yaml` lists `apps/*` and `tooling/*`, and there is no shared package yet;
  - `turbo.json` has `build`, `dev`, `lint` and `test` with no `dependsOn`;
  - `tooling/versioning` tags only `apps/` packages.

## Goals / Non-Goals

**Goals:**
- One implementation of the card rules, shared by the API (generation) and the web app (preview), so the two can never disagree.
- Deck and note writes that keep the data consistent: no orphaned notes, no deck cycles, and no reference to another user's rows, even under concurrent requests.
- A web foundation where the next screen is mostly composition: tokens, components, shell, typed client and browser checks are already there.
- Signed-in browser tests that run locally without weakening the API's "tests never call Clerk" rule.

**Non-Goals:**
- Anki template features beyond what the stock note types use: conditionals (`{{#Field}}`), filters other than `cloze:`, `type:` and `hint:`. They arrive with imports.
- Calling the API from the browser. Every call stays on the Next.js server, as `web-authentication` requires, so no CORS change is needed for the web app.
- A CI pipeline for Playwright. There's no CI workflow in the repo yet (only `versioning.yml`); the AWS and CI/CD roadmap item adds it.
- Faster browser search (trigram or `tsvector`). That's a growth-path item.

## Decisions

### 1. `packages/card-templates`: plain TypeScript built by `tsc` to `dist/`

The package is ESM with `"exports": { ".": { "types": "./dist/index.d.ts", "default": "./dist/index.js" } }`, built by `tsc` (`build`) and `tsc --watch` (`dev`). Both apps declare `"card-templates": "workspace:*"`.

`turbo.json` gains `"dependsOn": ["^build"]` on `build`, `test` and `lint`, so the package is built before anything that imports it. `dev` stays persistent, with the package's own `dev` watching.

- **Why built output:** at runtime, the API's `node dist/main.js` loads the package from `node_modules`, and Node doesn't strip types there. Shipping `.js` plus `.d.ts` works unchanged for `nest build`, Vitest, Next.js and `tsc --noEmit`.
- **Alternatives:**
  - TypeScript source with Next's `transpilePackages`: covers the web app only, and the API would still need a build;
  - `tsup` or another bundler: one more tool for a few hundred lines;
  - copying the code into each app: defeats the purpose.

### 2. Template renderer: a small, explicit subset of Anki's syntax

`render(template, fields, { side, clozeIndex, frontHtml })` works on strings, with no DOM:
- `{{Name}}` becomes the field value (already sanitized HTML). An unknown or empty field gives `''`.
- `{{FrontSide}}` on the back becomes the rendered front.
- `{{cloze:Name}}` replaces every `{{cN::text(::hint)?}}` in that field. For N = `clozeIndex`, the front shows `<span class="cloze">[...]</span>` (or `[hint]`) and the back shows `<span class="cloze">text</span>`; any other N shows `text` on both sides.

`clozeNumbers(text)` uses the regex `/\{\{c(\d+)::/g`. Nested clozes are not supported.

`cardsFor(noteType, fields)` returns `{ templateId, clozeIndex }[]`:
- **standard:** each template whose rendered front, with tags, `&nbsp;` and whitespace removed, is non-empty, with `clozeIndex` 0;
- **cloze:** one entry per number found in the fields that the single template references with `cloze:`.

`clozeFields(noteType)` exposes those field names, so the editor knows where the cloze action applies.

Inputs are plain objects (`{ kind, fields: {key, name}[], templates: {id, frontHtml, backHtml}[] }`) shaped like `GET /note-types`, so the web app feeds the response straight in and the API feeds its rows.

- **Alternative:** port an existing Anki renderer (such as the one inside `anki`'s Rust code, or a JS mustache library). That's far more than the stock templates need, and mustache's escaping rules differ from Anki's.

### 3. Template HTML is trusted only inside a sandbox

Field values are always sanitized (decision 4). Template HTML and CSS belong to the user's note types, and today these are only the stock copies. Later they may come from `.apkg` imports, so the web app never injects rendered card HTML into the page DOM.

The preview renders each card side into `<iframe sandbox="" srcdoc="...">`, with the note type's CSS and a `<div class="card">` wrapper:
- `sandbox=""` blocks scripts, forms and navigation;
- the iframe isolates the note type's CSS from the app's Tailwind styles.

The study session will reuse the same component.

### 4. Sanitizer: an allowlist walker over `htmlparser2`, shared by both sides

`sanitizeFieldHtml(html)` works in three steps:
1. parse with `htmlparser2`'s `parseDocument`;
2. walk the tree:
   - keep `b`, `strong`, `i`, `em`, `u` and `br` with no attributes;
   - drop `script` and `style` with their content;
   - unwrap every other element;
   - emit `<br>` between consecutive `p` or `div` siblings;
3. serialize, escaping text with `entities`.

The output is idempotent (spec "Sanitizing field HTML"). Cloze markers are plain text and pass through untouched.

The API sanitizes every field on `POST` and `PATCH /notes`, before storing. The web app sanitizes the editor's output before the preview and before display. The sort field is the sanitized value with tags removed and entities decoded.

- **Why this one:** it gives the same result in Node and the browser, with no DOM or jsdom on the server, at a small bundle size (`htmlparser2` with `domhandler` and `entities` is about 30 kB). It also leaves full control of the paragraph-to-`<br>` rule that Tiptap's `<p>` output needs.
- **Alternatives:**
  - DOMPurify: needs jsdom in Node, which is heavy and behaves slightly differently;
  - `sanitize-html`: pulls `postcss` into the browser bundle and can't express "`<br>` between blocks" without post-processing.

### 5. Card generation and new-card positions

Inside the `POST /notes` transaction, `NotesService`:
1. loads the note type with its fields and templates, scoped to the caller (404 otherwise);
2. sanitizes the fields and computes `cardsFor`;
3. answers 400 if the result is empty;
4. inserts the note, then inserts the cards.

`position` is `coalesce(max(position), 0) + 1` over the caller's cards, computed once per note, and all cards of the note share it, as Anki keeps a note's cards together in the new queue. Two concurrent notes may get the same position, which is harmless: the new queue orders by `(position, id)`, and the UUIDv7 id breaks ties in creation order.

`PATCH /notes/{id}` recomputes `cardsFor` and inserts only the `(templateId, clozeIndex)` pairs that don't exist yet, using `ON CONFLICT DO NOTHING` on `cards_note_id_template_id_cloze_index_unique`. New cards go to the deck of the note's earliest card (lowest `id`). Existing cards are never touched.

### 6. Deck counts: one grouped query, subtree sums in the service

`GET /decks` runs two queries:
- the caller's decks;
- `select deck_id, count(*) filter (where state = 'new' and not suspended), count(*) filter (where state <> 'new' and not suspended and (buried_until is null or buried_until <= $now) and due_at <= $now), count(*) from cards where user_id = $me group by deck_id`.

`$now` is taken once per request, so every count uses the same instant. The service builds the tree in memory and sums each subtree. A user has hundreds of decks at most, so this is trivial.

`GET /decks/{id}` reuses the same code and adds `deleteImpact`:
- subdecks from the in-memory tree;
- cards from the subtree total;
- notes from one query that counts the caller's notes whose every card is in the subtree (`not exists` a card outside it).

- **Alternative:** a recursive CTE that sums subtrees in SQL. It's harder to read and test, and gains nothing at this size.

### 7. Deck writes: an advisory lock per user, with cycles checked in SQL

Every deck create, update and delete runs in a transaction that first takes `pg_advisory_xact_lock(hashtextextended(user_id::text, 0))`, which serializes deck-tree writes per user:
- **Moves:** a recursive CTE walks the new parent's ancestors. If it reaches the deck itself, the answer is 400. Without the lock, two concurrent moves (A under B, B under A) could each pass the check and create a cycle.
- **Names:** trimmed, rejected by Zod when blank (400), and a unique violation on `decks_user_id_parent_id_name_unique` becomes 409.
- **Deletes**, all in the same transaction:
  1. collect the subtree ids with a recursive CTE;
  2. collect the ids of notes with a card in the subtree;
  3. delete the deck, which cascades to subdecks and cards and sets the review logs' `card_id` and `deck_id` to null;
  4. delete the collected notes that now have no cards.
- A `parentId`, `deckId` or `noteTypeId` in a request body is looked up with `where id = $1 and user_id = $me`, and a miss is 404. The composite foreign keys would reject another user's row anyway; the lookup turns that into the documented 404 instead of a 500.

### 8. Errors in the contract

`ApiErrorResponses` gains `notFound` (404) and `conflict` (409), in the same style as `badRequest` and `unauthorized`. Services throw Nest's `NotFoundException`, `ConflictException` and `BadRequestException`, and the global filter already shapes them as `ErrorResponse`.

| Route | 400 | 401 | 404 | 409 |
|---|---|---|---|---|
| `GET /decks`, `GET /note-types` | | x | | |
| `POST /decks` | x | x | x (parent) | x |
| `GET /decks/{id}` | x (bad uuid) | x | x | |
| `PATCH /decks/{id}` | x | x | x | x |
| `DELETE /decks/{id}` | x (bad uuid) | x | x | |
| `POST /notes` | x | x | x | |
| `GET`, `PATCH`, `DELETE /notes/{id}` | x | x | x | |
| `GET /cards` | x | x | x (deckId) | |
| `PATCH /cards/{id}` | x | x | x | |

### 9. Card browser: keyset pagination with an opaque cursor, and no new index

`GET /cards` joins `cards`, `notes`, `decks` and `card_templates`, all with `user_id = $me`.
- **Order:** by the chosen key (`notes.sort_field`, `cards.created_at` or `cards.due_at`), then by `cards.id` in the same direction.
- **Cursor:** base64url JSON `{ sort, order, v, id }` holding the last row's values. The next page adds `(key, cards.id) > ($v, $id)` (or `<` for descending). A cursor whose `sort` or `order` doesn't match the query is a 400.
- **`deckId`:** expands to the subtree with the same recursive CTE as decision 7.
- **`q`:** escapes `%`, `_` and `\` and uses `notes.sort_field ILIKE '%' || $q || '%'`.

No index is added. A `%q%` pattern can't use a B-tree, and ordering one user's rows by `sort_field` at the seed's 10,000 cards is a sort of a few thousand rows, a few milliseconds. The growth path (`system-design/README.md`) already plans a `tsvector` or trigram index for browser search when it matters.

- **Alternative:** offset pagination. It's simpler, but it skips or repeats rows when cards are added or moved while paging, and it gets slower with depth.

### 10. Web data flow: Server Components and Server Actions over a typed client

`openapi-typescript` generates `app/_lib/api-types.ts` (committed) from `../api/openapi.json` with `pnpm --filter web generate:api`. `openapi-fetch` builds a typed client on top of the existing server-only `apiFetch` (base URL plus bearer token), so every path, body and response is typed from the contract.
- **Reads:** pages are async Server Components that call the client.
- **Writes:** Server Actions (`'use server'`) call the client, then `revalidatePath` the affected routes. A 400 or 409 comes back to the form as a field or form error, keeping the input (spec "Deck page").
- **Client components:** only the interactive pieces (editor, dialogs, theme toggle, sheet) run in the browser, and they never call the API.
- **Staleness test:** it runs `openapi-typescript`'s programmatic API on `openapi.json` in memory and compares the result with the committed file, so it needs no server or network.

- **Alternatives:**
  - hand-written fetch wrappers: these are what the spec forbids;
  - calling the API from the browser with a Clerk token: it would contradict `web-authentication` and need CORS and token handling in client code.

### 11. Styling, theme and shell

- **Tailwind and shadcn:**
  - Tailwind v4 through `@tailwindcss/postcss`, with tokens in `app/globals.css` as CSS variables on `:root` and `.dark` (copied from the prototype) and mapped with `@theme inline`;
  - dark mode with `@custom-variant dark (&:where(.dark, .dark *))`;
  - shadcn/ui initialized with `components.json` (`aliases.ui` = `@/components/ui`), adding only the components the screens use: button, input, label, textarea, dialog, alert-dialog, sheet, dropdown-menu, select, table, badge, skeleton, sonner and tooltip.
- **Theme:** `next-themes` with `attribute="class"`, `defaultTheme="system"` and `enableSystem`. Its inline script sets the class before the first paint, and `<html suppressHydrationWarning>` is set.
- **Fonts:** Fraunces, Geist and Geist Mono through `next/font/google` as CSS variables.
- **Shell:**
  - a header on every page with the brand, the theme toggle and Clerk's `<UserButton>` or the sign-in and sign-up buttons;
  - for signed-in pages, a sidebar from 1024 px up, and a menu button that opens the same links in a shadcn `Sheet` below 1024 px.

  The spec requires the menu below 768 px; using it up to 1023 px keeps tablets from getting a cramped sidebar.
- **Clerk:** `<ClerkProvider appearance={{ cssLayerName: 'clerk', variables: { colorBackground: 'var(--card)', colorForeground: 'var(--foreground)', colorPrimary: 'var(--primary)', ... , fontFamily: 'var(--font-geist)' } }}>`, so Clerk follows the active theme through the same variables. If a variable isn't honored, the fallback is `elements` with Tailwind classes.

### 12. Routing and protection

`proxy.ts` uses `createRouteMatcher(['/decks(.*)', '/notes(.*)', '/cards(.*)'])` and calls `auth.protect()` on matches, which redirects to `/sign-in` with a `redirect_url` back to the page. `app/page.tsx` redirects signed-in users to `/decks` and renders the landing page otherwise. Until #65, the signed-in `/` keeps the account summary, as #62 says.

### 13. Note editor

- **Tiptap:** `@tiptap/react` with `StarterKit`, with headings, lists, blockquote, code, code block and horizontal rule turned off, plus the `Underline` extension. That leaves bold, italic, underline, paragraphs and hard breaks.
- **Saving:** each field's `editor.getHTML()` is sanitized with `sanitizeFieldHtml` before the preview and before submission. The API sanitizes again, which doesn't matter because the sanitizer is idempotent.
- **Cloze action:** for fields in `clozeFields(noteType)`, it computes `max(clozeNumbers(all field values)) + 1` and replaces the selection with `{{cN::selection}}` as plain text.
- **Preview:** recomputed on each change and debounced by about 150 ms, using `cardsFor` and `render` from `card-templates`, with each side shown in the sandboxed iframe from decision 3.

### 14. Browser tests

`apps/web/playwright.config.ts` has two projects, `phone` (375 x 812) and `desktop` (1280 x 800).
- **Servers:** `webServer` builds and starts the web app on port 3000 and, for the signed-in suite, the API on port 3001. Both expect `docker compose up -d --wait db` and the developer's local `.env` files, as `pnpm dev` does.
- **Signed out:** these tests always run: theme, overflow, redirects and landing.
- **Signed in:** these use `@clerk/testing`:
  - `clerkSetup()` in global setup;
  - `clerk.signIn()` with a test user of the Clerk development instance, from `E2E_CLERK_USER_USERNAME` and `E2E_CLERK_USER_PASSWORD` in the git-ignored `apps/web/.env.test.local`;
  - `test.skip` when the variables are missing.

  They create decks with a per-run unique prefix and delete them in `afterAll`, so they can run against the developer's database.
- **Accessibility:** `@axe-core/playwright` scans each screen in both themes, and serious and critical violations fail the test.
- **Turbo:** `test:e2e` is a turbo task with `cache: false`, not part of `pnpm test`, so `pnpm test` stays offline.

This is the one place tests talk to Clerk, and only to its development instance. The API's own tests keep signing tokens locally.

### 15. The prototype is the token source

`design/decks-and-cards/prototype.html` is one self-contained page. Its `:root` and `.dark` blocks define the tokens: background, foreground, card, muted, border, primary and its foreground, accent-due (terracotta), accent-new (green), destructive, ring, radius and the three font families. Each screen sits in a 375 px and a 1280 px frame with a per-frame theme switch.

#62 copies the token blocks into `globals.css` unchanged, so "matches the prototype" can be checked by comparing the variables.

The page is published as a private claude.ai artifact for review on a phone, and the user's approval is recorded on #61 before #62's theme is final and before #65 starts.

## Risks / Trade-offs

- [Signed-in browser tests depend on Clerk's development instance and a network.] → They skip without keys, and `pnpm test` stays offline. The flow is also covered at the API level by e2e tests with local tokens.
- [Removing the account section from `/` drops a visible use of `GET /me`.] → It is recorded as a REMOVED requirement with its migration. `GET /me` stays in the API, and the deck list now proves the signed-in API call.
- [The renderer subset will render some imported note types wrongly (conditionals, other filters).] → It's a non-goal for now. The package is the single place to extend when imports land, and unknown tags render empty rather than throwing.
- [Unsanitized template HTML from user-owned note types.] → It is only ever rendered in a `sandbox=""` iframe (decision 3).
- [The allowlist is narrow: imported HTML loses colors, links and images.] → It is deliberate for now, and widening the allowlist is a one-place change. Media (roadmap item 5) adds `img` with checked `src`.
- [The advisory lock serializes all deck writes of one user.] → Deck writes are rare and short, so contention is negligible. Note and card writes don't take it.
- [The stock note type CSS paints a white card, which may look harsh in the dark theme preview.] → The prototype decides how the preview frame looks in dark mode (see Open Questions).
- [Six sub-PRs and a long-lived integration branch.] → This is the same pattern as #48. `dev` is merged into the branch when it moves, never rebased.
- [`^build` dependencies make `pnpm test` build the package first.] → It's a one-second `tsc` and is cached by turbo.

## Migration Plan

- **Database:** no migration. `db:generate` must keep reporting no schema changes.
- **Deployment:** there's no production deployment yet (roadmap item 10). Locally, after pulling the integration branch:
  1. run `pnpm install`;
  2. build with `pnpm build`, or use `pnpm dev`, which builds the package through `^build`;
  3. optionally, add the test user's keys to `apps/web/.env.test.local` for the signed-in Playwright suite.
- **Rollback:** revert the squash commit on `dev`. No data was migrated, and decks and notes created in the meantime stay valid rows.

## Open Questions

- **Dark-mode card preview:** should the preview frame add Anki's `.nightMode` class and a dark override, or show cards exactly as the note type's CSS paints them? The prototype (#61) settles it. Either way the iframe from decision 3 stays the same.
- **The exact set of shadcn components:** decision 11 lists the expected set, and #62 or #65 may add or drop one as the prototype requires. That changes no task.
