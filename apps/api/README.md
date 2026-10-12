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

The auth variables are in [Auth](#auth). Invalid values stop the API at startup with an error naming the variable. Copy `.env.example` to `.env` to override them locally; `.env` is git-ignored.

## Auth

Users sign in with [Clerk](https://clerk.com) in the web app. Every API route needs a valid Clerk session token, sent as `Authorization: Bearer <token>`, except the ones marked `@Public()`: `/health`, the docs and `POST /webhooks/clerk`, which checks its own signature. Without a valid token a route answers `401`. An account is created, with its "Default" deck preset and the built-in note types, on its first authenticated request or on Clerk's `user.created` webhook, whichever comes first. `GET /me` returns the caller's account. The rules for writing routes are in the "Auth" subsection of [`CLAUDE.md`](../../CLAUDE.md), and the flow is [`system-design/09-flow-user-sync.png`](../../system-design/09-flow-user-sync.png).

| Variable | Default | |
|---|---|---|
| `WEB_ORIGIN` | `http://localhost:3000` | The web app's origins, comma-separated. Browsers may call the API only from these (CORS), and a session token's authorized party (`azp`) must be one of them. Required in production |
| `CLERK_JWT_KEY` | none | Clerk's JWT public key in PEM format (**API keys > Show JWT public key**), so tokens are verified without a network call. A one-line value may write the line breaks as `\n` |
| `CLERK_SECRET_KEY` | none | Clerk's secret key: the fallback when there is no `CLERK_JWT_KEY`, fetching Clerk's public keys over the network. Production needs one of the two keys |
| `CLERK_WEBHOOK_SIGNING_SECRET` | none | The `whsec_...` signing secret of the webhook endpoint (see [Clerk webhooks (local)](#clerk-webhooks-local)). Without it every webhook is rejected. Required in production |

Without either key, every route except the public ones answers `401`; `/health`, the docs and `pnpm --filter api openapi` still work.

**Calling a protected route from Swagger UI:** sign in to the web app, then get a session token from the browser console with `await window.Clerk.session.getToken()`. Open `http://localhost:3001/docs`, choose **Authorize**, paste the token and call the route. Session tokens expire after about a minute, so get a fresh one when you see `401`.

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

## Clerk webhooks (local)

Clerk sends `user.created`, `user.updated` and `user.deleted` to `POST /webhooks/clerk`, which keeps the `users` table in sync: it stores the account's email, and deletes the account and everything it owns. Without webhooks the API still works, because an account is created on its first authenticated request, but emails stay empty and deletions never arrive. The flow is in [`system-design/09-flow-user-sync.png`](../../system-design/09-flow-user-sync.png).

Clerk can't reach `localhost`, so exposing your local API takes a tunnel and an endpoint in Clerk's **development** instance:

1. **Start a tunnel to port 3001.** [ngrok](https://ngrok.com) with your free static domain keeps the URL the same between runs, so the Clerk endpoint never needs editing:

   ```bash
   ngrok http 3001 --url <your-static-domain>.ngrok-free.app
   ```

   `cloudflared tunnel --url http://localhost:3001` works without an account, but its URL changes on every run.
2. **Add the endpoint in the Clerk dashboard** (development instance): **Webhooks > Add Endpoint**, with the URL `https://<your-tunnel-host>/webhooks/clerk`, subscribed to `user.created`, `user.updated` and `user.deleted`.
3. **Copy the endpoint's signing secret** (it starts with `whsec_`) into `apps/api/.env`:

   ```bash
   CLERK_WEBHOOK_SIGNING_SECRET=whsec_...
   ```

   While you're there, set `CLERK_JWT_KEY` to the instance's JWT public key (**API keys > Show JWT public key > PEM**), so the API can verify session tokens. `apps/api/.env` is git-ignored; never commit these values.
4. **Restart the API** (`pnpm --filter api dev`) and sign up a new account in the web app. The endpoint's **Message Attempts** in the dashboard should show a `200`, and the account's email should be in the database:

   ```bash
   docker compose exec db psql -U flashcards -c "select clerk_user_id, email from users order by created_at desc limit 1"
   ```

A missing or wrong `CLERK_WEBHOOK_SIGNING_SECRET` makes every delivery fail with `400`, and Clerk retries it. Each environment has its own endpoint and secret; the production endpoint is created with the production deployment.

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
