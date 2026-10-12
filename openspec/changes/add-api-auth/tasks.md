## 1. System design: the user sync flow and the API auth guard (issue #49, AC 1 to 3)

- [x] 1.1 Cut `feat/api-auth` from `dev`, commit this change's artifacts as `chore(openspec): propose add-api-auth` and push the branch, so the integration branch exists before the first sub-PR. Before committing, run `find . -name "* [0-9].*" -not -path "*/node_modules/*" -not -path "*/.git/*" -not -path "*/.next/*"` and remove any sync duplicates. Verify that `git ls-remote --heads origin feat/api-auth` prints the same SHA as `git rev-parse feat/api-auth`.
- [x] 1.2 Read #48 and #49 with `gh issue view`, report any conflict with these artifacts, then cut `docs/auth-system-design` from `feat/api-auth`. Verify that `git merge-base --is-ancestor origin/feat/api-auth HEAD` exits 0.
- [x] 1.3 Read the Excalidraw+ diagram format guide (`read_diagram_format`), list the scenes of the `app-flashcards` collection with `list_collection_scenes`, and read `03-flow-study-session` with `get_scene_content` to reuse its sequence-diagram layout, colours and fonts. Verify that the listing shows `03-flow-study-session` and `08-api-structure` and no `09-*` scene.
- [x] 1.4 Create the scene `09-flow-user-sync` in the `app-flashcards` collection and draw it with `edit_scene_content` in the style of 03 (design.md, decisions 3 to 5):
  - lifelines: learner browser, Next.js on Amplify, Clerk, NGINX -> NestJS api, Postgres;
  - part (a): sign-up with Clerk, then `GET /me` with a Bearer JWT, the guard verifying the JWT (`azp` in `WEB_ORIGIN`), `ensureUser` running `INSERT users ... ON CONFLICT DO NOTHING` and, for a new user, the "Default" preset and stock note types in one transaction, then 200 `MeResponse`;
  - part (b): Clerk posting `user.created`, `user.updated` and `user.deleted` to `POST /webhooks/clerk`, the Svix signature check (400 on failure), `ensureUser` plus the email update, the cascading `DELETE FROM users`, and the 200 acknowledgement, with a note that Svix retries non-2xx;
  - a note that local delivery needs a tunnel and production waits for `api.*`.

  Check it with `take_screenshot` and fix overlaps with `edit_scene_content`. Verify that the screenshot shows both parts and all three event names.
- [x] 1.5 Export the pair through the shell, never hand-editing or rendering locally: `system-design/09-flow-user-sync.excalidraw` from `get_scene_content` and `system-design/09-flow-user-sync.png` from `take_screenshot`. Verify that `jq empty` passes on the `.excalidraw`, `file` reports the `.png` as PNG image data, and `grep -c "ensureUser\|user.created\|user.deleted" system-design/09-flow-user-sync.excalidraw` prints a number greater than 0. Tick #49 AC 1.
- [x] 1.6 With `edit_scene_content`, change:
  - in `08-api-structure`:
    - add a global auth guard (`APP_GUARD`, Clerk JWT -> `users` row) between `main.ts` and the validation pipe;
    - add a red "401 ErrorResponse" box fed by the guard, like the 400 one;
    - add a "@Public(): health, webhooks" label on a path that skips the guard;
    - move `users` and `webhooks` (and `auth`) to the built modules;
    - make the `src/config` box name `WEB_ORIGIN` and the `CLERK_*` variables;
  - in `03-flow-study-session`: the `ClerkAuthGuard` note to "verify JWT with cached JWKS, map sub -> users.id (create + provision on first request)".

  Check each with `take_screenshot`. Verify that the 08 screenshot shows `401` and `@Public` and the 03 screenshot shows "first request".
- [x] 1.7 Export the `08` and `03` pairs from their scenes as in 1.5. Verify that `grep -c 401 system-design/08-api-structure.excalidraw`, `grep -c @Public system-design/08-api-structure.excalidraw` and `grep -c "first request" system-design/03-flow-study-session.excalidraw` each print a number above 0, and `git diff --stat origin/feat/api-auth -- 'system-design/0[124567]-*'` prints nothing. Tick #49 AC 2.
- [x] 1.8 Update `system-design/README.md`:
  - a "09. Flow: user sync" section that describes and embeds `09-flow-user-sync.png`;
  - the 08 description mentions the auth guard and the 401 path;
  - the Auth decision row adds first-request provisioning through one shared `ensureUser` and that updates and deletes come only from webhooks;
  - an accepted trade-off for the window (up to the token lifetime, or a late `user.created` retry) in which a deleted account can be recreated empty.

  Verify that `grep -n "09-flow-user-sync.png\|first request\|deleted" system-design/README.md` matches the embed, the Auth row and the trade-off. Tick #49 AC 3.
- [ ] 1.9 Check for sync duplicates as in 1.1, commit with a Conventional Commit message (no Claude attribution) and push `docs/auth-system-design`. Open a PR into `feat/api-auth` titled like #49, with `Refs #49` and no `Closes` line in the body. Verify that `gh pr view --json baseRefName,body` shows `feat/api-auth` and `Refs #49`.
- [ ] 1.10 Post a progress comment on #49 (criteria verified, tasks completed, the PR link).
- [ ] 1.11 Stop until the user confirms the #49 PR is merged. Verify that `gh pr view <n> --json state` shows `MERGED`, then `git switch feat/api-auth && git pull --ff-only`.

## 2. Token verification, first-request provisioning and GET /me (issue #50, AC 1 to 8)

- [ ] 2.1 Read #48 and #50, report any conflict, then cut `feat/api-auth-guard` from the updated `feat/api-auth`. Verify the merge base as in 1.2.
- [ ] 2.2 In `apps/api`, run `pnpm add -E @clerk/backend@<version>` with the version the lockfile already resolves for `@clerk/nextjs` (`ls node_modules/.pnpm | grep '^@clerk+backend@'`; 3.23.2 at proposal time). Verify that `apps/api/package.json` lists it without `^` or `~`, `pnpm install --frozen-lockfile` exits 0, and `ls node_modules/.pnpm | grep -c '^@clerk+backend@'` prints `1`.
- [ ] 2.3 Spike (design.md, Risks): add `test/support/clerk.ts` with the key pair and `signSessionToken` (design.md, decision 9), and a unit test that verifies a signed token with `verifyToken(token, { jwtKey, authorizedParties: ['http://localhost:3000'] })` and rejects an expired one and one with `azp: 'https://evil.example'`. Verify that `pnpm --filter api exec vitest run test/support` passes. If a claim is missing, add it to the helper and note it in design.md.
- [ ] 2.4 Extend `src/config/env.ts` with `WEB_ORIGIN`, `CLERK_JWT_KEY` and `CLERK_SECRET_KEY` and their production checks (design.md, decision 7; `CLERK_WEBHOOK_SIGNING_SECRET` comes in 3.2 with #51), and add them to `apps/api/.env.example` with empty values except `WEB_ORIGIN=http://localhost:3000`. Extend `env.spec.ts` with:
  - the `WEB_ORIGIN` default;
  - a rejected `http://localhost:3000/app`;
  - a list of two origins parsing to two entries;
  - an escaped-newline PEM restored;
  - the missing-`WEB_ORIGIN` and missing-key production failures in the `api-module-structure` delta spec.

  Verify that the unit tests pass, and that after `pnpm --filter api build`:
  - `NODE_ENV=production DATABASE_URL=postgres://u:p@localhost:5432/x CLERK_JWT_KEY=k node apps/api/dist/main.js` exits non-zero naming `WEB_ORIGIN`;
  - the same with `WEB_ORIGIN=https://app.example` and without `CLERK_JWT_KEY` exits non-zero naming `CLERK_JWT_KEY` and `CLERK_SECRET_KEY`.

  Tick #50 AC 5.
- [ ] 2.5 Add `src/common/configure-app.ts` with `APP_OPTIONS` and `configureApp` (design.md, decision 6), and use them in `main.ts` and `openapi/generate.ts`. Add `test/support/create-app.ts`, which builds the app from `AppModule` with optional provider overrides, `APP_OPTIONS` and `configureApp`, and `test/support/env.ts`, registered as `setupFiles` in `vitest.config.e2e.ts` and `vitest.config.db.ts`. Switch the existing e2e tests to the helper. Verify that `pnpm --filter api test` passes and `pnpm --filter api openapi` leaves `git diff --exit-code apps/api/openapi.json` at 0.
- [ ] 2.6 Add `src/modules/users/provision-user.ts` (`provisionUser`), `users.service.ts` (`ensureUser`, `syncFromClerk`) and export `UsersService` from `UsersModule` (design.md, decision 3). Add `test/db/provisioning.db-spec.ts`, which shows that:
  - `provisionUser` creates one user, one preset named `Default` and three note types;
  - a second call creates nothing and returns the same id;
  - two concurrent calls (`Promise.all`) leave one user, one preset and three note types;
  - `syncFromClerk` sets and later changes `email`.

  Verify that `pnpm --filter api test:db` passes.
- [ ] 2.7 Change `src/database/seed.ts` to create the demo user with `provisionUser` and use the returned preset and note types, removing its direct `deckPresets` "Default" insert and `copyStockNoteTypes` call. Verify that:
  - `grep -n "copyStockNoteTypes" apps/api/src/database/seed.ts` prints nothing;
  - `pnpm --filter api db:seed` exits 0;
  - `docker compose exec db psql -U flashcards -tAc "select count(*) from deck_presets where name = 'Default'"` prints `1` and `select count(*) from note_types` prints `3`.

  Tick #50 AC 7.
- [ ] 2.8 Add `src/common/decorators/public.decorator.ts` (`@Public()`) and `current-user.decorator.ts` (`@CurrentUser()`), and `src/modules/auth/` with `auth.module.ts` (registers `AuthGuard` as `APP_GUARD`), `auth.service.ts` (token verification, design.md, decision 1) and `auth.guard.ts` (skips `@Public()`, verifies, runs `ensureUser`, attaches the user). Import `AuthModule` in `AppModule` and mark `HealthController` `@Public()`. Add `auth.service.spec.ts` unit tests for:
  - a missing header;
  - a non-bearer header;
  - a malformed token;
  - an expired token;
  - a foreign `azp`;
  - no key configured.

  Verify that the unit tests and the architecture test pass.
- [ ] 2.9 Add the `users` HTTP layer: `dto/me-response.dto.ts` (`MeResponseSchema` with `.meta({ id: 'MeResponse' })`: `id`, `email` nullable, `timezone`, `dayRolloverHour`, `remindersOn`, `createdAt` as an ISO string) and `users.controller.ts` with `GET /me`, decorated with:
  - `@ApiTags('users')`;
  - `@ApiOperation({ summary: "Get the caller's account" })`;
  - `@ApiResponseSchema(200, MeResponseSchema)`;
  - `@ApiErrorResponses({ unauthorized: true })`.

  Verify that `pnpm --filter api build` exits 0.
- [ ] 2.10 OpenAPI security (design.md, decision 8):
  - in `buildOpenApiDocument`, add `.addBearerAuth()` and the global bearer requirement;
  - make `@Public()` emit `security: []`, or use the post-processing fallback and record which in design.md;
  - add `unauthorized` to `ApiErrorResponses`;
  - delete `security-defined: off` and its comment from `redocly.yaml`;
  - extend `test/openapi.spec.ts` to fail when an operation that inherits bearer security has no 401 response;
  - run `pnpm --filter api openapi`.

  Verify that:
  - `jq '.components.securitySchemes' apps/api/openapi.json` shows an HTTP bearer scheme;
  - `jq '.paths["/me"].get.security // .security' apps/api/openapi.json` is non-empty;
  - `jq '.paths["/health"].get.security' apps/api/openapi.json` prints `[]`;
  - `grep -n "security-defined: off" apps/api/redocly.yaml` prints nothing;
  - `pnpm --filter api lint` exits 0;
  - deleting the `security` key from `/health` in a temporary copy of `openapi.json` makes `redocly lint --config apps/api/redocly.yaml <copy>` exit non-zero.

  Tick #50 AC 6.
- [ ] 2.11 Add `test/auth.e2e-spec.ts`, built with `test/support/create-app.ts`, which shows that:
  - `GET /me` with no header, `Bearer not-a-jwt`, an expired token and a token with `azp: 'https://evil.example'` each returns 401 with a body that `ErrorResponseSchema.parse` accepts;
  - `GET /health` and `GET /docs-json` (docs set up with `setupDocs` in the test app) return 200 without a token;
  - `OPTIONS /me` from `http://localhost:3000` returns `Access-Control-Allow-Origin: http://localhost:3000` and allows `authorization`;
  - the same preflight from `https://evil.example` has no `Access-Control-Allow-Origin`.

  Verify that `pnpm --filter api test:e2e` passes. Tick #50 AC 3 and 4.
- [ ] 2.12 Add `test/db/me.db-spec.ts`, which builds the app with `overrideProvider(DB).useValue(ctx.db)` and shows that:
  - a valid token returns 200, and `MeResponseSchema.parse(res.body)` accepts it with `email` null, `timezone` `UTC` and `dayRolloverHour` 4;
  - a second request returns the same `id`;
  - after the first request the database holds one user, one `Default` preset and three note types (Basic, Basic (and reversed card), Cloze) for that `clerk_user_id`;
  - two concurrent first requests both return 200 with one `id` and the same counts.

  Verify that `pnpm --filter api test:db` passes. Together with 2.11, tick #50 AC 1 and 2.
- [ ] 2.13 Verify that `pnpm turbo run lint test build --filter=api` exits 0 with the `db` container healthy. Tick #50 AC 8.
- [ ] 2.14 Check for sync duplicates, commit and push `feat/api-auth-guard`. Open a PR into `feat/api-auth` titled like #50, with `Refs #50` and no `Closes` line. Verify the base and body with `gh pr view --json baseRefName,body`.
- [ ] 2.15 Post a progress comment on #50.
- [ ] 2.16 Stop until the user confirms the #50 PR is merged. Verify `MERGED`, then fast-forward the local `feat/api-auth`.

## 3. Clerk webhook sync (issue #51, AC 1 to 7)

- [ ] 3.1 Read #48 and #51, report any conflict, then cut `feat/clerk-webhooks` from the updated `feat/api-auth`. Verify the merge base as in 1.2.
- [ ] 3.2 Add `CLERK_WEBHOOK_SIGNING_SECRET` to `src/config/env.ts` (optional, required in production; design.md, decision 7), to `apps/api/.env.example` with an empty value and to `env.spec.ts` (the production failure), and set a test secret in `test/support/env.ts`. In `apps/api`, run `pnpm add -D -E svix@<latest>`, and add `signWebhook(event, { secret? })` to `test/support/clerk.ts` (design.md, decision 9), with test `user.*` payload builders shaped like Clerk's (`id`, `email_addresses`, `primary_email_address_id`; `deleted: true` for `user.deleted`). Verify that the unit tests pass, `apps/api/package.json` lists `svix` without `^` or `~` and `pnpm install --frozen-lockfile` exits 0.
- [ ] 3.3 Add `src/modules/webhooks/`:
  - `webhooks.module.ts`, importing `UsersModule`;
  - `webhooks.controller.ts`: `POST /webhooks/clerk` with `@Public()`, `@ApiTags('webhooks')`, `@ApiOperation({ summary: 'Receive Clerk user events' })`, `@ApiResponseSchema(200, WebhookAckSchema)` and `@ApiErrorResponses({ badRequest: true })`. It verifies over `req.rawBody` with `verifyWebhook` and turns failures into 400 (design.md, decision 5);
  - `webhooks.service.ts`, dispatching the events (design.md, decision 4);
  - `dto/webhook-ack.dto.ts`.

  Import the module in `AppModule` and run `pnpm --filter api openapi`. Verify that `jq '.paths["/webhooks/clerk"].post.security' apps/api/openapi.json` prints `[]`, its responses include `400` and not `401`, and `pnpm --filter api lint` exits 0.
- [ ] 3.4 Add `test/webhooks.e2e-spec.ts`, which shows that:
  - a payload signed with another secret, and one without `svix-*` headers, each return 400 with a body that `ErrorResponseSchema.parse` accepts, and never 401;
  - a signed `session.created` returns 200, and its body parses with `WebhookAckSchema`.

  Verify that `pnpm --filter api test:e2e` passes. Tick #51 AC 1.
- [ ] 3.5 Add `test/db/webhooks.db-spec.ts` (app with `overrideProvider(DB)`), which shows that:
  - a signed `user.created` creates one user with the event's primary email, one `Default` preset and three note types, and sending it again changes no counts;
  - `user.created` for a user first created by `GET /me` fills `email` and keeps the counts;
  - `user.updated` changes `email`;
  - `user.deleted` for a user with a deck, a note, a card and a review log (built with the existing `test/db/helpers.ts`) leaves no row with that user's id in `users`, `decks`, `notes`, `cards` or `review_logs`;
  - `user.deleted` for an unknown user returns 200 and changes nothing;
  - a bad signature creates no user.

  Every 200 body is parsed with `WebhookAckSchema`. Verify that `pnpm --filter api test:db` passes. Tick #51 AC 2, 3 and 4.
- [ ] 3.6 After `pnpm --filter api build`, verify that `NODE_ENV=production DATABASE_URL=postgres://u:p@localhost:5432/x WEB_ORIGIN=https://app.example CLERK_JWT_KEY=k node apps/api/dist/main.js` exits non-zero naming `CLERK_WEBHOOK_SIGNING_SECRET`. Tick #51 AC 5.
- [ ] 3.7 Add a "Clerk webhooks (local)" section to `apps/api/README.md` with the tunnel, Clerk dashboard and `.env` steps (design.md, decision 11). Verify that the section names `ngrok`, `/webhooks/clerk`, `user.created`, `user.updated`, `user.deleted`, `CLERK_WEBHOOK_SIGNING_SECRET` and `CLERK_JWT_KEY`.
- [ ] 3.8 Live check with the user. Ask them to:
  - start a tunnel;
  - add the development-instance endpoint;
  - put `CLERK_WEBHOOK_SIGNING_SECRET` and `CLERK_JWT_KEY` in `apps/api/.env` as the README says;
  - with `pnpm dev` running both apps, sign up a new account in the web app.

  Then verify that `docker compose exec db psql -U flashcards -tAc "select email from users order by created_at desc limit 1"` prints that account's email, and that the Clerk dashboard shows the delivery as succeeded. Do not handle the user's credentials. Tick #51 AC 6.
- [ ] 3.9 Verify that `pnpm turbo run lint test build --filter=api` exits 0. Tick #51 AC 7.
- [ ] 3.10 Check for sync duplicates, commit and push `feat/clerk-webhooks`. Open a PR into `feat/api-auth` titled like #51, with `Refs #51` and no `Closes` line. Verify the base and body.
- [ ] 3.11 Post a progress comment on #51.
- [ ] 3.12 Stop until the user confirms the #51 PR is merged. Verify `MERGED`, then fast-forward the local `feat/api-auth`.

## 4. Web: API calls with the session token and the account display (issue #52, AC 1 to 6)

- [ ] 4.1 Read #48 and #52, report any conflict, then cut `feat/web-api-proof` from the updated `feat/api-auth`. Verify the merge base as in 1.2.
- [ ] 4.2 Add `API_URL` to the `turbo.json` build `env` and `API_URL=` to `apps/web/.env.example`, and run `pnpm --filter web add server-only` if it isn't already available. Verify that `pnpm turbo run build --filter=web --dry=json | jq '.tasks[] | select(.taskId=="web#build") | .environmentVariables'` lists `API_URL`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY`.
- [ ] 4.3 Add `apps/web/app/_lib/api.ts` with `apiFetch` (design.md, decision 10) and alias `server-only` to an empty module in `vitest.config.mts`. Add `__tests__/api.test.ts` with `@clerk/nextjs/server` and `fetch` mocked, which shows that:
  - a token `abc` sends `Authorization: Bearer abc` to `http://localhost:3001/me`;
  - no token sends no `Authorization` header;
  - `API_URL` overrides the base URL.

  Verify that `pnpm --filter web test` passes. Tick #52 AC 1.
- [ ] 4.4 Add `apps/web/app/_components/account-summary.tsx` and render it on `/` (design.md, decision 10). Add `__tests__/account-summary.test.tsx`, which shows that it:
  - renders nothing when signed out;
  - renders the email and time zone from a mocked 200 `/me`;
  - renders "No email yet" for a null email;
  - renders the "Couldn't load your account right now." message for a rejected `fetch` and for a 500.

  Verify that `pnpm --filter web test` passes.
- [ ] 4.5 With `docker compose up -d --wait db` and `pnpm dev` running both apps, check `/` signed out:
  - `curl -s -o /dev/null -w '%{http_code} %{redirect_url}' http://localhost:3000/` prints `200` and no redirect;
  - the page has no account section (checked in the built-in browser).

  Tick #52 AC 3.
- [ ] 4.6 Ask the user to sign in on `http://localhost:3000` in the built-in browser, or to provide a development-instance test account for you to use. Verify in the browser that `/` shows the account's email (or "No email yet") and `UTC`, and that `docker compose exec db psql -U flashcards -tAc "select count(*) from users where clerk_user_id = '<the signed-in user id>'"` prints `1`. Tick #52 AC 2.
- [ ] 4.7 Still signed in, stop only the API and reload `/`. Verify that the page loads (the browser's network panel shows 200 for the document) and shows "Couldn't load your account right now.", then restart the API. Tick #52 AC 4.
- [ ] 4.8 Verify that the dry run in 4.2 lists `API_URL` and that `grep -rn "NEXT_PUBLIC_API\|CLERK_SECRET_KEY" apps/web/app` prints nothing. Tick #52 AC 5.
- [ ] 4.9 Verify that `pnpm turbo run lint test build --filter=web` exits 0. Tick #52 AC 6.
- [ ] 4.10 Check for sync duplicates, commit and push `feat/web-api-proof`. Open a PR into `feat/api-auth` titled like #52, with `Refs #52` and no `Closes` line. Verify the base and body.
- [ ] 4.11 Post a progress comment on #52.
- [ ] 4.12 Stop until the user confirms the #52 PR is merged. Verify `MERGED`, then fast-forward the local `feat/api-auth`.

## 5. Auth conventions in CLAUDE.md, OpenSpec rules and the API README (issue #53, AC 1 to 3)

- [ ] 5.1 Read #48 and #53, report any conflict, then cut `docs/auth-conventions` from the updated `feat/api-auth`. Verify the merge base as in 1.2.
- [ ] 5.2 Add an "Auth" subsection to the "API (`apps/api`)" section of `CLAUDE.md`:
  - every route requires a valid Clerk session token unless marked `@Public()`;
  - `@Public()` is only for health, docs and signed third-party callbacks such as webhooks;
  - routes read the caller with `@CurrentUser()`, never from the token;
  - authenticated routes document 401 with `@ApiErrorResponses({ unauthorized: true })`;
  - accounts are created only through `ensureUser` (`provisionUser`);
  - the `WEB_ORIGIN` and `CLERK_*` variables.

  Also add `src/modules/auth` and the two decorators to the Layout bullets. Verify that `grep -n "@Public()\|@CurrentUser()\|ensureUser\|WEB_ORIGIN" CLAUDE.md` matches inside the "API (apps/api)" section. Tick #53 AC 1.
- [ ] 5.3 Add a `rules.proposal` entry to `openspec/config.yaml`: every endpoint listed under the API contract impact states whether it is public or authenticated. Verify that `grep -n "public or authenticated" openspec/config.yaml` prints it and that `openspec instructions proposal --change add-api-auth --json | jq -r '.rules[]'` includes it. Tick #53 AC 2.
- [ ] 5.4 Add an "Auth" section to `apps/api/README.md`:
  - an environment table with `WEB_ORIGIN`, `CLERK_JWT_KEY`, `CLERK_SECRET_KEY` and `CLERK_WEBHOOK_SIGNING_SECRET` (defaults, and what is required in production);
  - how to call an authenticated route from Swagger UI's Authorize button;
  - a link to the "Clerk webhooks (local)" section.

  Verify that the README names all four variables. Tick #53 AC 3.
- [ ] 5.5 Check for sync duplicates, commit and push `docs/auth-conventions`. Open a PR into `feat/api-auth` titled like #53, with `Refs #53` and no `Closes` line. Verify the base and body.
- [ ] 5.6 Post a progress comment on #53.
- [ ] 5.7 Stop until the user confirms the #53 PR is merged. Verify `MERGED`, then fast-forward the local `feat/api-auth`.

## 6. Integration, final PR and wiki (issue #48, AC 1 to 7)

- [ ] 6.1 If `dev` moved, merge `origin/dev` into `feat/api-auth` (no rebase) and push. With `docker compose up -d --wait db` run first, verify that `pnpm install --frozen-lockfile`, `pnpm lint`, `pnpm test` and `pnpm build` at the repo root each exit 0. Tick #48 AC 2.
- [ ] 6.2 Verify that `jq -r '.paths | keys[]' apps/api/openapi.json` prints exactly `/health`, `/me` and `/webhooks/clerk`. Tick #48 AC 3.
- [ ] 6.3 Verify that `pnpm --filter api db:generate` reports no schema changes and `git diff dev...feat/api-auth -- apps/api/drizzle` prints nothing. Tick #48 AC 4.
- [ ] 6.4 Verify that `gh issue view <n> --json body --jq .body | grep -c '^- \[ \]'` prints `0` for each of #49–#53. Tick #48 AC 1.
- [ ] 6.5 Open the PR from `feat/api-auth` into `dev`. Its title is `feat(auth): verify Clerk sessions in the API and sync users from Clerk webhooks`, and its body has `Closes #48`, `Closes #49`, `Closes #50`, `Closes #51`, `Closes #52` and `Closes #53`, with no Claude attribution. Verify that `gh pr view --json baseRefName,body` shows `dev` and all six `Closes` lines. Tick #48 AC 5.
- [ ] 6.6 Run `openspec validate add-api-auth --strict`, then sync the deltas with `/opsx:sync`. Verify that:
  - `openspec list --specs` lists `api-authentication` and `clerk-user-sync`;
  - `openspec/specs/web-authentication/spec.md` has the "Signed-in users see their account" requirement;
  - `openspec validate --specs --strict` exits 0.

  Commit and push to `feat/api-auth` (it lands in the open PR). Tick #48 AC 6.
- [ ] 6.7 Clone `https://github.com/aysllanferreira/app-flashcards.wiki.git` into the scratchpad and update:
  - `Status`: #48 in review, awaiting squash-merge, with the final PR and the sub-PRs listed;
  - `Changelog`: a new top entry;
  - `Roadmap`: the Auth item linked to #48, with API JWT verification and user sync in review;
  - `Architecture`: a new section embedding `09-flow-user-sync`, and the 08 and 03 sections updated, embedded from `https://raw.githubusercontent.com/aysllanferreira/app-flashcards/dev/system-design/<NN-name>.png`;
  - `Decisions`: first-request provisioning through one shared `ensureUser`; updates and deletes only from webhooks; `WEB_ORIGIN` for CORS and authorized parties; networkless JWT verification with `CLERK_JWT_KEY`. Each is linked to #48.

  Each page keeps its purpose line and ends with `Last updated: <YYYY-MM-DD> by add-api-auth (#48)`. Push with `docs(wiki): update for #48`. Verify that a fresh clone shows all five pages changed, and list them in a progress comment on #48. Tick #48 AC 7.
