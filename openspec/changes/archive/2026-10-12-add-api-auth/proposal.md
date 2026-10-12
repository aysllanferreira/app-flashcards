Issue: #48
Sub-issues: #49, #50, #51, #52, #53

## Why

Users can sign in to the web app (#13), but the API doesn't know who they are: no route checks a session token and nothing creates a row in `users`, so no user-owned feature on the roadmap can be built. A new account also needs its own stock note types and a default deck preset before it can make a deck or a note, and today only the dev seed creates them. Clerk is the source of truth for accounts, so email changes and account deletions made there must reach the database.

## What Changes

Delivered in five sub-issues, each a PR into the integration branch `feat/api-auth`, then one PR into `dev`:

- **#49 System design:**
  - a new `09-flow-user-sync` sequence diagram (first-request provisioning and the `user.*` webhooks);
  - diagram 08 gains the global auth guard, the 401 path and `@Public()` routes, with `users` and `webhooks` shown as built;
  - diagram 03's guard note says the user is created and provisioned on first request;
  - `system-design/README.md` indexes 09, extends the Auth decision and records the deleted-user token window as an accepted trade-off.
- **#50 Token verification and first-request provisioning:**
  - `CLERK_JWT_KEY`, `CLERK_SECRET_KEY` and `WEB_ORIGIN` in the validated environment;
  - a global guard that verifies the Clerk session JWT from `Authorization: Bearer`, checks `azp` against `WEB_ORIGIN` and answers 401 otherwise, with `@Public()` to opt out and `@CurrentUser()` for the caller;
  - `ensureUser`, which creates the user with a "Default" deck preset and the stock note types in one transaction, once, and which the dev seed reuses;
  - `GET /me`;
  - CORS for `WEB_ORIGIN`;
  - a bearer security scheme in the contract, 401 in `ApiErrorResponses`, and the Redocly `security-defined` rule back on.
- **#51 Clerk webhook sync:**
  - `CLERK_WEBHOOK_SIGNING_SECRET` in the validated environment;
  - public `POST /webhooks/clerk`, verified with Clerk's `verifyWebhook` over the raw body;
  - `user.created` and `user.updated` run `ensureUser` and set the primary email; `user.deleted` deletes the user and everything they own; all of them are safe to replay;
  - the API README's steps to receive webhooks locally through a tunnel and a development-instance endpoint.
- **#52 Web proof:**
  - a server-only `API_URL` (in `turbo.json`);
  - a server-side `apiFetch` helper that sends the Clerk session token;
  - on `/`, signed-in users see their account from `GET /me`, with a fallback message when the API is unreachable. All routes stay public.
- **#53 Conventions:** an Auth subsection in the API section of `CLAUDE.md`, a proposal rule in `openspec/config.yaml` that new endpoints state whether they are public or authenticated, and an Auth section in the API README.

API contract:
- adds `GET /me` (authenticated) and `POST /webhooks/clerk` (public);
- adds a bearer security scheme: every non-public operation requires it and documents a 401 `ErrorResponse`, and public operations (`GET /health`, `POST /webhooks/clerk`) declare `security: []`;
- `GET /health` is otherwise unchanged.

Data model: no change. `users` already has `clerk_user_id`, `email` and the settings columns, and provisioning writes only to existing tables (`users`, `deck_presets`, `note_types`, `note_type_fields`, `card_templates`).

System design:
- **Add `09-flow-user-sync`:** browser, Next.js, Clerk, NestJS API and Postgres. (a) Sign-up, then the first authenticated request: the guard verifies the JWT, finds no user and runs `ensureUser` (user + "Default" deck preset + stock note types in one transaction). (b) `user.created`, `user.updated` and `user.deleted`: Svix signature check, `ensureUser` doing nothing for a known user, the email update and the cascading delete, with Svix retries. A note that local delivery needs a tunnel and production waits for `api.*`.
- **Update `08-api-structure`:** a global auth guard before the validation pipe, a red 401 `ErrorResponse` path, `@Public()` routes skipping the guard, `users` and `webhooks` as built modules, and `src/config` naming the Clerk and `WEB_ORIGIN` variables.
- **Update `03-flow-study-session`:** the `ClerkAuthGuard` note says the user is created and provisioned on first request.
- **`system-design/README.md`:** 09 listed and embedded; the Auth decision adds first-request provisioning and that updates and deletes come only from webhooks; an accepted trade-off for the deleted-user token window.
- **No change to `01`, `02`, `04`, `05`, `06` or `07`.** Diagram 02 already shows the `user.*` webhooks and the SSR fetch with a JWT.

## Capabilities

### New Capabilities
- `api-authentication`: how the API identifies its caller, namely Clerk session token verification with the `azp` check, 401 responses, public routes, the caller's account at `GET /me`, and CORS for the web origin.
- `clerk-user-sync`: how `users` mirrors Clerk accounts, namely provisioning a new account exactly once from either the first request or `user.created`, the signed webhook endpoint, email updates, cascading deletes, replay safety and the documented local webhook setup.

### Modified Capabilities
- `api-module-structure`: the validated environment gains `WEB_ORIGIN`, `CLERK_JWT_KEY`, `CLERK_SECRET_KEY` and `CLERK_WEBHOOK_SIGNING_SECRET`, with their production requirements.
- `api-openapi-contract`: operations declare their security (bearer, or none for public routes), authenticated operations document a 401 `ErrorResponse`, the lint enforces `security-defined`, and proposals state whether new endpoints are public or authenticated.
- `web-authentication`: the web app calls the API server-side with the session token and shows signed-in users their account from `GET /me`; the build also tracks `API_URL`.
- `database-tooling`: the seed creates its demo user through the same provisioning as sign-up.

## Impact

- **Code (`apps/api`):**
  - `src/config/env.ts` gains the Clerk variables and `WEB_ORIGIN`;
  - an auth guard, `@Public()` and `@CurrentUser()`, registered in `AppModule`;
  - the `users` module gains `users.service.ts` (`ensureUser`, provisioning), `users.controller.ts` (`GET /me`) and `dto/`;
  - a new `webhooks` module (controller, service, `dto/`);
  - `main.ts` enables CORS and the raw body;
  - `ApiErrorResponses` gains 401, and the OpenAPI document builder gains the bearer scheme;
  - `seed.ts` uses the shared provisioning;
  - `redocly.yaml` turns `security-defined` back on;
  - `openapi.json` is regenerated;
  - e2e and database tests, with locally signed JWTs and Svix payloads.
- **Code (`apps/web`):** an `apiFetch` helper, an account section on `/`, `.env.example` and tests.
- **Repo root:** `turbo.json` build `env` gains `API_URL`.
- **Dependencies:** `@clerk/backend` in `apps/api` (the version `@clerk/nextjs` already resolves); `svix` as an `apps/api` dev dependency to sign test webhooks. Test JWTs are signed with `node:crypto`, so no JWT library is added.
- **Configuration outside the repo:** a webhook endpoint in the Clerk development instance and a local tunnel, both set up by the repo owner. Production secrets and the production endpoint wait for the AWS environment.
- **Repo docs and rules:** `CLAUDE.md`, `openspec/config.yaml` and `apps/api/README.md`.
- **System design:** new `09-flow-user-sync`, `08` and `03` re-exported from their scenes, and `system-design/README.md`.
- **Specs:** new `api-authentication` and `clerk-user-sync`; `api-module-structure`, `api-openapi-contract`, `web-authentication` and `database-tooling` modified.
- **Wiki:** Status, Changelog, Roadmap, Architecture and Decisions.
- **Out of scope** (from #48):
  - the production Clerk webhook endpoint and production secrets;
  - requiring sign-in for web pages;
  - roles, organizations or API keys;
  - a settings UI for timezone, day rollover or reminders;
  - a marker that stops a deleted user's still-valid token from recreating their account.
