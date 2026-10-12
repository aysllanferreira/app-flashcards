# project-wiki Specification

## Purpose

Keeps the GitHub Wiki as the project's shared, browsable place for its roadmap, current status and documentation. Every change keeps it current as the final step of apply.

## Requirements

### Requirement: Every change updates the wiki as its last task
The last task in every change's `tasks.md` SHALL create or update the GitHub Wiki. That task SHALL always update `Status` and `Changelog` for the change. It SHALL also update `Roadmap`, `Architecture` and `Decisions` whenever the change affects the roadmap, the system design or a recorded decision. The wiki task SHALL run after the change's commits and pull request, so the wiki records what actually shipped.

#### Scenario: Tasks are planned for a change
- **WHEN** `tasks.md` is written or revised for any change
- **THEN** its last task creates or updates the GitHub Wiki and names the pages it will update

#### Scenario: Change affects the architecture
- **WHEN** a change updates diagrams in `system-design/`
- **THEN** its wiki task also updates the `Architecture` page

### Requirement: Fixed wiki page set
The wiki SHALL contain exactly these content pages, each with one purpose:
- `Home`: what the app is, quick links and the current phase.
- `Roadmap`: Now / Next / Later, with each item linked to its issue.
- `Status`: shipped changes (change, issue, PR, date), work in flight and open questions.
- `Architecture`: a summary of `system-design/` with its diagrams embedded.
- `Development-Workflow`: the issue-driven OpenSpec flow, branches, commits and pull requests.
- `Decisions`: a decision log (date, decision, why, link).
- `Changelog`: one entry per archived change, newest first.

The wiki SHALL also contain `_Sidebar`, which links to every content page, and `_Footer`. A new page SHALL be added only when no existing page covers its purpose, and it SHALL then be linked from `_Sidebar`.

#### Scenario: Browsing the wiki
- **WHEN** a reader opens any wiki page
- **THEN** the sidebar links to all seven content pages

#### Scenario: Content that fits an existing page
- **WHEN** a change needs to document something that an existing page's purpose covers
- **THEN** the existing page is updated instead of a new page being created

### Requirement: Wiki page conventions
Every content page SHALL open with a one-line statement of its purpose and SHALL end with a `Last updated: <date> by <change> (#N)` line. References to work SHALL link the GitHub issue or pull request. `Architecture` SHALL embed the diagrams from the `system-design/` files on the `dev` branch rather than storing copies in the wiki.

#### Scenario: Page updated by a change
- **WHEN** a change updates a wiki page
- **THEN** the page's `Last updated` line names that change and its issue

#### Scenario: Diagram changes on dev
- **WHEN** a diagram in `system-design/` is updated and merged into `dev`
- **THEN** the `Architecture` page shows the updated diagram without the wiki storing a copy

### Requirement: Wiki edits go through the wiki repository
Wiki pages SHALL be edited by cloning `app-flashcards.wiki.git`, editing the Markdown files and pushing. Each wiki commit message SHALL follow Conventional Commits. The pages SHALL NOT contain secrets, credentials or environment details, because the wiki is public.

#### Scenario: Updating the wiki
- **WHEN** a change's wiki task runs
- **THEN** the pages are edited in a clone of the wiki repository and pushed with a Conventional Commit message

### Requirement: Archive requires the wiki task
A change SHALL NOT be archived while its wiki task is unticked. When archive proceeds, the summary comment on the linked issue SHALL link the wiki pages that changed.

#### Scenario: Wiki task still open
- **WHEN** archive is requested for a change whose wiki task is unticked
- **THEN** archive stops and reports the open wiki task

#### Scenario: Wiki updated
- **WHEN** archive is requested and the wiki task is ticked
- **THEN** archive proceeds, and the summary comment links the wiki pages that changed
