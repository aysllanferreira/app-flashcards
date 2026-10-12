## 1. Feature modules, `/health` and validated config (issue #24, AC 1 to 5)

- [x] 1.1 Commit this change's artifacts on `feat/nestjs-setup` as `chore(openspec): propose add-api-foundation` and push the branch to origin, so the integration branch exists before the first sub-PR. Verify that `git ls-remote --heads origin feat/nestjs-setup` prints the same SHA as `git rev-parse feat/nestjs-setup`.
- [x] 1.2 Read #23 and #24 with `gh issue view`, report any conflict with these artifacts, then cut `feat/api-modules-health` from `feat/nestjs-setup`. Verify that `git merge-base --is-ancestor origin/feat/nestjs-setup HEAD` exits 0.
- [x] 1.3 In `apps/api`, run `pnpm add zod @nestjs/config`. Verify that both appear under `dependencies` in `apps/api/package.json` and `pnpm install --frozen-lockfile` at the root exits 0.
- [x] 1.4 Add `src/config/env.ts` (`EnvSchema` with `NODE_ENV` and `PORT`, plus `type Env`; design.md, decision 2). Register `ConfigModule.forRoot({ isGlobal: true, validate })` in `AppModule`, and make `main.ts` read the port through `ConfigService`. Verify that after `pnpm --filter api build`, `PORT=abc node apps/api/dist/main.js` exits non-zero and its output contains `PORT`. Tick #24 AC 4.
- [x] 1.5 Create `src/modules/health/` with:
  - `health.module.ts`;
  - `health.controller.ts` (`@Controller('health')`, `@Get()`);
  - `health.service.ts` (returns `{ status: 'ok' }`);
  - `dto/health-response.dto.ts` (`HealthResponseSchema = z.object({ status: z.literal('ok') }).meta({ id: 'HealthResponse' })` and `type HealthResponse`).

  Import `HealthModule` in `AppModule`, and delete `src/app.controller.ts`, `src/app.service.ts` and `src/app.controller.spec.ts`. Verify that those three files are gone, the four health files exist, and `find apps/api/src \( -name '*.controller.ts' -o -name '*.service.ts' \) -not -path 'apps/api/src/modules/*'` prints nothing. Tick #24 AC 1.
- [x] 1.6 Replace `test/app.e2e-spec.ts` with `test/health.e2e-spec.ts` (`GET /health` → 200 and `{ status: 'ok' }`), and add `src/modules/health/health.service.spec.ts`. Change the `test` script to `vitest run && vitest run --config ./vitest.config.e2e.ts` (design.md, decision 6). Verify that `pnpm --filter api test` output shows both runs passing, including the health e2e test.
- [x] 1.7 Add `test/architecture.spec.ts` (design.md, decision 1). Verify it:
  - passes as is;
  - fails with the file name after `touch apps/api/src/stray.controller.ts`;
  - fails with the folder name after `mkdir apps/api/src/modules/empty`;
  - passes again once both are removed.

  Tick #24 AC 2.
- [x] 1.8 Start `pnpm --filter api dev`. Verify that `curl -s -w ' %{http_code}' http://localhost:3001/health` prints `{"status":"ok"} 200`, then stop the server. Tick #24 AC 3.
- [x] 1.9 Verify that `pnpm turbo run lint test build --filter=api` exits 0. Tick #24 AC 5.
- [x] 1.10 Commit with a Conventional Commit message (no Claude attribution) and push `feat/api-modules-health`. Open a PR into `feat/nestjs-setup` titled like #24, with `Refs #24` and no `Closes` line in the body. Verify that `gh pr view --json baseRefName,body` shows `feat/nestjs-setup` and `Refs #24`.
- [x] 1.11 Post a progress comment on #24 (criteria verified, tasks completed, the PR link).
- [x] 1.12 Stop until the user confirms the #24 PR is merged. Verify that `gh pr view <n> --json state` shows `MERGED`, then `git switch feat/nestjs-setup && git pull --ff-only`.

## 2. Zod request validation and response shaping (issue #25, AC 1 to 5)

- [x] 2.1 Read #23 and #25, report any conflict, then cut `feat/api-zod-validation` from the updated `feat/nestjs-setup`. Verify that `git merge-base --is-ancestor origin/feat/nestjs-setup HEAD` exits 0.
- [x] 2.2 Register `{ provide: APP_PIPE, useClass: StandardSchemaValidationPipe }` and `{ provide: APP_INTERCEPTOR, useClass: StandardSchemaSerializerInterceptor }` in `AppModule` (design.md, decision 3), and add `@SerializeOptions({ schema: HealthResponseSchema })` to the health route. Verify that `pnpm --filter api test` still passes.
- [x] 2.3 Add `test/fixtures/fixture.module.ts` (design.md, decision 5):
  - a `POST /fixtures/:id` route with `@Param('id', { schema: z.uuid() })`;
  - `@Query({ schema })` with an optional `verbose` boolean;
  - `@Body({ schema })` with a required `title: string` (trimmed);
  - a response schema `{ id, title }`, while the handler returns `{ id, title, secret }`.

  Verify that the module compiles under `pnpm --filter api test`.
- [x] 2.4 Add `test/validation.e2e-spec.ts`, which builds a testing module from `AppModule` plus `FixtureModule`. Verify these e2e cases pass:
  - a body without `title` gets 400 with a `message` array containing an entry that names `title`;
  - `not-a-uuid` as `:id` gets 400;
  - a valid body reaches the handler as the parsed value (e.g. `" Hola "` arrives trimmed as `"Hola"`).

  Tick #25 AC 2.
- [x] 2.5 In the same file, verify that the response body for a valid request has `id` and `title` and no `secret`. Tick #25 AC 3.
- [x] 2.6 In `test/health.e2e-spec.ts`, parse the `GET /health` body with `HealthResponseSchema.parse`. Verify that the test passes. Tick #25 AC 4.
- [x] 2.7 Verify that `grep -cE '"(nestjs-zod|class-validator|class-transformer)"' apps/api/package.json` prints `0`. Tick #25 AC 1.
- [x] 2.8 Verify that `pnpm turbo run lint test build --filter=api` exits 0. Tick #25 AC 5.
- [x] 2.9 Commit and push `feat/api-zod-validation`. Open a PR into `feat/nestjs-setup` titled like #25, with `Refs #25` and no `Closes` line. Verify the base and body with `gh pr view --json baseRefName,body`.
- [x] 2.10 Post a progress comment on #25.
- [x] 2.11 Stop until the user confirms the #25 PR is merged. Verify `gh pr view <n> --json state` shows `MERGED`, then fast-forward the local `feat/nestjs-setup`.

## 3. Swagger UI and the OpenAPI 3.1 document (issue #26, AC 1 to 6)

- [x] 3.1 Read #23 and #26, report any conflict, then cut `feat/api-swagger-docs` from the updated `feat/nestjs-setup`.
- [x] 3.2 In `apps/api`, run `pnpm add @nestjs/swagger zod-openapi`. Verify that both appear under `dependencies` and the root `pnpm install --frozen-lockfile` exits 0. Tick #26 AC 1.
- [x] 3.3 Add `src/openapi/zod-converter.ts` and `src/openapi/build-document.ts` (`buildOpenApiDocument`, `setupDocs`; design.md, decision 7). Verify that `pnpm --filter api build` exits 0.
- [x] 3.4 Add `test/openapi-fixture.spec.ts`. The fixture's query schema has no `.meta({ id })` (design.md, decision 4); its body and response schemas keep theirs. The test builds the document for `AppModule` plus `FixtureModule` and asserts that the document contains the converted schema for the fixture route's:
  - body (a `title` property);
  - query parameter (`verbose`, `in: query`);
  - path parameter (`id`, a UUID format);
  - 2xx response (`id` and `title`, no `secret`).

  Verify that it passes. If any of the four fails because of `@nestjs/swagger`'s Standard Schema support, stop and report it (design.md, Risks) instead of working around it. Tick #26 AC 2.
- [x] 3.5 Add `src/common/dto/error-response.dto.ts` (`ErrorResponseSchema`, id `ErrorResponse`) and the decorators in `src/common/decorators/` (`ApiResponseSchema`, `ApiErrorResponses`; design.md, decision 9). Then:
  - the health controller gets `@ApiTags('health')`, and its route gets `@ApiOperation({ summary })`, `@ApiResponseSchema(200, HealthResponseSchema)` and `@ApiErrorResponses()`;
  - the route drops its plain `@SerializeOptions`;
  - the fixture route uses the same decorators, with `badRequest: true`.

  Verify that `pnpm --filter api test` passes.
- [x] 3.6 Add `SWAGGER_UI` to `EnvSchema` (`z.stringbool().default(false)`). In `main.ts`, call `setupDocs` when `NODE_ENV !== 'production'` or `SWAGGER_UI` is true, and log the API URL, plus the docs URLs when they're served (design.md, decision 8). Verify that `pnpm --filter api build` exits 0.
- [x] 3.7 Start `pnpm --filter api dev` and verify:
  - `curl -s -w ' %{http_code}' localhost:3001/docs` returns 200 and the HTML contains `swagger-ui`;
  - `curl -s localhost:3001/docs-json | jq` shows `openapi` = `3.1.0`;
  - `paths["/health"].get` has `summary` and `operationId`;
  - its `responses["200"]` schema resolves to an object with a `status` property;
  - its `responses["500"]` schema `$ref` ends with `/ErrorResponse`.

  Tick #26 AC 3.
- [x] 3.8 After `pnpm --filter api build`, run `NODE_ENV=production node apps/api/dist/main.js` and verify that `/docs` and `/docs-json` return 404. Restart with `NODE_ENV=production SWAGGER_UI=true` and verify both return 200. Tick #26 AC 4.
- [x] 3.9 Verify the startup output:
  - for `pnpm --filter api dev`, it includes `http://localhost:3001`, `http://localhost:3001/docs` and `http://localhost:3001/docs-json`;
  - for the production run without `SWAGGER_UI` (task 3.8), it includes `http://localhost:3001` and no `/docs` URL.

  Stop all servers. Tick #26 AC 5.
- [x] 3.10 Verify that `pnpm turbo run lint test build --filter=api` exits 0. Tick #26 AC 6.
- [x] 3.11 Commit and push `feat/api-swagger-docs`. Open a PR into `feat/nestjs-setup` titled like #26, with `Refs #26` and no `Closes` line. Verify the base and body.
- [ ] 3.12 Post a progress comment on #26.
- [ ] 3.13 Stop until the user confirms the #26 PR is merged. Verify `MERGED`, then fast-forward the local `feat/nestjs-setup`.

## 4. Committed OpenAPI contract and its checks (issue #27, AC 1 to 5)

- [ ] 4.1 Read #23 and #27, report any conflict, then cut `feat/api-openapi-contract` from the updated `feat/nestjs-setup`.
- [ ] 4.2 Add `src/openapi/generate.ts` and the `openapi` script `nest build && node dist/openapi/generate.js` (design.md, decision 10). Run it and commit `apps/api/openapi.json`. Verify that `git ls-files apps/api/openapi.json` prints the file, and that running `pnpm --filter api openapi` again leaves `git diff --exit-code apps/api/openapi.json` at exit 0. Tick #27 AC 1.
- [ ] 4.3 Add `test/openapi.spec.ts` (the drift test). Verify that:
  - it passes;
  - after changing the health route's summary without regenerating, `pnpm --filter api test` fails with a message that mentions `pnpm --filter api openapi`;
  - after `pnpm --filter api openapi`, it passes;
  - after reverting the summary and regenerating, `git diff apps/api/openapi.json` is empty.

  Tick #27 AC 2.
- [ ] 4.4 Add `@redocly/cli` as a dev dependency and `apps/api/redocly.yaml` (design.md, decision 11), then extend `lint` to run Redocly on `openapi.json`. Verify that `pnpm --filter api lint` exits 0. Then, for four scratch copies of `openapi.json` (made with `jq`), each removing one item from `GET /health`, verify that `redocly lint --config apps/api/redocly.yaml <copy>` exits non-zero. The four removals are:
  - its `summary`;
  - its `operationId`;
  - the 200 response's `content` schema;
  - the 500 response.

  Also verify that a fifth copy, with an extra unused schema added under `components.schemas` (what a named query schema produces), exits non-zero because of `no-unused-components`. Tick #27 AC 3.
- [ ] 4.5 Add `.claude/hooks/guard-openapi-file.mjs` and register it under the existing `Edit|Write` `PreToolUse` matcher in `.claude/settings.json` (design.md, decision 12). Verify:
  - piping `{"tool_name":"Edit","cwd":"<repo>","tool_input":{"file_path":"<repo>/apps/api/openapi.json"}}` into the script exits 2, with stderr mentioning `pnpm --filter api openapi`;
  - the same payload for `<repo>/apps/api/src/main.ts` exits 0;
  - `jq empty .claude/settings.json` exits 0.

  Tick #27 AC 4.
- [ ] 4.6 Verify that `pnpm turbo run lint test build --filter=api` exits 0. Tick #27 AC 5.
- [ ] 4.7 Commit and push `feat/api-openapi-contract`. Open a PR into `feat/nestjs-setup` titled like #27, with `Refs #27` and no `Closes` line. Verify the base and body.
- [ ] 4.8 Post a progress comment on #27.
- [ ] 4.9 Stop until the user confirms the #27 PR is merged. Verify `MERGED`, then fast-forward the local `feat/nestjs-setup`.

## 5. API conventions and system design (issue #28, AC 1 to 4)

- [ ] 5.1 Read #23 and #28, report any conflict, then cut `docs/api-conventions` from the updated `feat/nestjs-setup`.
- [ ] 5.2 Add `## API (apps/api)` to `CLAUDE.md` after `## System design`. It covers:
  - the module layout and cross-cutting folders;
  - Zod DTOs in `dto/` (`XSchema` plus `type X`), and `schema/` for persistence only;
  - body and response schemas get `.meta({ id })`, but query and path-parameter object schemas never do, because Swagger would not expand them into parameters and the lint fails on the unused component;
  - the global validation pipe and serializer interceptor;
  - the decorators every route needs (`@ApiTags`, `@ApiOperation`, `@ApiResponseSchema`, `@ApiErrorResponses`);
  - regenerating `openapi.json` with `pnpm --filter api openapi` (never by hand; a hook blocks it);
  - the drift test, Redocly lint, architecture test and e2e schema tests.

  Verify that `grep -n "^## API (apps/api)" CLAUDE.md` matches and that the section mentions `pnpm --filter api openapi`, `@ApiResponseSchema`, `dto/` and the rule that query schemas get no `.meta({ id })`. Tick #28 AC 1.
- [ ] 5.3 Add to `openspec/config.yaml`:
  - a `rules.proposal` entry: state "API contract: no change" or list the endpoints added, changed or removed;
  - a `rules.design` entry: request and response shapes are Zod schemas in the module's `dto/`, with no class-validator DTOs;
  - a `rules.tasks` entry: changed endpoints get tasks for their schemas and Swagger decorators, regenerating `openapi.json`, and e2e tests that parse responses with their schemas;
  - one `context` sentence pointing to the `CLAUDE.md` API section.

  Verify that `openspec instructions proposal|design|tasks --change add-api-foundation --json | jq -r '.rules[]'` prints each new rule. Tick #28 AC 2.
- [ ] 5.4 Replace `apps/api/README.md` with:
  - what the API is;
  - `pnpm --filter api dev`, `test` and `lint`;
  - the `/docs` and `/docs-json` URLs and the production gating;
  - `pnpm --filter api openapi`;
  - a pointer to `CLAUDE.md` for the rules.

  Verify that the README mentions all three commands and both URLs, and that `grep -ci "mau\|observe" apps/api/README.md` prints `0`. Tick #28 AC 3.
- [ ] 5.5 Read the Excalidraw+ diagram format guide (`read_diagram_format`), then create the scene `08-api-structure` in the `app-flashcards` collection with `create_diagram` (design.md, decision 13). Check it with `take_screenshot` and fix any overlap or missing node with `edit_scene_content`. Verify that `list_collection_scenes` for `app-flashcards` lists `08-api-structure` and that the screenshot shows:
  - the entry points;
  - the pipeline;
  - the modules (health built, the rest marked planned);
  - `config`, `common` and `openapi`;
  - `openapi.json`.
- [ ] 5.6 Export the pair from the scene through the shell, never hand-editing or rendering locally: `system-design/08-api-structure.excalidraw` from `get_scene_content`, and `system-design/08-api-structure.png` from `take_screenshot`. Verify that both files exist, `jq empty` passes on the `.excalidraw`, and `file` reports the `.png` as PNG image data.
- [ ] 5.7 Update `system-design/README.md`:
  - add a "08. API structure" section embedding `08-api-structure.png`;
  - add Decisions rows for API layout (feature modules), API validation (Zod through Nest's built-in Standard Schema support) and the API contract (generated OpenAPI 3.1, committed `openapi.json`, drift and lint checks);
  - remove the open question "ORM and migration tool" only if it is decided by then (it isn't, today).

  Verify that `grep -n "08-api-structure.png" system-design/README.md` matches and `git diff --stat dev -- 'system-design/0[1-7]-*'` prints nothing. Tick #28 AC 4.
- [ ] 5.8 Commit and push `docs/api-conventions`. Open a PR into `feat/nestjs-setup` titled like #28, with `Refs #28` and no `Closes` line. Verify the base and body.
- [ ] 5.9 Post a progress comment on #28.
- [ ] 5.10 Stop until the user confirms the #28 PR is merged. Verify `MERGED`, then fast-forward the local `feat/nestjs-setup`.

## 6. Integration, final PR and wiki (issue #23, AC 1 to 5)

- [ ] 6.1 If `dev` moved, merge `origin/dev` into `feat/nestjs-setup` (no rebase) and push. Then verify that `pnpm install --frozen-lockfile`, `pnpm lint`, `pnpm test` and `pnpm build` at the repo root each exit 0. Tick #23 AC 2.
- [ ] 6.2 Verify that `gh issue view <n> --json body --jq .body | grep -c '^- \[ \]'` prints `0` for each of #24–#28. Tick #23 AC 1.
- [ ] 6.3 Run `openspec validate add-api-foundation --strict`, then sync the deltas with `/opsx:sync`. Verify that:
  - `openspec/specs/monorepo-workspace/spec.md` checks `GET http://localhost:3001/health` returning 200;
  - `openspec list --specs` lists `api-module-structure`, `api-request-validation` and `api-openapi-contract`;
  - `openspec validate --specs --strict` exits 0.

  Commit and push to `feat/nestjs-setup`. Tick #23 AC 4.
- [ ] 6.4 Open the PR from `feat/nestjs-setup` into `dev`. Its title is `feat(api): add API foundation with feature modules, Zod validation and an OpenAPI contract`, and its body has `Closes #23`, `Closes #24`, `Closes #25`, `Closes #26`, `Closes #27` and `Closes #28`, with no Claude attribution. Verify that `gh pr view --json baseRefName,body` shows `dev` and all six `Closes` lines. Tick #23 AC 3.
- [ ] 6.5 Clone `https://github.com/aysllanferreira/app-flashcards.wiki.git` into the scratchpad and update:
  - `Status`: #23 in review with the final PR, and the sub-PRs listed;
  - `Changelog`: a new top entry;
  - `Roadmap`: a new "API foundation" item before the Data layer, linked to #23;
  - `Architecture`: a section for diagram 08, embedded from `https://raw.githubusercontent.com/aysllanferreira/app-flashcards/dev/system-design/08-api-structure.png`;
  - `Decisions`: Zod through Nest's built-in Standard Schema support over class-validator/`nestjs-zod`, the committed OpenAPI 3.1 contract with drift and lint checks, and the feature-module layout, each linked to #23.

  Each page keeps its purpose line and ends with `Last updated: <YYYY-MM-DD> by add-api-foundation (#23)`. Push with `docs(wiki): update for #23`. Verify that a fresh clone shows all five pages changed, and list them in the progress comment on #23. Tick #23 AC 5.
