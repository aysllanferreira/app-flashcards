## Context

See proposal.md, Why. The rules this change touches live in three places, all read by every OpenSpec phase:

- **`CLAUDE.md`:**
  - "Issue-driven workflow" (Propose, Apply, Archive) assumes one linked issue per change;
  - "Branches and merging" says every feature PR targets `dev`;
  - "Pull requests" says the PR that completes a change has `Closes #N`, and already allows `Refs #N` for earlier PRs of a change that ships across several PRs.
- **`openspec/config.yaml`:** the `rules` (injected into `openspec instructions`) and the `operations.apply` / `operations.archive` guidance repeat those rules.
- **`.github/pull_request_template.md`:** starts with `Closes #`.

GitHub only closes an issue from a `Closes` keyword when the PR merges into the default branch (`dev`). The `dev` and `main` rulesets cover only those two branches, so an integration branch is unprotected. The `versioning` workflow runs only on pushes to `dev` and `main`.

## Goals / Non-Goals

**Goals:**
- A large change can be reviewed and merged in slices, with a checkpoint after each slice, without weakening the issue gate, the archive gate or the wiki rule.
- The rules are written once (`CLAUDE.md` subsection plus spec) and repeated as short pointers where each phase reads them (`config.yaml`, PR template).

**Non-Goals:**
- Protecting integration branches with rulesets, or automating sub-issue and PR creation.
- Editing the generated `.claude/skills/openspec-*` and `.claude/commands/opsx/*` files. They read `CLAUDE.md` and `config.yaml`, which carry the new rules.

## Decisions

1. **One OpenSpec change per parent issue, not one per sub-issue.**
   - The parent is the linked issue (`Issue: #P`), and `Sub-issues:` on line 2 names the slices.
   - *Alternative*: one change per sub-issue. Rejected because it means one archive and one wiki update per slice, and a feature's specs land in pieces while the feature is half-built.
2. **Native GitHub sub-issues (`gh issue create --parent`).**
   - The parent shows its sub-issues and their progress without editing its body.
   - *Alternative*: a task list of links in the parent body. Rejected because every update would be an issue-body edit that needs approval.
3. **Sub-PRs use `Refs #S`; the final PR closes everything.**
   - A `Closes` keyword in a PR into a non-default branch doesn't close anything, and closing sub-issues by hand needs approval each time.
   - Listing `Closes` for the parent and every sub-issue in the final PR closes them all when it merges into `dev`. This mirrors the existing "earlier PRs use `Refs`" rule.
4. **`dev` is merged into the integration branch, never rebased.**
   - Sub-branches are cut from the integration branch, so rewriting its history would break open sub-PRs and force-pushes.
   - The final PR into `dev` is squash-merged, so the merge commits from `dev` never reach `dev`'s history.
5. **Sub-PRs are squash-merged by the user.**
   - One commit per sub-issue keeps the integration branch readable.
   - The final squash into `dev` produces one commit and one version bump either way.
   - *Alternative*: merge commits for sub-PRs. Not harmful, but noisier, and there is no ruleset to enforce either method (non-goal).
6. **Stop points are tasks, so a resumed apply knows where it is.**
   - Each sub-issue's group ends with three tasks:
     - open the sub-PR (`Refs #S`, base = integration branch);
     - post a progress comment on the sub-issue;
     - wait for the user to confirm the merge, verified with `gh pr view <n> --json state` returning `MERGED`.
   - Apply ends its session at that last task. The next `/opsx:apply` resumes at the first unchecked task, which cuts the next sub-branch.
7. **Archive and wiki ride on the final PR.**
   - After the last sub-PR merges, the final PR into `dev` is opened.
   - The wiki records it as in review, and the archive commit is pushed directly onto the integration branch, which is the final PR's head. This is the same "archive before merge" pattern single-PR changes use today.
   - It isn't routed through another sub-PR, because archive belongs to the parent, not to a slice.
8. **Where the rules go:**
   - `CLAUDE.md`: a new `### Sub-issues and integration branches` subsection at the end of "Issue-driven workflow" holds the full rules. "Branches and merging" and "Pull requests" each gain one bullet stating the exception and pointing to it.
   - `openspec/config.yaml`:
     - one `rules.proposal` entry (the `Sub-issues:` line);
     - one `rules.tasks` entry (groups, stop tasks, final group);
     - one `operations.apply.guidance` entry (read parent and sub-issue, tick where the criterion lives, stop after each sub-PR);
     - one `operations.archive.guidance` entry (every sub-issue ticked, summary on the parent);
     - one sentence in `context`.
   - `.github/pull_request_template.md`: keeps `Closes #` as its first line and gains a comment explaining the sub-PR and final-PR variants.

## Risks / Trade-offs

- **[The integration branch drifts from `dev`]** → Merge `dev` into it whenever `dev` moves (decision 4). Nothing else is in flight today, so the first use (#23) should see little drift.
- **[An integration branch is unprotected, so a sub-PR could be merged with any method, or pushed to directly]** → Accepted for now (rulesets are out of scope). The user merges every sub-PR, and the final PR into `dev` still goes through the `dev` ruleset.
- **[Sub-issues stay open until the final merge, so the parent's sub-issue progress reads 0 of N throughout]** → Ticked criteria and the progress comment on each sub-issue show the real state. The wiki Status page lists the change as in flight.
- **[The final PR is large]** → It's the sum of sub-PRs already reviewed. Its own new content is the archive, the spec sync and the wiki links.
- **[Generated opsx skills don't mention sub-issues]** → `CLAUDE.md` overrides the skills where it is stricter, and the `config.yaml` rules are injected into `openspec instructions`, so every phase sees them.

## Migration Plan

No migration. The rules apply to changes proposed after this one merges. Existing archived changes and the default one-issue, one-PR flow are untouched. The first use is #23 (`add-api-foundation`, sub-issues #24–#28, integration branch `feat/nestjs-setup`). Rollback is reverting the squash commit.
