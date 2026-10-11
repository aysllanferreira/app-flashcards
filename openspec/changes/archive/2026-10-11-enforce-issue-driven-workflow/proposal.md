Issue: #2

## Why

OpenSpec changes can be proposed, applied and archived with no link to a GitHub issue, so nothing records why the work exists, what "done" means, or how far along it is. Issues also have no consistent format. GitHub issues need to become the single source of truth for every piece of work, with OpenSpec artifacts and progress kept in sync with them.

## What Changes

- Add a root `CLAUDE.md` holding the non-negotiable issue-driven workflow rules for every opsx phase:
  - **Explore**: an issue is required only once the work becomes concrete. The issue is drafted in the template and created only after the user approves it. Open-ended discussion needs no issue.
  - **Propose**: a linked issue is required before a change is scaffolded. `proposal.md` starts with `Issue: #N`, and a comment linking the change is posted on the issue.
  - **Apply**: the issue is read first. A scope or acceptance change stops the work, an issue edit is proposed for user approval, and the artifacts are then updated to match. Acceptance criteria checkboxes are ticked automatically as each one is verified, and a progress comment is posted at the end of each apply session.
  - **Archive**: blocked until every acceptance criteria checkbox is ticked. A summary comment is posted. The issue is not closed: the PR body carries `Closes #N`, and the issue closes when the PR merges. When there is no PR, the user is asked before the issue is closed.
  - **Issue quality**: exactly three sections, `Motivation`, `Description` and `Acceptance Criteria`, none empty. There must be at least one testable checkbox criterion and no vague wording. Out-of-scope notes go inside Description.
  - **Commits and PRs**: commit messages follow Conventional Commits. Commits and PRs are authored only by the repo owner, with no Claude `Co-Authored-By` trailer and no "Generated with Claude Code" line.
  - **Branching**: PRs target `dev` and are always squash-merged. The squash commit title is the conventional PR title plus `(#N)`, the PR number. `main` is the release branch.
- Fill `openspec/config.yaml` with:
  - project context;
  - artifact `rules`, so that a proposal links its issue and tasks map to the issue's acceptance criteria;
  - `operations.apply` / `operations.archive` guidance that restates the apply and archive rules.
- Add `.github/ISSUE_TEMPLATE/task.yml`, an issue form with the three sections as required fields, and `.github/ISSUE_TEMPLATE/config.yml`, which disables blank issues.
- Add `.github/pull_request_template.md` with a `Closes #` line.
- Change the repository settings:
  - `dev` becomes the default branch, so `Closes #N` and issue forms take effect on merge into `dev`.
  - Only squash merges are allowed.
  - Squash commits are titled `<PR title> (#N)`.

## Capabilities

### New Capabilities
- `issue-driven-workflow`: how GitHub issues gate and track OpenSpec work across explore, propose, apply and archive, plus the required issue format and quality rules.

### Modified Capabilities
<!-- None: no specs exist yet. -->

## Impact

- **New files**: `CLAUDE.md`, `.github/ISSUE_TEMPLATE/task.yml`, `.github/ISSUE_TEMPLATE/config.yml`, `.github/pull_request_template.md`.
- **Modified files**: `openspec/config.yaml`, which is currently comments only.
- **Unchanged**: the generated `.claude/skills/openspec-*` and `.claude/commands/opsx/*` files. Enforcement relies on `CLAUDE.md` taking precedence over skills, so it survives `openspec update`.
- **GitHub repository settings**: the default branch changes from `main` to `dev`, and merge commits and rebase merges are disabled.
- **GitHub**: issues created in the web UI must use the form. Issues created with `gh issue create` bypass forms, so the `CLAUDE.md` quality rules cover them.
- **Existing work**: issue #1 already follows the template, so no migration is needed.
- **Out of scope**: hooks or CI-based enforcement, label and title conventions.
