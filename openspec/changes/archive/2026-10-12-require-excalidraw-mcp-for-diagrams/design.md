## Context

See proposal.md, Why. Today the diagram rules live in three places, and none names the Excalidraw+ scene as the editing surface:

- `CLAUDE.md`, "Diagram conventions": "change the `.excalidraw` source (in Excalidraw+ or on excalidraw.com), then re-export the PNG".
- `system-design/README.md` intro: open the `.excalidraw` at excalidraw.com or in the Excalidraw+ collection; "If you change a diagram, re-export both files."
- `openspec/config.yaml` `rules.tasks`: "include tasks to edit or create each NN-name.excalidraw source, re-export its NN-name.png".

The project has no `.claude/settings.json` and no Claude Code hooks yet. `.claude/` is tracked (only the generated opsx skills and commands live there). `#9` decided "Diagram edits stay manual … independent of any MCP server" (archived design, decision 5); this change reverses that decision.

## Goals / Non-Goals

**Goals:**
- One editing surface per diagram (its Excalidraw+ scene), with the repo pair always derived from it.
- Claude cannot take the shortcut that caused the drift in #12, even if it ignores the prose rule.

**Non-Goals:**
- Blocking shell writes. Exports from MCP output are written through the shell, so `Bash` stays unguarded.
- Guarding human edits (git hooks, CI), or comparing the repo files against the scenes.

## Decisions

1. **The Excalidraw+ scene is the source; the repo pair is an export.**
   - The scene `NN-name` in the `app-flashcards` collection holds the editable diagram. `get_scene_content` produces `NN-name.excalidraw` and `take_screenshot` produces `NN-name.png`.
   - *Alternative*: keep the repo `.excalidraw` as the source and re-import it into the scene after each edit. Rejected because the owner works in Excalidraw+, and importing on every edit is the step that was skipped in #12.
2. **Enforcement is a Claude Code `PreToolUse` hook, not prose alone.**
   - `.claude/settings.json` (project settings, committed) registers one hook with the matcher `Edit|Write` and the command `node "$CLAUDE_PROJECT_DIR/.claude/hooks/guard-diagram-files.mjs"`.
   - *Alternative*: rely on `CLAUDE.md` and the memory note. Rejected because those already existed in spirit and the drift still happened.
3. **The guard script is a Node ES module with no dependencies.**
   - It reads the hook payload from stdin, takes `tool_input.file_path`, resolves it against the payload `cwd`, and makes it relative to `$CLAUDE_PROJECT_DIR` (falling back to the payload `cwd`).
   - If the relative path matches `system-design/<file>.excalidraw` or `system-design/<file>.png` (top level only), it prints a message to stderr naming the Excalidraw+ MCP flow (`edit_scene_content` or `create_diagram`, `take_screenshot`, then export with `get_scene_content` and `take_screenshot`) and exits 2, which blocks the call and shows the message to Claude.
   - Anything else, including `system-design/README.md`, exits 0. Unparsable input also exits 0, so a malformed payload never blocks unrelated edits.
   - *Alternative*: a shell script with `jq`. Rejected because Node is already required by the monorepo, while `jq` is not a declared dependency, and a missing `jq` would make the guard fail open silently.
4. **Only `Edit` and `Write` are matched.** These are the tools Claude uses to change files directly. `Bash` stays allowed so exports from MCP output still work, as the issue specifies.
5. **The rule text is updated everywhere it is stated.** `CLAUDE.md`, the spec requirement, the README intro and the `rules.tasks` entry all name the scene, so every phase sees the same rule.

## Risks / Trade-offs

- [The shell is an open path around the hook] → Accepted by the issue: shell writes are how exports land. The prose rule in `CLAUDE.md` and the spec still forbid hand-editing, and the hook catches the common accidental route.
- [Hooks load when a session starts] → Sessions already open when the hook lands won't apply it until restarted. The hook is verified by piping sample payloads into the script, which doesn't depend on a live session.
- [The scene and the repo files can still drift if someone edits the scene and forgets to export] → Out of scope for #17. Archive already blocks while `system-design/` doesn't reflect the change.
- [The Excalidraw+ MCP may be unavailable] → Diagram work waits until it is connected. This is the intended trade-off: no diagram change bypasses the scene.
