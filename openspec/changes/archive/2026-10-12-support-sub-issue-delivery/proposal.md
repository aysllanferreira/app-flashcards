Issue: #22

## Why

Every change ships as one issue and one PR into `dev`. That breaks down for large changes: the API foundation (#23) would be one PR spanning module layout, Zod validation, Swagger, a committed OpenAPI contract and conventions, with no review checkpoints along the way. Splitting it under today's rules fails in three places:
- `CLAUDE.md` says every feature PR targets `dev`.
- `Closes #N` only fires when a PR merges into the default branch.
- OpenSpec assumes one issue per change for ticking and for the archive gate.

The rules need to exist before #23's first sub-PR.

## What Changes

An optional delivery mode for large changes. One issue with one PR into `dev` stays the default; the user chooses sub-issues during explore or propose.

- **Issues**:
  - a parent issue plus sub-issues, each in the issue format and approved before it is created;
  - sub-issues are created with `gh issue create --parent <parent>`;
  - the parent's criteria cover integration, and each sub-issue's criteria cover its own slice.
- **OpenSpec**:
  - one change is linked to the parent: `proposal.md` line 1 is `Issue: #P`, line 2 is `Sub-issues: #S1, #S2, ...`;
  - `tasks.md` has one task group per sub-issue, in delivery order, each heading naming that sub-issue's criteria;
  - each group ends by pushing the sub-branch, opening a PR into the integration branch with `Refs #S`, posting a progress comment on the sub-issue, and stopping until the user says the PR is merged;
  - a final group opens the PR from the integration branch into `dev` and holds the wiki and archive tasks.
- **Branches**:
  - the integration branch is cut from `dev` and pushed before the first sub-PR;
  - each sub-branch is cut from the latest integration branch, and the user squash-merges its PR;
  - if `dev` moves, `dev` is merged into the integration branch (no rebase);
  - the final PR into `dev` is a normal feature PR: squash merge, one version bump.
- **Closing**: sub-PRs use `Refs #S`. The final PR lists `Closes #P` and `Closes #S` for every sub-issue.
- **Apply**: before each group, read the parent and that sub-issue. Tick each criterion on the issue that holds it.
- **Archive**:
  - waits until every criterion on the parent and every sub-issue is ticked;
  - the summary comment goes on the parent;
  - archive and wiki land on the integration branch before the final PR merges.
- **Files**:
  - `CLAUDE.md`: a new "Sub-issues and integration branches" subsection, plus the exceptions in "Branches and merging" and "Pull requests";
  - `openspec/config.yaml`: proposal and tasks rules, apply and archive guidance;
  - `.github/pull_request_template.md`.

System design: no change. This change edits workflow rules only. No service, flow, data model or CI/CD step in `system-design/` changes: sub-PRs into an integration branch run no workflow, and the final PR into `dev` follows the existing CI/CD path.

## Capabilities

### New Capabilities
<!-- None. -->

### Modified Capabilities
- `issue-driven-workflow`:
  - adds a requirement for sub-issues delivered through an integration branch (issues, change linking, task groups and stops, apply ticking, archive gate);
  - changes "Issues close through pull requests" so sub-PRs use `Refs` and the final PR closes the parent and every sub-issue;
  - changes "Branching and squash merges" so sub-PRs may target an integration branch.

## Impact

- **Modified files**:
  - `CLAUDE.md`: Issue-driven workflow, Branches and merging, Pull requests;
  - `openspec/config.yaml`: `rules.proposal`, `rules.tasks`, `operations.apply.guidance`, `operations.archive.guidance`;
  - `.github/pull_request_template.md`.
- **Specs**: `openspec/specs/issue-driven-workflow/spec.md`, synced at archive.
- **Wiki**: Development-Workflow, Decisions, Status, Changelog.
- **Unchanged**: the default one-issue, one-PR flow; the `dev` and `main` rulesets; the `versioning` workflow; husky hooks; the generated `.claude/skills/openspec-*` and `.claude/commands/opsx/*` files.
- **First user**: #23 (`add-api-foundation`) with sub-issues #24–#28 on `feat/nestjs-setup`, once this change has merged.
- **Out of scope**: GitHub rulesets for integration branches, and automation that creates sub-issues or PRs.
