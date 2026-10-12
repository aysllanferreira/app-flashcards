## Context

See proposal.md, Why. The workflow is enforced today by two layers:

- `CLAUDE.md` holds the issue-driven rules for every opsx phase. It overrides the generated OpenSpec skills wherever it is stricter.
- `openspec/config.yaml` feeds `context`, per-artifact `rules` and per-operation `guidance` into `openspec instructions`.

The OpenSpec CLI accepts operation guidance only for `apply` and `archive`; its source declares `OPERATION_IDS = ['apply', 'archive']`. Explore and update have no config hook. Update rewrites artifacts, so it does pick up artifact `rules`.

## Goals / Non-Goals

**Goals:**
- Every phase that plans or closes a change sees the system-design rule at the moment it acts.
- The rules survive `openspec update`, which regenerates the skills.

**Non-Goals:**
- Machine enforcement, such as a CI check that diagrams changed.
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

## Risks / Trade-offs

- [Rules in prose can be skipped] → Each phase sees them at the point of action: `openspec instructions` output for proposal, design, tasks and archive, and `CLAUDE.md` for every phase. Archive is a hard gate that lists outstanding diagram updates.
- [Diagram updates add friction to small changes] → The "System design: no change" line keeps the cost near zero for changes that don't affect architecture.
- [PNG and `.excalidraw` source can drift apart] → The conventions require both to be updated together. A CI check is out of scope for #9 and can come later.
