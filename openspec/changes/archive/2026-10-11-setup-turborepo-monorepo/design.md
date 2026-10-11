## Context

See proposal.md for motivation and specs/monorepo-workspace/spec.md for the required behavior.

The root is not empty. `package.json` already declares `packageManager: pnpm@10.33.0`, the husky `prepare` script and the commitlint dev dependencies, and the `git-hooks` spec depends on `pnpm install` keeping that working. `.gitignore` contains only `node_modules`. The local toolchain is Node 24 and pnpm 10.33. Current npm releases at proposal time: Turbo 2.11, Next.js 16.4, NestJS 12.1, ESLint 10, TypeScript 7.0.

## Goals / Non-Goals

**Goals:**
- Extend the existing root in place; the husky and commitlint setup keeps working unchanged.
- Use each framework's official generator for its app, so the apps start from upstream defaults rather than hand-written config.
- Make `pnpm lint` a pure check and `pnpm test` meaningful in both apps.

**Non-Goals:**
- Shared `packages/*` (tsconfig, ESLint config, UI). Each app keeps its own config for now.
- Remote caching, CI, deployment.
- Styling decisions for the web app.

## Decisions

### Hand-write the root, generate the apps
Write `pnpm-workspace.yaml` (`packages: ["apps/*"]`), `turbo.json` and the root scripts by hand. Scaffold the apps with `create-next-app` and `nest new`.
- Alternative: `create-turbo`. Rejected because it generates its own root `package.json`, `.gitignore` and example `packages/*`, which would conflict with the existing husky and commitlint setup and add shared packages that issue #1 puts out of scope.

### Generator flags: no nested repos, no nested installs
Run `create-next-app` with `--disable-git --skip-install` and `nest new` with `--skip-git --skip-install --package-manager pnpm`, then run a single `pnpm install` at the root.
- Without these flags each generator runs `git init` inside its folder (a nested repo) and installs on its own, which creates a per-app lockfile. That would break the single-lockfile requirement.
- The generated `package.json` names are set to `web` and `api`, so Turbo task labels read `web:build`, `api:test` and so on.

### Web app options
TypeScript, App Router, ESLint and the `@/*` import alias. No Tailwind: styling is not part of issue #1 and is left for a later issue. Keep `src/` off, which is the generator default. The `dev` script pins `--port 3000` explicitly even though it is Next's default, so the port is visible in `package.json`.

### API port
Nest's generated `main.ts` listens on `process.env.PORT ?? 3000`. Change the fallback to `3001`, keeping the `PORT` override.

### Turbo tasks
- `build`: `outputs: [".next/**", "!.next/cache/**", "dist/**"]`.
- `dev`: `cache: false`, `persistent: true`.
- `lint`, `test`: default caching, no `dependsOn`. There are no shared packages, so nothing upstream needs building first.
- Root scripts are `turbo run <task>` for each of `dev`, `build`, `lint` and `test`.
- Turbo is a root dev dependency, so the version is pinned by the lockfile rather than a global install.

### Lint is check-only
Nest's generated `lint` script passes `--fix`, which rewrites files. Remove `--fix` so `pnpm lint` only reports problems (spec: "without rewriting source files"). The web app's generated `lint` script is plain `eslint`, since Next 16 removed `next lint`.

### Web smoke test: Vitest + React Testing Library
Add `vitest`, `jsdom`, `@vitejs/plugin-react`, `@testing-library/react` and `@testing-library/dom` to `apps/web`, plus a `vitest.config.mts` with the jsdom environment. The `test` script is `vitest run`, which runs once and does not watch.
- The smoke test renders `app/page.tsx` and asserts on a known element of the generated home page.
- This follows the Next.js Vitest guide. Its limit is that async Server Components cannot be rendered under Vitest; the generated home page is synchronous.
- Alternative: Jest, to match Nest. Rejected because the issue names Vitest, and Next's Jest setup needs more config (SWC transform via `next/jest`).

### API tests: keep what `nest new` generates
Keep the generated unit spec (`app.controller.spec.ts`) and its runner; `api`'s `test` script runs it. The e2e script stays available but is not part of `pnpm test`.

### Per-app `.gitignore` files are kept
Both generators write their own `.gitignore`. The web one covers `next-env.d.ts`, `*.tsbuildinfo` and `.env*`. Keep them alongside the extended root `.gitignore`, so dev and build leave no untracked generated files at all, not just the four entries the issue names.

### TypeScript version: the generator's pin
Each app keeps the TypeScript version its generator writes into its `package.json`; there is no root-level TypeScript. NestJS depends on `experimentalDecorators` and `emitDecoratorMetadata`, and it is not confirmed that TypeScript 7 handles them the way NestJS 12 expects. The generator's pin is the version upstream tests against.

### pnpm build-script approvals
pnpm 10 blocks dependency lifecycle scripts by default and prints "Ignored build scripts" (for example for `sharp`). Keep that default. Approve a package with `pnpm approve-builds` only if `pnpm build`, `pnpm dev` or `pnpm test` fails without its script, and record which ones were approved in the apply progress comment.

## Risks / Trade-offs

- [Generator output differs from these assumptions (flags renamed, different defaults, prompts in non-interactive mode)] → Pass every option as a flag so nothing prompts. Check the generated files right after scaffolding; tasks verify the names, ports and scripts explicitly.
- [Version mismatch between ESLint 10 and the generated ESLint configs, or Vitest 5 peer requirements] → Use the versions the generators and `pnpm add` resolve. If install or lint fails on peer ranges, pin the newest compatible major and note it in the progress comment.
- [`pnpm dev` hard to verify headlessly] → Run it in the background, poll both ports with `curl` until they respond or a timeout passes, then stop the process.
- [pnpm's isolated `node_modules` layout breaks a framework tool] → Next.js and NestJS both support pnpm workspaces. If a tool fails to resolve a dependency, fix it in that app's config, not with root-wide `shamefully-hoist`.
