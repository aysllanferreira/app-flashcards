## Purpose

The first product screens of the web app: the deck list, a deck's page, the note editor with a live preview of its cards, and the card browser, usable on phones and desktops in both themes by signed-in users.

## ADDED Requirements

### Requirement: Signed-in screens
`/decks`, `/decks/[id]`, `/notes/new`, `/notes/[id]/edit` and `/cards` SHALL be shown only to signed-in users. A signed-out visitor SHALL be redirected to `/sign-in` and, after signing in, returned to the page they asked for. A signed-in user who opens `/` SHALL be redirected to `/decks`. Every API call these screens make SHALL be made from the server with the user's session token.

#### Scenario: Signed-out visit
- **WHEN** a visitor with no session opens `/cards`
- **THEN** they land on `/sign-in`, and after signing in they are on `/cards`

#### Scenario: Signed-in home
- **WHEN** a signed-in user opens `/`
- **THEN** they land on `/decks`

### Requirement: Deck list
`/decks` SHALL show the user's decks as a tree, each with its new, due and total counts including subdecks, and SHALL let the user create a deck at the top level or under another deck, and open a deck. With no decks it SHALL show an invitation to create the first one. When the API can't be reached or answers with an error, the page SHALL still render and show a short message with a way to retry.

#### Scenario: Counts update after adding a note
- **WHEN** the user adds a Basic (and reversed card) note to deck A and returns to `/decks`
- **THEN** A's new count has grown by 2

#### Scenario: First visit
- **WHEN** a user with no decks opens `/decks`
- **THEN** the page invites them to create a deck and offers the create action

#### Scenario: API down
- **WHEN** a signed-in user opens `/decks` while the API is stopped
- **THEN** the page renders and shows that the decks couldn't be loaded, with a retry action

### Requirement: Deck page
`/decks/[id]` SHALL show the deck's name, description, counts, subdecks and cards, and SHALL let the user rename it, move it under another deck or to the top level, add a note to it and delete it. Before deleting, it SHALL ask for confirmation stating how many subdecks, cards and notes will be deleted. A failed action SHALL show the API's reason, such as a duplicate name, without losing the user's input.

#### Scenario: Delete confirmation
- **WHEN** the user chooses to delete a deck that has 1 subdeck, 5 cards and 3 notes that would be left with no cards
- **THEN** the confirmation states 1 subdeck, 5 cards and 3 notes before anything is deleted

#### Scenario: Duplicate name
- **WHEN** the user renames a deck to the name of a sibling
- **THEN** the form stays open with the typed name and shows that the name is taken

### Requirement: Note editor with live preview
`/notes/new` and `/notes/[id]/edit` SHALL let the user choose a note type and a deck (on create), edit one rich-text input per field of the note type with bold, italic and underline, edit the tags, and save. For cloze fields, a cloze action SHALL wrap the selected text in `{{cN::...}}`, where N is one more than the highest cloze number already in the note. While the user types, the editor SHALL show a preview of the front and back of every card the note will produce, computed and sanitized in the browser with the same rules as the API, with no request to the server.

#### Scenario: Preview before saving
- **WHEN** the user fills Front and Back of a Basic (and reversed card) note
- **THEN** the preview shows 2 cards before the note is saved

#### Scenario: Cloze action
- **WHEN** the user selects `Madrid` and uses the cloze action, then selects `Spain` and uses it again
- **THEN** the field contains `{{c1::Madrid}}` and `{{c2::Spain}}`, and the preview shows 2 cards

#### Scenario: No card would be produced
- **WHEN** the user tries to save a note that would produce no card
- **THEN** the note is not saved and the editor says why

### Requirement: Card browser
`/cards` SHALL list the user's cards in a table with the sort field, deck, card (template name or cloze number), state and due date, with numbers in a monospace font. It SHALL offer a search box, a deck filter, sorting by sort field, created date and due date, and loading the next page. From a row the user SHALL be able to open the note in the editor, move the card to another deck, and delete the note after a confirmation that states how many cards will go. Below 768 px wide, each card SHALL be shown as a stacked row that fits the screen instead of a wide table.

#### Scenario: Search
- **WHEN** the user types `hola` in the search box
- **THEN** only cards whose sort field contains `hola`, regardless of case, are listed

#### Scenario: Move a card
- **WHEN** the user moves a card to deck B from its row
- **THEN** the row shows deck B

#### Scenario: Phone layout
- **WHEN** `/cards` is loaded at 375 px wide
- **THEN** the cards are shown as stacked rows and the page does not scroll horizontally

### Requirement: Field content is shown safely
The screens SHALL show note field content only after sanitizing it with the shared rules, so markup outside the allowlist is never rendered as HTML.

#### Scenario: Unsafe content from the API
- **WHEN** a field value containing `<img src=x onerror=alert(1)>` reaches the browser
- **THEN** no `img` element is rendered and no script runs

### Requirement: Usable on every screen size and theme
Every screen in this capability SHALL have no horizontal scroll at 375 px and 1280 px wide in both themes, SHALL be fully usable with the keyboard alone, and SHALL have no serious or critical accessibility violations in an automated axe scan.

#### Scenario: Axe scan
- **WHEN** each screen is scanned with axe in both themes
- **THEN** the scan reports no serious or critical violations
