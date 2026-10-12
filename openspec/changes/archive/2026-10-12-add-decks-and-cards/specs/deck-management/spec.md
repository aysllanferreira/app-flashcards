## Purpose

Lets a signed-in user organize their cards into nested decks through the API: list their decks with how many cards are new, due and in total, and create, rename, move and delete decks.

## ADDED Requirements

### Requirement: List decks with card counts
`GET /decks` SHALL return every deck of the caller and no other user's deck. Each deck SHALL have its `id`, `parentId` (null for a top-level deck), `name`, `description`, and two sets of counts: the deck's own cards and the cards of the deck and all of its subdecks. Each set SHALL count `new` cards (state `new`, not suspended), `due` cards (state not `new`, not suspended, not buried at the time of the request, and `due_at` not later than the time of the request) and `total` cards (all cards, including suspended ones).

#### Scenario: Counts for a deck with a subdeck
- **WHEN** deck A has 2 new cards, 1 review card due an hour ago, 1 review card due tomorrow and 1 suspended new card, its subdeck B has 1 new card and 1 learning card due now, and the caller requests `GET /decks`
- **THEN** A's own counts are new 2, due 1, total 5, A's counts including subdecks are new 3, due 2, total 7, and B's own and subtree counts are both new 1, due 1, total 2

#### Scenario: Buried card is not due
- **WHEN** a review card is due an hour ago but buried until tomorrow
- **THEN** it is counted in `total` and not in `due`

#### Scenario: Another user's decks are not listed
- **WHEN** users X and Y each have decks and X requests `GET /decks`
- **THEN** the response contains only X's decks

### Requirement: Create a deck
`POST /decks` SHALL create a deck for the caller from a `name`, an optional `description` (default empty) and an optional `parentId` (default top-level), using the caller's preset named "Default", and SHALL answer 201 with the new deck in the same shape as `GET /decks/{id}`. Leading and trailing whitespace SHALL be trimmed from the name.

#### Scenario: Top-level deck
- **WHEN** the caller posts `{"name": "  Spanish "}`
- **THEN** the response is 201 with `name` `Spanish`, `parentId` null, and all counts 0

#### Scenario: Subdeck
- **WHEN** the caller posts `{"name": "Verbs", "parentId": "<id of Spanish>"}`
- **THEN** the response is 201 and the new deck's `parentId` is Spanish's id

### Requirement: Read and update a deck
`GET /decks/{id}` SHALL return one of the caller's decks with its counts and a `deleteImpact` stating how many subdecks, cards and notes deleting it would delete. `PATCH /decks/{id}` SHALL change any of `name`, `description` and `parentId` (`null` makes the deck top-level) and return the updated deck. Moving a deck SHALL move its subdecks and cards with it. A deck SHALL NOT be moved under itself or under one of its own subdecks: such a request SHALL be answered with 400 and change nothing.

#### Scenario: Delete impact
- **WHEN** deck A has subdeck B, A and B hold 5 cards, 3 notes have cards only in A and B, and 1 note also has a card in deck C, and the caller requests `GET /decks/{id}` for A
- **THEN** `deleteImpact` is 1 subdeck, 5 cards and 3 notes

#### Scenario: Rename
- **WHEN** the caller patches a deck with `{"name": "Español"}`
- **THEN** the response is 200 with the new name, and `GET /decks` shows it

#### Scenario: Move under another deck
- **WHEN** the caller patches deck B with `{"parentId": "<id of A>"}`
- **THEN** B's `parentId` is A's id, and A's subtree counts now include B's cards

#### Scenario: Move into its own subtree
- **WHEN** deck A has subdeck B and the caller patches A with `{"parentId": "<id of B>"}` or `{"parentId": "<id of A>"}`
- **THEN** the response is 400 with an `ErrorResponse` body, and both decks are unchanged

### Requirement: Deck names
A deck name SHALL NOT be blank after trimming. Two decks with the same parent (or two top-level decks) of the same user SHALL NOT have the same name, while the same name SHALL be allowed under different parents.

#### Scenario: Blank name
- **WHEN** the caller creates or renames a deck to `"   "`
- **THEN** the response is 400 with an `ErrorResponse` body

#### Scenario: Duplicate sibling name
- **WHEN** the caller already has a top-level deck `Spanish` and creates another top-level deck `Spanish`, or renames or moves a deck so that it would sit next to a sibling with its name
- **THEN** the response is 409 with an `ErrorResponse` body, and nothing changes

#### Scenario: Same name under different parents
- **WHEN** the caller creates `Verbs` under `Spanish` and `Verbs` under `French`
- **THEN** both requests return 201

### Requirement: Delete a deck
`DELETE /decks/{id}` SHALL, in one transaction, delete the deck, all of its subdecks, all of their cards, and every note of the caller that is left with no cards, then answer 204. A note with at least one card in another deck SHALL remain, with that card. Review logs of the deleted cards SHALL remain, with their card and deck references cleared.

#### Scenario: Deck with a subdeck and a shared note
- **WHEN** deck A has subdeck B, note N1 has cards only in A and B, note N2 has one card in A and one in deck C, and the caller deletes A
- **THEN** A, B and their cards are gone, N1 is gone, N2 remains with its card in C, and the deleted cards' review logs remain with `card_id` and `deck_id` null

### Requirement: Decks are private to their owner
Every deck route SHALL require a session token. A deck that does not exist or belongs to another user SHALL be answered with 404 and an `ErrorResponse` body, for reads, updates and deletes, and when it is named as a `parentId`.

#### Scenario: Another user's deck
- **WHEN** user X requests `GET`, `PATCH` or `DELETE /decks/{id}` for user Y's deck, or creates a deck with Y's deck as `parentId`
- **THEN** each response is 404, and Y's deck is unchanged

#### Scenario: No session token
- **WHEN** any deck route is called without `Authorization`
- **THEN** the response is 401
