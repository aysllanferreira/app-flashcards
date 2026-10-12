## 1. CLAUDE.md system-design rules (issue #9, AC 1)

- [x] 1.1 Add a `## System design` section to `CLAUDE.md`, after "Issue-driven workflow" and before "Commits and pull requests". It names `system-design/` (PNGs, `.excalidraw` sources, `README.md`) as the source of truth for architecture, flows, data model and CI/CD, and states that a disagreement is resolved by adjusting the change or by updating the diagrams after approval. Verify `grep -n "^## System design" CLAUDE.md` prints one line.
- [x] 1.2 Add the diagram conventions to the section: `NN-name.png` plus `NN-name.excalidraw` with the same basename; every diagram listed and embedded in `system-design/README.md`; new diagrams take the next free number; edits update both the source and the PNG. Verify by reading the section against the spec requirement "Diagram file conventions".
- [x] 1.3 Add phase subsections `### Explore`, `### Propose`, `### Update` and `### Archive` to the section, matching the spec requirements of the same phases:
  - explore: read the README and relevant diagrams, report the match, propose specific edits or additions, apply them only after approval;
  - propose: `proposal.md` states "System design: no change" or lists the diagrams, and `tasks.md` has diagram tasks;
  - update: re-check the alignment on every revision;
  - archive: gate on an up-to-date system design, and list the changed files in the summary comment.

  Verify that `sed -n '/^## System design/,/^## Commits/p' CLAUDE.md | grep -c "^### \(Explore\|Propose\|Update\|Archive\)"` prints 4.

## 2. OpenSpec config (issue #9, AC 2, 3 and 4)

- [x] 2.1 Add one sentence to `context` in `openspec/config.yaml` naming `system-design/` as the architecture source of truth, with a pointer to the "System design" section of `CLAUDE.md`. Verify that `openspec context --json` runs with no config warning.
- [x] 2.2 Add a system-design rule to `rules.proposal`: state "System design: no change" or list the diagrams to add or update. Verify that `openspec instructions proposal --change enforce-system-design-source-of-truth --json | jq -r '.rules[]' | grep -i "system design"` prints the rule.
- [x] 2.3 Add `rules.design` (do not describe architecture that contradicts `system-design/` without listing the diagram updates) and a system-design rule to `rules.tasks` (when diagrams change, include tasks to edit the `.excalidraw` source, re-export the PNG and update `system-design/README.md`). Verify that `openspec instructions tasks --change enforce-system-design-source-of-truth --json | jq -r '.rules[]' | grep -i "system-design"` prints the tasks rule, and the equivalent `design` command prints the design rule.
- [x] 2.4 Add archive guidance to `operations.archive.guidance`: do not archive while `system-design/` does not reflect what shipped; list outstanding diagram updates; name the changed system-design files (or "none") in the summary comment. Verify that `openspec instructions archive --change enforce-system-design-source-of-truth --json` output contains that guidance (`grep -i "system-design"`).

## 3. Spec capability (issue #9, AC 5)

- [x] 3.1 Run `openspec validate enforce-system-design-source-of-truth --strict` and fix any finding. Verify that it exits 0.
- [x] 3.2 Sync the delta into the main specs with `/opsx:sync`, so `openspec/specs/system-design-source-of-truth/spec.md` exists before archive. Verify that `openspec list --specs` lists `system-design-source-of-truth` and `openspec validate --specs` exits 0.

## 4. Wrap-up (issue #9, AC 1 to 5)

- [x] 4.1 Confirm `system-design/` is unchanged (this change states "System design: no change"). Verify that `git diff --stat dev -- system-design/` prints nothing.
- [x] 4.2 Commit with Conventional Commits and no Claude attribution, and open a PR to `dev` with `Closes #9`. Verify that `git log dev..HEAD --format=%B | grep -ci "co-authored-by"` prints 0 and that `gh pr view --json baseRefName -q .baseRefName` prints `dev`.
