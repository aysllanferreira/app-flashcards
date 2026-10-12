## 1. CLAUDE.md sub-issue rules (issue #22, AC 1 and 2)

- [x] 1.1 Add a `### Sub-issues and integration branches` subsection at the end of `## Issue-driven workflow` in `CLAUDE.md`, after `### Archive` (design.md, decisions 1–3 and 6–7). It states:
  - **Default.** One issue with one PR into `dev` stays the default. The user chooses sub-issues during explore or propose, when a change is too large for one reviewable PR.
  - **Issues.**
    - A parent issue plus one sub-issue per slice, each in the issue format and each created only after approval.
    - Sub-issues are created with `gh issue create --parent <parent>`.
    - The parent's criteria cover integration (the whole branch passes, specs, wiki); each sub-issue's criteria cover its slice.
  - **Change.**
    - One OpenSpec change is linked to the parent.
    - `proposal.md` has `Issue: #P` on line 1 and `Sub-issues: #S1, #S2, ...` on line 2, in delivery order.
    - The propose comment goes on the parent.
  - **Tasks.**
    - One task group per sub-issue, in delivery order, whose heading names that sub-issue's criteria (for example "(issue #S1, AC 1 and 2)").
    - Each group ends with tasks that:
      - push the sub-branch;
      - open a PR into the integration branch with `Refs #S`;
      - post a progress comment on the sub-issue;
      - stop until the user confirms the merge (verified with `gh pr view <n> --json state` showing `MERGED`).
    - A final group opens the PR from the integration branch into `dev` (with `Closes` for the parent and every sub-issue), then holds the wiki task.
  - **Apply.** Before each group, read the parent and that group's sub-issue. Tick each criterion on the issue that holds it, and end the session at each stop task.
  - **Archive.**
    - Waits until every criterion on the parent and on every sub-issue is ticked.
    - The summary comment goes on the parent.
    - Archive and the wiki land on the integration branch, the head of the final PR, before it merges.

  Verify that `grep -n "^### Sub-issues and integration branches" CLAUDE.md` prints a line number between those of `^## Issue-driven workflow` and `^## System design`, and that `grep -n "gh issue create --parent" CLAUDE.md`, `grep -n "Sub-issues: #S1" CLAUDE.md` and `grep -n "Refs #S" CLAUDE.md` each match inside it. Tick AC 1 and AC 2.

## 2. Branch and pull request exceptions (issue #22, AC 3)

- [x] 2.1 In `CLAUDE.md` `### Branches and merging`:
  - Qualify the "Every feature PR targets `dev`" bullet with the sub-issue exception.
  - Add a bullet on integration branches:
    - cut from `dev` and pushed before the first sub-PR;
    - sub-PRs target it and the user squash-merges them;
    - when `dev` moves, `dev` is merged into it (never rebased);
    - it reaches `dev` through one normal feature PR (squash merge, one version bump);
    - see "Sub-issues and integration branches".

  Verify that `sed -n '/^### Branches and merging/,/^### Versioning/p' CLAUDE.md | grep -c "integration branch"` prints at least 2 and that the section still says feature PRs into `dev` are squash-merged.
- [x] 2.2 In `CLAUDE.md` `### Pull requests`, add a bullet: a sub-PR into an integration branch uses `Refs #S` and no `Closes`, and the final PR from the integration branch into `dev` lists `Closes #P` and `Closes #S` for every sub-issue. Verify that `sed -n '/^### Pull requests/,$p' CLAUDE.md | grep -n "Refs #S"` matches. Tick AC 3.

## 3. OpenSpec config (issue #22, AC 4)

- [x] 3.1 In `openspec/config.yaml`:
  - Add one sentence to `context`: large changes may ship as sub-issues through an integration branch (see "Sub-issues and integration branches" in `CLAUDE.md`).
  - Add a `rules.proposal` entry: when the change ships as sub-issues, line 1 is `Issue: #P` (the parent) and line 2 is `Sub-issues: #S1, #S2, ...` in delivery order.
  - Add a `rules.tasks` entry: one task group per sub-issue in delivery order, each ending with the push, sub-PR (`Refs #S`, base = integration branch), progress-comment and wait-for-merge tasks, plus a final group for the PR into `dev` (`Closes` for the parent and every sub-issue) and the wiki task.
  - Add an `operations.apply.guidance` entry: before each group, read the parent and that sub-issue; tick each criterion on the issue that holds it; after opening a sub-PR, comment on the sub-issue and stop until the user confirms the merge; cut the next sub-branch from the updated integration branch; merge `dev` into the integration branch when `dev` moves.
  - Add an `operations.archive.guidance` entry: do not archive while any criterion on the parent or on any sub-issue is unticked; post the summary on the parent; archive on the integration branch before the final PR merges.

  Verify that `openspec instructions proposal --change support-sub-issue-delivery --json | jq -r '.rules[]' | grep "Sub-issues:"` and `openspec instructions tasks --change support-sub-issue-delivery --json | jq -r '.rules[]' | grep "Refs #S"` each print the new rule, and that `sed -n '/^operations:/,$p' openspec/config.yaml | grep -ci "sub-issue"` prints at least 2. Tick AC 4.

## 4. Pull request template (issue #22, AC 5)

- [x] 4.1 In `.github/pull_request_template.md`, keep `Closes #` as the first line and add an HTML comment right after it. The comment says that a sub-PR into an integration branch replaces it with `Refs #S`, and that the final PR from an integration branch lists `Closes #P` and a `Closes #S` line for every sub-issue. Verify that `head -1 .github/pull_request_template.md` prints `Closes #` and `grep -c "Refs #S" .github/pull_request_template.md` prints at least 1. Tick AC 5.

## 5. Spec delta (issue #22, AC 6)

- [x] 5.1 Run `openspec validate support-sub-issue-delivery --strict` and fix any finding. Verify that it exits 0.
- [x] 5.2 Sync the delta into the main specs with `/opsx:sync`. Verify that `openspec/specs/issue-driven-workflow/spec.md` has `### Requirement: Sub-issues delivered through an integration branch` with the scenarios "Sub-PR is opened", "Final PR into dev" and "Archive with an open sub-issue criterion", that "Issues close through pull requests" and "Branching and squash merges" carry the sub-PR wording, and that `openspec validate issue-driven-workflow --type spec --strict` exits 0. Tick AC 6.

## 6. Commit and pull request (issue #22, AC 1 to 6)

- [x] 6.1 Confirm the system design is unchanged (proposal.md: "System design: no change"). Verify that `git diff --stat dev -- system-design/` prints nothing.
- [x] 6.2 Commit on `chore/sub-issue-delivery` with a Conventional Commit message, authored by the repo owner with no Claude attribution. Push, and open a PR to `dev` titled `chore(openspec): deliver large changes as sub-issues merged through an integration branch` with `Closes #22` in the body. Verify that `gh pr view --json baseRefName,body` shows `dev` and contains `Closes #22`, and that `git log dev..HEAD --format=%B | grep -ci "co-authored-by"` prints 0.

## 7. GitHub Wiki (issue #22, AC 7)

- [x] 7.1 After the PR is open, clone `https://github.com/aysllanferreira/app-flashcards.wiki.git` into the scratchpad and update:
  - `Development-Workflow`: a "Sub-issues and integration branches" subsection with the flow (parent and sub-issues, sub-PRs into the integration branch with `Refs`, stop after each, final PR into `dev` closing all), a row in the "Branches, commits and pull requests" table, and a link in Contents;
  - `Decisions`: large changes may ship as sub-issues through an integration branch, with one OpenSpec change on the parent, `Refs` on sub-PRs and `Closes` for all on the final PR; linked to #22;
  - `Status`: #22 in review with its PR;
  - `Changelog`: a new entry at the top.

  Each page keeps its purpose line and ends with `Last updated: <YYYY-MM-DD> by support-sub-issue-delivery (#22)`. Push with `docs(wiki): update for #22`. Verify that a fresh clone shows the changes on all four pages, and list them in the issue's progress comment. Tick AC 7.
