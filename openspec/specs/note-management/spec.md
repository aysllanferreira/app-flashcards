# note-management Specification

## Purpose

Lets a signed-in user add flashcard content through the API: notes written against a note type, the cards generated from them, a card browser, and moving cards between decks, with field content limited to safe formatting.

## Requirements

### Requirement: List note types
`GET /note-types` SHALL return every note type of the caller, each with its `id`, `name`, `kind` (`standard` or `cloze`), `css`, its fields (`key`, `name`, `ord`) in display order and its templates (`id`, `name`, `ord`, `frontHtml`, `backHtml`) in order. Note types SHALL be read-only through the API.

#### Scenario: New account
- **WHEN** a newly provisioned user requests `GET /note-types`
- **THEN** the response lists Basic, Basic (and reversed card) and Cloze with their fields and templates

### Requirement: Create a note and its cards
`POST /notes` SHALL take a `noteTypeId`, a `deckId`, `fields` (a value per field key; missing keys are empty) and optional `tags`, and SHALL create the note and every card it produces, in one transaction, all cards in the given deck as new cards. A standard note type SHALL produce one card per template whose front renders to non-empty content; a cloze note type SHALL produce one card per distinct cloze number in its cloze fields. The response SHALL be 201 with the note and its cards. A note that would produce no card SHALL be answered with 400 and SHALL NOT be stored.

#### Scenario: Basic (and reversed card) with both fields
- **WHEN** the caller creates a Basic (and reversed card) note with Front `hola` and Back `hello`
- **THEN** the response is 201 with 2 cards, one per template

#### Scenario: Basic (and reversed card) with an empty Back
- **WHEN** the caller creates a Basic (and reversed card) note with Front `hola` and an empty Back
- **THEN** the response is 201 with 1 card, for the first template

#### Scenario: Cloze
- **WHEN** the caller creates a Cloze note whose Text is `{{c1::Madrid}} is the capital of {{c2::Spain}}`
- **THEN** the response is 201 with 2 cards, with cloze numbers 1 and 2

#### Scenario: No card produced
- **WHEN** the caller creates a Basic note with an empty Front, or a Cloze note whose Text has no cloze deletion
- **THEN** the response is 400 with an `ErrorResponse` body, and no note is stored

### Requirement: Field content is sanitized
Every field value written through the API SHALL be stored sanitized: only bold, italic, underline and line-break markup SHALL be kept, with no attributes; paragraph and `div` boundaries SHALL become line breaks; every other element SHALL be removed while its text is kept, except that script and style content SHALL be removed entirely. The rules SHALL be those of the `card-templates` sanitizer. Cloze markers are plain text and SHALL be kept. Each note's sort field SHALL hold the plain text of its note type's sort field.

#### Scenario: Dangerous markup
- **WHEN** a field is sent as `<img src=x onerror=alert(1)><b>hi</b><script>alert(2)</script>`
- **THEN** the stored and returned value is `<b>hi</b>`

#### Scenario: Sort field
- **WHEN** a Basic note's Front is `<b>hola</b> amigo`
- **THEN** the note's sort field is `hola amigo`

### Requirement: Read a note
`GET /notes/{id}` SHALL return one of the caller's notes with its note type id, fields, tags and sort field, and its cards (id, deck id, template id, cloze number, state, due date).

#### Scenario: Note with cards
- **WHEN** the caller requests a note that has 2 cards
- **THEN** the response is 200 with the note and both cards

### Requirement: Edit a note
`PATCH /notes/{id}` SHALL replace any of the note's `fields` and `tags`, sanitize the fields and update the sort field, and SHALL create every card the note now produces that does not exist yet, as new cards in the deck of the note's earliest card. It SHALL NOT delete a card or change an existing card's scheduling state, even when the card no longer renders.

#### Scenario: Adding a cloze deletion
- **WHEN** a Cloze note with cards for c1 and c2 is edited to add `{{c3::...}}`
- **THEN** the note has 3 cards, and the c1 and c2 cards keep their ids and scheduling fields

#### Scenario: Removing a cloze deletion
- **WHEN** that note is then edited to remove `c2`
- **THEN** the note still has 3 cards

### Requirement: Delete a note
`DELETE /notes/{id}` SHALL delete the note and all of its cards and answer 204. Their review logs SHALL remain, with the card reference cleared.

#### Scenario: Note with reviewed cards
- **WHEN** the caller deletes a note whose card has review logs
- **THEN** the note and its cards are gone and the review logs remain with `card_id` null

### Requirement: Browse cards
`GET /cards` SHALL return the caller's cards, one row per card with the card id, note id, the note's sort field, deck id and name, template name, cloze number, state and due date. It SHALL accept a `deckId` filter that includes the deck's subdecks, a `q` filter that matches cards whose note's sort field contains `q` regardless of case, a `sort` of `sortField`, `createdAt` or `dueAt` with an `order` of `asc` or `desc`, and a `limit` from 1 to 100 (default 50). It SHALL page with an opaque `cursor`: each response SHALL include a `nextCursor`, null on the last page, and following it SHALL return every matching card exactly once even when sort values are equal.

#### Scenario: Paging through every card
- **WHEN** the caller has 250 cards and follows `nextCursor` from `GET /cards?limit=100` until it is null
- **THEN** the pages hold 100, 100 and 50 cards, and every card appears exactly once

#### Scenario: Deck filter includes subdecks
- **WHEN** deck A has subdeck B and the caller requests `GET /cards?deckId=<A>`
- **THEN** the response includes the cards of both A and B and no others

#### Scenario: Text filter
- **WHEN** a note's sort field is `Hola amigo` and the caller requests `GET /cards?q=HOLA`
- **THEN** that note's cards are returned

### Requirement: Move a card
`PATCH /cards/{id}` with a `deckId` SHALL move the card to that deck of the caller and return the card, without changing its scheduling state.

#### Scenario: Move to another deck
- **WHEN** the caller moves a card from deck A to deck B
- **THEN** the card's deck is B, its state and due date are unchanged, and the deck counts reflect the move

### Requirement: Notes and cards are private to their owner
Every note, note type and card route SHALL require a session token. A note, card, deck or note type that does not exist or belongs to another user SHALL be answered with 404 and an `ErrorResponse` body, whether it is the route's subject or named in the request body or query.

#### Scenario: Another user's records
- **WHEN** user X reads, edits or deletes user Y's note, moves Y's card, moves X's card into Y's deck, or creates a note with Y's note type or in Y's deck
- **THEN** each response is 404, and Y's data is unchanged
