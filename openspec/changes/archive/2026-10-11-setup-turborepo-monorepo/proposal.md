Issue: #1

## Why

The repository has workflow tooling (OpenSpec, husky, commitlint) but no application code, and the app needs both a web frontend and an API. Putting both in one Turborepo monorepo with pnpm workspaces lets them share tooling, start together with one command, and build through one cached pipeline instead of two repos that drift apart.

## What Changes

- Turn the existing root into a pnpm workspace (`apps/*`) orchestrated by Turborepo, extending the current root `package.json` (which keeps its husky `prepare` script and commitlint dev dependencies) instead of replacing it.
- Add `apps/web`: a Next.js app (App Router, TypeScript) served on port 3000.
- Add a Vitest setup to `apps/web` with one smoke test that renders the home page.
- Add `apps/api`: a NestJS app (TypeScript) served on port 3001.
- Add a root `turbo.json` with `dev`, `build`, `lint` and `test` tasks, and root scripts `pnpm dev`, `pnpm build`, `pnpm lint` and `pnpm test` that run them.
- Extend the root `.gitignore` to cover `node_modules`, `.next`, `dist` and `.turbo`.

Out of scope (per issue #1): shared packages, auth, database, deployment and CI.

## Capabilities

### New Capabilities
- `monorepo-workspace`: the root-level developer commands (install, dev, build, lint, test) that operate on both apps, the ports each app is served on, and keeping generated output out of Git.

### Modified Capabilities
<!-- None. git-hooks requirements are unchanged; this change extends the root package.json that installs the hooks and must keep that working. -->

## Impact

- New: `pnpm-workspace.yaml`, `turbo.json`, `apps/web/**`, `apps/api/**`.
- Modified: root `package.json` (adds `turbo` and the four scripts), `pnpm-lock.yaml` (now covers all workspaces), `.gitignore`.
- New dependencies: `turbo` at the root; Next.js, React and ESLint in `apps/web`; Vitest and its React testing helpers in `apps/web`; NestJS with its test and lint tooling in `apps/api`.
- Contributors still need Node and pnpm and run `pnpm install` once at the root; that install keeps installing the husky hooks (`git-hooks` spec).
