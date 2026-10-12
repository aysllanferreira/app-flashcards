# app-versioning Specification

## Purpose

Gives each deployable app (`api` and `web`) its own Semantic Version. A dev prerelease is created on every merge into `dev` that affects the app, and a release version on every release merge into `main`. Versions are recorded as git tags and GitHub Releases.

## Requirements

### Requirement: Versions are per-app git tags
Each app under `apps/` SHALL have its own Semantic Version, independent of the other apps. Versions SHALL be recorded only as git tags named `<app>@<version>`, where `<app>` is the app's package name, together with a GitHub Release for each tag. A dev version SHALL have the form `X.Y.Z-dev.N`, and a release version SHALL have the form `X.Y.Z`. Versioning SHALL NOT push commits to any branch. The `version` field in each app's `package.json` SHALL be `0.0.0` and SHALL NOT be used as a version.

#### Scenario: Tag names
- **WHEN** versions exist for both apps
- **THEN** `git ls-remote --tags origin` lists tags such as `api@0.2.0-dev.3`, `api@0.1.0` and `web@0.1.1-dev.1`, and no tag without an `<app>@` prefix is created by versioning

#### Scenario: No version commits
- **WHEN** versioning runs on a push to `dev` or `main`
- **THEN** the branch head after the run is the same commit that triggered it

### Requirement: Dev versions on merges into dev
When a commit lands on `dev`, every app affected by that commit SHALL get a new dev version. An app is affected when the task runner's dependency graph reports it as changed between the previous `dev` head and the new one; changes to its own files, its workspace dependencies, its installed dependencies or global configuration count. Files that do not belong to any app's dependency graph (for example `openspec/` or `system-design/`) SHALL NOT affect any app. For each affected app, a tag `<app>@X.Y.Z-dev.N` SHALL be created on the new commit, and a GitHub Release marked as prerelease SHALL be published for it.

#### Scenario: Change to one app
- **WHEN** a PR that changes only files under `apps/api` is squash-merged into `dev`
- **THEN** a tag matching `api@X.Y.Z-dev.N` points to the new `dev` commit, `gh release list` shows it as a prerelease, and no new `web@*` tag exists

#### Scenario: Change outside the apps
- **WHEN** a PR that changes only files under `openspec/` or `system-design/` is squash-merged into `dev`
- **THEN** no new tag is created

#### Scenario: Change to shared root configuration
- **WHEN** a PR that changes the root `package.json` or `pnpm-lock.yaml` in a way that affects both apps is squash-merged into `dev`
- **THEN** a new dev tag is created for both `api` and `web`

### Requirement: Bump size comes from the commit type
The size of the bump SHALL come from the Conventional Commit header and footer of the commit that landed on `dev`:
- breaking (`!` after the type or scope, or a `BREAKING CHANGE:` footer): major, or minor while the major version is 0;
- `feat`: minor;
- any other type, or a header that is not a Conventional Commit: patch.

The candidate version SHALL be the app's last release version (`0.0.0` if it has none) bumped by that size. If the app has an open dev cycle (a latest dev version whose `X.Y.Z` is greater than its last release), the new version SHALL be the candidate with `-dev.1` when the candidate is greater than the open cycle's `X.Y.Z`. Otherwise it SHALL be the open cycle's `X.Y.Z` with `N` increased by one. Without an open dev cycle, the new version SHALL be the candidate with `-dev.1`.

#### Scenario: First version
- **WHEN** the app has no tags and a `feat` commit affecting it lands on `dev`
- **THEN** the app is tagged `<app>@0.1.0-dev.1`

#### Scenario: Patch bump
- **WHEN** the app's last release is `0.2.0`, it has no open dev cycle, and a `fix` commit affecting it lands on `dev`
- **THEN** the app is tagged `<app>@0.2.1-dev.1`

#### Scenario: Non-feature, non-fix type
- **WHEN** the app's last release is `0.2.0`, it has no open dev cycle, and a `refactor` or `chore` commit affecting it lands on `dev`
- **THEN** the app is tagged `<app>@0.2.1-dev.1`

#### Scenario: Major bump
- **WHEN** the app's last release is `1.4.2` and a commit with header `feat(api)!: drop v1 routes` affecting it lands on `dev`
- **THEN** the app is tagged `<app>@2.0.0-dev.1`

#### Scenario: Breaking change while 0.x
- **WHEN** the app's last release is `0.4.1` and a commit with a `BREAKING CHANGE:` footer affecting it lands on `dev`
- **THEN** the app is tagged `<app>@0.5.0-dev.1`

#### Scenario: Continuing a dev cycle
- **WHEN** the app's last release is `0.2.0`, its latest dev version is `0.2.1-dev.2`, and a `fix` commit affecting it lands on `dev`
- **THEN** the app is tagged `<app>@0.2.1-dev.3`

#### Scenario: Escalating a dev cycle
- **WHEN** the app's last release is `0.2.0`, its latest dev version is `0.2.1-dev.2`, and a `feat` commit affecting it lands on `dev`
- **THEN** the app is tagged `<app>@0.3.0-dev.1`

#### Scenario: Smaller bump inside a larger cycle
- **WHEN** the app's last release is `0.2.0`, its latest dev version is `0.3.0-dev.1`, and a `fix` commit affecting it lands on `dev`
- **THEN** the app is tagged `<app>@0.3.0-dev.2`

### Requirement: Release versions on merges into main
When a release PR from `dev` is merged into `main`, every app whose latest dev version has an `X.Y.Z` greater than its last release SHALL be promoted. The tag `<app>@X.Y.Z` (the dev version without its prerelease suffix) SHALL be created on the new `main` commit, and a GitHub Release, not marked as prerelease, SHALL be published with notes listing the commits of that dev cycle. Apps without a newer dev version SHALL NOT get a tag. The release version SHALL NOT be recalculated from the commits on `main`.

#### Scenario: Promote a changed app
- **WHEN** `api`'s last release is `0.1.0`, its latest dev version is `0.2.0-dev.4`, and a release PR is merged into `main`
- **THEN** `api@0.2.0` points to the new `main` commit and `gh release view api@0.2.0` shows a release that is not a prerelease

#### Scenario: Unchanged app
- **WHEN** `web`'s latest dev version is `0.1.1-dev.2` and `web@0.1.1` already exists, and a release PR is merged into `main`
- **THEN** no new `web@*` tag is created

### Requirement: Versioning is idempotent
Running versioning again for a commit that already has a version tag for an app SHALL NOT create another tag or release for that app.

#### Scenario: Re-run on dev
- **WHEN** the versioning workflow is re-run for a `dev` commit that already has `api@0.2.0-dev.3`
- **THEN** no new `api@*` tag is created and the run succeeds

#### Scenario: Re-run on main
- **WHEN** the versioning workflow is re-run for a `main` commit that already has `api@0.2.0`
- **THEN** no new `api@*` tag is created and the run succeeds

### Requirement: Version logic is unit tested
The version calculation SHALL be covered by unit tests that run as part of `pnpm test` at the repository root. The tests SHALL cover at least: first version, patch, minor, major, a breaking change while 0.x, continuing a dev cycle, escalating a dev cycle, promotion, and an app that is not affected.

#### Scenario: Root test run
- **WHEN** a developer runs `pnpm test` at the repository root
- **THEN** the command exits with code 0 and the output includes a test task for the versioning package whose tests cover each listed case
