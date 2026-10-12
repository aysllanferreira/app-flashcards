## 1. CLAUDE.md diagram rule (issue #17, AC 1)

- [x] 1.1 Rewrite the last bullet of `### Diagram conventions` in `CLAUDE.md` (under `## System design`) and add bullets so the subsection states:
  - the Excalidraw+ scene `NN-name` in the `app-flashcards` collection is where every diagram is edited;
  - every create or edit goes through the Excalidraw+ MCP (`create_diagram` / `edit_scene_content`) and is checked with `take_screenshot`;
  - the repo pair is then exported from the scene: `NN-name.excalidraw` from `get_scene_content`, `NN-name.png` from `take_screenshot`, and `README.md` is updated when the description, decisions or trade-offs change;
  - a new diagram starts as a new scene with the same name;
  - the diagram files are never hand-edited or rendered locally, and a hook blocks Claude's `Edit`/`Write` on them.

  Keep the existing pair, README-index and next-free-number bullets. Verify that `grep -n "Excalidraw+ MCP" CLAUDE.md` prints a line number between the `## System design` and `## GitHub Wiki` headings (`grep -n "^## " CLAUDE.md`).

## 2. Spec delta (issue #17, AC 2)

- [x] 2.1 Run `openspec validate require-excalidraw-mcp-for-diagrams --strict` and fix any finding. Verify that it exits 0.
- [x] 2.2 Sync the delta into the main specs with `/opsx:sync`. Verify that the "Diagram file conventions" requirement in `openspec/specs/system-design-source-of-truth/spec.md` names the Excalidraw+ scene and the Excalidraw+ MCP, that it has the "Editing a diagram" scenario built around the scene, and that `openspec validate --specs` exits 0.

## 3. Edit guard hook (issue #17, AC 3 and 4)

- [x] 3.1 Create `.claude/hooks/guard-diagram-files.mjs`, a dependency-free Node ES module (design.md, decision 3). It reads the `PreToolUse` payload from stdin, resolves `tool_input.file_path` against the payload `cwd`, and makes it relative to `$CLAUDE_PROJECT_DIR` (falling back to `cwd`). For `system-design/<file>.excalidraw` or `system-design/<file>.png` it writes a message to stderr naming the Excalidraw+ MCP flow and exits 2; for any other path, or unparsable input, it exits 0. Verify with sample payloads (`tool_name` `Edit` and `Write`, absolute `file_path`, `cwd` set to the repo root):
  - `system-design/07-cicd.excalidraw` → exit 2, and stderr contains `Excalidraw+ MCP`;
  - `system-design/07-cicd.png` → exit 2, and stderr contains `Excalidraw+ MCP`;
  - `system-design/README.md` → exit 0.
- [x] 3.2 Create `.claude/settings.json` with a `hooks.PreToolUse` entry whose `matcher` is `Edit|Write` and whose command hook runs `node "$CLAUDE_PROJECT_DIR/.claude/hooks/guard-diagram-files.mjs"`. Verify that `jq '.hooks.PreToolUse' .claude/settings.json` prints that entry and `jq empty .claude/settings.json` exits 0.

## 4. README and OpenSpec config wording (issue #17, AC 5)

- [x] 4.1 Rewrite the intro of `system-design/README.md` (the paragraph and bullets above `## Diagrams`) so it names the Excalidraw+ scene `NN-name` in the `app-flashcards` collection as the place to edit each diagram, through the Excalidraw+ MCP, with both files exported from that scene. Leave the diagram sections and decisions untouched. Verify that `grep -n "Excalidraw+" system-design/README.md` matches the new wording and `git diff --stat -- system-design/` lists only `README.md`.
- [x] 4.2 Reword the diagram rule in `rules.tasks` of `openspec/config.yaml`: when diagrams change, include tasks to edit or create each `NN-name` scene in the Excalidraw+ collection `app-flashcards` through the Excalidraw+ MCP, export `NN-name.excalidraw` and `NN-name.png` from it, and update `system-design/README.md`. Verify that `grep -n "Excalidraw+" openspec/config.yaml` matches the new rule and that `openspec instructions tasks --change require-excalidraw-mcp-for-diagrams --json | jq -r '.rules[]' | grep "Excalidraw+"` prints it.

## 5. Wrap-up (issue #17, AC 1 to 5)

- [x] 5.1 Confirm no diagram changed (this change states "System design: no change"). Verify that `git diff --stat dev -- 'system-design/*.excalidraw' 'system-design/*.png'` prints nothing.
- [ ] 5.2 Commit with Conventional Commits and no Claude attribution, push a branch, and open a PR to `dev` titled `chore(system-design): require the Excalidraw+ MCP for every diagram change` with `Closes #17` in the body. Verify that `git log dev..HEAD --format=%B | grep -ci "co-authored-by"` prints 0 and `gh pr view --json baseRefName -q .baseRefName` prints `dev`.

## 6. GitHub Wiki (issue #17, AC 1 to 5)

- [ ] 6.1 Update the GitHub Wiki after the PR is open: clone `app-flashcards.wiki.git` into the scratchpad; update `Status` (this change in flight or shipped, with #17 and the PR), `Changelog` (entry for this change) and `Decisions` (diagrams are edited only in the Excalidraw+ scene through the Excalidraw+ MCP, reversing #9's "edits stay manual, any tool" decision); also update `Roadmap` if it lists #17, and `Architecture` or `Development-Workflow` if either describes how diagrams are edited. Keep each page's purpose line and set its `Last updated` line; push with `docs(wiki): update status for #17`. Verify that a fresh clone shows the changes on every page named in the issue's progress comment.
