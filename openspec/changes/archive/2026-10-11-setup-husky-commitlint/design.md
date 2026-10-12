## Context

The repository has no `package.json`, lockfile or `.gitignore` yet; issue #1 (Turborepo) will add the monorepo on top of whatever this change creates. Local toolchain: Node 24.15.0, pnpm 10.33.0. The GitHub rulesets on `dev` and `main` already require a pull request, block force-push and deletion, and have no bypass actors. PRs are squash-merged, so the commit that lands on `dev` uses the PR title, not the branch commits. See proposal.md for motivation.

## Goals / Non-Goals

**Goals:**
- Hooks install automatically from `pnpm install`, with no extra manual step.
- The root `package.json` stays minimal so issue #1 can extend it without conflicts.
- The pre-push check cannot be dodged by pushing a differently named local branch to `dev` or `main`.

**Non-Goals:**
- Replacing the GitHub rulesets. The hooks are a fast-fail convenience, bypassable with `--no-verify`.
- Validating PR titles, the message that actually lands on `dev`. That needs CI and is out of scope.

## Decisions

### Husky 9 with the `prepare` script
Use Husky 9 (current: 9.1.7). Its `prepare: "husky"` script sets `core.hooksPath` to `.husky/_` on every install, and hooks are plain shell files in `.husky/`.
- Alternative: `simple-git-hooks` / lefthook. Lefthook is a separate binary with its own YAML config; `simple-git-hooks` needs a re-run after config changes. Husky is the most widely known option and is what the issue names.
- pnpm 10 blocks dependency lifecycle scripts by default, but the root project's own `prepare` script still runs, so no `onlyBuiltDependencies` entry is needed.

### commitlint with `@commitlint/config-conventional`
Use `@commitlint/cli` and `@commitlint/config-conventional` (current: 21.2.3, which requires Node >= 22.12; local Node 24 satisfies this). The conventional preset's type list (`build`, `chore`, `ci`, `docs`, `feat`, `fix`, `perf`, `refactor`, `revert`, `style`, `test`) is a superset of the types listed in CLAUDE.md, so no custom type list is needed.
- The `commit-msg` hook runs `pnpm exec commitlint --edit "$1"`, so it uses the locally installed binary and never downloads anything.

### `commitlint.config.js` written as CommonJS
The root `package.json` has no `"type"` field, so `.js` files are CommonJS. The config uses `module.exports = { extends: ['@commitlint/config-conventional'] }`.
- Alternative: `export default` with `"type": "module"` in `package.json`. That would change how every root `.js` file loads, which issue #1 should decide, not this change.
- Alternative: `commitlint.config.mjs`. That works, but the issue names `commitlint.config.js`.

### pre-push checks the remote refs from stdin, not the current branch
Git passes one line per ref to `pre-push` on stdin: `<local ref> <local sha> <remote ref> <remote sha>`. The hook reads every line and exits 1, with a message naming the branch, if any `<remote ref>` is `refs/heads/dev` or `refs/heads/main`. This catches `git push origin feat/x:dev`, `git push origin HEAD:main` and deletion pushes (`git push origin :dev`). A current-branch check would miss all three.
- The hook is POSIX `sh`. Husky 9 runs hooks with `sh`, so bash-only syntax is avoided.

### Minimal root `package.json`
Fields: `name`, `private: true`, `packageManager: "pnpm@10.33.0"`, `scripts.prepare`, `devDependencies`. No `workspaces`, `engines` or `type`; those belong to issue #1.

## Risks / Trade-offs

- [Hooks bypassed with `--no-verify`] → The GitHub rulesets still reject direct pushes to `dev` and `main`; commit messages on `dev` come from PR titles, which squash merge controls.
- [A contributor forgets `pnpm install`, so no hooks are active] → The same server-side rulesets apply; once issue #1 lands, every workflow needs `pnpm install` anyway.
- [Merge conflict with issue #1 on `package.json` / `.gitignore`] → Rebase `feat/turbo-install` onto `dev` after this merges; the files are deliberately small.
- [Verifying AC 3 adds an empty `chore: verify commitlint` commit to the branch] → Drop it afterwards with `git reset HEAD~1`; squash merge would hide it anyway.

## Migration Plan

No migration. After this merges, existing clones run `pnpm install` once to activate the hooks. Rollback: revert the PR and run `git config --unset core.hooksPath`.
