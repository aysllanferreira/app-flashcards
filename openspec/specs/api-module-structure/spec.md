# api-module-structure Specification

## Purpose

Defines where the API's code lives and how it starts: one folder per feature module, separate homes for cross-cutting code, and an environment that is validated before the app serves anything.

## Requirements

### Requirement: Feature modules live in src/modules
Every controller and service in `apps/api/src` SHALL live in a feature module folder `apps/api/src/modules/<name>/`, and every folder directly under `src/modules/` SHALL contain `<name>.module.ts`. A feature module SHALL hold its HTTP layer in `<name>.controller.ts`, its business logic in `<name>.service.ts`, and its request and response schemas in a `dto/` folder. A `schema/` folder SHALL hold only the module's database table definitions, and a table SHALL NOT be defined anywhere else. Code that belongs to no single feature SHALL live in `src/config/` (environment), `src/common/` (shared decorators and schemas), `src/openapi/` (the API document) or `src/database/` (the database client, its module and the seed).

#### Scenario: Health module layout
- **WHEN** the API source tree is listed
- **THEN** `src/modules/health/` contains `health.module.ts`, `health.controller.ts`, `health.service.ts` and `dto/health-response.dto.ts`, and no `*.controller.ts` or `*.service.ts` exists outside `src/modules/`

#### Scenario: Stray controller is rejected
- **WHEN** a `*.controller.ts` or `*.service.ts` file is added outside `src/modules/<name>/`
- **THEN** `pnpm --filter api test` fails with a message naming the file

#### Scenario: Module folder without a module file is rejected
- **WHEN** a folder is added under `src/modules/` without a `<name>.module.ts`
- **THEN** `pnpm --filter api test` fails with a message naming the folder

#### Scenario: Stray table is rejected
- **WHEN** a table definition is added to a file outside `src/modules/<name>/schema/`
- **THEN** `pnpm --filter api test` fails with a message naming the file

### Requirement: Environment is validated at startup
The API SHALL validate its environment before it starts listening. `NODE_ENV` SHALL be one of `development`, `test` or `production`, defaulting to `development`. `PORT` SHALL be an integer port, defaulting to 3001. `SWAGGER_UI` SHALL be a boolean, defaulting to `false`. `DATABASE_URL` SHALL be a `postgres://` or `postgresql://` URL; outside production it SHALL default to the local Docker database, and in production it SHALL be required. `WEB_ORIGIN` SHALL be a comma-separated list of `http` or `https` origins (scheme, host and optional port, with no path); outside production it SHALL default to `http://localhost:3000`, and in production it SHALL be required. `CLERK_JWT_KEY` (the identity provider's PEM public key) and `CLERK_SECRET_KEY` SHALL be optional, but in production at least one of them SHALL be set. `CLERK_WEBHOOK_SIGNING_SECRET` SHALL be optional outside production and required in production. If any value is invalid or a required value is missing, the API SHALL exit with a non-zero code and an error that names the variable.

#### Scenario: Defaults
- **WHEN** the API starts with none of these variables set
- **THEN** it listens on port 3001, uses the local Docker database and accepts browser requests from `http://localhost:3000`

#### Scenario: Invalid port
- **WHEN** the API starts with `PORT=abc`
- **THEN** it exits with a non-zero code and its error output names `PORT`

#### Scenario: Invalid database URL
- **WHEN** the API starts with `DATABASE_URL=not-a-url`
- **THEN** it exits with a non-zero code and its error output names `DATABASE_URL`

#### Scenario: Database URL missing in production
- **WHEN** the API starts with `NODE_ENV=production` and no `DATABASE_URL`
- **THEN** it exits with a non-zero code and its error output names `DATABASE_URL`

#### Scenario: Invalid web origin
- **WHEN** the API starts with `WEB_ORIGIN=http://localhost:3000/app`
- **THEN** it exits with a non-zero code and its error output names `WEB_ORIGIN`

#### Scenario: Web origin missing in production
- **WHEN** the API starts with `NODE_ENV=production`, a valid `DATABASE_URL`, a `CLERK_JWT_KEY`, a `CLERK_WEBHOOK_SIGNING_SECRET` and no `WEB_ORIGIN`
- **THEN** it exits with a non-zero code and its error output names `WEB_ORIGIN`

#### Scenario: No token verification key in production
- **WHEN** the API starts with `NODE_ENV=production`, a valid `DATABASE_URL`, `WEB_ORIGIN` and `CLERK_WEBHOOK_SIGNING_SECRET`, and neither `CLERK_JWT_KEY` nor `CLERK_SECRET_KEY`
- **THEN** it exits with a non-zero code and its error output names `CLERK_JWT_KEY` and `CLERK_SECRET_KEY`

#### Scenario: Webhook secret missing in production
- **WHEN** the API starts with `NODE_ENV=production`, a valid `DATABASE_URL`, `WEB_ORIGIN` and `CLERK_JWT_KEY`, and no `CLERK_WEBHOOK_SIGNING_SECRET`
- **THEN** it exits with a non-zero code and its error output names `CLERK_WEBHOOK_SIGNING_SECRET`

### Requirement: Health endpoint
The API SHALL answer `GET /health` with status 200 and the JSON body `{"status":"ok"}`.

#### Scenario: Health check
- **WHEN** a client sends `GET /health` to a running API
- **THEN** the response status is 200 and the body is `{"status":"ok"}`

### Requirement: The API starts without a reachable database
The API SHALL open its database connection on first use, so it starts and answers `GET /health` while the database is unreachable, and it SHALL close its database connections when it shuts down.

#### Scenario: Database stopped
- **WHEN** the API starts while the `db` container is stopped
- **THEN** it starts listening, and `GET /health` returns 200 with `{"status":"ok"}`
