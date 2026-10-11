## 1. CLAUDE.md workflow rules (issue #2, AC 1, 7 and 8)

- [x] 1.1 Create root `CLAUDE.md` with an "Issue-driven workflow" section. It states the issue as the source of truth and the issue format and quality rules: exactly Motivation / Description / Acceptance Criteria, none empty, at least one verifiable checkbox criterion, no vague wording, out-of-scope inside Description. Verify by reading the file and checking each spec requirement "Issue format" rule is present.
- [x] 1.2 Add the phase rules to `CLAUDE.md`. Verify that each spec requirement maps to a rule in the file:
  - explore: an issue only once the work is concrete;
  - propose: a linked issue is required, `proposal.md` line 1 is `Issue: #N`, and a link comment is posted;
  - apply: read the issue first; a scope change means stop, propose the issue edit, get approval, then update the artifacts; tick criteria automatically; post a progress comment each session;
  - archive: gate on all criteria ticked, post a summary comment, never close the issue;
  - PR: `Closes #N`; when there is no PR, ask before closing.
- [x] 1.3 Add the approval split and `gh` usage to `CLAUDE.md`. Verify it lists what needs approval (create an issue, edit issue text), what is automatic (tick a checkbox, comment), and the rule to fetch the issue body fresh before every edit.
- [x] 1.4 Add a "Commits and pull requests" section to `CLAUDE.md`. It covers: Conventional Commits; owner-only authorship with no Claude `Co-Authored-By` trailer and no "Generated with Claude Code" line; PRs target `dev` and are squash-merged with commit title `<PR title> (#N)`; `main` is the release branch. Verify each rule is present with grep.

## 2. OpenSpec config (issue #2, AC 2, 3 and 8)

- [x] 2.1 Replace the commented `openspec/config.yaml` with `schema: spec-driven` plus a short `context` describing the project and the issue-driven workflow, with a pointer to `CLAUDE.md`. Verify that `openspec context --json` and `openspec list --json` run without config warnings.
- [x] 2.2 Add `rules.proposal` (line 1 must be `Issue: #N`; the proposal must not exceed the issue's scope) and `rules.tasks` (every acceptance criterion of the issue is covered by at least one task, and the task groups name the criteria they cover). Verify that `openspec instructions proposal --change enforce-issue-driven-workflow --json` returns the `Issue: #N` rule in `rules`.
- [x] 2.3 Add `operations.apply.guidance` (read the issue first, issue-first scope changes with approval, automatic criterion ticking, progress comment per session) and `operations.archive.guidance` (gate on ticked criteria, summary comment, do not close the issue). Verify that `openspec instructions apply --change enforce-issue-driven-workflow --json` returns `operationGuidance` covering those points, with no config warnings.
- [x] 2.4 Add the branching and commit rules to the `config.yaml` context and to `operations.archive.guidance` (the PR targets `dev`, squash merge, `(#N)` in the commit title, no Claude attribution). Verify `openspec instructions archive --change enforce-issue-driven-workflow --json` returns them, with no config warnings.

## 3. GitHub templates and repository settings (issue #2, AC 4, 5 and 9)

- [x] 3.1 Create `.github/ISSUE_TEMPLATE/task.yml`, an issue form with required `textarea` fields Motivation, Description and Acceptance Criteria (Acceptance Criteria pre-filled with `- [ ] `). Verify the file parses as YAML and that each field has `validations.required: true`.
- [x] 3.2 Create `.github/ISSUE_TEMPLATE/config.yml` with `blank_issues_enabled: false`. Verify the file parses as YAML.
- [x] 3.3 Create `.github/pull_request_template.md` with a `Closes #` line and a short summary section. Verify with `grep -n "Closes #" .github/pull_request_template.md`.
- [x] 3.4 Set the repository default branch to `dev`, allow only squash merges, and set `squash_merge_commit_title=PR_TITLE` and `squash_merge_commit_message=PR_BODY`. Verify with `gh api repos/aysllanferreira/app-flashcards`.

## 4. End-to-end verification (issue #2, AC 4, 6 and 7)

- [x] 4.1 Dry run in a new Claude session: run `/opsx:propose` for a throwaway idea with no issue. Verify Claude drafts an issue in the template and asks before creating it instead of scaffolding a change. Discard the draft and leave no change directory behind.
- [ ] 4.2 Commit the work as Conventional Commits and open a PR to `dev` with `Closes #2`. Verify that `git log dev..HEAD --format=%B | grep -ci "co-authored-by"` prints 0 and that `gh pr view --json baseRefName` reports `dev`.
- [ ] 4.3 After the PR merges into `dev`, open "New issue" on GitHub. Verify the form shows the three required fields and no blank-issue option, then tick AC 4 on issue #2. The PR cannot verify this, because GitHub reads issue forms only from the default branch (`dev`).
