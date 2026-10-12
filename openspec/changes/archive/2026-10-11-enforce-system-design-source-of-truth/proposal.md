Issue: #9

## Why

`system-design/` (added for #8) records the agreed MVP architecture, flows, data model and CI/CD. No OpenSpec phase is required to check it, so a change can add a service, table, queue or flow the diagrams don't show. The diagrams then go stale and stop being a reliable reference. They need to become the architecture source of truth that every phase checks and keeps in sync.

The project also has no shared, browsable place for its roadmap, current status and documentation. The GitHub Wiki can fill that role only if every change keeps it current.

## What Changes

- Add a "System design" section to `CLAUDE.md` that names `system-design/` (PNGs, `.excalidraw` sources and `README.md`) as the source of truth for architecture, flows, data model and CI/CD, with rules per phase:
  - **Explore**: before concrete work, read `system-design/README.md` and the relevant diagrams, and report whether the work matches. When it doesn't, propose specific updates: edit existing diagrams or add new `NN-name` diagrams. Apply them only after the user approves.
  - **Propose**: `proposal.md` states the system-design alignment, either "System design: no change" or the diagrams to add or update. When updates are needed, `tasks.md` includes tasks to edit the `.excalidraw` source, re-export the PNG and update `README.md`.
  - **Update**: re-check the alignment whenever the change artifacts are revised.
  - **Archive**: do not archive while `system-design/` does not reflect what shipped. The archive summary comment lists the system-design files that changed.
  - **Conventions**: every diagram is `NN-name.png` plus `NN-name.excalidraw`, indexed in `system-design/README.md`. A new diagram takes the next free number.
- Extend `openspec/config.yaml`:
  - `context`: name `system-design/` as the architecture source of truth.
  - `rules`: entries for `proposal`, `design` and `tasks`, which propose and update both write.
  - `operations.archive.guidance`: the archive gate.

  The config only supports apply and archive operation hooks, so the explore and update rules live in `CLAUDE.md` only.
- Record the rules as a new spec capability.
- Keep the GitHub Wiki current as part of every change:
  - **`CLAUDE.md`**: a new "GitHub Wiki" section.
    - The last task in every change's `tasks.md` creates or updates the wiki. Status and Changelog are always updated; Roadmap, Architecture and Decisions are updated when the change affects them.
    - Archive is blocked while the wiki task is unticked, and the archive summary comment links the wiki pages that changed.
    - The section defines the fixed page set and page conventions, and how to edit the wiki: clone `app-flashcards.wiki.git`, edit the Markdown pages, push with Conventional Commits.
  - **`openspec/config.yaml`**: a `rules.tasks` entry for the wiki last task, and an `operations.archive.guidance` wiki check.
  - **Initial wiki**: `Home`, `Roadmap`, `Status`, `Architecture`, `Development-Workflow`, `Decisions`, `Changelog`, `_Sidebar` and `_Footer`, filled with the current project state.

System design: no change. This change edits workflow rules and project documentation only, and adds no services, flows or data.

## Capabilities

### New Capabilities
- `system-design-source-of-truth`: how `system-design/` acts as the architecture source of truth across explore, propose, update and archive, plus the diagram file conventions.
- `project-wiki`: how every change keeps the GitHub Wiki current, the wiki's required page set and conventions, and how it is edited.

### Modified Capabilities
<!-- None. `issue-driven-workflow` is unchanged; this capability sits alongside it. -->

## Impact

- **Modified files**: `CLAUDE.md` (new "System design" and "GitHub Wiki" sections), `openspec/config.yaml` (context, rules and archive guidance).
- **New specs**: `openspec/specs/system-design-source-of-truth/spec.md` and `openspec/specs/project-wiki/spec.md`, synced before archive.
- **GitHub Wiki** (public, because the repository is public): created with the page set above. Prerequisite: the owner creates the first wiki page once in the GitHub web UI, because GitHub only creates the wiki repository after that.
- **Unchanged**: generated `.claude/skills/openspec-*` and `.claude/commands/opsx/*` files. As with the issue-driven workflow, enforcement relies on `CLAUDE.md` taking precedence over skills, so it survives `openspec update`.
- **Unchanged**: the existing diagrams in `system-design/`.
- **Out of scope**: changing any existing diagram, automated CI checks of diagram freshness, and automated wiki publishing (for example a GitHub Action that syncs pages).
