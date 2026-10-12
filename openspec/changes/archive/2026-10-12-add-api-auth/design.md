## Context

See proposal.md for the motivation. What exists today:

- **Web (`apps/web`):** `@clerk/nextjs` 7.9 with `clerkMiddleware()` in `proxy.ts`, `ClerkProvider` in the root layout, and in-app `/sign-in` and `/sign-up` pages. No code calls the API. The vitest suite runs in jsdom.
- **API (`apps/api`):** Nest 12, Zod 4 through the built-in Standard Schema pipe and serializer, and a generated, linted `openapi.json`.
  - Every route is public, and `main.ts` neither enables CORS nor keeps the raw body.
  - `UsersModule` is empty apart from `schema/users.ts` (`clerk_user_id` unique, `email` nullable).
  - `copyStockNoteTypes(db, userId)` exists in `note-types/stock-note-types.ts`.
  - Only `seed.ts` creates users, inserting the user, a "Default" preset and the stock note types by hand.
- **Contract lint:** `redocly.yaml` turns off `security-defined` "until API auth (Clerk JWT) lands".
- **Tests:**
  - e2e tests build the app with `Test.createTestingModule({ imports: [AppModule] })` and need no database;
  - the database suite (`test/db/`) runs against `flashcards_test`, migrated by its global setup, and truncates every table before each test.
- **Clerk:** `@clerk/backend` 3.23.2 is already in the lockfile through `@clerk/nextjs`.
  - `verifyToken(token, { jwtKey | secretKey, authorizedParties })` verifies without a network call when given `jwtKey`.
  - `verifyWebhook(request: Request, { signingSecret })` from `@clerk/backend/webhooks` verifies Svix / Standard Webhooks signatures.
  - Session tokens live about 60 s.
- **System design:**
  - 03 already names a `ClerkAuthGuard` that maps `sub` to `users.id`;
  - 02 shows `user.*` webhooks entering through NGINX;
  - 08 lists `users` and `webhooks` as planned modules.

## Goals / Non-Goals

**Goals:**
- Exactly one provisioning code path, shared by the guard, the webhook and the seed.
- Tests never touch Clerk's network: JWTs and webhooks are signed locally.
- The API still boots, serves `/health` and generates `openapi.json` with no Clerk configuration outside production.
- Every future route is authenticated by default; making one public is an explicit, visible act.

**Non-Goals:**
- Caching the `users` lookup per request (one indexed query per request is fine at MVP scale).
- Recording processed `svix-id`s; handlers are idempotent instead.
- A generated TypeScript client for the web app. The web app declares the small `MeResponse` type it reads by hand until there are more endpoints.
- Browser-side API calls (study sessions will add them; CORS is ready for them).

## Decisions

### 1. Token verification: `verifyToken` from `@clerk/backend` in a global guard
The guard reads `Authorization: Bearer <jwt>` and calls `verifyToken` with:
- `jwtKey: CLERK_JWT_KEY` when it is set, which verifies without a network call;
- otherwise `secretKey: CLERK_SECRET_KEY`, which fetches and caches Clerk's JWKS;
- `authorizedParties` set to the parsed `WEB_ORIGIN` list.

Any failure throws `UnauthorizedException`, so the body is Nest's standard `{ statusCode: 401, message, error }`, which `ErrorResponse` already describes. With no key configured, the guard rejects every non-public request without trying to verify.

*Alternatives:*
- `authenticateRequest()` also handles cookies and handshakes, which only matter for same-site browser apps, so the API doesn't need it.
- `@clerk/express` middleware would sit outside Nest's guard and metadata model, so `@Public()` couldn't drive it.

`@clerk/backend` is pinned exactly to the version the lockfile already resolves through `@clerk/nextjs` (3.23.2 today), so web and API verify with the same code.

### 2. Layout: guard in an `auth` module, decorators in `src/common/decorators/`
- `src/modules/auth/`:
  - `auth.module.ts` registers the guard as `APP_GUARD` and imports `UsersModule`;
  - `auth.service.ts` wraps the token verification and is unit-tested without Nest;
  - `auth.guard.ts`.
- `@Public()` (`public.decorator.ts`) and `@CurrentUser()` (`current-user.decorator.ts`) live in `src/common/decorators/`, next to the existing Swagger decorators, because every module uses them.
- The guard puts the caller's `users` row on the request, and `@CurrentUser()` reads it.

This fits the architecture test: the only service is inside a module folder, and guards and decorators aren't controllers or services. `AppModule` imports `AuthModule`.

*Alternative:* everything under `src/common/auth/`. Rejected because `auth.service.ts` would then sit outside `src/modules/`, which the architecture test forbids.

### 3. Provisioning: one function, `provisionUser`, wrapped by `UsersService.ensureUser`
`src/modules/users/provision-user.ts` exports `provisionUser(db, { clerkUserId, email })`. It runs one transaction:
1. `INSERT INTO users ... ON CONFLICT (clerk_user_id) DO NOTHING RETURNING *`;
2. **when a row comes back**, insert the "Default" deck preset and call `copyStockNoteTypes(tx, userId)`, which nests as a savepoint, then return `{ user, created: true, preset, noteTypes }`;
3. **when nothing comes back**, select the existing row and return `{ user, created: false }`.

The unique constraint makes it exactly-once. A concurrent second transaction blocks on the conflicting insert until the first commits, then sees nothing returned and selects the committed row, so two simultaneous first requests can't both provision.

`UsersService.ensureUser(clerkUserId)` calls it with the injected `DB`, and `UsersService.syncFromClerk(clerkUserId, email)` calls `provisionUser` and then updates `email` when it differs. `seed.ts` calls `provisionUser` directly (it is plain Drizzle, with no Nest context) and uses the returned preset and note types, so the seed can't drift from sign-up.

*Alternative:* select first and insert when missing. That races, and a second request would fail on the unique index.

### 4. Who writes what
| Trigger | Action |
|---|---|
| Authenticated request | `ensureUser(sub)`; email stays as stored (the default Clerk session token has no email) |
| `user.created`, `user.updated` | `syncFromClerk(data.id, primaryEmail)` |
| `user.deleted` | `DELETE FROM users WHERE clerk_user_id = data.id` (cascades); 0 rows is fine |
| Any other verified event | Acknowledge, ignore |

`primaryEmail` is the `email_address` of the entry in `data.email_addresses` whose `id` equals `data.primary_email_address_id`, or `null`.

### 5. Webhook verification: Clerk's `verifyWebhook` over Nest's raw body
The app is created with `{ rawBody: true }`, so Nest keeps `req.rawBody` alongside the parsed JSON. The webhook controller builds a Fetch `Request` from the original URL, the `svix-*` headers and `rawBody`, and passes it to `verifyWebhook(request, { signingSecret })`. Any verification error, or a missing secret, becomes `BadRequestException` (400 `ErrorResponse`). The route is `@Public()` and documents `@ApiErrorResponses({ badRequest: true })`.

The response is `200 { received: true }` (`WebhookAckSchema`, `.meta({ id: 'WebhookAck' })`). The request body isn't declared as a Zod body schema: the route has to see the raw bytes before any parsing, and the payload type comes from `WebhookEvent` in `@clerk/backend/webhooks`.

*Alternatives:*
- Calling `svix`'s `Webhook.verify` directly works, but duplicates Clerk's header mapping, and the Clerk helper is the documented path.
- A route-level `express.raw()` middleware fights Nest's global JSON parser.

### 6. App setup shared by `main.ts` and the tests
`src/common/configure-app.ts` exports:
- `APP_OPTIONS = { rawBody: true }` (used by `NestFactory.create` and by `createNestApplication` in tests);
- `configureApp(app)`, which enables CORS with `origin` set to the `WEB_ORIGIN` list, `allowedHeaders: ['Authorization', 'Content-Type']`, and `methods` limited to what the API serves.

`main.ts`, `openapi/generate.ts` and a new test helper (`test/support/create-app.ts`) all use both, so tests exercise the same CORS and raw-body behavior as production.

### 7. Environment
`src/config/env.ts` gains:
- `WEB_ORIGIN`: a comma-separated string, transformed to `string[]`. Each entry must parse as a URL with protocol `http:` or `https:` whose `origin` equals the entry, which rejects paths and trailing slashes. It defaults to `http://localhost:3000` outside production and is required in production;
- `CLERK_JWT_KEY`: optional. Escaped `\n` sequences are turned back into newlines, so a PEM fits in one `.env` line;
- `CLERK_SECRET_KEY`: optional;
- `CLERK_WEBHOOK_SIGNING_SECRET`: optional;
- production checks in the existing `superRefine`: `WEB_ORIGIN` must be set, at least one of `CLERK_JWT_KEY` / `CLERK_SECRET_KEY` must be set (one issue on path `CLERK_JWT_KEY` whose message names both), and `CLERK_WEBHOOK_SIGNING_SECRET` must be set.

`env.spec.ts` covers each production failure.

### 8. OpenAPI security
- `DocumentBuilder` gains `.addBearerAuth()` (scheme name `bearer`) and a global security requirement `[{ bearer: [] }]`, so every operation is authenticated in the document unless it overrides that.
- `@Public()` composes the guard metadata with an OpenAPI override that emits `security: []` on the operation. It uses `ApiOperation`-compatible metadata or `ApiExtension`, whichever `@nestjs/swagger` 12 emits as an operation-level `security: []`. A unit test on the generated document asserts `/health` has `security: []`.
- **Outcome (task 2.10):** `@Public()` sets the `@nestjs/swagger` security metadata (`DECORATORS.API_SECURITY`) to an empty list, which the explorer emits as `security: []`, so the fallback below wasn't needed. `buildOpenApiDocument` also copies the global requirement onto every operation that has no `security` of its own, so each operation in `openapi.json` states its security explicitly.
- **Fallback, if neither emits it:** `buildOpenApiDocument` post-processes the document, setting `security: []` on operations whose handlers carry the public metadata. It finds them by walking the app's controllers with `DiscoveryService` and matching `operationId`.
- `ApiErrorResponses` gains `{ unauthorized: true }`, which adds the 401 `ErrorResponse`. An `openapi.spec.ts` test fails when an operation that inherits bearer security has no 401 response, so a missing `unauthorized: true` is caught.
- `redocly.yaml` drops `security-defined: off`, and the comment for it goes too.

### 9. Test signing without Clerk
- `test/support/clerk.ts` generates an RSA key pair once per process (`generateKeyPairSync('rsa', { modulusLength: 2048 })`) and exports `signSessionToken({ sub, azp, exp?, nbf? })`. That builds an RS256 JWT with `node:crypto` (`base64url` header and payload, `sign('sha256', ...)`) with the claims Clerk puts in session tokens (`sub`, `azp`, `sid`, `iat`, `nbf`, `exp`, `iss`).
- It also exports `signWebhook(event)`, which uses `svix`'s `Webhook.sign(msgId, date, payload)` with a fixed test secret `whsec_...` and returns the body and the `svix-*` headers.
- A vitest `setupFiles` entry (`test/support/env.ts`), added to both the e2e and database configs, sets `CLERK_JWT_KEY` (the public PEM), `CLERK_WEBHOOK_SIGNING_SECRET` and `WEB_ORIGIN=http://localhost:3000` before `AppModule` is imported.
- **Where each test goes:**
  - tests that need no database go in the e2e suite: the 401 cases, the CORS preflights, webhook signature rejection, and `/health` and `/docs-json` without a token;
  - tests that write go in `test/db/*.db-spec.ts`: `/me` success, provisioning counts and concurrency, and every webhook event.

  The database tests build the app with `overrideProvider(DB).useValue(ctx.db)`, so the API writes to `flashcards_test`. They still parse every response with its schema, which satisfies the "every endpoint has an e2e test" rule.
- `svix` is pinned exactly as a dev dependency.

### 10. Web: `apiFetch` and the account section
- `apps/web/app/_lib/api.ts` (with `import "server-only"`) exports `apiFetch(path, init?)`. It resolves `API_URL`, which defaults to `http://localhost:3001` when `NODE_ENV !== "production"` and throws when it is unset in production. It gets the token from `(await auth()).getToken()` and adds `Authorization: Bearer <token>` only when there is one. It uses `cache: "no-store"`.
- `apps/web/app/_components/account-summary.tsx` is an async server component. It renders nothing when `auth()` has no `userId`. Otherwise it calls `apiFetch("/me")` and shows the email (or "No email yet") and the time zone. A non-2xx response or a network error renders "Couldn't load your account right now." It never throws, so `/` keeps its 200.
- `page.tsx` renders it at the top of the existing page.
- Tests mock `@clerk/nextjs/server` and `fetch`. The `server-only` import is aliased to an empty module in `vitest.config.mts`.
- `turbo.json` adds `API_URL` to the build `env`, and `apps/web/.env.example` adds `API_URL=`.

### 11. Local webhook delivery
The API README documents:
1. starting a tunnel to `localhost:3001`. The recommended tool is `ngrok http 3001 --url <your free static domain>`, because a static domain means the Clerk endpoint never changes; `cloudflared tunnel --url http://localhost:3001` works as a no-account alternative whose URL changes on every run;
2. in the Clerk dashboard (development instance), Webhooks > Add endpoint: `<tunnel>/webhooks/clerk`, subscribed to `user.created`, `user.updated` and `user.deleted`;
3. copying the endpoint's signing secret into `apps/api/.env` as `CLERK_WEBHOOK_SIGNING_SECRET`, and the instance's JWT public key (API keys > JWT public key) into `CLERK_JWT_KEY`.

The repo owner does these steps. Nothing secret is committed.

## Risks / Trade-offs

- [A deleted user's still-valid token (about 60 s), or a late Svix retry of `user.created` after `user.deleted`, recreates an empty, provisioned account] → Accepted and recorded in `system-design/README.md`. Clerk revokes sessions on delete, so the window is short and the account has no content. A delete marker is the fix if it ever matters, and #48 keeps it out of scope.
- [`verifyToken` with a PEM `jwtKey` might require claims (for example `iss` or `kid`) that the self-signed test tokens lack] → The first task in group 2 is a spike: sign a token with the test helper and verify it with `verifyToken`. If something is rejected, add the missing claim to the helper. Never loosen the production check.
- [`@Public()` may not be able to emit `security: []` through `@nestjs/swagger` metadata] → Use the post-processing fallback in decision 8, and record which path was taken in this file.
- [The raw body doubles memory for large bodies] → The API's bodies are small JSON, and media goes straight to S3.
- [Email is null until the first webhook, and is never filled locally without a tunnel] → `GET /me` and the web display handle `null` explicitly. Adding an `email` claim to the Clerk session token is a later option and needs no schema change.
- [The guard adds one indexed `SELECT` per request, plus a provisioning transaction on the first request] → Acceptable at MVP scale; a per-process cache keyed by `sub` can come later without changing behavior.
- [No Clerk configuration outside production means every protected route answers 401] → This is intended: the README's Auth section says which variables a developer sets, and `/health`, the docs and `pnpm --filter api openapi` keep working.

## Migration Plan

There is no data migration and no schema change. Deploying needs, in this order:
1. `WEB_ORIGIN`, `CLERK_JWT_KEY` (or `CLERK_SECRET_KEY`) and `CLERK_WEBHOOK_SIGNING_SECRET` in the API's environment;
2. `API_URL` in the web app's environment;
3. a production webhook endpoint in Clerk.

All three wait for the AWS environment roadmap item. Rolling back means reverting the merge: no table changed, and rows created by provisioning are ordinary user data.
