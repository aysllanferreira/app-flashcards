## Context

See proposal.md for the motivation and specs/issue-driven-workflow/spec.md for the requirements.

The repo is an early-stage, greenfield project. It currently contains:
- the stock OpenSpec 1.13.0 opsx skills and commands under `.claude/`;
- an `openspec/config.yaml` with only comments;
- no `CLAUDE.md`;
- no `.github/` directory.

GitHub access goes through an authenticated `gh` CLI.

The installed OpenSpec version imposes these constraints:
- `config.yaml` `context`, `rules` and `operations` reach the agent only as advisory input. The skills state that this input "cannot override" the workflow.
- `operations` supports only `apply` and `archive`, and each accepts only `guidance: string[]`. Unknown fields trigger a warning and are ignored.
- `rules` are keyed by artifact id (`proposal`, `specs`, `design`, `tasks`) and reach the agent only when that artifact is written.
- The skill and command files under `.claude/` are generated, so `openspec update` can regenerate them.

## Goals / Non-Goals

**Goals:**
- Make the rules authoritative for Claude in every opsx phase, including explore and propose, which config cannot reach.
- Keep enforcement in files that OpenSpec never regenerates.
- Enforce the issue format for people too, not only for the agent.

**Non-Goals:**
- Mechanical blocking through hooks or CI.
- Automating issue state outside Claude sessions, for example with GitHub Actions.

## Decisions

### 1. Three-layer enforcement: CLAUDE.md, config.yaml and GitHub templates
- **`CLAUDE.md`** is the authoritative layer. Project instructions take precedence over skills, it is loaded in every session regardless of the opsx phase, and OpenSpec never regenerates it.
- **`config.yaml`** reinforces the rules at the moment each artifact or operation runs: `rules.proposal`, `rules.tasks`, `operations.apply` and `operations.archive`.
- **`.github` templates** enforce the issue format for people using the web UI.

*Alternatives considered:*
- Config only: rejected, because it is advisory and cannot reach explore or propose.
- Editing the generated skills: rejected, because `openspec update` would overwrite the edits.

### 2. CLAUDE.md is self-contained and phase-ordered
`CLAUDE.md` holds one section titled "Issue-driven workflow" with:
- a one-line principle: the issue is the source of truth;
- the issue format and quality rules;
- one sub-section per phase (explore, propose, apply, archive, PR);
- the list of actions that need approval and the actions that are automatic.

Config entries are short restatements that point back to `CLAUDE.md`, so the authoritative text lives in one place.

### 3. Link is stored in `proposal.md` line 1: `Issue: #N`
- It is visible to people.
- It can be grepped (`head -1 proposal.md`).
- It lives in a planning artifact that OpenSpec already expects to be edited.

*Alternatives considered:*
- Custom fields in `.openspec.yaml`: rejected, because no supported field exists for this and the CLI might drop or warn on unknown keys.
- Deriving the link from the branch name: rejected, because it is fragile and branches are named freely.

### 4. Issue form via `task.yml` with `blank_issues_enabled: false`
- The GitHub issue form uses one `textarea` for each section, each with `validations.required: true`.
- The Acceptance Criteria textarea is pre-filled with `- [ ] ` so checkboxes are the default.
- Issue forms render each field under its label as an `### <label>` heading, which differs from the `##` headings used by issues created through `gh`. The rules match on section names, not heading level, so both forms are accepted.

### 5. GitHub writes use `gh`, with an approval split
- **Need approval:** creating an issue, and editing an issue's Motivation, Description or Acceptance Criteria text (`gh issue create`, `gh issue edit --body-file`).
- **Automatic:**
  - ticking a checkbox, which rewrites only `- [ ]` to `- [x]` on the matched line and leaves the rest of the body untouched;
  - posting propose, progress and archive comments (`gh issue comment`).
- The issue body is always fetched fresh (`gh issue view N --json body`) before it is rewritten, to avoid overwriting edits made on GitHub.

### 6. PR template carries `Closes #`
`.github/pull_request_template.md` provides a `Closes #` line and a short summary section, so the closing keyword exists by default. Claude-created PRs fill in N from the `Issue: #N` line in the proposal.

### 7. `dev` is the default branch; merges are squash-only
- PRs target `dev`. `main` is the release branch.
- GitHub honors closing keywords and loads issue forms only on the **default branch**, so `dev` becomes the default (`gh repo edit --default-branch dev`). As a result, `Closes #N` and the issue form take effect as soon as a PR merges into `dev`.
- The repo allows only squash merges: merge commits and rebase merges are disabled.
- The squash commit settings are `squash_merge_commit_title: PR_TITLE` and `squash_merge_commit_message: PR_BODY`. GitHub then titles every squash commit `<PR title> (#N)`, so each commit on `dev` maps to exactly one PR, and through it to one issue.
- PR titles are written as Conventional Commits, so the squash commit is one as well.

*Alternative considered:* keeping `main` as the default and closing issues by hand after merging into `dev`. Rejected because issue forms and closing keywords would not work until a release.

### 8. Commit attribution
- Commits use the local git identity of the repository owner.
- Claude never adds `Co-Authored-By` trailers or "Generated with Claude Code" lines.
- This rule is stated in `CLAUDE.md`, which takes precedence over any default attribution behavior.

## Risks / Trade-offs

- **[Risk]** Enforcement is instructional, not mechanical, so a session could skip a rule. → **Mitigation:** `CLAUDE.md` and the config restate the rule at each phase, and the archive gate catches unticked criteria. Hooks remain a possible follow-up.
- **[Risk]** `gh issue create` skips the issue form. → **Mitigation:** the `CLAUDE.md` format rules apply to every issue Claude drafts.
- **[Risk]** Concurrent edits on GitHub while a checkbox is being ticked. → **Mitigation:** fetch the body fresh immediately before each edit and change only the target line.
- **[Risk]** GitHub reads issue forms and `config.yml` only from the default branch (`dev`), so the web-UI acceptance criterion cannot be verified until this PR merges into `dev`. Merging also closes the issue through `Closes #2` while that criterion is still unticked. → **Mitigation:** validate the YAML syntax locally before the PR. After the merge, verify the web UI, tick the criterion on the closed issue, and only then archive.
- **[Trade-off]** Advisory config text duplicates part of `CLAUDE.md`. → It stays short and refers back, so drift is limited to a few lines.

## Migration Plan

- No migration is needed. Issue #1 was already rewritten into the template, and this change is linked to issue #2.
- **Rollback:** delete `CLAUDE.md` and the `.github` files, and restore the commented `config.yaml`.
