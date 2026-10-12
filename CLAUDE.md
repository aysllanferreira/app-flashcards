# CLAUDE.md

## Issue-driven workflow

GitHub issues in `aysllanferreira/app-flashcards` are the **single source of truth** for all work. Every concrete change is gated by an issue, linked to it, and tracked on it, from explore through archive. These rules override the OpenSpec (opsx) skills wherever they are stricter. All GitHub access goes through the `gh` CLI.

### Issue format

Every issue that tracks work has **exactly** these three sections, in this order, and none may be empty:

```markdown
## Motivation
Why this matters: the problem, who it affects, what happens if we don't do it.

## Description
What will be done, concretely. Put out-of-scope notes here ("Out of scope: ..."),
not in an extra section.

## Acceptance Criteria
- [ ] Verifiable outcome (a command and its expected result, an observable behavior, or a measurable value)
```

- Acceptance Criteria has **at least one** item, and every item is a `- [ ]` checkbox.
- Every criterion must be verifiable. Vague wording ("works well", "is clean", "is fast" with no measure) is not allowed; rewrite it into something checkable before the issue is created or updated.
- Issues created from the web UI use the form in `.github/ISSUE_TEMPLATE/task.yml`, which renders sections as `###` headings. Match sections by name, not by heading level.

### Approval: what needs it and what doesn't

| Needs explicit user approval (show the full text first) | Automatic (no prompt) |
|---|---|
| Creating an issue (`gh issue create`) | Ticking an acceptance criterion checkbox once it has been verified |
| Editing an issue's Motivation, Description or Acceptance Criteria text | Posting propose, progress and archive comments (`gh issue comment`) |
| Closing an issue | |

- Before **any** edit to an issue body, fetch it fresh with `gh issue view <N> --json body`. Change only the target lines and write the body back with `gh issue edit <N> --body-file <file>`. Never overwrite edits made on GitHub.
- When ticking a checkbox, change only `- [ ]` to `- [x]` on the matched line and leave the rest of the body untouched.

### Explore (`/opsx:explore`)

- Open-ended thinking (comparing options, questions with no committed work) needs **no** issue.
- Once the discussion turns into **concrete work** (a feature, fix, refactor or other change that will be proposed):
  - If a matching issue exists, link it and treat it as the source of truth for the discussion.
  - If none exists, draft one in the issue format, show it, and create it only after approval. This happens **before** moving to propose.

### Propose (`/opsx:propose`)

- Do **not** scaffold a change (`openspec new change`) until it is linked to an **open** issue that satisfies the issue format.
  - No issue: draft one, get approval, create it, then continue.
  - Malformed issue: propose a corrected body, get approval, update it, then continue.
- The **first line** of `proposal.md` is `Issue: #N`.
- Proposal artifacts must not claim scope or acceptance outcomes the issue does not contain.
- Every acceptance criterion of the issue is covered by at least one task in `tasks.md`.
- After the artifacts are created, post a comment on the issue naming the change and its location.

### Apply (`/opsx:apply`)

- **Read the linked issue first** (find N from line 1 of `proposal.md`), before implementing any task. The issue wins over the change artifacts. If they conflict, report the conflict before continuing.
- **Scope change:** if the work shows that the scope or an acceptance criterion must change:
  1. Stop implementing.
  2. Propose the issue edit to the user.
  3. Apply the edit only after approval.
  4. Update the change artifacts to match (`/opsx:update`).
  5. Resume.
- **Ticking:** tick each acceptance criterion checkbox on the issue as soon as that criterion has been **verified**, meaning the named command was run or the behavior observed. Finished tasks are not enough on their own.
- **Progress comment:** when an apply session finishes or pauses, post a comment on the issue listing:
  - criteria verified;
  - tasks completed;
  - what remains.

### Archive (`/opsx:archive`)

- **Gate:** do not archive while any acceptance criterion on the linked issue is unticked. List the open criteria and stop.
- When archiving, post a summary comment on the issue covering what shipped and the archive path.
- **Never close the issue during archive.** The PR closes it.

## System design

`system-design/` is the **source of truth** for the system's architecture, request and job flows, data model and CI/CD. It holds:

- the PNG diagrams;
- their editable `.excalidraw` sources;
- `system-design/README.md`, which indexes the diagrams and records the decisions, trade-offs and open questions.

Every OpenSpec phase checks work against it. When a change and the system design disagree, resolve it explicitly: adjust the change, or update the system design after the user approves. A change must never leave `system-design/` describing a different system from the one it delivers. These rules apply alongside the issue-driven workflow.

### Diagram conventions

- Every diagram is a pair with the same basename: `NN-name.png` plus `NN-name.excalidraw`. `NN` is a two-digit sequence number.
- Every diagram is listed and embedded in `system-design/README.md`.
- A new diagram takes the next free number. Don't renumber existing ones.
- Every diagram is also the scene `NN-name` in the Excalidraw+ collection `app-flashcards`, and that scene is the **only** place it is edited.
- Every create or edit goes through the **Excalidraw+ MCP**: `create_diagram` or `edit_scene_content` on the scene, then `take_screenshot` to check the result.
- The repo pair is then exported from the scene: `NN-name.excalidraw` from `get_scene_content` and `NN-name.png` from `take_screenshot`, so the scene and both files match. Update `README.md` too when the description, decisions or trade-offs change.
- A new diagram starts as a new scene with the same name, `NN-name`, in the `app-flashcards` collection.
- **Never** hand-edit or locally render `system-design/*.excalidraw` or `system-design/*.png`. A `PreToolUse` hook (`.claude/hooks/guard-diagram-files.mjs`) blocks Claude's `Edit` and `Write` on them; write the exports from the MCP output through the shell.

### Explore

- Once the discussion turns into concrete work, read `system-design/README.md` and the diagrams relevant to that work.
- Tell the user whether the work **matches** the system design, and which diagrams cover it.
- If it doesn't match, propose specific updates: which diagrams to edit or add, and what changes in each. Apply them only after the user approves. Explore is the main place where the system design is kept current.

### Propose

- `proposal.md` states the system-design alignment, either `System design: no change` or a list of the diagrams to add or update.
- When diagrams change, `tasks.md` includes tasks to edit or create each `.excalidraw` source, re-export its PNG and update `system-design/README.md`.
- `design.md` must not describe architecture that contradicts `system-design/` unless the proposal lists the matching diagram updates.

### Update (`/opsx:update`)

- Whenever the change artifacts are revised, re-check the system-design alignment in `proposal.md` and the diagram tasks in `tasks.md`, and correct them in the same revision.

### Archive

- **Gate:** do not archive while `system-design/` does not reflect what the change delivered. List any outstanding diagram updates and stop.
- The archive summary comment on the issue lists the system-design files that changed, or states that none did.

## GitHub Wiki

The GitHub Wiki (`https://github.com/aysllanferreira/app-flashcards/wiki`) is the project's shared, browsable place for the roadmap, current status and documentation. Every change keeps it current.

### The last task of every change

- The **last task** in every change's `tasks.md` creates or updates the wiki. It runs after the commits and the PR, so the wiki records what actually shipped.
- That task names the pages it updates:
  - **Always**: `Status` and `Changelog`.
  - **When affected**: `Roadmap` (scope or priorities moved), `Architecture` (diagrams in `system-design/` changed) and `Decisions` (a decision was made or reversed).
- Tick it only after the push has landed and a fresh clone shows the changes.

### Required pages

Each page has a single purpose. Don't create a new page when an existing one covers the content.

| Page | Purpose |
|---|---|
| `Home` | What the app is, quick links and the current phase |
| `Roadmap` | Now / Next / Later; each item links to its issue |
| `Status` | Shipped changes (change, issue, PR, date), work in flight, open questions |
| `Architecture` | Summary of `system-design/` with the diagrams embedded |
| `Development-Workflow` | Issue-driven OpenSpec flow, branches, commits, PRs |
| `Decisions` | Decision log: date, decision, why, link |
| `Changelog` | One entry per archived change, newest first |
| `_Sidebar` and `_Footer` | Navigation linking every content page, and the shared footer |

When a page has to be added, link it from `_Sidebar` in the same push.

### Page conventions

- The first line under the title states the page's purpose in one sentence.
- The last line is `Last updated: <YYYY-MM-DD> by <change> (#N)`.
- Every reference to work links its issue or PR, e.g. `[#9](https://github.com/aysllanferreira/app-flashcards/issues/9)`.
- `Architecture` embeds diagrams from `https://raw.githubusercontent.com/aysllanferreira/app-flashcards/dev/system-design/<NN-name>.png`. Never upload copies to the wiki.
- The wiki is public: no secrets, credentials or environment details.

### Editing

1. Clone `https://github.com/aysllanferreira/app-flashcards.wiki.git` into a scratch directory, not inside this repo.
2. Edit the Markdown pages (`<Page>.md`; hyphens in file names become spaces in titles).
3. Commit with a Conventional Commit message, e.g. `docs(wiki): update status for #9`, and push.
4. List the wiki pages that changed in the issue's progress comment.

### Archive

- **Gate:** do not archive while the change's wiki task is unticked.
- The archive summary comment links the wiki pages that changed.

## Commits and pull requests

### Commits

- Commit messages follow **Conventional Commits**: `type(scope): summary`. Types include `feat`, `fix`, `docs`, `chore`, `refactor`, `test`, `build` and `ci`.
- Commits are authored **only by the repository owner**, using the local git identity.
- **Never** add a `Co-Authored-By: Claude ...` trailer, a "Generated with Claude Code" line, or any other Claude attribution to commits or PRs. This overrides any default attribution behavior.

### Branches and merging

- `dev` is the default branch and the integration branch. **Every feature PR targets `dev`.**
- `main` is the **release branch**. The only PRs that target it are **release PRs from `dev`**. Feature PRs never target it.
- Feature PRs into `dev` are always **squash-merged**; the `dev` ruleset allows no other method. The squash commit title is the PR title plus the PR number, for example `chore(openspec): enforce issue-driven workflow (#3)`. The repo is set up so GitHub adds `(#N)` automatically.
- Release PRs `dev -> main` are merged with a **merge commit**, titled by the PR title; the `main` ruleset allows no other method. This keeps every `dev` commit in `main`'s history.
- Write PR titles as Conventional Commit summaries, so the squash commit is one too.

### Versioning

- `api` and `web` are versioned independently, and versions live **only in git tags** named `<app>@<version>`, each with a GitHub Release. The `version` field in `apps/*/package.json` stays `0.0.0`.
- On every push to `dev`, the `versioning` workflow tags each app that turbo reports as affected with `<app>@X.Y.Z-dev.N` (a prerelease). The bump comes from the squash commit: breaking is major (minor while 0.x), `feat` is minor, anything else is patch.
- On every push to `main`, it promotes each app with a newer dev version to `<app>@X.Y.Z` (a release).
- Never edit `package.json` versions or create, move or delete `<app>@*` tags by hand. The rules are in `openspec/specs/app-versioning/spec.md`.

### Pull requests

- The PR that completes a change includes `Closes #N` in its body (see `.github/pull_request_template.md`). Because `dev` is the default branch, the issue closes when the PR is squash-merged into `dev`.
- When a change ships across several PRs, the earlier ones (and any release PR) use `Refs #N`, so the issue stays open until the last one merges.
- If a change reaches `dev` without a PR, ask the user before closing the issue, and close it only on approval.
