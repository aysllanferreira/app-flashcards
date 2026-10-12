# data-model Specification

## Purpose

Defines the Postgres tables behind the flashcards app and the rules the database itself enforces: per-user ownership, the Anki-style note type, note and card model, FSRS scheduling state, review history, media, the shared TTS cache, import jobs and the indexes behind the study queues.

## Requirements

### Requirement: Every user-owned row belongs to exactly one user
Every table except `tts_clips` SHALL carry a non-null `user_id` that references `users`, and deleting a user SHALL delete every row that user owns. A required reference from one user-owned row to another SHALL include `user_id`, so the database rejects a row that points at another user's data. The nullable references `review_logs.card_id`, `review_logs.deck_id` and `import_jobs.deck_id` SHALL be cleared when their target is deleted instead, and their ownership SHALL be checked by the code that writes them.

#### Scenario: Cross-user reference is rejected
- **WHEN** a card is inserted for user A with a `deck_id` that belongs to user B
- **THEN** the insert fails with a foreign key violation

#### Scenario: Deleting a user removes everything they own
- **WHEN** a user with presets, decks, note types, notes, cards, review logs, media and import jobs is deleted
- **THEN** no row with that `user_id` remains in any table

### Requirement: Identifiers are time-ordered UUIDs
Every primary key except those of `tts_clips` and `note_media` SHALL be a version 7 UUID. When an insert omits the id, one SHALL be assigned; a caller MAY supply its own id.

#### Scenario: Assigned id is a version 7 UUID
- **WHEN** a user is inserted without an id
- **THEN** `uuid_extract_version(id)` returns 7 for the stored row

### Requirement: Users map to Clerk accounts
`users` SHALL hold one row per Clerk account, with `clerk_user_id` unique, a `timezone` defaulting to `UTC`, a `day_rollover_hour` from 0 to 23 defaulting to 4, and a `reminders_on` flag.

#### Scenario: Duplicate Clerk account is rejected
- **WHEN** a second user is inserted with an existing `clerk_user_id`
- **THEN** the insert fails with a unique violation

#### Scenario: Day rollover is bounded
- **WHEN** a user is inserted with `day_rollover_hour` 24
- **THEN** the insert fails with a check violation

### Requirement: Content is modeled as note types, notes and cards
A note type SHALL have a kind, `standard` or `cloze`, a set of fields and a set of card templates. A note SHALL belong to one note type and hold the field values. A card SHALL belong to one note and one card template, with a `cloze_index` that is 0 for standard note types, and there SHALL be at most one card per `(note_id, template_id, cloze_index)`. Deleting a card template SHALL delete its cards, deleting a note SHALL delete its cards, and deleting a note type that still has notes SHALL be rejected.

#### Scenario: Duplicate card is rejected
- **WHEN** a second card is inserted with the same `note_id`, `template_id` and `cloze_index`
- **THEN** the insert fails with a unique violation

#### Scenario: Deleting a template deletes its cards
- **WHEN** the second template of a Basic (and reversed) note type is deleted
- **THEN** every card generated from that template is deleted, and the cards of the first template remain

#### Scenario: Note type in use cannot be deleted
- **WHEN** a note type that has at least one note is deleted
- **THEN** the delete fails with a foreign key violation

### Requirement: Field values are keyed by stable field keys
Each field of a note type SHALL have a `key` that is unique within the note type and never reused after the field is deleted, and a name that is unique within the note type. A note SHALL store its field values as a JSON object keyed by field key, so renaming or reordering fields SHALL NOT require changing any note.

#### Scenario: Duplicate field key is rejected
- **WHEN** a second field with an existing `key` is added to a note type
- **THEN** the insert fails with a unique violation

#### Scenario: Renaming a field leaves notes untouched
- **WHEN** a field of a note type is renamed and moved to another position
- **THEN** the stored `fields` of that note type's notes are unchanged and still hold the value under the same key

### Requirement: Built-in note types are copied into each account
The system SHALL define the built-in note types Basic (one template), Basic (and reversed) (two templates) and Cloze (kind `cloze`, one template) and SHALL be able to copy them into a given user's account as rows owned by that user, so each user can change their copies without affecting anyone else.

#### Scenario: Copying the built-in note types
- **WHEN** the built-in note types are copied into a user
- **THEN** that user owns a Basic note type with 1 template, a Basic (and reversed) note type with 2 templates and a Cloze note type of kind `cloze`

### Requirement: Decks nest and share option presets
A deck SHALL have an optional parent deck of the same user and SHALL use one of that user's presets. Sibling decks SHALL have distinct names, top-level decks included, while the same name SHALL be allowed under different parents. Deleting a deck SHALL delete its subdecks and their cards, and deleting a preset that a deck uses SHALL be rejected. A preset SHALL hold the daily new and review limits, learning and relearning steps, the desired retention, the maximum interval and optional FSRS parameters.

#### Scenario: Duplicate sibling name is rejected
- **WHEN** a user creates two top-level decks named `Spanish`, or two decks named `Verbs` under the same parent
- **THEN** the second insert fails with a unique violation

#### Scenario: Same name under different parents is accepted
- **WHEN** a user creates a deck named `Verbs` under `Spanish` and another under `French`
- **THEN** both inserts succeed

### Requirement: Cards carry FSRS scheduling state
Each card SHALL carry its deck, its position in the new-card queue and its FSRS scheduling state: `state` (one of `new`, `learning`, `review`, `relearning`), `due_at`, `stability`, `difficulty`, the learning `step`, `reps`, `lapses` and `last_review_at`, plus `suspended`, `buried_until` and a `flag` from 0 to 7.

#### Scenario: Unknown state is rejected
- **WHEN** a card is inserted with `state` set to `graduated`
- **THEN** the insert fails with a check violation

#### Scenario: Flag out of range is rejected
- **WHEN** a card is inserted with `flag` 8
- **THEN** the insert fails with a check violation

### Requirement: Review history is recorded in full and outlives its card
Each review SHALL be stored once in `review_logs`, under an id the client may supply, with the rating (1 to 4), the review kind (`learn`, `review`, `relearn` or `manual`), the state, due date, stability and difficulty before and after the review, the elapsed and scheduled days, the time spent and the review time. Deleting a card or a deck SHALL keep its review logs and clear the reference.

#### Scenario: A retried review is stored once
- **WHEN** a review log is inserted with an id that already exists
- **THEN** the insert fails with a unique violation and only the first row remains

#### Scenario: Rating out of range is rejected
- **WHEN** a review log is inserted with `rating` 5
- **THEN** the insert fails with a check violation

#### Scenario: Deleting a card keeps its history
- **WHEN** a card with review logs is deleted
- **THEN** its review logs remain with `card_id` set to NULL

### Requirement: Media is stored once per user and linked to notes
A media row SHALL be unique per user by the SHA-256 of its content, and its storage key SHALL be unique. `note_media` SHALL link a note to a media row of the same user, and deleting either side SHALL delete the link.

#### Scenario: Same file twice for one user is rejected
- **WHEN** a user inserts a second media row with an existing `sha256`
- **THEN** the insert fails with a unique violation, while another user may insert a row with the same `sha256`

#### Scenario: Cross-user media link is rejected
- **WHEN** a `note_media` row links user A's note to user B's media
- **THEN** the insert fails with a foreign key violation

### Requirement: TTS audio is cached globally by content
`tts_clips` SHALL hold one row per hash of language, voice and text, with no owner, so every user studying the same text in the same voice shares one audio file. Deleting a user SHALL NOT delete clips, and each clip SHALL record when it was last used so unused clips can be cleaned up.

#### Scenario: Clips survive account deletion
- **WHEN** a user is deleted
- **THEN** the rows in `tts_clips` are unchanged

### Requirement: Import jobs track bulk imports
An import job SHALL record its source file key, its format (`csv` or `apkg`), its status (`pending`, `running`, `done` or `failed`), progress counters and an optional error, and SHALL keep its row with the deck reference cleared when the target deck is deleted.

#### Scenario: Unknown format is rejected
- **WHEN** an import job is inserted with `format` set to `xlsx`
- **THEN** the insert fails with a check violation

### Requirement: Study queues are served by indexes
Fetching the next review cards of a deck (cards that are not new and not suspended, due now, ordered by due date) and the next new cards of a deck (new and not suspended, ordered by position) SHALL each be answered by a partial index on `cards`, without a sequential scan of `cards`.

#### Scenario: Review queue uses its index
- **WHEN** `EXPLAIN` runs the review-queue query for one deck with `LIMIT 20` on the seeded database
- **THEN** the plan scans the review-queue partial index and contains no `Seq Scan on cards`

#### Scenario: New queue uses its index
- **WHEN** `EXPLAIN` runs the new-queue query for one deck with `LIMIT 20` on the seeded database
- **THEN** the plan scans the new-queue partial index and contains no `Seq Scan on cards`
