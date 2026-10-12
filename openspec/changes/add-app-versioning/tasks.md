## 1. Merge methods (issue #12, AC 7)

- [x] 1.1 Enable merge commits at the repo level with the PR title as the merge commit title: `gh api -X PATCH repos/aysllanferreira/app-flashcards -F allow_merge_commit=true -f merge_commit_title=PR_TITLE -f merge_commit_message=PR_BODY`. Verify that `gh api repos/aysllanferreira/app-flashcards --jq '{allow_merge_commit, allow_squash_merge, allow_rebase_merge, merge_commit_title}'` prints `true`, `true`, `false`, `"PR_TITLE"`.
- [x] 1.2 Fetch the `dev` ruleset fresh, set only `pull_request.parameters.allowed_merge_methods` to `["squash"]`, and `PUT` it back. Do the same for `main` with `["merge"]`. Verify that `gh api repos/aysllanferreira/app-flashcards/rulesets/<id> --jq '.rules[] | select(.type=="pull_request") | .parameters.allowed_merge_methods'` prints `["squash"]` for `dev` and `["merge"]` for `main`, and that every other rule is unchanged.

## 2. Version calculator (issue #12, AC 4)

- [x] 2.1 Add `tooling/*` to `pnpm-workspace.yaml` and create the `tooling/versioning` package (private; `test` script `vitest run`; dependencies `semver`, `vitest`, `@types/semver`, `@types/node`; a `tsconfig.json` with `allowImportingTsExtensions`, `erasableSyntaxOnly` and `noEmit`). Verify that `pnpm install` exits 0 and `pnpm -s turbo ls --output=json` lists `versioning` at `tooling/versioning`.
- [x] 2.2 Write `src/version.ts` with the pure functions `parseBump(messages)`, `nextDevVersion({ release, dev, bump })` and `promotion({ release, dev })`, following design.md Decisions 2, 4 and 5. Write `src/version.test.ts` covering every scenario of "Bump size comes from the commit type" and "Release versions on merges into main": first version, patch, other type as patch, minor, major, breaking while 0.x, `BREAKING CHANGE:` footer, a non-conventional header, continuing a dev cycle, escalating a dev cycle, a smaller bump inside a larger cycle, promotion, and nothing to promote. Verify that `pnpm --filter versioning test` passes with each case as a named test.
- [x] 2.3 Verify that `pnpm test` at the repository root exits 0 and shows test tasks for `api`, `web` and `versioning`.

## 3. Versioning CLI (issue #12, AC 1, 2, 3 and 5)

- [x] 3.1 Write `src/cli.ts` with a `dev` subcommand:
  - read `BEFORE`/`GITHUB_SHA` and fail if the base is empty or all zeros;
  - run `turbo ls --affected --output=json` with `TURBO_SCM_BASE`/`TURBO_SCM_HEAD`, parse from the first `{`, and keep the packages under `apps/`;
  - compute the bump from `git log BEFORE..SHA`;
  - for each affected app with no `<app>@*` tag pointing at SHA, create the tag and prerelease with `gh release create <tag> --target <sha> --prerelease`.

  Add a `--dry-run` flag that prints the planned tags instead of creating them. Verify locally that `BEFORE=1196644~1 GITHUB_SHA=1196644 node tooling/versioning/src/cli.ts dev --dry-run` plans no tag, and that `BEFORE=a5a6251~1 GITHUB_SHA=a5a6251 node tooling/versioning/src/cli.ts dev --dry-run` plans `api@0.1.0-dev.1` and `web@0.1.0-dev.1`.
- [x] 3.2 Add a `main` subcommand: for each app, compute `promotion` from the highest release and dev tags; skip it if `<app>@X.Y.Z` already exists; otherwise build release notes from the commits that carry the app's dev tags newer than the last release (design.md Decision 8) and run `gh release create <app>@X.Y.Z --target <sha>`. Verify with `--dry-run` against a temporary local tag `api@0.1.0-dev.1` (deleted afterwards) that it plans `api@0.1.0` and prints the notes.

## 4. Workflow (issue #12, AC 1, 2, 3 and 5)

- [ ] 4.1 Add `.github/workflows/versioning.yml` as in design.md Decision 7:
  - `on: push` to `dev` and `main`, with `permissions: contents: write`;
  - concurrency `versioning-${{ github.ref }}` with `cancel-in-progress: false`;
  - checkout with `fetch-depth: 0` and `fetch-tags: true`, pnpm and Node 24 setup, `pnpm install --frozen-lockfile`;
  - run `node tooling/versioning/src/cli.ts dev` (with `BEFORE: ${{ github.event.before }}`) on `dev` and `... main` on `main`, with `GH_TOKEN: ${{ github.token }}`.

  Verify that `gh workflow view versioning.yml` succeeds once the PR is pushed, or check the YAML with `actionlint` if it is available.

## 5. App versions, CLAUDE.md and specs (issue #12, AC 8)

- [x] 5.1 Set `"version": "0.0.0"` in `apps/api/package.json` and `apps/web/package.json`. Verify that `jq -r .version apps/*/package.json` prints `0.0.0` twice.
- [x] 5.2 Update "Commits and pull requests" in `CLAUDE.md`:
  - feature PRs target `dev` and are squash-merged;
  - release PRs go from `dev` to `main` with a merge commit titled by the PR title;
  - add a short "Versioning" subsection (per-app tags `<app>@X.Y.Z-dev.N` on `dev`, promoted to `<app>@X.Y.Z` on `main`, never edit `package.json` versions or create `<app>@*` tags by hand);
  - PRs that deliver only part of a change use `Refs #N`, and only the PR that completes it uses `Closes #N`.

  Verify that `grep -n "merge commit" CLAUDE.md` and `grep -n "<app>@" CLAUDE.md` both print matches, and that the "always squash-merged; the repo allows no other merge method" sentence is gone.
- [x] 5.3 Run `openspec validate add-app-versioning --strict` and fix any finding. Verify that it exits 0.
- [x] 5.4 Sync the deltas into the main specs with `/opsx:sync`. Verify that `openspec list --specs` lists `app-versioning` and that `openspec/specs/issue-driven-workflow/spec.md` contains the "Release PR is merged" scenario.

## 6. PR 1: versioning lands on dev (issue #12, AC 4, 7 and 8)

- [ ] 6.1 Commit groups 2 to 5 with Conventional Commits and no Claude attribution, push `feat/apps-versioning`, and open a PR to `dev` titled `feat(versioning): version api and web with dev prereleases and release tags`, with `Refs #12` in the body. Verify that `git log dev..HEAD --format=%B | grep -ci "co-authored-by"` prints 0 and that `gh pr view --json baseRefName,body` shows `dev` and `Refs #12`.
- [ ] 6.2 After the user squash-merges the PR, check the workflow run on `dev`. Verify that `gh run list --workflow versioning.yml --branch dev --limit 1` shows success and that `git ls-remote --tags origin` lists `api@0.1.0-dev.1` and `web@0.1.0-dev.1`.

## 7. PR 2: system design, no tag (issue #12, AC 2 and 8)

- [ ] 7.1 Edit `system-design/07-cicd.excalidraw`:
  - "Branch and merge rules" box: squash into `dev`, merge commit for `dev -> main`;
  - add a versioning lane: push to `dev` creates `<app>@X.Y.Z-dev.N` and a prerelease; push to `main` promotes it to `<app>@X.Y.Z` and a GitHub Release.

  Re-export `system-design/07-cicd.png`. Verify by opening the PNG and confirming both edits appear and match the `.excalidraw` source.
- [ ] 7.2 Update `system-design/README.md`:
  - add a **Versioning** row to Decisions (per-app tags, promotion on `main`, no bot commits, `GITHUB_TOKEN` tags don't trigger workflows so future deploys must run in the same workflow or use `workflow_run`);
  - change the **CI/CD** row's merge wording;
  - update the 07 description.

  Verify with `grep -n "Versioning" system-design/README.md`.
- [ ] 7.3 Commit (`docs(system-design): ...`) on a new branch from `dev`, open a PR to `dev` with `Refs #12`, and after the user squash-merges it verify that `git diff --name-only HEAD~1 HEAD` on `dev` lists only `system-design/` files, that the versioning run succeeded, and that `git tag --points-at origin/dev` prints nothing. Tick AC 2.

## 8. PR 3: api-only change and re-run (issue #12, AC 1 and 3)

- [ ] 8.1 On a new branch from `dev`, fill the empty `description` and `author` fields in `apps/api/package.json`, commit as `chore(api): fill package description and author`, and open a PR to `dev` with `Refs #12`. Verify that `gh pr diff --name-only` lists only `apps/api/package.json`.
- [ ] 8.2 After the user squash-merges it, verify that `git ls-remote --tags origin` lists `api@0.1.0-dev.2`, that `gh release list` shows it as a prerelease, and that no new `web@*` tag exists. Tick AC 1.
- [ ] 8.3 Re-run that versioning run with `gh run rerun <id>`. Verify that it succeeds and that `git ls-remote --tags origin | grep -c "api@"` is unchanged. Tick AC 3.

## 9. First release to main (issue #12, AC 5 and 6)

- [ ] 9.1 Open a release PR from `dev` to `main` titled `chore(release): release api 0.1.0 and web 0.1.0`, with `Refs #12`. Verify that `gh pr view --json baseRefName,headRefName` shows `main` and `dev`, and that the merge box offers only "Create a merge commit".
- [ ] 9.2 After the user merges it with a merge commit, verify that `git ls-remote --tags origin` lists `api@0.1.0` and `web@0.1.0` on the new `main` commit, that `gh release view api@0.1.0 --json isPrerelease` prints `false` and the notes list the cycle's commits, and that the same holds for `web@0.1.0`. Tick AC 5.
- [ ] 9.3 Verify that `git fetch origin && git merge-base --is-ancestor origin/dev origin/main` exits 0. Tick AC 6. Tick AC 4, 7 and 8 too if they are not ticked yet: re-run `pnpm test` on `dev`, the `gh api` checks from 1.1 and 1.2, and the greps from 5.2 and 7.2.

## 10. GitHub Wiki

- [ ] 10.1 Clone `https://github.com/aysllanferreira/app-flashcards.wiki.git` into the scratchpad and update:
  - `Status` (shipped change, #12, its PRs, date);
  - `Changelog` (new entry at the top);
  - `Development-Workflow` (squash into `dev`, merge commit for release PRs, `Refs`/`Closes` usage, versioning tags);
  - `Architecture` (07-cicd summary);
  - `Decisions` (custom tag-based versioning over Changesets, release-please and semantic-release; merge commits for release PRs; with links to #12).

  Each page keeps its purpose line and ends with `Last updated: <YYYY-MM-DD> by add-app-versioning (#12)`. Push with `docs(wiki): update for #12`. Verify that a fresh clone shows the changes on all five pages, and list them in the issue's progress comment.
