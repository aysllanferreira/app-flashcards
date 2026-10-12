# monorepo-workspace Specification

## Purpose

Root-level developer commands that install, run, build, lint and test the web app and the API together from one repository, with fixed local ports and generated output kept out of Git.

## Requirements

### Requirement: One install covers every workspace
Running `pnpm install` at the repository root SHALL install the dependencies of the root, of both apps (`web` and `api`) and of every shared package under `packages/`, and exit with code 0. The repository SHALL have a single lockfile, at the root.

#### Scenario: Root install succeeds
- **WHEN** a developer runs `pnpm install` at the repository root of a fresh clone
- **THEN** the command exits with code 0
- **AND** `apps/web`, `apps/api` and each package under `packages/` have their dependencies installed

#### Scenario: Single lockfile
- **WHEN** `pnpm install` has completed
- **THEN** `pnpm-lock.yaml` exists at the root and no lockfile exists under `apps/` or `packages/`

### Requirement: One command runs both apps for development
Running `pnpm dev` at the root SHALL start the web app on `http://localhost:3000` and the API on `http://localhost:3001` at the same time, from a single process the developer can stop with one interrupt. The API's liveness check SHALL be `GET /health`.

#### Scenario: Both apps respond
- **WHEN** a developer runs `pnpm dev` at the root and waits for both apps to start
- **THEN** an HTTP GET to `http://localhost:3000` returns status 200 with the web home page
- **AND** an HTTP GET to `http://localhost:3001/health` returns status 200 with the body `{"status":"ok"}`

### Requirement: One command builds both apps
Running `pnpm build` at the root SHALL build every shared package under `packages/` before the apps that depend on it, then produce a production build of the web app and of the API, and exit with code 0.

#### Scenario: Root build succeeds
- **WHEN** a developer runs `pnpm build` at the root
- **THEN** the command exits with code 0
- **AND** the output shows a build task for `card-templates` that finishes before the build tasks for `web` and `api`

### Requirement: Lint and test run in both apps
Running `pnpm lint` and `pnpm test` at the root SHALL each run that check in both `web` and `api` and in every shared package under `packages/`, and exit with code 0 when the checks pass. Linting SHALL report problems without rewriting source files. The web app SHALL have at least one test that renders its home page.

#### Scenario: Root lint covers both apps
- **WHEN** a developer runs `pnpm lint` at the root
- **THEN** the command exits with code 0
- **AND** the output shows a lint task for `web`, one for `api` and one for `card-templates`
- **AND** `git status` shows no source files modified by the lint run

#### Scenario: Root test covers both apps
- **WHEN** a developer runs `pnpm test` at the root
- **THEN** the command exits with code 0
- **AND** the output shows a test task for `web`, one for `api` and one for `card-templates`
- **AND** the `web` test run includes a test that renders the home page

### Requirement: Generated output stays out of Git
Dependencies, build output and task-runner cache produced by install, dev and build SHALL be ignored by Git.

#### Scenario: Clean status after install, dev and build
- **WHEN** a developer runs `pnpm install`, `pnpm dev` (then stops it) and `pnpm build` on a clean checkout
- **THEN** `git status --porcelain` lists no `node_modules`, `.next`, `dist` or `.turbo` entries
