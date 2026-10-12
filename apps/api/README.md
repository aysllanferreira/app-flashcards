# api

The NestJS REST API for the flashcards app. It lives in this Turborepo monorepo next to the Next.js web app (`apps/web`).

The rules for working on it (module layout, Zod DTOs, Swagger decorators, the OpenAPI contract and the tests) are in the "API (apps/api)" section of [`CLAUDE.md`](../../CLAUDE.md). The architecture is in [`system-design/08-api-structure.png`](../../system-design/08-api-structure.png).

## Run it

From the repo root:

```bash
pnpm install
pnpm --filter api dev
```

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

Invalid values stop the API at startup with an error naming the variable.

## Check it

```bash
pnpm --filter api test    # unit and e2e tests, including the openapi.json drift test
pnpm --filter api lint    # oxlint, then Redocly on openapi.json
pnpm --filter api build   # compile to dist/
```

## The OpenAPI contract

`openapi.json` in this folder is the committed contract, and it is generated from the code. After changing routes, schemas or Swagger decorators, regenerate it and commit the result:

```bash
pnpm --filter api openapi
```

Never edit `openapi.json` by hand. The drift test fails when it is out of date, and the lint fails when an operation is not fully documented.
