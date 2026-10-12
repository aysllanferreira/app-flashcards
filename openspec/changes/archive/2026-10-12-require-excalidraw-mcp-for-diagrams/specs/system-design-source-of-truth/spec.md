## MODIFIED Requirements

### Requirement: Diagram file conventions
Every diagram in `system-design/` SHALL exist as a pair, `NN-name.png` and `NN-name.excalidraw`, where `NN` is a two-digit sequence number and both files share the same basename. Every diagram SHALL be listed and embedded in `system-design/README.md`. A new diagram SHALL take the next free number.

Every diagram SHALL also exist as the scene `NN-name` in the Excalidraw+ collection `app-flashcards`, and that scene SHALL be the only place the diagram is created or edited. Creating or editing a diagram SHALL go through the Excalidraw+ MCP, and the result SHALL be checked with a screenshot of the scene before the repo files are written. The repo pair SHALL then be exported from the scene: `NN-name.excalidraw` from the scene content and `NN-name.png` from the scene screenshot, so the scene and both files show the same content. The `.excalidraw` and `.png` files in `system-design/` SHALL NOT be hand-edited or rendered locally. Claude Code SHALL refuse its own `Edit` and `Write` on `system-design/*.excalidraw` and `system-design/*.png`, with a message that points to the Excalidraw+ MCP flow.

#### Scenario: Adding a diagram
- **WHEN** a change needs a diagram that does not exist yet
- **THEN** a new scene `NN-name` with the next free number is created in the `app-flashcards` collection through the Excalidraw+ MCP, `NN-name.excalidraw` and `NN-name.png` are exported from it, and `system-design/README.md` lists and embeds the diagram

#### Scenario: Editing a diagram
- **WHEN** an existing diagram is changed
- **THEN** its scene `NN-name` in the `app-flashcards` collection is edited through the Excalidraw+ MCP and checked with a screenshot, both `NN-name.excalidraw` and `NN-name.png` are re-exported from that scene, and `system-design/README.md` is updated if the description or decisions changed

#### Scenario: Direct edit of a diagram file is refused
- **WHEN** Claude Code attempts an `Edit` or `Write` on `system-design/NN-name.excalidraw` or `system-design/NN-name.png`
- **THEN** the tool call is blocked with a message naming the Excalidraw+ MCP flow, and no diagram file is changed

#### Scenario: Other system-design files stay editable
- **WHEN** Claude Code attempts an `Edit` or `Write` on `system-design/README.md`
- **THEN** the tool call is allowed
