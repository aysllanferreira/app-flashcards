## Purpose

Defines where the API's code lives and how it starts: one folder per feature module, separate homes for cross-cutting code, and an environment that is validated before the app serves anything.

## ADDED Requirements

### Requirement: Feature modules live in src/modules
Every controller and service in `apps/api/src` SHALL live in a feature module folder `apps/api/src/modules/<name>/`, and every folder directly under `src/modules/` SHALL contain `<name>.module.ts`. A feature module SHALL hold its HTTP layer in `<name>.controller.ts`, its business logic in `<name>.service.ts`, and its request and response schemas in a `dto/` folder. A `schema/` folder SHALL appear only for persistence schemas. Code that belongs to no single feature SHALL live in `src/config/` (environment), `src/common/` (shared decorators and schemas) or `src/openapi/` (the API document).

#### Scenario: Health module layout
- **WHEN** the API source tree is listed
- **THEN** `src/modules/health/` contains `health.module.ts`, `health.controller.ts`, `health.service.ts` and `dto/health-response.dto.ts`, and no `*.controller.ts` or `*.service.ts` exists outside `src/modules/`

#### Scenario: Stray controller is rejected
- **WHEN** a `*.controller.ts` or `*.service.ts` file is added outside `src/modules/<name>/`
- **THEN** `pnpm --filter api test` fails with a message naming the file

#### Scenario: Module folder without a module file is rejected
- **WHEN** a folder is added under `src/modules/` without a `<name>.module.ts`
- **THEN** `pnpm --filter api test` fails with a message naming the folder

### Requirement: Environment is validated at startup
The API SHALL validate its environment before it starts listening. `NODE_ENV` SHALL be one of `development`, `test` or `production`, defaulting to `development`. `PORT` SHALL be an integer port, defaulting to 3001. `SWAGGER_UI` SHALL be a boolean, defaulting to `false`. If any value is invalid, the API SHALL exit with a non-zero code and an error that names the variable.

#### Scenario: Defaults
- **WHEN** the API starts with none of these variables set
- **THEN** it listens on port 3001

#### Scenario: Invalid port
- **WHEN** the API starts with `PORT=abc`
- **THEN** it exits with a non-zero code and its error output names `PORT`

### Requirement: Health endpoint
The API SHALL answer `GET /health` with status 200 and the JSON body `{"status":"ok"}`.

#### Scenario: Health check
- **WHEN** a client sends `GET /health` to a running API
- **THEN** the response status is 200 and the body is `{"status":"ok"}`
