# issue-driven-workflow Specification

## Purpose

Makes GitHub issues the single source of truth for all OpenSpec work: every concrete change is gated by, linked to, and tracked on a well-defined issue from explore through archive.

## Requirements

### Requirement: Issue format
Every issue that tracks work SHALL contain exactly three sections, `## Motivation`, `## Description` and `## Acceptance Criteria`, in that order, and none of them SHALL be empty. Acceptance Criteria SHALL contain at least one item, and every item SHALL be a Markdown checkbox (`- [ ]`) that names a verifiable outcome: a command and its expected result, an observable behavior, or a measurable value. Vague wording such as "works well", "is clean" or "is fast" without a measure SHALL NOT be used as a criterion. Out-of-scope notes SHALL go inside Description, not in an extra section.

#### Scenario: Well-formed issue
- **WHEN** an issue is drafted for concrete work
- **THEN** it has the Motivation, Description and Acceptance Criteria sections, all non-empty, with at least one checkbox criterion that is verifiable

#### Scenario: Vague acceptance criterion
- **WHEN** a drafted acceptance criterion reads like "the page works well"
- **THEN** the criterion is rewritten into a verifiable outcome before the issue is created or updated

#### Scenario: Issue created in the GitHub web UI
- **WHEN** a user opens "New issue" in the repository on GitHub
- **THEN** a form is shown with required Motivation, Description and Acceptance Criteria fields, and no option to open a blank issue is offered

### Requirement: Issue creation requires approval
An issue SHALL NOT be created or edited on GitHub until its full title and body have been shown to the user and the user has approved them.

#### Scenario: Drafting a new issue
- **WHEN** concrete work has no matching issue
- **THEN** an issue is drafted in the required format and shown to the user, and it is created only after the user approves it

### Requirement: Explore links an issue once work is concrete
During explore, an issue SHALL be required only once the discussion turns into concrete work, meaning a feature, fix, refactor or other change that will be proposed. Open-ended discussion SHALL NOT require an issue. When the work is concrete, an existing matching issue SHALL be linked and read as context. If no issue exists, one SHALL be drafted and created under the approval rule before the work moves to propose.

#### Scenario: Open-ended exploration
- **WHEN** explore is used to compare options or think through a question with no committed work
- **THEN** no issue is required

#### Scenario: Exploration becomes concrete with an existing issue
- **WHEN** explore converges on work that a matching open issue already describes
- **THEN** that issue is linked and its content is treated as the source of truth for the discussion

#### Scenario: Exploration becomes concrete without an issue
- **WHEN** explore converges on concrete work and no matching issue exists
- **THEN** an issue is drafted in the required format and created only after the user approves it, before any proposal is made

### Requirement: Propose requires a linked issue
A change SHALL NOT be scaffolded until it is linked to an open issue that satisfies the issue format. The first line of the change's `proposal.md` SHALL be `Issue: #N`, where N is the linked issue number. After the proposal artifacts are created, a comment SHALL be posted on the issue naming the change and its location.

#### Scenario: Propose with a valid issue
- **WHEN** a change is proposed for issue #N, which satisfies the issue format
- **THEN** the change is scaffolded, `proposal.md` begins with `Issue: #N`, and a comment on #N names the change

#### Scenario: Propose without an issue
- **WHEN** a change is proposed and no linked issue exists
- **THEN** no change is scaffolded; an issue is drafted and created only after the user approves it, and only then does the proposal proceed

#### Scenario: Propose against a malformed issue
- **WHEN** a change is proposed for an issue that does not satisfy the issue format
- **THEN** a corrected issue body is proposed to the user and applied only after approval, before the change is scaffolded

### Requirement: Proposal stays consistent with its issue
Proposal artifacts SHALL NOT claim scope or acceptance outcomes that the linked issue does not contain, and every acceptance criterion in the issue SHALL be covered by at least one task in `tasks.md`.

#### Scenario: Tasks cover acceptance criteria
- **WHEN** `tasks.md` is written for a change linked to issue #N
- **THEN** each acceptance criterion of #N is covered by at least one task

### Requirement: Apply follows the issue
Before implementation starts, apply SHALL read the linked issue, and the issue SHALL take precedence over the change artifacts. If work reveals a needed change to scope or acceptance criteria, implementation SHALL stop, an edit to the issue SHALL be proposed to the user, and the edit SHALL be applied only after approval. The change artifacts SHALL be updated to match afterwards, and implementation SHALL resume only then.

#### Scenario: Apply reads the issue first
- **WHEN** apply starts for a change linked to issue #N
- **THEN** issue #N is read before any task is implemented

#### Scenario: Scope change discovered during apply
- **WHEN** implementation reveals that an acceptance criterion or the described scope must change
- **THEN** work stops, the proposed issue edit is shown to the user, the issue is updated only after approval, the change artifacts are then updated to match, and implementation resumes

#### Scenario: Artifacts conflict with the issue
- **WHEN** a change artifact contradicts the linked issue
- **THEN** the issue is treated as correct and the conflict is reported before implementation continues

### Requirement: Apply tracks progress on the issue
During apply, each acceptance criterion checkbox on the linked issue SHALL be ticked as soon as that criterion is verified, without asking for approval. Verification means running the command or observing the behavior the criterion names. At the end of each apply session, a progress comment SHALL be posted on the issue, without asking for approval, listing the criteria verified, the tasks completed and what remains.

#### Scenario: Criterion verified
- **WHEN** an acceptance criterion has been verified during apply
- **THEN** its checkbox on the issue is ticked without a confirmation prompt

#### Scenario: Criterion not yet verified
- **WHEN** the tasks related to a criterion are done but the criterion has not been verified
- **THEN** its checkbox stays unticked

#### Scenario: Apply session ends
- **WHEN** an apply session finishes or pauses
- **THEN** a progress comment is posted on the issue summarizing verified criteria, completed tasks and remaining work

### Requirement: Archive gates on the issue
Archive SHALL NOT proceed while any acceptance criteria checkbox on the linked issue is unticked, and it SHALL report which criteria are still open. When archive proceeds, a summary comment SHALL be posted on the issue describing what shipped and where the change was archived. Archive SHALL NOT close the issue.

#### Scenario: Archive with open criteria
- **WHEN** archive is requested and the linked issue has at least one unticked acceptance criterion
- **THEN** archive stops and lists the unticked criteria

#### Scenario: Archive with all criteria ticked
- **WHEN** archive is requested and every acceptance criterion on the linked issue is ticked
- **THEN** the change is archived, a summary comment is posted on the issue, and the issue stays open

### Requirement: Issues close through pull requests
Every pull request that delivers a change SHALL include `Closes #N` for its linked issue in the body, so the issue closes when the PR merges into `dev`, the default branch. If a change ships without a pull request, the user SHALL be asked before the issue is closed.

#### Scenario: PR delivers the change
- **WHEN** a pull request is opened for a change linked to issue #N
- **THEN** its body contains `Closes #N`, and squash-merging it into `dev` closes #N

#### Scenario: Change shipped without a PR
- **WHEN** an archived change reached the main branch without a pull request
- **THEN** the user is asked whether to close the linked issue, and it is closed only on their approval

### Requirement: Commit and PR attribution
Commit messages SHALL follow Conventional Commits (`type(scope): summary`). Commits and pull requests SHALL be authored only by the repository owner. They SHALL NOT include a Claude `Co-Authored-By` trailer or a "Generated with Claude Code" line.

#### Scenario: Claude creates a commit
- **WHEN** Claude commits work in this repository
- **THEN** the message is a Conventional Commit, the author is the repository owner, and the message contains no `Co-Authored-By` trailer for Claude

#### Scenario: Claude opens a pull request
- **WHEN** Claude opens a pull request in this repository
- **THEN** the PR title is a Conventional Commit summary and the body contains no "Generated with Claude Code" line

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
