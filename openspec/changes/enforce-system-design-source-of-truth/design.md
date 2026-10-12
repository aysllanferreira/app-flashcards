## Context

See proposal.md, Why. The workflow is enforced today by two layers:

- `CLAUDE.md` holds the issue-driven rules for every opsx phase. It overrides the generated OpenSpec skills wherever it is stricter.
- `openspec/config.yaml` feeds `context`, per-artifact `rules` and per-operation `guidance` into `openspec instructions`.

The OpenSpec CLI accepts operation guidance only for `apply` and `archive`; its source declares `OPERATION_IDS = ['apply', 'archive']`. Explore and update have no config hook. Update rewrites artifacts, so it does pick up artifact `rules`.

## Goals / Non-Goals

**Goals:**
- Every phase that plans or closes a change sees the system-design rule at the moment it acts.
- The rules survive `openspec update`, which regenerates the skills.
- The GitHub Wiki always reflects shipped work, the roadmap and the current status.

**Non-Goals:**
- Machine enforcement, such as a CI check that diagrams changed.
- Automated wiki publishing, such as a GitHub Action that syncs pages.
- Changing the generated `.claude/skills/openspec-*` or `.claude/commands/opsx/*` files.

## Decisions

1. **CLAUDE.md is the primary home, and config repeats the parts it can carry.**
   - `CLAUDE.md` gets a "System design" section with Explore, Propose, Update and Archive rules plus the diagram conventions.
   - Config carries what it can: `context`, `rules.proposal`, `rules.design`, `rules.tasks` and `operations.archive.guidance`.
   - *Alternative*: editing the generated skills. Rejected because `openspec update` would overwrite them, which is the same reason the issue-driven workflow lives in `CLAUDE.md`.
2. **Explore and update rules live only in `CLAUDE.md`.** The config has no hook for them.
   - Update still gets the artifact `rules` because it rewrites proposal, design and tasks.
   - *Alternative*: a custom schema with extra operations. Rejected because it is heavier and diverges from the default `spec-driven` schema for little gain.
3. **A separate capability instead of a modification to `issue-driven-workflow`.** System-design alignment is a separate concern from issue tracking. A new `system-design-source-of-truth` spec keeps each spec focused and easy to read.
4. **The proposal states alignment as a single line or list.** The line is "System design: no change", or a list of diagrams. This forces an explicit decision on every change and gives archive something concrete to check.
5. **Diagram edits stay manual, through Excalidraw.** The rules require both the `.excalidraw` source and the PNG to be updated but do not prescribe tooling. Excalidraw+ or excalidraw.com both work, which keeps the rule independent of any MCP server being connected.
6. **The wiki is managed through its git repository.** Clone `app-flashcards.wiki.git`, edit the Markdown pages and push with a Conventional Commit message.
   - *Alternative*: the GitHub web editor. Rejected because it can't be scripted and its edits can't be reviewed as a diff.
7. **A fixed page set, one purpose per page.**
   - The pages are `Home`, `Roadmap`, `Status`, `Architecture`, `Development-Workflow`, `Decisions` and `Changelog`, plus `_Sidebar` (links to every content page) and `_Footer`.
   - Every page opens with a one-line purpose and ends with `Last updated: <date> by <change> (#N)`.
   - `Architecture` embeds the diagrams from `https://raw.githubusercontent.com/aysllanferreira/app-flashcards/dev/system-design/*.png`, so the wiki never holds a copy that can drift from `system-design/`.
   - *Alternative*: free-form pages. Rejected because a fixed set lets every change know exactly which pages to touch, which keeps the wiki organized as it grows.
8. **"Wiki is the last task" is enforced by a tasks rule plus an archive check.**
   - Running it last means the wiki records what actually shipped, after the commits and the PR.
   - The `rules.tasks` entry makes every new `tasks.md` end with the wiki task, and the archive guidance blocks archive while it is unticked.

## Risks / Trade-offs

- [Rules in prose can be skipped] → Each phase sees them at the point of action: `openspec instructions` output for proposal, design, tasks and archive, and `CLAUDE.md` for every phase. Archive is a hard gate that lists outstanding diagram updates.
- [Diagram updates add friction to small changes] → The "System design: no change" line keeps the cost near zero for changes that don't affect architecture.
- [PNG and `.excalidraw` source can drift apart] → The conventions require both to be updated together. A CI check is out of scope for #9 and can come later.
- [Wiki pushes bypass PR review] → Each wiki push is listed in the issue's progress comment, and the wiki's own git history keeps every revision.
- [The wiki is public] → It holds only project documentation (roadmap, status, architecture, decisions, changelog), never secrets, credentials or environment details.
