# CLAUDE.md

## Issue-driven workflow

GitHub issues in `aysllanferreira/app-flashcards` are the **single source of truth** for all work. Every concrete change is gated by an issue, linked to it, and tracked on it, from explore through archive. These rules override the OpenSpec (opsx) skills wherever they are stricter. All GitHub access goes through the `gh` CLI.

### Issue format

Every issue that tracks work has **exactly** these three sections, in this order, and none may be empty:

```markdown
## Motivation
Why this matters: the problem, who it affects, what happens if we don't do it.

## Description
What will be done, concretely. Put out-of-scope notes here ("Out of scope: ..."),
not in an extra section.

## Acceptance Criteria
- [ ] Verifiable outcome (a command and its expected result, an observable behavior, or a measurable value)
```

- Acceptance Criteria has **at least one** item, and every item is a `- [ ]` checkbox.
- Every criterion must be verifiable. Vague wording ("works well", "is clean", "is fast" with no measure) is not allowed; rewrite it into something checkable before the issue is created or updated.
- Issues created from the web UI use the form in `.github/ISSUE_TEMPLATE/task.yml`, which renders sections as `###` headings. Match sections by name, not by heading level.

### Approval: what needs it and what doesn't

| Needs explicit user approval (show the full text first) | Automatic (no prompt) |
|---|---|
| Creating an issue (`gh issue create`) | Ticking an acceptance criterion checkbox once it has been verified |
| Editing an issue's Motivation, Description or Acceptance Criteria text | Posting propose, progress and archive comments (`gh issue comment`) |
| Closing an issue | |

- Before **any** edit to an issue body, fetch it fresh with `gh issue view <N> --json body`. Change only the target lines and write the body back with `gh issue edit <N> --body-file <file>`. Never overwrite edits made on GitHub.
- When ticking a checkbox, change only `- [ ]` to `- [x]` on the matched line and leave the rest of the body untouched.

### Explore (`/opsx:explore`)

- Open-ended thinking (comparing options, questions with no committed work) needs **no** issue.
- Once the discussion turns into **concrete work** (a feature, fix, refactor or other change that will be proposed):
  - If a matching issue exists, link it and treat it as the source of truth for the discussion.
  - If none exists, draft one in the issue format, show it, and create it only after approval. This happens **before** moving to propose.

### Propose (`/opsx:propose`)

- Do **not** scaffold a change (`openspec new change`) until it is linked to an **open** issue that satisfies the issue format.
  - No issue: draft one, get approval, create it, then continue.
  - Malformed issue: propose a corrected body, get approval, update it, then continue.
- The **first line** of `proposal.md` is `Issue: #N`.
- Proposal artifacts must not claim scope or acceptance outcomes the issue does not contain.
- Every acceptance criterion of the issue is covered by at least one task in `tasks.md`.
- After the artifacts are created, post a comment on the issue naming the change and its location.

### Apply (`/opsx:apply`)

- **Read the linked issue first** (find N from line 1 of `proposal.md`), before implementing any task. The issue wins over the change artifacts. If they conflict, report the conflict before continuing.
- **Scope change:** if the work shows that the scope or an acceptance criterion must change:
  1. Stop implementing.
  2. Propose the issue edit to the user.
  3. Apply the edit only after approval.
  4. Update the change artifacts to match (`/opsx:update`).
  5. Resume.
- **Ticking:** tick each acceptance criterion checkbox on the issue as soon as that criterion has been **verified**, meaning the named command was run or the behavior observed. Finished tasks are not enough on their own.
- **Progress comment:** when an apply session finishes or pauses, post a comment on the issue listing:
  - criteria verified;
  - tasks completed;
  - what remains.

### Archive (`/opsx:archive`)

- **Gate:** do not archive while any acceptance criterion on the linked issue is unticked. List the open criteria and stop.
- When archiving, post a summary comment on the issue covering what shipped and the archive path.
- **Never close the issue during archive.** The PR closes it.

### Sub-issues and integration branches

One issue with one PR into `dev` stays the **default**. When a change is too large for one reviewable PR, the user can choose, during explore or propose, to split it into sub-issues delivered through an integration branch. The rules above still apply, with these additions:

- **Issues:**
  - one parent issue plus one sub-issue per slice, each in the issue format and each created only after approval;
  - create sub-issues with `gh issue create --parent <parent>`;
  - the parent's criteria cover integration (the whole branch passes, specs, wiki), and each sub-issue's criteria cover its slice.
- **Change:**
  - one OpenSpec change is linked to the parent;
  - `proposal.md` has `Issue: #P` on line 1 and `Sub-issues: #S1, #S2, ...` on line 2, in delivery order;
  - the propose comment goes on the parent.
- **Tasks:**
  - `tasks.md` has one task group per sub-issue, in delivery order, whose heading names that sub-issue's criteria, e.g. "(issue #S1, AC 1 and 2)".
  - Each group ends with tasks that:
    1. push the sub-branch;
    2. open a PR into the integration branch with `Refs #S`;
    3. post a progress comment on the sub-issue;
    4. **stop until the user confirms the merge** (verified with `gh pr view <n> --json state` showing `MERGED`).
  - A final group opens the PR from the integration branch into `dev`, with `Closes #P` and `Closes #S` for every sub-issue, then holds the wiki task.
- **Apply:**
  - before each group, read the parent and that group's sub-issue;
  - tick each criterion on the issue that holds it;
  - end the session at each stop task;
  - cut the next sub-branch from the updated integration branch.
- **Archive:**
  - **Gate:** do not archive while any criterion on the parent or on any sub-issue is unticked;
  - the summary comment goes on the parent;
  - archive and the wiki land on the integration branch, which is the head of the final PR, before it merges.

## System design

`system-design/` is the **source of truth** for the system's architecture, request and job flows, data model and CI/CD. It holds:

- the PNG diagrams;
- their editable `.excalidraw` sources;
- `system-design/README.md`, which indexes the diagrams and records the decisions, trade-offs and open questions.

Every OpenSpec phase checks work against it. When a change and the system design disagree, resolve it explicitly: adjust the change, or update the system design after the user approves. A change must never leave `system-design/` describing a different system from the one it delivers. These rules apply alongside the issue-driven workflow.

### Diagram conventions

- Every diagram is a pair with the same basename: `NN-name.png` plus `NN-name.excalidraw`. `NN` is a two-digit sequence number.
- Every diagram is listed and embedded in `system-design/README.md`.
- A new diagram takes the next free number. Don't renumber existing ones.
- Every diagram is also the scene `NN-name` in the Excalidraw+ collection `app-flashcards`, and that scene is the **only** place it is edited.
- Every create or edit goes through the **Excalidraw+ MCP**: `create_diagram` or `edit_scene_content` on the scene, then `take_screenshot` to check the result.
- The repo pair is then exported from the scene: `NN-name.excalidraw` from `get_scene_content` and `NN-name.png` from `take_screenshot`, so the scene and both files match. Update `README.md` too when the description, decisions or trade-offs change.
- A new diagram starts as a new scene with the same name, `NN-name`, in the `app-flashcards` collection.
- **Never** hand-edit or locally render `system-design/*.excalidraw` or `system-design/*.png`. A `PreToolUse` hook (`.claude/hooks/guard-diagram-files.mjs`) blocks Claude's `Edit` and `Write` on them; write the exports from the MCP output through the shell.

### Explore

- Once the discussion turns into concrete work, read `system-design/README.md` and the diagrams relevant to that work.
- Tell the user whether the work **matches** the system design, and which diagrams cover it.
- If it doesn't match, propose specific updates: which diagrams to edit or add, and what changes in each. Apply them only after the user approves. Explore is the main place where the system design is kept current.

### Propose

- `proposal.md` states the system-design alignment, either `System design: no change` or a list of the diagrams to add or update.
- When diagrams change, `tasks.md` includes tasks to edit or create each `.excalidraw` source, re-export its PNG and update `system-design/README.md`.
- `design.md` must not describe architecture that contradicts `system-design/` unless the proposal lists the matching diagram updates.

### Update (`/opsx:update`)

- Whenever the change artifacts are revised, re-check the system-design alignment in `proposal.md` and the diagram tasks in `tasks.md`, and correct them in the same revision.

### Archive

- **Gate:** do not archive while `system-design/` does not reflect what the change delivered. List any outstanding diagram updates and stop.
- The archive summary comment on the issue lists the system-design files that changed, or states that none did.

## API (apps/api)

The NestJS API follows these conventions. The OpenAPI contract `apps/api/openapi.json` is the **source of truth** for what the API exposes, and it is always generated from the code. The rules apply alongside the system design; `system-design/08-api-structure` shows the structure.

### Layout

- Every feature is a module folder `src/modules/<name>/` with:
  - `<name>.module.ts`;
  - `<name>.controller.ts`: HTTP only, no business logic;
  - `<name>.service.ts`: the business logic;
  - `dto/`: request and response schemas;
  - `schema/`: the module's Drizzle tables, one file per table, added once the module needs them. This is the only place a table (`pgTable`) may be defined.
- Code that belongs to no single feature lives in:
  - `src/config/`: the Zod environment schema, validated at startup by `@nestjs/config`;
  - `src/common/`: shared decorators and schemas, such as `ErrorResponse`, `@Public()` and `@CurrentUser()`, plus `configure-app.ts` (the app options and CORS that `main.ts`, the `openapi.json` generator and the tests share);
  - `src/openapi/`: the document builder and the `openapi.json` generator;
  - `src/database/`: the global `DatabaseModule` (the Drizzle client, injected as `DB`), the shared column builders (`id()`, `createdAt()`, `updatedAt()`) and the dev seed.
- `app.module.ts` and `main.ts` stay at the `src/` root. A new module is imported in `AppModule`.
- `src/modules/auth/` registers the global auth guard, and `src/modules/users/` owns account provisioning (see "Auth").
- `test/architecture.spec.ts` fails when:
  - a `*.controller.ts` or `*.service.ts` sits outside `src/modules/<name>/`;
  - a module folder lacks `<name>.module.ts`;
  - a `pgTable` is defined outside `src/modules/<name>/schema/`.

### DTOs, validation and responses

- Request and response shapes are **Zod schemas** in the module's `dto/`. Each `dto/<name>.dto.ts` exports `XSchema` and `type X = z.infer<typeof XSchema>`.
- Never use `class-validator`, `class-transformer` or `nestjs-zod`.
- Routes declare inputs with `@Body({ schema })`, `@Query({ schema })` and `@Param('id', { schema })`, and type the parameter with the inferred type.
- Validation is global:
  - the `StandardSchemaValidationPipe` registered in `AppModule` returns 400 with one message per invalid field;
  - the `StandardSchemaSerializerInterceptor` shapes every response with the route's response schema and drops undeclared fields.
- **Component ids:** body and response schemas get `.meta({ id: 'X' })`, which becomes a named OpenAPI component. Query and path-parameter object schemas **never** get an `id`. Swagger only expands an inline query schema into parameters, and the lint fails on the unused component a named one leaves behind.

### Documenting routes (Swagger)

Every route needs:
- `@ApiTags('<module>')` on its controller;
- `@ApiOperation({ summary })`;
- `@ApiResponseSchema(status, XSchema)`, once per route, for the success response. It documents the schema and shapes the response with it, so never add a separate `@SerializeOptions` or `@ApiResponse` for the success response.
- `@ApiErrorResponses()` for the shared `ErrorResponse`: 500 on every route, plus `{ badRequest: true }` for 400 on routes that take input, `{ unauthorized: true }` for 401 on every route that isn't `@Public()`, `{ notFound: true }` for 404 on routes that address a record by id or name one in their input, and `{ conflict: true }` for 409 on routes that can clash with an existing record.
- A route that answers **204 with no body** (deletes) uses `@HttpCode(204)` and `@ApiNoContentResponse()` instead of `@ApiResponseSchema`, which needs a schema.

Swagger UI is at `/docs` and the JSON at `/docs-json`. Both are served unless `NODE_ENV=production`; `SWAGGER_UI=true` turns them on in production. The startup log prints the URLs.

### Auth

Clerk is the identity provider; `system-design/09-flow-user-sync` shows the flow.
- **Every route needs a valid Clerk session token** (`Authorization: Bearer <jwt>`) unless it is marked `@Public()`. The global guard (`APP_GUARD` in `src/modules/auth/`) answers 401 with `ErrorResponse` for a missing, invalid or expired token, or one whose `azp` isn't in `WEB_ORIGIN`.
- **`@Public()`** (`src/common/decorators/`) is only for health, docs and signed third-party callbacks such as webhooks, which verify their own signature. It also makes the OpenAPI operation declare `security: []`; every other operation requires the bearer scheme.
- **Read the caller with `@CurrentUser()`**, which gives the caller's `users` row. Never decode the token in a route, and scope every query by that user's `id`.
- **Accounts are created only through `ensureUser`** (`UsersService`), which wraps `provisionUser`: the user, the "Default" deck preset and the stock note types, in one transaction, exactly once. The guard calls it on the first request, the Clerk webhook calls it on `user.created`, and the seed uses `provisionUser`. Never insert into `users` anywhere else. Email updates and deletes come only from the `user.*` webhooks.
- **Variables:** `WEB_ORIGIN` (web origins, comma-separated; used for CORS and the `azp` check; `http://localhost:3000` outside production), `CLERK_JWT_KEY` (Clerk's PEM public key, for verification without a network call) or `CLERK_SECRET_KEY` (fallback), and `CLERK_WEBHOOK_SIGNING_SECRET`. Production requires `WEB_ORIGIN`, one of the two keys and the webhook secret. The API README explains the local webhook setup.

### The contract: openapi.json

- After any change to routes, schemas or Swagger decorators, run `pnpm --filter api openapi` and commit the regenerated `apps/api/openapi.json` with the change.
- **Never** edit `openapi.json` by hand. A `PreToolUse` hook (`.claude/hooks/guard-openapi-file.mjs`) blocks Claude's `Edit` and `Write` on it.
- `pnpm --filter api test` runs a drift test that fails when the file doesn't match the code.
- `pnpm --filter api lint` runs Redocly (`apps/api/redocly.yaml`) on the file. Every operation needs a `summary`, an `operationId`, a 2xx response with a schema, an `ErrorResponse` error response and declared `security`, and unused components fail. A unit test also fails when an authenticated operation doesn't document 401. Turn a `recommended` rule off only with a comment explaining why.
- The document's `info.version` is the contract version, set in `src/openapi/build-document.ts`. It is not the release tag, and it changes only on a deliberate contract change.

### Tests

- `pnpm --filter api test` runs three suites:
  - unit (`*.spec.ts`);
  - e2e (`*.e2e-spec.ts`, in-process with supertest);
  - database (`test/db/*.db-spec.ts`, against `flashcards_test`). It needs `docker compose up -d --wait db` and fails with that instruction when the database is down. `pnpm --filter api test:db` runs it alone.
- Every endpoint has an e2e test that parses its response body with the route's response schema (`XSchema.parse(res.body)`).
- Test-only routes live under `test/fixtures/` and never reach `dist/` or `openapi.json`.
- Tests never call Clerk. `test/support/clerk.ts` signs session tokens and Svix webhooks locally, `test/support/env.ts` (a `setupFiles` entry of the e2e and database suites) gives the API the matching keys, and `createTestApp()` (`test/support/create-app.ts`) builds the app as `main.ts` does. Database e2e tests override `DB` with the test database.

### Database

Postgres 18 runs in Docker for local development and tests: `docker compose up -d --wait db` at the repo root starts the app database `flashcards` and `flashcards_test`, and `docker compose down -v` wipes them. Production is Neon. `DATABASE_URL` defaults to the local database outside production and is required in production. `system-design/06-data-model` is the source of truth for the tables.

**Table conventions.** Every new table follows them:
- **ids:** `id()` from `src/database/columns.ts`, a UUIDv7 generated by the app with `uuidv7()` as the database default.
- **Ownership:** every user-owned table has `userId()` (from the `users` module), which cascades on user deletion.
- **Required references to user-owned rows** are composite foreign keys `(x_id, user_id) -> x(id, user_id)`, so a row can never point at another user's data. The referenced table declares `unique(id, user_id)`.
- **"In use" references** (a deck's preset, a note's note type) are `NO ACTION`, never `RESTRICT`, so deleting a user still cascades in one statement.
- **Nullable references that must survive a delete** (`ON DELETE SET NULL`) are single-column foreign keys, and the service that writes them checks ownership.
- **Types:** timestamps are `timestamptz` (`createdAt()`, and `updatedAt()` on tables whose rows change). Enumerations are `text` with a TypeScript union and a `CHECK`, never a Postgres enum.
- **Deletes are permanent.** Review history outlives its card and deck.
- **Naming:** constraints are named explicitly in snake_case (for example `cards_note_fk`). Columns are camelCase keys mapped to snake_case by `casing: 'snake_case'`.

**Migrations:**
- After changing a `schema/` file, run `pnpm --filter api db:generate`, review the generated SQL in `apps/api/drizzle/`, and commit it with the change.
- Apply migrations with `pnpm --filter api db:migrate`. On a branch whose migrations are complete, `db:generate` reports "No schema changes".
- **Never** edit a migration that has been merged, and **never** use `drizzle-kit push`. Fix a bad migration with a new one.

**Tests and data:**
- Every new constraint (unique, check, foreign key, cascade) gets a database test in `test/db/` that asserts the Postgres error code (`23505`, `23514`, `23503`) or the cascade's result.
- `pnpm --filter api db:seed` refills the local database with a demo dataset (10,000 cards, review history). It refuses production and non-local hosts.

### OpenSpec

- Proposals state the API contract impact: "API contract: no change", or the endpoints added, changed or removed, each stated as public or authenticated.
- Proposals state the data model impact: "Data model: no change", or the tables and columns added, changed or removed. When the schema changes, `tasks.md` includes tasks to generate and commit the migration, apply it to a fresh database and add database tests for new constraints.
- When endpoints change, `tasks.md` includes tasks for:
  - their schemas and Swagger decorators;
  - regenerating `openapi.json`;
  - e2e tests that parse responses with their schemas.

## Web (apps/web)

The Next.js app follows these conventions. The approved prototype under `design/` is the visual target (see "Design"), and `system-design/README.md` ("Web UI") records the decisions.

### Styling and components

- **Tailwind v4 and shadcn/ui only.** Components live in `components/ui/` (add one with `pnpm --filter web dlx shadcn@latest add <name>`), app components in `app/_components/`. No CSS modules, no inline colors.
- **Colors come only from the design tokens** in `app/globals.css` (the `:root, .light` and `.dark` blocks, copied unchanged from the prototype, plus `--due`, `--new` and `--learning` for card states). Change a token in the prototype first, then copy it.
- Fonts: Fraunces for headings (`font-heading`), Geist for text, Geist Mono for numbers and dates.
- **Light, dark and system themes** through `next-themes` (class on `<html>`, set before the first paint). Every screen works in both themes.
- **Every screen works at 375 px and 1280 px**: no horizontal scroll, navigation in a sheet below 1024 px, dense tables become stacked rows below 768 px.

### Data and the API

- **The browser never calls the API.** Pages are Server Components that read through `apiClient()` (`app/_lib/api.ts`), and writes are Server Actions in `app/_lib/actions.ts` that call the API and revalidate. Both send the user's Clerk session token.
- **API types come only from the contract.** `app/_lib/api-types.ts` is generated from `apps/api/openapi.json`: run `pnpm --filter web generate:api` after any contract change and commit the result. `pnpm --filter web test` fails while it is stale. Never hand-write interfaces for API bodies.
- **Field HTML is shown only after sanitizing** with `sanitizeFieldHtml` from `card-templates`, and card template HTML renders only inside a sandboxed `<iframe>` (no `allow-scripts`).
- Pages that show a user's own data are protected in `proxy.ts` (`auth.protect()`); `/`, `/sign-in` and `/sign-up` stay public.

### Tests

- `pnpm --filter web test` (Vitest, jsdom) needs no server or network.
- `pnpm --filter web test:e2e` (Playwright) runs against the production build at 375 px (`phone`) and 1280 px (`desktop`), with the API as a second web server. It needs `docker compose up -d --wait db`, and port 3000 free.
- **The one exception to "tests never call Clerk":** signed-in Playwright tests sign in with `@clerk/testing` as a test user of the Clerk development instance (`E2E_CLERK_USER_EMAIL` in the git-ignored `apps/web/.env.test.local`), and skip without it. Each spec cleans up the decks it creates.
- Every screen gets an overflow check at both widths in both themes and an axe scan with no serious or critical violations.
- `pnpm --filter web screenshots` regenerates the review screenshots under `design/<change>/screenshots/`.

## Design

- **UI work starts from an approved prototype.** A change that adds or reshapes screens first builds an HTML prototype under `design/<change>/` (every screen at 375 px and 1280 px, light and dark, with empty, loading, error and confirmation states), publishes it for review, and records the user's approval on the issue before any screen is built.
- The PR that delivers the screens embeds screenshots of them (`design/<change>/screenshots/`) and records the user's review against the prototype.

## Shared packages (packages/)

- Code that both apps need, with no I/O, lives in a workspace package under `packages/` (today `card-templates`: template rendering, card generation and field sanitizing).
- A package is plain TypeScript built by `tsc` to `dist/`, imported as `"<name>": "workspace:*"`, and tested with its own `pnpm --filter <name> test`. Turbo builds it before the apps (`^build`), and a change to it marks both apps as affected for versioning.

## GitHub Wiki

The GitHub Wiki (`https://github.com/aysllanferreira/app-flashcards/wiki`) is the project's shared, browsable place for the roadmap, current status and documentation. Every change keeps it current.

### The last task of every change

- The **last task** in every change's `tasks.md` creates or updates the wiki. It runs after the commits and the PR, so the wiki records what actually shipped.
- That task names the pages it updates:
  - **Always**: `Status` and `Changelog`.
  - **When affected**: `Roadmap` (scope or priorities moved), `Architecture` (diagrams in `system-design/` changed) and `Decisions` (a decision was made or reversed).
- Tick it only after the push has landed and a fresh clone shows the changes.

### Required pages

Each page has a single purpose. Don't create a new page when an existing one covers the content.

| Page | Purpose |
|---|---|
| `Home` | What the app is, quick links and the current phase |
| `Roadmap` | Now / Next / Later; each item links to its issue |
| `Status` | Shipped changes (change, issue, PR, date), work in flight, open questions |
| `Architecture` | Summary of `system-design/` with the diagrams embedded |
| `Development-Workflow` | Issue-driven OpenSpec flow, branches, commits, PRs |
| `Decisions` | Decision log: date, decision, why, link |
| `Changelog` | One entry per archived change, newest first |
| `_Sidebar` and `_Footer` | Navigation linking every content page, and the shared footer |

When a page has to be added, link it from `_Sidebar` in the same push.

### Page conventions

- The first line under the title states the page's purpose in one sentence.
- The last line is `Last updated: <YYYY-MM-DD> by <change> (#N)`.
- Every reference to work links its issue or PR, e.g. `[#9](https://github.com/aysllanferreira/app-flashcards/issues/9)`.
- `Architecture` embeds diagrams from `https://raw.githubusercontent.com/aysllanferreira/app-flashcards/dev/system-design/<NN-name>.png`. Never upload copies to the wiki.
- The wiki is public: no secrets, credentials or environment details.

### Editing

1. Clone `https://github.com/aysllanferreira/app-flashcards.wiki.git` into a scratch directory, not inside this repo.
2. Edit the Markdown pages (`<Page>.md`; hyphens in file names become spaces in titles).
3. Commit with a Conventional Commit message, e.g. `docs(wiki): update status for #9`, and push.
4. List the wiki pages that changed in the issue's progress comment.

### Archive

- **Gate:** do not archive while the change's wiki task is unticked.
- The archive summary comment links the wiki pages that changed.

## Commits and pull requests

### Commits

- Commit messages follow **Conventional Commits**: `type(scope): summary`. Types include `feat`, `fix`, `docs`, `chore`, `refactor`, `test`, `build` and `ci`.
- Commits are authored **only by the repository owner**, using the local git identity.
- **Never** add a `Co-Authored-By: Claude ...` trailer, a "Generated with Claude Code" line, or any other Claude attribution to commits or PRs. This overrides any default attribution behavior.

### Branches and merging

- `dev` is the default branch and the integration branch. **Every feature PR targets `dev`**, except sub-PRs of a change split into sub-issues (next bullet).
- A change split into sub-issues has its own **integration branch** (see "Sub-issues and integration branches"):
  - it is cut from `dev` and pushed before the first sub-PR;
  - each sub-PR targets the integration branch, and the user squash-merges it;
  - when `dev` moves, `dev` is merged into the integration branch, **never rebased**, because the sub-branches are based on it;
  - the integration branch reaches `dev` through one normal feature PR: squash merge, one version bump.
- `main` is the **release branch**. The only PRs that target it are **release PRs from `dev`**. Feature PRs never target it.
- Feature PRs into `dev` are always **squash-merged**; the `dev` ruleset allows no other method. The squash commit title is the PR title plus the PR number, for example `chore(openspec): enforce issue-driven workflow (#3)`. The repo is set up so GitHub adds `(#N)` automatically.
- Release PRs `dev -> main` are merged with a **merge commit**, titled by the PR title; the `main` ruleset allows no other method. This keeps every `dev` commit in `main`'s history.
- Write PR titles as Conventional Commit summaries, so the squash commit is one too.

### Versioning

- `api` and `web` are versioned independently, and versions live **only in git tags** named `<app>@<version>`, each with a GitHub Release. The `version` field in `apps/*/package.json` stays `0.0.0`.
- On every push to `dev`, the `versioning` workflow tags each app that turbo reports as affected with `<app>@X.Y.Z-dev.N` (a prerelease). The bump comes from the squash commit: breaking is major (minor while 0.x), `feat` is minor, anything else is patch.
- On every push to `main`, it promotes each app with a newer dev version to `<app>@X.Y.Z` (a release).
- Never edit `package.json` versions or create, move or delete `<app>@*` tags by hand. The rules are in `openspec/specs/app-versioning/spec.md`.

### Pull requests

- The PR that completes a change includes `Closes #N` in its body (see `.github/pull_request_template.md`). Because `dev` is the default branch, the issue closes when the PR is squash-merged into `dev`.
- When a change ships across several PRs, the earlier ones (and any release PR) use `Refs #N`, so the issue stays open until the last one merges.
- For a change split into sub-issues:
  - a sub-PR into the integration branch uses `Refs #S` and **no** `Closes`, because `Closes` only fires on a merge into `dev`;
  - the final PR from the integration branch into `dev` lists `Closes #P` and a `Closes #S` for every sub-issue, so all of them close when it merges.
- If a change reaches `dev` without a PR, ask the user before closing the issue, and close it only on approval.
