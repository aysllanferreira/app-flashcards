## Context

See proposal.md (Why) for motivation and `specs/app-versioning/spec.md` for the required behavior. The current state that shapes the approach:

- `dev` and `main` rulesets require a PR and have no bypass actors, so a workflow cannot push commits to either branch. Pushing tags is unaffected.
- `.github/workflows/` is empty. This change adds the first workflow.
- Every commit on `dev` is one squash-merged PR whose title is a Conventional Commit, so a `dev` push normally carries one commit.
- The repo uses turbo 2.11.7, pnpm 10.33.0 and Node 24. `pnpm-workspace.yaml` lists only `apps/*`.
- `origin/main` holds only the initial commit and is an ancestor of `origin/dev`, so the first release PR merges cleanly.

A spike with `turbo ls --affected --output=json`, run on past `dev` merges, showed:

| Merge | Files | Affected |
|---|---|---|
| #11, #10 | only `CLAUDE.md`, `openspec/`, `system-design/` | none |
| #6 | root `package.json` and lockfile | `api`, `web` |
| #7 | everything | `api`, `web` |

So turbo's own graph already gives the "outside the apps" behavior, and no ignore list is needed. Turbo prints a `• turbo 2.11.7` banner, so the script must parse the JSON object only, not the whole output.

## Goals / Non-Goals

**Goals:**
- A pure, unit-tested version calculator, kept separate from the git, turbo and GitHub I/O, so every rule in the spec is a plain function test.
- Version state that can be rebuilt from tags alone: no state files, and no reliance on git ancestry between `dev` and `main`.
- Safe to re-run, and serialized per branch.

**Non-Goals:**
- Publishing to npm, or writing versions into `package.json` or `CHANGELOG.md` files.
- Versioning anything outside `apps/*` (the `tooling/versioning` package itself has no version).
- Triggering deploys from tags. Deploy pipelines don't exist yet; see Risks.

## Decisions

### 1. Tags and GitHub Releases are the only state
For each app, the last release is the highest `<app>@X.Y.Z` tag and the open dev cycle is the highest `<app>@X.Y.Z-dev.N` tag. "Highest" is by SemVer ordering over `git tag --list '<app>@*'`, never `git describe`. Release tags sit on `main` merge commits that are not ancestors of `dev`, so `git describe` on `dev` would not see them.

- *Alternative: commit bumped `package.json` versions (Changesets, release-please, `@semantic-release/git`).* Rejected: needs a ruleset bypass or an extra bot PR per merge.
- *Alternative: semantic-release with a monorepo plugin.* Rejected: it filters by path rather than the turbo graph, it depends on a third-party plugin, and on `main` it analyzes commits instead of promoting.

### 2. `main` promotes and never recalculates
On `main`, an app is promoted when the `X.Y.Z` of its highest dev tag is greater than its last release. The release tag is exactly that `X.Y.Z`. The bump was decided on `dev`, where each commit is one Conventional Commit. On `main`, the merge commit's title is the release PR's title and says nothing about bump size.

### 3. Affected apps come from turbo
On `dev`, the script runs `turbo ls --affected --output=json` with `TURBO_SCM_BASE=${{ github.event.before }}` and `TURBO_SCM_HEAD=${{ github.sha }}`, then keeps the packages whose `path` starts with `apps/`.
- **Empty or missing base.** If `github.event.before` is empty or all zeros, the job fails with a clear error instead of guessing. The `non_fast_forward` ruleset rule makes this unreachable on `dev`.
- **Full history.** The checkout uses `fetch-depth: 0` (with tags): turbo marks everything as affected when history is missing.

- *Alternative: path filters on `apps/<app>/**`.* Rejected: they miss lockfile, root-config and future `packages/*` dependencies, which the turbo graph covers.

### 4. Bump size is the maximum over the pushed commits
`dev` pushes are single squash commits in practice, but the script reads every commit in `before..sha` (`git log --format=%H%x00%B`) and takes the largest bump. A multi-commit push therefore can't understate the bump. Parsing:
- `^(\w+)(\([^)]*\))?(!)?:` on the header;
- `BREAKING CHANGE:` or `BREAKING-CHANGE:` at the start of a footer line.

A header that doesn't match counts as patch. The 0.x rule (breaking becomes minor) applies when the *last release's* major version is 0.

### 5. Escalate-or-continue rule
Following the spec, with `R` the last release (`0.0.0` if none), `D` the latest dev version and `cand = bump(R)`:
- **Open cycle** (`base(D) > R`): if `cand > base(D)`, the result is `cand-dev.1`; otherwise it is `base(D)-dev.(n+1)`.
- **No open cycle:** the result is `cand-dev.1`.

The rule needs only the latest tags, never the cycle's commit history.

### 6. Package layout: `tooling/versioning`
`pnpm-workspace.yaml` gains `tooling/*`. The new package is `versioning` (private, no `version` bump semantics), with:
- `src/version.ts`: pure functions `parseBump`, `nextDevVersion` and `promotion`;
- `src/cli.ts`: I/O for git, turbo and `gh`, with `dev` and `main` subcommands;
- `src/*.test.ts`: vitest tests;
- `package.json`: a `test` script (`vitest run`).

It's written in TypeScript and runs directly with Node 24's built-in type stripping (`node src/cli.ts`), so there's no build step. The code therefore uses only erasable syntax and `.ts` import extensions. `semver` handles comparison and increments.

Turbo picks up the `test` script, so root `pnpm test` runs it alongside `api` and `web`. No app depends on the package, so changes to it never affect an app's version.

- *Alternative: root `scripts/`.* Rejected: root `pnpm test` runs only workspace tasks, so the tests wouldn't run.

### 7. Workflow shape
`.github/workflows/versioning.yml`:
- **Triggers:** `on: push` for branches `dev` and `main`.
- **Permissions:** `contents: write` only.
- **Concurrency:** `group: versioning-${{ github.ref }}` and `cancel-in-progress: false`, so runs on the same branch queue and never compute from stale tags.
- **Steps:** checkout (`fetch-depth: 0`, `fetch-tags: true`), `pnpm/action-setup` (version taken from `packageManager`), `actions/setup-node` (Node 24, pnpm cache), `pnpm install --frozen-lockfile`, then `node tooling/versioning/src/cli.ts <dev|main>`.

`GH_TOKEN` is `${{ github.token }}`.

Tags and releases are created together with `gh release create <tag> --target <sha> --title <tag> --notes <notes>`, plus `--prerelease` on `dev`.

**Idempotency:** before creating anything, the CLI checks whether `<app>@*` already points at the commit (`git tag --points-at <sha> --list '<app>@*'`). If so, it skips that app.

### 8. Release notes
- **Dev prerelease:** the pushed commit headers.
- **Release:** the headers of the commits that carry this app's dev tags newer than the last release, newest first, each with its dev tag.

Squash titles end in `(#N)`, which GitHub links automatically.

- *Alternative: `--generate-notes`.* Rejected: it lists every PR since the previous tag, not just the ones that affected this app.

### 9. Merge methods are set through the API
The settings change is applied with `gh api` and verified the same way:
- **Repository:** `PATCH /repos/aysllanferreira/app-flashcards` with `allow_merge_commit=true`, `merge_commit_title=PR_TITLE` and `merge_commit_message=PR_BODY`. Squash stays enabled; rebase stays disabled.
- **Rulesets:** `PUT /repos/.../rulesets/<id>` for `dev`, with `pull_request.parameters.allowed_merge_methods = ["squash"]`, and for `main`, with `["merge"]`. All other rules stay as they are.

Each ruleset is fetched fresh and written back with only that field changed.

### 10. Delivery happens in several PRs so the criteria can be observed
Criteria 1, 2, 3, 5 and 6 can only be verified by real merges. The work therefore ships as:
1. `feat(versioning): ...`: tooling, workflow, `package.json` versions, CLAUDE.md. Settings are changed just before it merges. Merging it creates `api@0.1.0-dev.1` and `web@0.1.0-dev.1`.
2. `docs(system-design): ...`: changes only `system-design/`. Verifies "no tag".
3. `chore(api): ...`: a real api-only fix. Fill the empty `description` and `author` in `apps/api/package.json`. Verifies the api-only tag, then the workflow is re-run to check idempotency.
4. **Release PR `dev -> main`**, merged with a merge commit. Verifies promotion and ancestry.
5. Archive PR (`openspec/` only) with `Closes #12`.

PRs 1 to 3 reference the issue with `Refs #12` instead of `Closes #12`, so the issue stays open until the archive PR merges.

## Risks / Trade-offs

- [A squash title that isn't a Conventional Commit is never linted on GitHub] → it falls back to patch, which is safe; PR titles are already reviewed as Conventional Commits.
- [Tags and releases created with `GITHUB_TOKEN` don't trigger other workflows] → fine today, since there are no deploy workflows. Future deploy pipelines must run in the same workflow or use `workflow_run`, not `on: push: tags`. Recorded in the system-design README.
- [Anyone with write access can push or delete `<app>@*` tags by hand and corrupt the state] → accepted for now (tag protection is out of scope). Every version can be rebuilt from the remaining tags and the release list.
- [A global turbo input change (root `package.json`, lockfile, `turbo.json`) bumps both apps] → intended: the build inputs of both apps changed.
- [The banner line, or turbo output format changes, break parsing] → parse from the first `{`, and fail the job if the JSON doesn't parse.
- [Two release PRs merged in quick succession] → per-branch concurrency serializes the runs, and the second sees the first's tags.

## Migration Plan

1. Change the repo merge settings and both rulesets (Decision 9), and verify them with `gh api`. Merging feature PRs as squash keeps working throughout.
2. Merge PRs 1 to 3 into `dev` (Decision 10) and check tags and releases after each.
3. Open and merge the first release PR into `main` with a merge commit.

**Rollback:** delete `.github/workflows/versioning.yml`. Existing tags and releases are inert and can stay or be deleted. The merge settings can be restored with the same `gh api` calls.
