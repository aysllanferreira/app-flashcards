Issue: #23
Sub-issues: #24, #25, #26, #27, #28

## Why

`apps/api` is still the NestJS starter: one `AppController` returning `Hello World!` at `/`, no request validation, no API docs and no agreed layout. Every MVP feature on the Roadmap adds endpoints, and without a foundation each one would invent its own layout, validation and docs while the web app codes against an undocumented API.

Nest 12 (12.1.2 installed) validates and serializes with Zod out of the box, and `@nestjs/swagger` 12 turns those schemas into OpenAPI. That makes Zod plus a generated, committed OpenAPI contract the cheapest foundation to build now, before the first feature lands. The CI/CD design (`07-cicd`) already smoke-tests `GET /health`, which doesn't exist yet.

## What Changes

Delivered in five sub-issues, each a PR into the integration branch `feat/nestjs-setup`, then one PR into `dev`:

- **#24 Feature modules, `/health` and validated config:**
  - `AppController`/`AppService` are replaced by `src/modules/health` (`GET /health` → `{"status":"ok"}`);
  - `@nestjs/config` validates `NODE_ENV` and `PORT` with a Zod schema at startup;
  - an architecture test enforces the `src/modules/<name>/` layout.
- **#25 Zod validation and response shaping:**
  - a global `StandardSchemaValidationPipe` and `StandardSchemaSerializerInterceptor`;
  - request schemas on `@Body`/`@Query`/`@Param({ schema })`, response schemas through `@SerializeOptions({ schema })`;
  - `dto/` files export a Zod schema and its inferred type.
- **#26 Swagger UI and the OpenAPI 3.1 document:**
  - `@nestjs/swagger` 12 with `zod-openapi` as the converter, through one document builder in `src/openapi/`;
  - `/docs` and `/docs-json`, off in production unless `SWAGGER_UI=true`;
  - the API and docs URLs logged at startup;
  - shared decorators for response schemas and the `ErrorResponse` error shape.
- **#27 Committed contract and its checks:**
  - `pnpm --filter api openapi` writes `apps/api/openapi.json`;
  - a drift test in `pnpm --filter api test`;
  - Redocly lint in `pnpm --filter api lint`;
  - a `PreToolUse` hook that blocks hand-edits to `openapi.json`.
- **#28 Conventions and system design:**
  - an "API (`apps/api`)" section in `CLAUDE.md`;
  - API-contract rules in `openspec/config.yaml`;
  - a new `apps/api/README.md`;
  - the new diagram `08-api-structure` and the README Decisions rows.
- **BREAKING (local only):** `GET http://localhost:3001/` no longer returns `Hello World!`; the API's liveness check is `GET /health`. Nothing consumes `/` today.

System design:
- **Add `08-api-structure`.** A new scene in the Excalidraw+ collection `app-flashcards`, exported as `08-api-structure.excalidraw` and `.png`. It shows:
  - the HTTP entry point (`main.ts`) and the planned worker entry;
  - the global request pipeline (validation pipe → controller → service → serializer interceptor);
  - the health module plus the planned feature modules (users, decks, cards, reviews, media, imports, webhooks);
  - `src/config`, `src/common` and `src/openapi`;
  - the generated `openapi.json`.
- **`system-design/README.md`:** index and embed diagram 08, and add Decisions rows for API layout, API validation and the API contract.
- **No change to diagrams 01–07.** `/health` already appears in `07-cicd`, and the API stays one container in `02-aws-architecture`.

## Capabilities

### New Capabilities
- `api-module-structure`: where API code lives (feature modules in `src/modules/<name>/`, cross-cutting code in `src/config`, `src/common`, `src/openapi`), environment validation at startup, and the architecture test that enforces the layout.
- `api-request-validation`: how requests are validated (400 with per-field messages) and how responses are shaped by their declared schemas.
- `api-openapi-contract`: the served docs (`/docs`, `/docs-json`, production gating, startup URLs), what every documented operation must contain, the committed `openapi.json` with its drift and lint checks, the hand-edit guard, and how proposals declare their API contract impact.

### Modified Capabilities
- `monorepo-workspace`: "One command runs both apps for development" checks the API at `GET http://localhost:3001/health` instead of `GET http://localhost:3001`.

## Impact

- **Code (`apps/api`):**
  - `src/` restructured into `modules/health`, `config/`, `common/` and `openapi/`, with `main.ts` and `app.module.ts` rewritten;
  - `test/` gains health, validation, fixture, OpenAPI drift and architecture tests;
  - new `openapi.json`, `redocly.yaml` and README;
  - `package.json` scripts: `openapi` (new), `lint` (adds Redocly), `test` (also runs the e2e suite).
- **Dependencies (`apps/api`):** `zod`, `@nestjs/config`, `@nestjs/swagger` and `zod-openapi` (runtime); `@redocly/cli` (dev). No `nestjs-zod`, `class-validator` or `class-transformer`.
- **Repo tooling:** a new `.claude/hooks/guard-openapi-file.mjs`, registered in `.claude/settings.json`; a new `CLAUDE.md` section; new `openspec/config.yaml` rules.
- **System design:** new `08-api-structure.excalidraw` and `.png`; `system-design/README.md` updated.
- **Specs:** three new capabilities, and `monorepo-workspace` modified.
- **Wiki:** Status, Changelog, Roadmap, Architecture and Decisions.
- **Out of scope** (from #23): ORM, migrations and `schema/` contents; Clerk JWT verification and the bearer security scheme; CORS, `helmet` and rate limiting; the worker entry point and SQS consumers; a generated web client; the PR CI workflow from `07-cicd`; a global route prefix or URI versioning.
