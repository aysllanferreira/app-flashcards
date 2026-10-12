## Context

`apps/web` is the create-next-app boilerplate on Next.js 16.4, React 19.3 and the App Router. It has no `src/` directory, no header and no request proxy. Its only test (`__tests__/page.test.tsx`) renders `app/page.tsx` on its own and checks the `<h1>`. `apps/web/.gitignore` ignores `.env*`. `turbo.json` declares no task environment variables, so Turborepo 2 runs tasks in strict env mode and passes through only the variables it infers for Next.js (`NEXT_PUBLIC_*`). The repo is a pnpm workspace, so tools that detect a framework from the current directory have to be run inside `apps/web`.

See proposal.md for the motivation and scope, and specs/web-authentication/spec.md for the required behavior.

## Goals / Non-Goals

**Goals:**
- Let the CLI do the standard wiring, then adapt its output to this repo's layout and to the issue's scope.
- Keep the existing page test passing without mocking Clerk.
- Keep the Clerk configuration in code, so the env contract is only the two keys.

**Non-Goals:**
- Server-side session checks (`auth()`) or route protection. Nothing calls `auth()` yet.
- Calling the api with the session JWT. That comes with the api's `ClerkAuthGuard`.

## Decisions

### 1. Scaffold with `clerk init`, then review the diff
Run `clerk init --app app_3KZYqa9Dp4M1kAFH6UZVN1VFkh1` from `apps/web`. It installs `@clerk/nextjs` with pnpm, links the dev instance and writes the keys to `apps/web/.env.local`. Its edits are then reviewed with `git diff` and `git status` and brought in line with the decisions below. Anything outside `apps/web`, other than `pnpm-lock.yaml`, is reverted.
- *Alternative:* follow the manual quickstart. It gives the same result but means copying the keys by hand from the dashboard, which is easy to get wrong and puts the secret key on the clipboard.

### 2. `proxy.ts` at the app root, with no protection
`apps/web/proxy.ts` exports `clerkMiddleware()` with no handler, so every route stays public. The `config.matcher` is Clerk's recommended pair: skip `_next` and static files, and always run for `'/(api|trpc)(.*)'`. `'/__clerk/:path*'` follows it exactly once. Next 16 renamed `middleware.ts` to `proxy.ts`, and the file sits next to `app/` because there is no `src/`.
- *Alternative:* protect everything except `/`, `/sign-in` and `/sign-up` now. That is rejected because the issue leaves route protection out of scope and there is no user-owned page to protect yet.

### 3. Sign-in and sign-up routes set on `ClerkProvider`
The pages live at `app/sign-in/[[...sign-in]]/page.tsx` and `app/sign-up/[[...sign-up]]/page.tsx`. Their optional catch-all segments let the prebuilt `<SignIn />` and `<SignUp />` handle their multi-step sub-paths. The URLs are set with the `signInUrl` and `signUpUrl` props on `<ClerkProvider>`, so the header buttons and later `auth.protect()` redirects go to these pages instead of the Account Portal.
- *Alternative:* the `NEXT_PUBLIC_CLERK_SIGN_IN_URL` and `NEXT_PUBLIC_CLERK_SIGN_UP_URL` environment variables. They are rejected because routing is code, not a per-environment secret, and they would need setting again in every environment, Amplify included.

### 4. Header as a component rendered by the root layout
A small server component, `app/_components/site-header.tsx`, renders the app name plus the auth controls: `SignInButton` and `SignUpButton` when signed out, `UserButton` when signed in. It uses the signed-in/signed-out control component exported by the installed `@clerk/nextjs` version (`<Show when="signed-in" | "signed-out">` in Core 3, or `<SignedIn>` and `<SignedOut>` in older majors). The root layout renders it above `{children}`, inside `<ClerkProvider>`, inside `<body>`. The `_components` folder name keeps it out of routing. Because the header lives in the layout, `page.tsx` and its test stay unchanged.
- *Alternative:* put the controls in `page.tsx`. That is rejected because they would show only on `/`, and the page test would need a Clerk provider or mocks.

### 5. Env contract and Turborepo
`apps/web/.env.example` lists `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=` and `CLERK_SECRET_KEY=`, and `apps/web/.gitignore` adds `!.env.example` after `.env*`. `turbo.json` gets `"env": ["NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "CLERK_SECRET_KEY"]` on `build`. Turborepo then passes both through in strict mode (CI and Amplify inject them as process environment, not files) and hashes them, so rotating a key invalidates the cached build. Locally, Next.js reads `.env.local` itself.

### 6. Verify the behavior in the browser, not with Clerk mocks
The header and auth flow are checked against the real Clerk dev instance on `pnpm --filter web dev`, using the built-in browser. A unit test that mocks `@clerk/nextjs` would only test the mock.

## Risks / Trade-offs

- [`clerk init` writes more than we want, for example its own header or a different matcher] → Decision 1 reviews the diff, and the tasks reshape its output to match decisions 2 to 5.
- [`next build` fails without a publishable key, so a future CI build would fail] → The issue only requires the local build, which reads `.env.local`. When CI or Amplify builds land, they supply the key through the `build.env` declared here.
- [The sign-up form sends credentials to Clerk's hosted Frontend API, not to localhost] → The agent must not type credentials there. The user signs up and signs out the test user themselves, and the agent checks the header before and after.
- [A future Clerk major renames the signed-in/out components] → Decision 4 uses whatever the installed version exports, and the build catches a wrong import.
