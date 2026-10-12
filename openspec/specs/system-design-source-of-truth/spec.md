# system-design-source-of-truth Specification

## Purpose

Makes `system-design/` the architecture source of truth for all OpenSpec work. Every phase checks a change against the diagrams, and the diagrams are updated whenever a change makes them inaccurate.

## Requirements

### Requirement: System design is the architecture source of truth
`system-design/` SHALL be the source of truth for the system's architecture, request and job flows, data model and CI/CD. It consists of the PNG diagrams, their `.excalidraw` sources and `system-design/README.md`. When a change and the system design disagree, the disagreement SHALL be resolved explicitly: either the change is adjusted to match the system design, or the system design is updated, after user approval, to match the change. A change SHALL NOT leave `system-design/` describing a system that differs from what the change delivers.

#### Scenario: Change matches the system design
- **WHEN** a change adds no component, flow, data structure or pipeline step beyond what `system-design/` shows
- **THEN** the system design is left unchanged and the change records that it is aligned

#### Scenario: Change diverges from the system design
- **WHEN** a change adds, removes or alters a component, flow, table or pipeline step that `system-design/` shows differently or not at all
- **THEN** the divergence is reported to the user, and either the change is adjusted or the affected diagrams are updated or added after the user approves

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

### Requirement: Explore checks the system design
When explore reaches concrete work, `system-design/README.md` and the diagrams relevant to that work SHALL be read, and the user SHALL be told whether the work matches the system design. If it does not, explore SHALL propose specific system-design updates, naming the diagrams to edit or add and what changes in each. Those updates SHALL be applied only after the user approves them.

#### Scenario: Explored work matches
- **WHEN** explore converges on concrete work that the system design already covers
- **THEN** the user is told that the work matches the system design and which diagrams cover it

#### Scenario: Explored work does not match
- **WHEN** explore converges on concrete work that the system design does not cover or contradicts
- **THEN** the user is shown the proposed diagram edits or additions, and they are made only after approval

### Requirement: Propose records system-design alignment
A change's `proposal.md` SHALL state its system-design alignment, either "System design: no change" or a list of the diagrams to add or update. When diagrams must be added or updated, `tasks.md` SHALL contain tasks to edit or create the `.excalidraw` source, re-export the PNG and update `system-design/README.md`. The change's design artifact, when present, SHALL NOT describe architecture that contradicts the system design without listing the corresponding diagram updates.

#### Scenario: Proposal with no system-design impact
- **WHEN** a change is proposed that does not affect architecture, flows, data model or CI/CD
- **THEN** `proposal.md` contains "System design: no change"

#### Scenario: Proposal that changes the architecture
- **WHEN** a change is proposed that adds or alters a component, flow, table or pipeline step
- **THEN** `proposal.md` lists the diagrams to add or update, and `tasks.md` contains tasks to update each one's `.excalidraw` source and PNG and the README

### Requirement: Update re-checks system-design alignment
Whenever a change's planning artifacts are revised, the system-design alignment recorded in `proposal.md`, and the related tasks in `tasks.md`, SHALL be re-checked and corrected so they still match the revised change.

#### Scenario: Revision introduces an architectural change
- **WHEN** a change's artifacts are updated so the change now adds or alters a component, flow, table or pipeline step
- **THEN** the proposal's system-design alignment and the diagram tasks are updated in the same revision

### Requirement: Archive requires an up-to-date system design
A change SHALL NOT be archived while `system-design/` does not reflect what the change delivered. If any diagram update listed in the proposal is incomplete, archive SHALL stop and report the outstanding updates. When archive proceeds, the summary comment on the linked issue SHALL list the system-design files that changed, or state that none changed.

#### Scenario: Diagram update still pending
- **WHEN** archive is requested for a change whose listed diagram updates are not done
- **THEN** archive stops and lists the diagrams that still need updating

#### Scenario: System design is current
- **WHEN** archive is requested and `system-design/` reflects the delivered change
- **THEN** archive proceeds, and the issue's summary comment lists the system-design files that changed, or says none did
