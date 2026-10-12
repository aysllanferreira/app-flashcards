## ADDED Requirements

### Requirement: The web app calls the API as the signed-in user
The web app SHALL call the API from server-side code only, at the base URL in the server-only `API_URL` variable, which SHALL default to `http://localhost:3001` outside production. When a session exists, each call SHALL send the session token as `Authorization: Bearer <token>`; when none exists, it SHALL send no `Authorization` header. The API base URL SHALL NOT be exposed to browser code through a `NEXT_PUBLIC_` variable.

#### Scenario: Signed-in call
- **WHEN** the web app's API helper runs for a request with a session whose token is `abc`
- **THEN** the outgoing request has `Authorization: Bearer abc`

#### Scenario: Signed-out call
- **WHEN** the web app's API helper runs for a request with no session
- **THEN** the outgoing request has no `Authorization` header

#### Scenario: No public API variable
- **WHEN** `grep -rn "NEXT_PUBLIC_API" apps/web` is run, excluding `node_modules` and `.next`
- **THEN** it prints no matches

### Requirement: Signed-in users see their account
On `/`, a signed-in user SHALL see their account as `GET /me` returns it: their email (or a fallback label when the API has none) and their time zone. A signed-out visitor SHALL see no account section. When the API can't be reached or returns an error, the page SHALL still render with status 200 and show a short message that the account couldn't be loaded.

#### Scenario: Signed-in user
- **WHEN** a signed-in user opens `/` while the API is running
- **THEN** the page shows their account's email or fallback label and time zone from `GET /me`

#### Scenario: Signed-out visitor
- **WHEN** a visitor with no session requests `/`
- **THEN** the page renders with status 200, shows no account section and does not redirect to `/sign-in`

#### Scenario: API unreachable
- **WHEN** a signed-in user opens `/` while the API is stopped
- **THEN** the page renders with status 200 and shows the message that the account couldn't be loaded

## MODIFIED Requirements

### Requirement: Build tracks the auth environment variables
The monorepo build task for the web app SHALL declare both auth environment variables and the API base URL variable, so they reach the build under strict environment mode and a change to any of them invalidates the cached build.

#### Scenario: Dry run lists the variables
- **WHEN** `pnpm turbo run build --filter=web --dry=json` is run
- **THEN** the `build` task's environment variables include `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` and `API_URL`
