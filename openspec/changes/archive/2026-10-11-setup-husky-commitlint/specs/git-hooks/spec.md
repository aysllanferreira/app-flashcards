## Purpose

Local Git hooks that reject commit messages that are not Conventional Commits and pushes that target the protected `dev` and `main` branches, so mistakes fail on the developer's machine before reaching GitHub.

## ADDED Requirements

### Requirement: Hooks are installed by dependency installation
Running `pnpm install` at the repository root SHALL install the project's Git hooks, so that `git config core.hooksPath` reports the hooks directory `.husky/_`. Installed dependencies SHALL NOT be tracked by Git.

#### Scenario: Fresh clone installs hooks
- **WHEN** a developer clones the repository and runs `pnpm install` at the root
- **THEN** the command exits with code 0
- **AND** `git config core.hooksPath` prints `.husky/_`

#### Scenario: Installed dependencies stay untracked
- **WHEN** `pnpm install` has completed
- **THEN** `git status` shows no `node_modules` entries

### Requirement: Commit messages must follow Conventional Commits
A commit SHALL be rejected when its message does not follow Conventional Commits (`type(scope): summary`, with the scope optional), and SHALL be accepted when it does. A rejected commit SHALL exit non-zero, print the reason, and create no commit.

#### Scenario: Non-conventional message is rejected
- **WHEN** a developer runs `git commit --allow-empty -m "bad message"`
- **THEN** the command exits non-zero
- **AND** it prints a commitlint error explaining which rule failed
- **AND** no commit is created

#### Scenario: Conventional message is accepted
- **WHEN** a developer runs `git commit --allow-empty -m "chore: verify commitlint"`
- **THEN** the command exits with code 0 and the commit is created

### Requirement: Pushes to protected branches are rejected locally
A push SHALL be rejected before any data is sent when any remote ref it would update is `refs/heads/dev` or `refs/heads/main`. The decision SHALL be based on the remote refs being updated, not on the name of the current local branch. The rejection message SHALL name the protected branch. Pushes that update only other branches SHALL be allowed.

#### Scenario: Push to dev is rejected
- **WHEN** a developer runs `git push origin HEAD:dev`
- **THEN** the command exits non-zero with a message from the pre-push hook naming `dev`
- **AND** the remote `dev` branch points to the same commit as before the attempt

#### Scenario: Push to main is rejected
- **WHEN** a developer runs `git push origin HEAD:main`
- **THEN** the command exits non-zero with a message from the pre-push hook naming `main`
- **AND** the remote `main` branch points to the same commit as before the attempt

#### Scenario: Push from a feature branch to a protected ref is rejected
- **WHEN** a developer on branch `feat/x` runs `git push origin feat/x:dev`
- **THEN** the push is rejected with a message naming `dev`, even though the current branch is not `dev`

#### Scenario: Push to a feature branch is allowed
- **WHEN** a developer runs `git push -u origin feat/husky-installation`
- **THEN** the pre-push hook allows the push and the command exits with code 0
