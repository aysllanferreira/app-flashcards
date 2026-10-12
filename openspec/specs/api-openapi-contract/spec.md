# api-openapi-contract Specification

## Purpose

Makes the OpenAPI document the source of truth for the API: generated from the code, served while developing, committed as `apps/api/openapi.json`, and checked for drift and completeness so every endpoint stays documented.

## Requirements

### Requirement: Docs are served outside production
The API SHALL serve Swagger UI at `/docs` and the OpenAPI document as JSON at `/docs-json` unless `NODE_ENV` is `production`. In production, both paths SHALL return 404 unless `SWAGGER_UI=true`, which SHALL serve both. The document SHALL declare OpenAPI `3.1.0`.

#### Scenario: Development
- **WHEN** the API runs with `NODE_ENV` unset
- **THEN** `GET /docs` returns 200 with the Swagger UI, and `GET /docs-json` returns 200 with a JSON document whose `openapi` is `3.1.0`

#### Scenario: Production
- **WHEN** the built API runs with `NODE_ENV=production` and no `SWAGGER_UI`
- **THEN** `GET /docs` and `GET /docs-json` return 404

#### Scenario: Production with docs enabled
- **WHEN** the built API runs with `NODE_ENV=production` and `SWAGGER_UI=true`
- **THEN** `GET /docs` and `GET /docs-json` return 200

### Requirement: Startup output shows the URLs
On startup, the API SHALL log the URL it listens on and, when the docs are served, the Swagger UI URL and the JSON document URL.

#### Scenario: Development startup
- **WHEN** the API starts on port 3001 with `NODE_ENV` unset
- **THEN** its output includes `http://localhost:3001`, `http://localhost:3001/docs` and `http://localhost:3001/docs-json`

#### Scenario: Production startup without docs
- **WHEN** the API starts with `NODE_ENV=production` and no `SWAGGER_UI`
- **THEN** its output includes the API URL and neither docs URL

### Requirement: Every operation is fully documented
Every operation in the OpenAPI document SHALL have a `summary`, an `operationId`, at least one 2xx response with a schema, and an error response whose schema is the shared `ErrorResponse`. The document SHALL include the converted schema of every request body, query parameter, path parameter and response that a route declares. `ErrorResponse` SHALL describe the API's error body: `statusCode` (integer), `message` (a string or an array of strings) and an optional `error` (string). Every route SHALL document a 500 `ErrorResponse`. Routes that take input SHALL also document a 400 `ErrorResponse`. Routes that address a record by id, or name one in their input, SHALL document a 404 `ErrorResponse`, and routes that can conflict with an existing record SHALL document a 409 `ErrorResponse`. The document SHALL define a bearer security scheme. Every operation SHALL declare its security: operations that require a session token SHALL require the bearer scheme and document a 401 `ErrorResponse`, and public operations SHALL declare an empty security list (`security: []`).

#### Scenario: Health operation
- **WHEN** the document is generated
- **THEN** `GET /health` has a `summary`, an `operationId`, a 200 response whose schema has a `status` property, a 500 response that references `ErrorResponse`, and `security: []`

#### Scenario: All input kinds are converted
- **WHEN** the document is generated for a route that declares a body, a query, a path parameter and a response schema
- **THEN** the document contains the converted schema for each of the four

#### Scenario: Authenticated operation
- **WHEN** the document is generated
- **THEN** `components.securitySchemes` defines an HTTP bearer scheme, and `GET /me` requires it and has a 401 response that references `ErrorResponse`

#### Scenario: Not found and conflict
- **WHEN** the document is generated
- **THEN** `PATCH /decks/{id}` has 404 and 409 responses that reference `ErrorResponse`, and `GET /decks` has neither

#### Scenario: Public webhook operation
- **WHEN** the document is generated
- **THEN** `POST /webhooks/clerk` has `security: []` and a 400 response that references `ErrorResponse`, and no 401 response

#### Scenario: Operation without declared security
- **WHEN** an operation in a copy of the file has no `security` and the document has no global `security`
- **THEN** linting that copy with the API's lint configuration exits non-zero

### Requirement: The contract is committed and kept current
The OpenAPI document SHALL be committed as `apps/api/openapi.json` and generated only by `pnpm --filter api openapi`. Generating it SHALL be deterministic. The document's `info.version` SHALL be a fixed contract version that does not follow release tags. `pnpm --filter api test` SHALL fail when the committed file differs from the document built from the code. `pnpm --filter api lint` SHALL validate the file as OpenAPI 3.1 and fail when any operation breaks the "Every operation is fully documented" rules. Claude Code SHALL refuse its own `Edit` and `Write` on `apps/api/openapi.json`, with a message that points to `pnpm --filter api openapi`.

#### Scenario: Regenerating a current file
- **WHEN** `pnpm --filter api openapi` runs on a clean tree
- **THEN** `git diff --exit-code apps/api/openapi.json` exits 0

#### Scenario: Stale file
- **WHEN** a route's summary changes and `openapi.json` is not regenerated
- **THEN** `pnpm --filter api test` fails, and it passes again after `pnpm --filter api openapi`

#### Scenario: Incomplete operation
- **WHEN** an operation in a copy of the file lacks a `summary`, an `operationId`, a 2xx response with a schema, or an `ErrorResponse` error response
- **THEN** linting that copy with the API's lint configuration exits non-zero

#### Scenario: Hand-edit refused
- **WHEN** Claude Code attempts an `Edit` or `Write` on `apps/api/openapi.json`
- **THEN** the tool call is blocked with a message pointing to `pnpm --filter api openapi`, and an `Edit` on `apps/api/src/main.ts` is allowed

### Requirement: Changes declare their API contract impact
The project's rules SHALL make every proposal state its API contract impact: either "API contract: no change", or the endpoints it adds, changes or removes, each stated as public or authenticated. When a change adds or changes endpoints, its tasks SHALL include:
- declaring the request and response schemas and the Swagger decorators;
- regenerating `openapi.json`;
- e2e tests that parse responses with their schemas.

`CLAUDE.md` SHALL describe these API conventions, including that routes require a session token unless marked public.

#### Scenario: Proposing an endpoint change
- **WHEN** a change that adds an endpoint is proposed
- **THEN** its `proposal.md` lists the new endpoint under its API contract impact and says whether it is public or authenticated, and its `tasks.md` includes regenerating `openapi.json` and an e2e test that parses the endpoint's response with its schema
