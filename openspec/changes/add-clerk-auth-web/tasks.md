## 1. Branch, Clerk CLI and scaffold (issue #13, AC 1)

- [x] 1.1 Create `feat/web-clerk-auth` from an up-to-date `dev`. Verify that `git rev-parse --abbrev-ref HEAD` prints `feat/web-clerk-auth` and `git merge-base --is-ancestor origin/dev HEAD` exits 0.
- [x] 1.2 Install or update the Clerk CLI (`command -v clerk && clerk update --yes`, otherwise `pnpm install -g clerk`), then run `clerk auth login` and wait for the user to finish the login flow. Verify that `clerk --version` prints a version and the login command reports success.
- [x] 1.3 From `apps/web`, run `clerk init --app app_3KZYqa9Dp4M1kAFH6UZVN1VFkh1`, without `--framework` or `--pm`. Verify with `git status --short` that changes are limited to `apps/web/` and `pnpm-lock.yaml`, and revert anything else. Don't open or print `.env.local`: only check with `git check-ignore apps/web/.env.local` that it is ignored.
- [x] 1.4 Verify that `apps/web/package.json` lists `@clerk/nextjs` under `dependencies` and that `pnpm install --frozen-lockfile` at the repo root exits 0. Tick AC 1.

## 2. Provider and proxy (issue #13, AC 2 and 3)

- [x] 2.1 Make `apps/web/proxy.ts` (not `middleware.ts`) export `clerkMiddleware()` with no protection handler, and give `config.matcher` Clerk's static-file skip pattern, `'/(api|trpc)(.*)'`, then `'/__clerk/:path*'`. Verify with `grep -c "__clerk" apps/web/proxy.ts` printing `1`, with that line coming after the `(api|trpc)` line, and with `test ! -e apps/web/middleware.ts`. Tick AC 2.
- [x] 2.2 In `apps/web/app/layout.tsx`, put `<ClerkProvider signInUrl="/sign-in" signUpUrl="/sign-up">` inside `<body>`, wrapping the header and `{children}`, and leave `<html>` and the font setup unchanged. Verify by reading the file that `<ClerkProvider>` is a child of `<body>`, not a wrapper around `<html>`. Tick AC 3.

## 3. Sign-in and sign-up pages and header (issue #13, AC 5)

- [x] 3.1 Add `apps/web/app/sign-in/[[...sign-in]]/page.tsx` rendering `<SignIn />` and `apps/web/app/sign-up/[[...sign-up]]/page.tsx` rendering `<SignUp />`, centered in the page. Remove any duplicate routes `clerk init` created. Verify that `find apps/web/app -path '*sign-*' -name page.tsx` lists exactly these two files.
- [x] 3.2 Add `apps/web/app/_components/site-header.tsx` with the app name, plus `SignInButton` and `SignUpButton` when signed out and `UserButton` when signed in. Use the signed-in/out component the installed `@clerk/nextjs` exports (`Show` in Core 3), render it from the root layout above `{children}`, and remove any header `clerk init` added. Verify that `pnpm --filter web exec tsc --noEmit` exits 0 and that `git diff --quiet apps/web/app/page.tsx apps/web/__tests__` exits 0.

## 4. Env contract and Turborepo (issue #13, AC 6, 7 and 8)

- [x] 4.1 Create `apps/web/.env.example` with exactly `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=` and `CLERK_SECRET_KEY=`, and add `!.env.example` after `.env*` in `apps/web/.gitignore`. After staging, verify that `git ls-files apps/web | grep '\.env'` prints only `apps/web/.env.example` and that `grep -E '=.+' apps/web/.env.example` prints nothing. Tick AC 6.
- [x] 4.2 Verify that `grep -rn CLERK_SECRET_KEY apps/web/app` prints no matches. Tick AC 7.
- [x] 4.3 Add `"env": ["NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "CLERK_SECRET_KEY"]` to the `build` task in `turbo.json`. Verify that the `web#build` task in `pnpm turbo run build --filter=web --dry=json` lists both names in its environment variables. Tick AC 8.

## 5. Verification (issue #13, AC 4, 5 and 9)

- [x] 5.1 Run `clerk doctor` in `apps/web`, fix anything it reports, and verify that it reports no errors. Tick AC 4.
- [x] 5.2 Verify that `pnpm turbo run lint test build --filter=web` exits 0. Tick AC 9.
- [x] 5.3 Start `pnpm --filter web dev` and open `http://localhost:3000/` in the built-in browser. Verify that the header shows "Sign in" and "Sign up" and no avatar, and that `/` returns 200 without redirecting. Then verify that clicking "Sign up" and "Sign in" lands on `localhost:3000/sign-up` and `localhost:3000/sign-in`.
- [x] 5.4 Ask the user to sign up a new test user at `/sign-up` (the agent does not type credentials, because the form posts to Clerk's hosted API). Verify that the browser returns to the app with a `UserButton` avatar in the header and no "Sign in" or "Sign up". Then ask the user to sign out from the `UserButton`, and verify that "Sign in" and "Sign up" are shown again. Tick AC 5.

## 6. Commit and pull request

- [ ] 6.1 Commit as `feat(web): add Clerk authentication to the Next.js app`, authored by the repo owner with no Claude attribution, then push and open a PR to `dev` with that title and `Closes #13` in the body. Verify that `gh pr view --json baseRefName,body` shows `dev` and contains `Closes #13`, and that `gh pr diff --name-only` contains no `.env.local`.

## 7. GitHub Wiki

- [ ] 7.1 After the PR is merged, clone `https://github.com/aysllanferreira/app-flashcards.wiki.git` into the scratchpad and update:
  - `Status` (shipped change, #13, its PR, date);
  - `Changelog` (new entry at the top);
  - `Decisions` (in-app `/sign-in` and `/sign-up` pages over the hosted Account Portal; all routes public until the first user-owned page; Clerk keys declared in `turbo.json` `build.env`; linked to #13);
  - `Roadmap` (move the web-auth item to done, if it lists one).

  Each page keeps its purpose line and ends with `Last updated: <YYYY-MM-DD> by add-clerk-auth-web (#13)`, with no keys or environment details. Push with `docs(wiki): update for #13`. Verify that a fresh clone shows the changes, and list the pages in the issue's progress comment.
