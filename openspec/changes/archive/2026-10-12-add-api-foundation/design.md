## Context

See proposal.md, Why. The current API and tooling, as observed:

- **`apps/api`:**
  - an ESM package (`"type": "module"`, `module: nodenext`, so relative imports end in `.js`) on `@nestjs/*` 12.1.2;
  - `experimentalDecorators` and `emitDecoratorMetadata` are on;
  - `main.ts` listens on `process.env.PORT ?? 3001`;
  - the only route is `AppController.getHello()` at `GET /`.
- **Tests:**
  - Vitest 4. `pnpm --filter api test` runs `vitest run` (files matching `**/*.spec.ts`).
  - `test:e2e` runs `vitest.config.e2e.ts` (`**/*.e2e-spec.ts`). Root `pnpm test` therefore never runs e2e tests today.
  - Both suites pass, so Nest DI works under Vitest's transform.
- **Lint:** `oxlint --type-aware src/ test/`.
- **Nest 12 built-ins:**
  - `@Body/@Query/@Param({ schema })` attach a Standard Schema to a parameter;
  - `StandardSchemaValidationPipe` validates it and returns 400 with `path: message` strings;
  - `StandardSchemaSerializerInterceptor` with `@SerializeOptions({ schema })` validates and transforms responses.
- **`@nestjs/swagger` 12:**
  - the `standardSchemaConverter` option turns those schemas into OpenAPI (bodies, queries, params);
  - `@ApiResponse({ standardSchema })` does the same for responses.
- **`zod-openapi` 6:** `createSchema(schema, { io })` returns `{ schema, components }`, and `.meta({ id })` registers a named component.
- **Repo tooling:** `.claude/settings.json` already registers a `PreToolUse` hook (`guard-diagram-files.mjs`) for `Edit|Write`.
- **System design:** the system design shows the API as one container. `07-cicd` smoke-tests `GET /health`. There is no PR CI workflow yet, so the checks here run through `pnpm lint`/`pnpm test`.

## Goals / Non-Goals

**Goals:**
- One definition per shape: a Zod schema gives the TS type, the validation, the response shaping and the OpenAPI schema.
- The committed `openapi.json` can't silently drift from the code or lose documentation.
- Each sub-issue leaves `feat/nestjs-setup` green (`pnpm turbo run lint test build --filter=api`).

**Non-Goals:**
- Persistence, auth guards, CORS, `helmet`, the worker entry point, client generation and PR CI (see proposal, out of scope).
- Changing `apps/web`.

## Decisions

1. **Layout and its enforcement (#24).**
   - `src/modules/<name>/{<name>.module.ts, <name>.controller.ts, <name>.service.ts, dto/}`, plus `src/config/`, `src/common/` and `src/openapi/`. `app.module.ts` and `main.ts` stay at the `src/` root.
   - `test/architecture.spec.ts` walks `src/` with `node:fs`:
     - every `*.controller.ts` and `*.service.ts` must sit at `src/modules/<name>/`;
     - every directory directly under `src/modules/` must contain `<name>.module.ts`;
     - failures name the offending path.
   - *Alternative*: dependency-cruiser. Rejected for now: one more tool for two rules. It can come later for import-boundary rules.
2. **Environment through `@nestjs/config` with a Zod schema (#24, extended in #26).**
   - `src/config/env.ts` exports `EnvSchema`:
     - `NODE_ENV`: `z.enum([...]).default('development')`;
     - `PORT`: `z.coerce.number().int().min(1).max(65535).default(3001)`;
     - `SWAGGER_UI`: `z.stringbool().default(false)`, added in #26.
   - It also exports `type Env`.
   - `ConfigModule.forRoot({ isGlobal: true, validate: (raw) => EnvSchema.parse(raw) })`. A Zod error names the variable path, so `PORT=abc` fails with `PORT` in the message.
   - `main.ts` reads values through `ConfigService<Env, true>`.
   - *Alternative*: parse `process.env` in a plain module. Rejected because injected config keeps future modules (database, Clerk) testable.
3. **Validation and shaping are registered in `AppModule`, not `main.ts` (#25).**
   - `{ provide: APP_PIPE, useClass: StandardSchemaValidationPipe }` and `{ provide: APP_INTERCEPTOR, useClass: StandardSchemaSerializerInterceptor }`.
   - Any app built from `AppModule`, including the testing modules in e2e tests and the OpenAPI generator, gets the same pipeline. `app.useGlobalPipes` in `main.ts` would skip it in tests.
4. **DTO convention (#25).**
   - `dto/<name>.dto.ts` exports `XSchema = z.object({...})` and `type X = z.infer<typeof XSchema>`.
   - **Body and response schemas** add `.meta({ id: 'X' })`. The `id` becomes the OpenAPI component name, so documents use `$ref`s with readable names (`HealthResponse`, `ErrorResponse`).
   - **Query and path-parameter object schemas get no `id`.** `@nestjs/swagger` 12.0.2 expands an inline object schema into one parameter per field. A schema carrying an `id` comes back from the converter as a `$ref`, which it does not expand: it emits an unused component and no parameters. This was found by the fixture check in task 3.4.
   - Redocly's `no-unused-components` rule, set to error (decision 11), catches a query schema that is given an `id` by mistake.
   - Handlers type their parameters with the inferred type: `@Body({ schema: CreateDeckSchema }) body: CreateDeck`.
5. **Fixture routes prove validation and documentation without product endpoints (#25, #26).**
   - `test/fixtures/fixture.module.ts` declares a controller with a Zod body, a query, a UUID path parameter, and a response schema that omits a field the handler returns.
   - e2e tests build a testing module from `AppModule` plus `FixtureModule`. The global pipe and interceptor apply because they are `APP_*` providers.
   - The OpenAPI test in #26 builds the document from the same pair and asserts the four converted schemas.
   - Fixtures live under `test/`, so they never reach `dist/` or `openapi.json`.
6. **`pnpm --filter api test` runs unit and e2e suites (#24).**
   - The `test` script becomes `vitest run && vitest run --config ./vitest.config.e2e.ts`, so root `pnpm test` covers the e2e tests these issues rely on.
   - The e2e tests run in-process with supertest, with no database or network, so the cost is under a second.
   - `test:e2e` stays for running e2e alone.
7. **One document builder (#26).**
   - `src/openapi/build-document.ts` exports `buildOpenApiDocument(app)`:
     - `DocumentBuilder` with title "Flashcards API", a fixed `info.version` (`0.1.0`, the contract version, bumped by hand only for deliberate contract changes) and `setOpenAPIVersion('3.1.0')`;
     - `SwaggerModule.createDocument(app, config, { standardSchemaConverter })`.
   - It also exports `setupDocs(app, document)`, which calls `SwaggerModule.setup('docs', app, document, { jsonDocumentUrl: 'docs-json' })`.
   - `src/openapi/zod-converter.ts`:
     - narrows to Zod with `schema['~standard'].vendor === 'zod'`;
     - calls `createSchema(schema, { io: schemaType })`;
     - returns `undefined` for other vendors.
   - `main.ts`, the generator and the tests all call `buildOpenApiDocument`, so they can't diverge.
   - Release tags aren't used for `info.version`, because the committed file would then change on every release and fight the drift test.
8. **Docs gating and startup logs (#26).**
   - `main.ts` serves docs when `NODE_ENV !== 'production' || SWAGGER_UI`. When they're off, `/docs` and `/docs-json` 404 by default.
   - After `listen`, a `Logger('Bootstrap')` logs `API listening on http://localhost:<port>`, then `Swagger UI: .../docs` and `OpenAPI JSON: .../docs-json` when docs are on.
9. **Shared decorators (#26), in `src/common/decorators/`:**
   - `ApiResponseSchema(status, schema, description?)` is `applyDecorators(ApiResponse({ status, description, standardSchema: schema }), SerializeOptions({ schema }))`. One decorator documents and shapes the response, so the two can't disagree.
   - `ApiErrorResponses({ badRequest?: boolean })` documents 500 always, plus 400 when `badRequest` is true, both with `ErrorResponseSchema` (`src/common/dto/error-response.dto.ts`: `statusCode` int, `message` string or string[], `error` optional string; Nest's default error body).
   - Every route also gets `@ApiOperation({ summary })` and its controller `@ApiTags(...)`.
   - `operationId` keeps `@nestjs/swagger`'s default (`HealthController_check`), which is unique per controller method.
10. **Generating `openapi.json` (#27).**
    - The `openapi` script is `nest build && node dist/openapi/generate.js`. Node's type stripping can't run legacy decorators, so the generator runs from the build output.
    - `generate.ts`:
      - creates the app with `NestFactory.create(AppModule, { logger: false })`;
      - calls `buildOpenApiDocument`;
      - writes `JSON.stringify(document, null, 2) + '\n'` to `apps/api/openapi.json`, resolved from `import.meta.url`;
      - closes the app.
    - The drift test (`test/openapi.spec.ts`, a unit test) builds the document the same way and compares it with the parsed file using `toEqual`. Its failure message says to run `pnpm --filter api openapi`.
11. **Lint with Redocly CLI (#27).**
    - `@redocly/cli` is a dev dependency, configured in `apps/api/redocly.yaml`. The config extends `recommended`, then makes these rules errors:
      - `operation-summary`;
      - `operation-operationId`;
      - `operation-2xx-response`;
      - a configurable rule that every 2xx response's media type has a `schema`;
      - a configurable rule that every operation has a 4xx or 5xx response whose schema `$ref` ends with `/ErrorResponse`;
      - `no-unused-components` (a `warn` in `recommended`), so a named query or path-parameter schema, which ends up as an unused component (decision 4), fails the lint.
    - It also turns off four rules:
      - `operation-4xx-response`, because `/health` has no 4xx and the `ErrorResponse` rule replaces it;
      - `security-defined`, because no security scheme exists until API auth lands;
      - `info-license`;
      - `no-empty-servers`, because there is no fixed server URL until the domain is decided (an open question in `system-design/README.md`), and Swagger UI uses the origin it is served from. This one was found when the lint was first run in #27.
    - The `lint` script becomes `oxlint --type-aware src/ test/ && redocly lint openapi.json`, with `REDOCLY_TELEMETRY=off` set in the script.
    - If a configurable rule can't express a check, a local Redocly plugin (`apps/api/redocly/plugin.js`) implements it instead. The AC is checked against lint outcomes, not the rule mechanism.
12. **Hand-edit guard (#27).**
    - `.claude/hooks/guard-openapi-file.mjs` mirrors `guard-diagram-files.mjs`:
      - reads the payload;
      - resolves `tool_input.file_path` relative to `$CLAUDE_PROJECT_DIR`;
      - for `apps/api/openapi.json`, exits 2 with a message pointing to `pnpm --filter api openapi`;
      - otherwise exits 0.
    - It's registered as a second hook under the existing `Edit|Write` matcher in `.claude/settings.json`.
    - *Alternative*: generalize the diagram guard. Rejected so each guard keeps its own specific message.
13. **Conventions and diagram (#28).**
    - **`CLAUDE.md`:** a new `## API (apps/api)` section after "System design".
    - **`openspec/config.yaml`:** a `rules.proposal` "API contract:" rule, a `rules.design` Zod-DTO rule and a `rules.tasks` endpoint rule.
    - **Diagram `08-api-structure`:**
      - created with `create_diagram` in the `app-flashcards` collection and checked with `take_screenshot`;
      - exported as `.excalidraw` (from `get_scene_content`) and `.png` (from `take_screenshot`), written through the shell;
      - shows: the entry points; the pipeline (validation pipe → controller → service → serializer interceptor); the modules (health built, others marked planned); `config`, `common` and `openapi`; and `openapi.json`.
14. **Delivery order and branches.**
    - Each sub-issue is cut from the updated `feat/nestjs-setup`:
      - `feat/api-modules-health` (#24)
      - `feat/api-zod-validation` (#25)
      - `feat/api-swagger-docs` (#26)
      - `feat/api-openapi-contract` (#27)
      - `docs/api-conventions` (#28)
    - The change artifacts are committed to `feat/nestjs-setup` and pushed before the first sub-PR.
    - The spec sync, wiki and archive go onto `feat/nestjs-setup` after the final PR into `dev` is open.

## Risks / Trade-offs

- **[Swagger's Standard Schema support is new (12.0.0, August 2026)]** → #26 starts with the fixture test that asserts all four schema kinds convert. If one fails, stop and raise it before building on it (scope-change rule), rather than working around it silently.
  - That check found one limit: a query schema with a component `id` isn't expanded into parameters. Body, path-parameter and response schemas convert correctly.
  - Resolved by convention (decision 4, approved by the owner) and guarded by the lint (decision 11).
  - If a later `@nestjs/swagger` release expands referenced query schemas, the convention can be relaxed.
- **[`zod-openapi` output differs from what Swagger expects for 3.1]** → The `/docs-json` checks in #26 and the Redocly validation in #27 catch an invalid document.
- **[Redocly's `recommended` set may flag rules not listed here]** → Adjust `redocly.yaml` only to turn off rules that conflict with this design (no auth yet, no 4xx on `/health`), and list each one in a comment. Never turn off the four documentation rules.
- **[Running e2e in `test` slows the root test]** → In-process tests, measured in milliseconds today. Revisit if a later e2e suite needs a database.
- **[The generator boots the whole `AppModule`]** → Fine today (no external connections). When the data layer arrives, its providers must not connect at construction, or the generator needs a document-only module. Flagged for that change.
- **[`openapi.json` diffs are noisy in PRs]** → Accepted: the diff is the contract review. Formatting is stable, so only real changes show.

## Migration Plan

- `GET /` disappears and `GET /health` replaces it. No client uses `/` (the web app doesn't call the API yet).
- The `monorepo-workspace` spec is updated to match at sync.
- Rollback: revert the final squash commit on `dev`.
- In-flight sub-PRs can be reverted individually on `feat/nestjs-setup`.
