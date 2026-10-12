## ADDED Requirements

### Requirement: Sub-issues delivered through an integration branch
A change SHALL ship as one issue and one pull request into `dev` unless the user chooses, during explore or propose, to split it into sub-issues delivered through an integration branch.

When the user chooses sub-issues:
- **Issues.** There SHALL be one parent issue and one sub-issue per slice, each in the issue format and each created only after approval. Sub-issues SHALL be attached to the parent with `gh issue create --parent <parent>`. The parent's criteria cover integration of the whole change; each sub-issue's criteria cover its slice.
- **Change.** Exactly one OpenSpec change SHALL be linked to the parent. Its `proposal.md` SHALL have `Issue: #P` on line 1 and `Sub-issues: #S1, #S2, ...` on line 2, listing every sub-issue in delivery order.
- **Tasks.** `tasks.md` SHALL have one task group per sub-issue, in delivery order, whose heading names that sub-issue's criteria. Each group SHALL end with tasks that push the sub-branch, open a pull request into the integration branch with `Refs #S`, post a progress comment on the sub-issue, and stop until the user confirms the merge. A final task group SHALL open the pull request from the integration branch into `dev` and hold the wiki and archive tasks.
- **Branches.** The integration branch SHALL be cut from `dev` and pushed before the first sub-PR. Each sub-branch SHALL be cut from the latest integration branch. The user SHALL squash-merge each sub-PR into the integration branch. When `dev` moves, `dev` SHALL be merged into the integration branch, never rebased onto it.
- **Apply.** Before working on a task group, apply SHALL read the parent issue and that group's sub-issue. Each criterion SHALL be ticked on the issue that holds it.
- **Archive.** Archive SHALL NOT proceed while any criterion on the parent or on any sub-issue is unticked. The archive summary comment SHALL be posted on the parent. Archive and the wiki update SHALL land on the integration branch before the final pull request is merged.

#### Scenario: Proposing a change with sub-issues
- **WHEN** the user chooses sub-issues for parent issue #P with sub-issues #S1 and #S2
- **THEN** one change is scaffolded, its `proposal.md` starts with `Issue: #P` followed by `Sub-issues: #S1, #S2`, and `tasks.md` has a task group for #S1, then one for #S2, then a final group for the pull request into `dev`

#### Scenario: Sub-PR is opened
- **WHEN** apply finishes the tasks of the group for sub-issue #S1
- **THEN** a pull request is opened from the sub-branch into the integration branch with `Refs #S1` and no `Closes` line in its body, a progress comment is posted on #S1, and apply stops until the user says the pull request is merged

#### Scenario: Next sub-issue starts
- **WHEN** the user confirms that the sub-PR for #S1 is merged
- **THEN** the next sub-branch is cut from the updated integration branch, and #P and #S2 are read before any task in #S2's group is implemented

#### Scenario: dev moves during delivery
- **WHEN** a commit lands on `dev` while sub-PRs are still being delivered
- **THEN** `dev` is merged into the integration branch, and the integration branch is not rebased

#### Scenario: Final PR into dev
- **WHEN** every sub-PR has been merged into the integration branch
- **THEN** a pull request from the integration branch into `dev` is opened with a Conventional Commit title and `Closes #P`, `Closes #S1` and `Closes #S2` in its body, and squash-merging it closes all three issues

#### Scenario: Archive with an open sub-issue criterion
- **WHEN** archive is requested and every criterion on #P is ticked but one criterion on #S2 is not
- **THEN** archive stops and lists the unticked criterion on #S2

#### Scenario: Default delivery
- **WHEN** the user does not choose sub-issues
- **THEN** the change has one linked issue and ships in one pull request into `dev` with `Closes #N`

## MODIFIED Requirements

### Requirement: Issues close through pull requests
Every pull request that delivers a change into `dev` SHALL include `Closes #N` for its linked issue in the body, so the issue closes when the PR merges into `dev`, the default branch. When a change is delivered through sub-issues, a pull request into the integration branch SHALL reference its sub-issue with `Refs #S` and SHALL NOT use `Closes`, and the final pull request from the integration branch into `dev` SHALL include `Closes` for the parent issue and for every sub-issue. If a change ships without a pull request, the user SHALL be asked before the issue is closed.

#### Scenario: PR delivers the change
- **WHEN** a pull request is opened for a change linked to issue #N
- **THEN** its body contains `Closes #N`, and squash-merging it into `dev` closes #N

#### Scenario: Sub-PR into the integration branch
- **WHEN** a pull request delivers sub-issue #S into an integration branch
- **THEN** its body contains `Refs #S` and no `Closes` line, and #S stays open after it merges

#### Scenario: Final PR closes the parent and its sub-issues
- **WHEN** the pull request from an integration branch into `dev` is opened for parent issue #P
- **THEN** its body contains `Closes #P` and a `Closes` line for every sub-issue of #P, and squash-merging it into `dev` closes all of them

#### Scenario: Change shipped without a PR
- **WHEN** an archived change reached the main branch without a pull request
- **THEN** the user is asked whether to close the linked issue, and it is closed only on their approval

### Requirement: Branching and squash merges
Feature pull requests SHALL target `dev`, which is the repository's default branch, and SHALL be merged only by squash merge. The squash commit title SHALL be the PR title followed by the PR number in the form `(#N)`. The only exception SHALL be pull requests for sub-issues: they target the change's integration branch, which is cut from `dev`, and the user squash-merges them there. The integration branch itself reaches `dev` through one feature pull request. `main` SHALL be the release branch: the only pull requests that target it SHALL be release pull requests from `dev`, and they SHALL be merged only with a merge commit whose title is the PR title. Feature pull requests SHALL NOT target `main`.

#### Scenario: PR is opened
- **WHEN** a pull request is opened for a change that is not split into sub-issues
- **THEN** its base branch is `dev`

#### Scenario: Sub-PR is opened
- **WHEN** a pull request is opened for a sub-issue
- **THEN** its base branch is the change's integration branch, not `dev` or `main`

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
