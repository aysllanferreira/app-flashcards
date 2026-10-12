Issue: #12

## Why

api and web deploy independently, but nothing records which version of each app is on `dev` or released: there are no tags, no release notes, and the `package.json` versions never change. That leaves no answer to "what is running", "what changed since the last release" or "what do we roll back to". Release PRs from `dev` to `main` can also only be squash-merged today, so `main` never contains `dev`'s commits, and every release PR after the first would list and diff the whole history since the initial commit. Both problems have to be solved before the first release to `main`.

## What Changes

- Add independent Semantic Versioning for `api` and `web`, stored only in git tags (`api@X.Y.Z`, `web@X.Y.Z`). No workflow ever commits to `dev` or `main`, so the rulesets need no bypass.
- Add a versioning script in a new `tooling/versioning` workspace package, with unit tests run by `pnpm test`:
  - **Push to `dev`:** `turbo ls --affected` between the previous and the new commit picks the affected apps. Each affected app gets a dev prerelease tag `<app>@<next>-dev.<n>` and a GitHub prerelease. The bump comes from the squash commit's Conventional Commit type: breaking is major (minor while the major version is 0), `feat` is minor, any other type is patch. Within a dev cycle the bump only escalates.
  - **Push to `main`:** each app whose latest dev tag is newer than its last release is promoted: tag `<app>@X.Y.Z` on the merge commit and publish a GitHub Release with that cycle's notes.
- Add a GitHub Actions workflow, `.github/workflows/versioning.yml`, that runs the script on pushes to `dev` and `main`.
- **BREAKING (workflow):** release PRs `dev -> main` are merged with a merge commit. Turn merge commits on at the repo level, limit the `dev` ruleset to squash and the `main` ruleset to merge commits, and make the merge commit title the PR title. Feature PRs into `dev` stay squash-only.
- Set the `version` field of `apps/api/package.json` and `apps/web/package.json` to `0.0.0`. Tags are the only source of truth.
- Update `CLAUDE.md` ("Commits and pull requests") to match the new merge methods and the versioning flow.

Out of scope (from the issue): a PR CI workflow (lint/test/build), deploy pipelines and version-based image tags, exposing the version at runtime, hotfixes made directly on `main`, and tag-protection rulesets.

System design: update `07-cicd` (`.excalidraw` source and re-exported `.png`) and `system-design/README.md`:
- **07-cicd:** the "Branch and merge rules" box says feature PRs are squash-merged into `dev` and release PRs `dev -> main` use a merge commit. A new versioning lane shows a push to `dev` tagging `<app>@X.Y.Z-dev.N` with a GitHub prerelease, and a push to `main` promoting it to `<app>@X.Y.Z` with a GitHub Release.
- **README.md:** add a **Versioning** row to Decisions, and change the **CI/CD** row's merge wording.

## Capabilities

### New Capabilities
- `app-versioning`: how `api` and `web` get dev prerelease versions on merges into `dev` and release versions on merges into `main`, using git tags and GitHub Releases.

### Modified Capabilities
- `issue-driven-workflow`: the "Branching and squash merges" requirement changes. Feature PRs into `dev` stay squash-only, and release PRs `dev -> main` are merged with a merge commit.

## Impact

- **New files:** `tooling/versioning/` (package, script, tests), `.github/workflows/versioning.yml`.
- **Modified files:** `pnpm-workspace.yaml` (adds `tooling/*`), `pnpm-lock.yaml`, `apps/api/package.json`, `apps/web/package.json` (version `0.0.0`), `CLAUDE.md`, `system-design/07-cicd.excalidraw`, `system-design/07-cicd.png`, `system-design/README.md`.
- **GitHub settings:** repo `allow_merge_commit: true` with the merge commit title set to the PR title. `dev` ruleset `allowed_merge_methods: ["squash"]`, `main` ruleset `["merge"]`.
- **GitHub:** the workflow creates tags and releases with `GITHUB_TOKEN` (`contents: write`).
- **First run:** merging this change into `dev` changes both apps' `package.json`, so it creates `api@0.1.0-dev.1` and `web@0.1.0-dev.1` (the PR is a `feat`).
- **Wiki:** Status, Changelog, Development-Workflow, Architecture and Decisions.
