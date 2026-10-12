## MODIFIED Requirements

### Requirement: Branching and squash merges
Feature pull requests SHALL target `dev`, which is the repository's default branch, and SHALL be merged only by squash merge. The squash commit title SHALL be the PR title followed by the PR number in the form `(#N)`. `main` SHALL be the release branch: the only pull requests that target it SHALL be release pull requests from `dev`, and they SHALL be merged only with a merge commit whose title is the PR title. Feature pull requests SHALL NOT target `main`.

#### Scenario: PR is opened
- **WHEN** a pull request is opened for a change
- **THEN** its base branch is `dev`

#### Scenario: PR is merged
- **WHEN** a pull request titled `chore(openspec): enforce issue-driven workflow` with number 3 is merged
- **THEN** it is squash-merged into `dev` as a single commit titled `chore(openspec): enforce issue-driven workflow (#3)`

#### Scenario: Other merge methods
- **WHEN** someone tries to merge a pull request into `dev` with a merge commit or a rebase
- **THEN** GitHub rejects it, because the `dev` ruleset allows only squash merges

#### Scenario: Release PR is merged
- **WHEN** a release pull request from `dev` into `main` is merged
- **THEN** it is merged with a merge commit, and afterwards `git merge-base --is-ancestor origin/dev origin/main` exits 0

#### Scenario: Other merge methods into main
- **WHEN** someone tries to squash or rebase a pull request into `main`
- **THEN** GitHub rejects it, because the `main` ruleset allows only merge commits
