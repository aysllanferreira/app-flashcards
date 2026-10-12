Issue: #13

## Why

The system design picks Clerk for sign-up, sign-in and sessions, but `apps/web` has no auth at all. Every user-facing feature (decks, study sessions, reviews) belongs to a signed-in user, and the api will verify Clerk session JWTs, so the web app has to sign users in before anything user-specific can be built.

## What Changes

- Install `@clerk/nextjs` in `apps/web` by running `clerk init --app app_3KZYqa9Dp4M1kAFH6UZVN1VFkh1` from `apps/web`, not the repo root.
- Wrap the app in `<ClerkProvider>` inside `<body>` in `apps/web/app/layout.tsx`.
- Add `apps/web/proxy.ts` (Next 16's replacement for `middleware.ts`) exporting `clerkMiddleware()`. Its matcher includes `'/(api|trpc)(.*)'` followed by `'/__clerk/:path*'`. Every route stays public.
- Add in-app sign-in and sign-up pages at `/sign-in` and `/sign-up`, using Clerk's prebuilt components.
- Add a header to the root layout. Signed out, it shows "Sign in" and "Sign up". Signed in, it shows the Clerk user button.
- Keys: development-instance keys live only in the gitignored `apps/web/.env.local`. Commit `apps/web/.env.example` with empty values and add a `!.env.example` exception to `apps/web/.gitignore`. Declare both Clerk variables in the `build` task's `env` in `turbo.json`.

Out of scope (from the issue): protecting specific routes, NestJS JWT verification (`ClerkAuthGuard`), Clerk `user.*` webhooks and `users` table sync, the Clerk production instance and Amplify environment variables, Organizations, and theming.

System design: no change. `01-context` and `02-aws-architecture` already show Clerk as third-party SaaS, the README's Decisions table already records Clerk for auth and Amplify environment variables for web secrets, and steps 1 and 2 of `03-flow-study-session` (the browser signs in with Clerk components and receives a session cookie and JWT) are exactly what this change builds.

## Capabilities

### New Capabilities
- `web-authentication`: how visitors sign up, sign in and sign out of the web app, what the header shows in each state, and how the Clerk keys are kept out of git and client code.

### Modified Capabilities
None. The `monorepo-workspace` requirements (root install, dev, build, lint and test) are unchanged and must keep passing.

## Impact

- **Code:** `apps/web/app/layout.tsx`, a new `apps/web/proxy.ts`, new route files under `apps/web/app/sign-in/` and `apps/web/app/sign-up/`, and a header component in `apps/web`.
- **Dependencies:** `@clerk/nextjs` in `apps/web`, and an updated `pnpm-lock.yaml` at the root.
- **Config:** `apps/web/.env.example` (new), `apps/web/.gitignore`, and `turbo.json` (`build.env`).
- **External:** the Clerk development instance of app `app_3KZYqa9Dp4M1kAFH6UZVN1VFkh1`. Each developer needs its keys in `apps/web/.env.local` to run the web app with auth.
- **Versioning:** a merge into `dev` that changes `apps/web` gets a `web@X.Y.Z-dev.N` prerelease tag, with a minor bump for `feat`.
