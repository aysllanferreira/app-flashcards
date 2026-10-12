Issue: #9

## Why

`system-design/` (added for #8) records the agreed MVP architecture, flows, data model and CI/CD. No OpenSpec phase is required to check it, so a change can add a service, table, queue or flow the diagrams don't show. The diagrams then go stale and stop being a reliable reference. They need to become the architecture source of truth that every phase checks and keeps in sync.

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

System design: no change. This change edits workflow rules only and adds no services, flows or data.

## Capabilities

### New Capabilities
- `system-design-source-of-truth`: how `system-design/` acts as the architecture source of truth across explore, propose, update and archive, plus the diagram file conventions.

### Modified Capabilities
<!-- None. `issue-driven-workflow` is unchanged; this capability sits alongside it. -->

## Impact

- **Modified files**: `CLAUDE.md` (new section), `openspec/config.yaml` (context, rules and archive guidance).
- **New spec**: `openspec/specs/system-design-source-of-truth/spec.md`, synced on archive.
- **Unchanged**: generated `.claude/skills/openspec-*` and `.claude/commands/opsx/*` files. As with the issue-driven workflow, enforcement relies on `CLAUDE.md` taking precedence over skills, so it survives `openspec update`.
- **Unchanged**: the existing diagrams in `system-design/`.
- **Out of scope**: changing any existing diagram, and automated CI checks of diagram freshness.
