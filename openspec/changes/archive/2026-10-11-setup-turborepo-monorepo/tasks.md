## 1. Workspace root (issue #1, AC 1 and 5)

- [x] 1.1 Create `pnpm-workspace.yaml` with `packages: ["apps/*"]` and verify `cat pnpm-workspace.yaml` shows it
- [x] 1.2 Add `turbo` as a root dev dependency (`pnpm add -D -w turbo`) and add root scripts `dev`, `build`, `lint` and `test` (each `turbo run <task>`), keeping `prepare: husky` and the commitlint dev dependencies; verify `pnpm exec turbo --version` prints a 2.x version and `node -e "require('./package.json')"` exits 0
- [x] 1.3 Create `turbo.json` with the `build`, `dev`, `lint` and `test` tasks from design.md (build outputs `.next/**`, `!.next/cache/**`, `dist/**`; dev `cache: false`, `persistent: true`) and verify it parses with `node -e "JSON.parse(require('fs').readFileSync('turbo.json','utf8'))"`
- [x] 1.4 Extend root `.gitignore` to `node_modules`, `.next`, `dist` and `.turbo` and verify `cat .gitignore` lists all four

## 2. Web app scaffold (issue #1, AC 1, 2, 3 and 4)

- [x] 2.1 Scaffold `apps/web` with `create-next-app` (TypeScript, App Router, ESLint, no Tailwind, no `src/`, `@/*` alias, `--use-pnpm --disable-git --skip-install`, all options as flags), then verify `apps/web/.git` and `apps/web/node_modules` do not exist and no lockfile exists under `apps/web`
- [x] 2.2 Set `apps/web/package.json` `name` to `web` and its `dev` script to `next dev --port 3000`; verify with `node -p "require('./apps/web/package.json').name"` and by reading the `dev` script
- [x] 2.3 Confirm the web `lint` script runs `eslint` without `--fix` and verify by reading `apps/web/package.json`

## 3. Web smoke test with Vitest (issue #1, AC 4)

- [x] 3.1 Add `vitest`, `jsdom`, `@vitejs/plugin-react`, `@testing-library/react` and `@testing-library/dom` as `apps/web` dev dependencies, add `vitest.config.mts` (jsdom environment, React plugin) and set the `test` script to `vitest run`; verify `pnpm --filter web exec vitest --version` prints a version
- [x] 3.2 Write a smoke test in `apps/web` that renders `app/page.tsx` and asserts on a known element of the home page; verify `pnpm --filter web test` exits 0 and reports 1 passing test
- [x] 3.3 Verify the smoke test can fail: temporarily change the asserted text, confirm `pnpm --filter web test` exits non-zero, then revert and confirm it passes again

## 4. API app scaffold (issue #1, AC 1, 2, 3 and 4)

- [x] 4.1 Scaffold `apps/api` with `nest new` (`--skip-git --skip-install --package-manager pnpm`), then verify `apps/api/.git` and `apps/api/node_modules` do not exist and no lockfile exists under `apps/api`
- [x] 4.2 Set `apps/api/package.json` `name` to `api` and verify with `node -p "require('./apps/api/package.json').name"`
- [x] 4.3 Change the port fallback in `apps/api/src/main.ts` to `process.env.PORT ?? 3001` and verify with `grep -n 3001 apps/api/src/main.ts`
- [x] 4.4 Remove `--fix` from the api `lint` script and verify by reading `apps/api/package.json`

## 5. Install (issue #1, AC 1)

- [x] 5.1 Run `pnpm install` at the root and verify it exits 0, `pnpm-lock.yaml` exists only at the root, and `apps/web/node_modules` and `apps/api/node_modules` exist (AC 1)
- [x] 5.2 Verify the husky hooks are still installed: `git config core.hooksPath` prints `.husky/_` (git-hooks spec regression check)
- [x] 5.3 If pnpm prints "Ignored build scripts", leave them ignored unless a later build, dev or test step fails because of one. Approve only the failing package with `pnpm approve-builds` and note it for the progress comment.

## 6. End-to-end verification (issue #1, AC 2, 3, 4 and 5)

- [x] 6.1 Run `pnpm build` at the root and verify it exits 0, the output shows `web:build` and `api:build`, and `apps/web/.next` and `apps/api/dist` exist (AC 3)
- [x] 6.2 Run `pnpm lint` at the root and verify it exits 0, the output shows `web:lint` and `api:lint`, and `git status --porcelain` shows no modified source files (AC 4)
- [x] 6.3 Run `pnpm test` at the root and verify it exits 0, the output shows `web:test` and `api:test`, and the web run includes the home page smoke test (AC 4)
- [x] 6.4 Start `pnpm dev` in the background, poll until `curl -s -o /dev/null -w '%{http_code}' http://localhost:3000` and `http://localhost:3001` both return `200` (2-minute timeout), confirm the output shows both `web:dev` and `api:dev`, then stop the process and confirm both ports are free (AC 2)
- [x] 6.5 After 5.1, 6.1 and 6.4, verify `git status --porcelain` lists no `node_modules`, `.next`, `dist` or `.turbo` entries and no other generated files such as `next-env.d.ts` or `*.tsbuildinfo` (AC 5)

## 7. Commit (issue #1, all AC)

- [x] 7.1 Commit the work on `feat/setup-turbo` with Conventional Commit messages and no Claude attribution, and verify each commit passes the commit-msg hook and `git status --porcelain` is empty afterwards
