Issue: #17

## Why

Each diagram in `system-design/` exists twice: as a scene in the Excalidraw+ collection `app-flashcards`, where the owner views and edits it, and as the `NN-name.excalidraw`/`NN-name.png` pair in the repo. During #12, `07-cicd` was changed by editing the repo JSON and rendering it locally, so the Excalidraw+ scene went stale until the owner noticed. Nothing in the project names the scene as the place where diagrams are edited, so the two copies will drift apart again unless the rule is written down and enforced.

## What Changes

- **`CLAUDE.md`, "Diagram conventions"** (under "System design"):
  - the Excalidraw+ scene `NN-name` in the `app-flashcards` collection is where every diagram is edited;
  - every create or edit goes through the Excalidraw+ MCP (`create_diagram` / `edit_scene_content`) and is checked with `take_screenshot`;
  - the repo pair is then exported from the scene: `NN-name.excalidraw` from `get_scene_content`, `NN-name.png` from `take_screenshot`;
  - a new diagram starts as a new scene with the same name;
  - the diagram files are never hand-edited or rendered locally.
- **Spec**: modify the "Diagram file conventions" requirement of `system-design-source-of-truth` the same way, with the "Editing a diagram" scenario rewritten around the scene.
- **Enforcement**: a `PreToolUse` hook, registered in a new `.claude/settings.json` with the matcher `Edit|Write` and implemented by a script in `.claude/hooks/`. It blocks Claude's `Edit` and `Write` on `system-design/*.excalidraw` and `system-design/*.png` (exit 2) with a message pointing to the Excalidraw+ MCP flow. Every other path, and exports written from MCP output through the shell, stay allowed.
- **Wording**: the `system-design/README.md` intro and the diagram rule in `openspec/config.yaml` `rules.tasks` name the Excalidraw+ scene as the place to edit.

System design: no change. This change edits the rules for how diagrams are edited and adds a Claude Code hook; no diagram content, service, flow, table or pipeline step changes.

## Capabilities

### New Capabilities
<!-- None. -->

### Modified Capabilities
- `system-design-source-of-truth`: the "Diagram file conventions" requirement now names the Excalidraw+ scene as the place every diagram is created and edited, through the Excalidraw+ MCP, with the repo pair exported from it and never hand-edited or rendered locally.

## Impact

- **Modified files**: `CLAUDE.md` ("Diagram conventions"), `system-design/README.md` (intro only), `openspec/config.yaml` (`rules.tasks` diagram rule).
- **New files**: `.claude/settings.json` (project hook registration, committed) and `.claude/hooks/` (the guard script).
- **Specs**: `openspec/specs/system-design-source-of-truth/spec.md`, synced before archive.
- **Claude Code sessions**: once the hook is loaded, `Edit`/`Write` on diagram files is refused. Hooks are read when a session starts, so sessions already open pick it up only after a restart.
- **Unchanged**: the seven existing diagrams and their scenes; the generated `.claude/skills/openspec-*` and `.claude/commands/opsx/*` files.
- **Out of scope**: changing existing diagrams, git hooks for human contributors, and checking the other six scenes for drift.
