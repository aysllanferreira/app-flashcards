# web-authentication Specification

## Purpose

Lets visitors create an account, sign in and sign out of the web app through the hosted identity provider, shows their auth state in the header, and keeps the provider's keys out of git and client code.

## Requirements

### Requirement: Auth controls in the header
Every page of the web app SHALL show a header with auth controls. When the visitor is signed out, the header SHALL show a "Sign in" control and a "Sign up" control and no user menu. When the visitor is signed in, the header SHALL show a user menu (avatar) and SHALL NOT show the "Sign in" or "Sign up" controls.

#### Scenario: Signed-out visitor
- **WHEN** a visitor with no session opens `/`
- **THEN** the header shows "Sign in" and "Sign up" and no user avatar

#### Scenario: Signed-in user
- **WHEN** a user with an active session opens `/`
- **THEN** the header shows the user avatar and neither "Sign in" nor "Sign up"

### Requirement: In-app sign-up and sign-in pages
The web app SHALL serve its own sign-up page at `/sign-up` and sign-in page at `/sign-in`, on the app's own domain, and the header's "Sign up" and "Sign in" controls SHALL lead to them. After a successful sign-up or sign-in the visitor SHALL be returned to the app as a signed-in user.

#### Scenario: Sign up a new user
- **WHEN** a signed-out visitor completes the form at `/sign-up` with a new email address
- **THEN** they are returned to the app and the header shows their user avatar

#### Scenario: Sign in an existing user
- **WHEN** a signed-out visitor completes the form at `/sign-in` with an existing account's credentials
- **THEN** they are returned to the app and the header shows their user avatar

#### Scenario: Pages stay on the app domain
- **WHEN** a visitor selects "Sign in" or "Sign up" in the header
- **THEN** the browser stays on the app's origin at `/sign-in` or `/sign-up` rather than navigating to a provider-hosted page

### Requirement: Sign out
A signed-in user SHALL be able to sign out from the user menu, after which the app SHALL treat them as signed out.

#### Scenario: Sign out from the user menu
- **WHEN** a signed-in user chooses "Sign out" in the user menu
- **THEN** the header shows "Sign in" and "Sign up" again and no user avatar

### Requirement: All routes stay public
Adding auth SHALL NOT restrict access to any existing route. Every page SHALL render for signed-out visitors.

#### Scenario: Home page while signed out
- **WHEN** a visitor with no session requests `/`
- **THEN** the page renders with status 200 and no redirect to `/sign-in`

### Requirement: Auth keys stay out of git and client code
The identity provider's publishable key and secret key SHALL be read only from environment variables (`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY`). No file tracked by git SHALL contain a key value. The repository SHALL track an example env file that names both variables with empty values. The secret key SHALL NOT be referenced from any code that runs in the browser.

#### Scenario: Only the example env file is tracked
- **WHEN** `git ls-files apps/web | grep '\.env'` is run
- **THEN** it prints only `apps/web/.env.example`, and that file sets both variables to empty values

#### Scenario: Secret key absent from app code
- **WHEN** `grep -rn CLERK_SECRET_KEY apps/web/app` is run
- **THEN** it prints no matches

### Requirement: Build tracks the auth environment variables
The monorepo build task for the web app SHALL declare both auth environment variables and the API base URL variable, so they reach the build under strict environment mode and a change to any of them invalidates the cached build.

#### Scenario: Dry run lists the variables
- **WHEN** `pnpm turbo run build --filter=web --dry=json` is run
- **THEN** the `build` task's environment variables include `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` and `API_URL`

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
