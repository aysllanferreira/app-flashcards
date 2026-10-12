# api

The NestJS REST API for the flashcards app. It lives in this Turborepo monorepo next to the Next.js web app (`apps/web`).

The rules for working on it (module layout, Zod DTOs, Swagger decorators, the OpenAPI contract, the database conventions and the tests) are in the "API (apps/api)" section of [`CLAUDE.md`](../../CLAUDE.md). The architecture is in [`system-design/08-api-structure.png`](../../system-design/08-api-structure.png) and the tables in [`system-design/06-data-model.png`](../../system-design/06-data-model.png).

## Run it

From the repo root:

```bash
pnpm install
docker compose up -d --wait db
pnpm --filter api db:migrate
pnpm --filter api dev
```

The API starts without a database too: it connects on the first query.

The API listens on `http://localhost:3001` (set `PORT` to change it). On startup it logs its URL and, when the docs are served, the docs URLs:

| URL | What it is |
|---|---|
| `http://localhost:3001/health` | Liveness check: `{"status":"ok"}` |
| `http://localhost:3001/docs` | Swagger UI |
| `http://localhost:3001/docs-json` | The OpenAPI 3.1 document as JSON |

The docs are served unless `NODE_ENV=production`; set `SWAGGER_UI=true` to serve them in production too.

### Environment

| Variable | Default | |
|---|---|---|
| `NODE_ENV` | `development` | `development`, `test` or `production` |
| `PORT` | `3001` | Port to listen on |
| `SWAGGER_UI` | `false` | Serve `/docs` and `/docs-json` in production |
| `DATABASE_URL` | the local Docker database | A `postgres://` URL. Required in production |

Invalid values stop the API at startup with an error naming the variable. Copy `.env.example` to `.env` to override them locally; `.env` is git-ignored.

## Database

Postgres 18 runs in Docker, defined in `compose.yaml` at the repo root. Run these from the repo root:

```bash
docker compose up -d --wait db     # start Postgres: the app database and flashcards_test
pnpm --filter api db:migrate       # apply the migrations in drizzle/
pnpm --filter api db:seed          # replace local data with a demo user and 10,000 cards
pnpm --filter api db:generate      # after changing a schema/ file: write a new migration
docker compose down -v             # stop Postgres and wipe its data
```

Tables are defined in each module's `schema/` folder. After changing one, run `db:generate`, review the SQL it writes to `drizzle/`, and commit it with the change. Never edit a merged migration or use `drizzle-kit push`. The table conventions are in the "Database" subsection of [`CLAUDE.md`](../../CLAUDE.md).

If `docker compose up` fails because port 5432 is taken, stop the other Postgres (for example `brew services stop postgresql`) and try again.

## Check it

```bash
pnpm --filter api test    # unit, e2e and database tests (needs the db container), including the openapi.json drift test
pnpm --filter api test:db # the database tests alone, against flashcards_test
pnpm --filter api lint    # oxlint, then Redocly on openapi.json
pnpm --filter api build   # compile to dist/
```

## The OpenAPI contract

`openapi.json` in this folder is the committed contract, and it is generated from the code. After changing routes, schemas or Swagger decorators, regenerate it and commit the result:

```bash
pnpm --filter api openapi
```

Never edit `openapi.json` by hand. The drift test fails when it is out of date, and the lint fails when an operation is not fully documented.
