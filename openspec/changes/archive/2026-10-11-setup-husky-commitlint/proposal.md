Issue: #5

## Why

Commits must follow Conventional Commits and nobody may push directly to `dev` or `main`, but nothing on a developer's machine checks either rule today. The GitHub rulesets already reject direct pushes to `dev` and `main`, but only after a network round trip and with a generic error. Local Git hooks catch both mistakes the moment they happen, with a clear message, before anything leaves the machine.

## What Changes

- Add a minimal root `package.json` (`private: true`, `packageManager: pnpm@10.33.0`, `"prepare": "husky"`) and `pnpm-lock.yaml`, so `pnpm install` installs the hooks. Issue #1 (Turborepo) will build on this file instead of creating it.
- Add a root `.gitignore` containing `node_modules`.
- Add dev dependencies `husky`, `@commitlint/cli` and `@commitlint/config-conventional`.
- Add `commitlint.config.js` extending `@commitlint/config-conventional`.
- Add a `.husky/commit-msg` hook that runs commitlint on the commit message.
- Add a `.husky/pre-push` hook that rejects a push when any remote ref being updated is `refs/heads/dev` or `refs/heads/main`, based on the refs Git passes to the hook rather than the current branch name. Pushes to every other branch are allowed.
- The GitHub rulesets on `dev` and `main` stay the real enforcement; the hooks are a local fast-fail and can be bypassed with `--no-verify`.

Out of scope: Turborepo and app scaffolding (issue #1), a pre-commit / lint-staged hook, a CI check on PR titles, and rejecting Claude `Co-Authored-By` trailers in commit messages.

## Capabilities

### New Capabilities
- `git-hooks`: local Git hooks, installed by `pnpm install`, that reject non-Conventional commit messages and pushes that target `dev` or `main`.

### Modified Capabilities
<!-- None. The issue-driven-workflow spec already states the Conventional Commits and branch rules; this change adds local checks for them without changing those requirements. -->

## Impact

- New root files: `package.json`, `pnpm-lock.yaml`, `.gitignore`, `commitlint.config.js`, `.husky/commit-msg`, `.husky/pre-push`.
- New dev dependencies: `husky`, `@commitlint/cli`, `@commitlint/config-conventional`. Contributors need Node and pnpm and must run `pnpm install` once after cloning for the hooks to be active.
- Issue #1 (`feat/turbo-install`) must extend this root `package.json` and `.gitignore` rather than create them, so that branch should be rebased onto `dev` after this lands.
- No change to the GitHub rulesets.
