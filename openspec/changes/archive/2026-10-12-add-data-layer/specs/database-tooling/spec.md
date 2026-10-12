## Purpose

Defines how developers run, change and test the database: Postgres in Docker for local work, migrations generated from the table definitions and committed, a database test suite that runs with the API tests, a seeded local dataset, and how proposals declare their data model impact.

## ADDED Requirements

### Requirement: Local Postgres starts with one command
`docker compose up -d --wait db` at the repo root SHALL start Postgres 18 from a pinned image, listening on `localhost:5432`, and SHALL return once the database reports healthy. The container SHALL provide the app database and a separate `flashcards_test` database, and SHALL keep its data in a named volume until `docker compose down -v` removes it.

#### Scenario: Database starts healthy with both databases
- **WHEN** `docker compose up -d --wait db` runs on a machine with Docker
- **THEN** the command exits 0, and `psql -l` inside the `db` container lists the app database and `flashcards_test`

#### Scenario: Data is wiped only on request
- **WHEN** `docker compose down` and then `docker compose up -d --wait db` run
- **THEN** the tables and rows from before are still there, while `docker compose down -v` followed by `up` starts from an empty database

### Requirement: Migrations are generated from the table definitions and committed
Schema changes SHALL reach the database only through SQL migrations generated from the table definitions with `pnpm --filter api db:generate`, reviewed and committed with the change. A migration that has been merged SHALL NOT be edited, and the schema SHALL NOT be pushed to a database without a migration. On a branch where the migrations are complete, `pnpm --filter api db:generate` SHALL report that there are no schema changes.

#### Scenario: Table definitions and migrations agree
- **WHEN** `pnpm --filter api db:generate` runs on a branch whose migrations are committed
- **THEN** it reports no schema changes and creates no file

### Requirement: Migrations apply cleanly and only once
`pnpm --filter api db:migrate` SHALL apply every migration not yet applied to the database named by `DATABASE_URL`, and running it again SHALL apply nothing.

#### Scenario: Fresh database
- **WHEN** `pnpm --filter api db:migrate` runs after `docker compose down -v && docker compose up -d --wait db`
- **THEN** it exits 0 and every table of the data model exists

#### Scenario: Second run
- **WHEN** `pnpm --filter api db:migrate` runs again
- **THEN** it exits 0 and applies no migration

### Requirement: Database tests run with the API tests
`pnpm --filter api test` SHALL run a database test suite against `flashcards_test`, after applying the migrations to it, and SHALL never write to the app database. When the database is unreachable, the suite SHALL fail with a message telling the developer to run `docker compose up -d --wait db`.

#### Scenario: Database is running
- **WHEN** `pnpm --filter api test` runs with the `db` container healthy
- **THEN** the unit, e2e and database suites all run, and the database suite checks the data model's constraints against `flashcards_test`

#### Scenario: Database is down
- **WHEN** `pnpm --filter api test` runs with the `db` container stopped
- **THEN** it exits non-zero and its output tells the developer to run `docker compose up -d --wait db`

### Requirement: A seed builds a realistic local dataset
`pnpm --filter api db:seed` SHALL clear the data in the app database and create a demo user with presets, nested decks, the built-in note types, at least 10,000 cards spread across states and due dates, and review logs, then refresh the planner statistics. It SHALL refuse to run when `NODE_ENV` is `production`.

#### Scenario: Seeding locally
- **WHEN** `pnpm --filter api db:seed` runs against the migrated local database
- **THEN** it exits 0 and `cards` holds at least 10,000 rows

#### Scenario: Seeding in production is refused
- **WHEN** `pnpm --filter api db:seed` runs with `NODE_ENV=production`
- **THEN** it exits non-zero without changing any data

### Requirement: Proposals declare their data model impact
Every OpenSpec proposal SHALL state its data model impact: "Data model: no change", or the tables and columns it adds, changes or removes. When a change alters the schema, its `tasks.md` SHALL include tasks to generate and commit the migration, apply it to a fresh database and add database tests for new constraints, and its design SHALL follow the table conventions in `CLAUDE.md`.

#### Scenario: Proposal that adds a column
- **WHEN** a change adds a column to a table
- **THEN** its `proposal.md` lists the column under its data model impact, and its `tasks.md` includes generating the migration, applying it to a fresh database and a database test for any new constraint
