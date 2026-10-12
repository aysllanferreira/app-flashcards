Issue: #36
Sub-issues: #37, #38, #39, #40, #41

## Why

Every MVP feature after the API foundation stores data, yet the API has no database connection, ORM or migrations. The data model in `system-design/06-data-model` can't grow into what Anki does: a card holds its own front and back text, `review_states` only fits SM-2, and `review_logs` records too little to tune FSRS or undo a review. Reshaping content tables once users have data is the most expensive migration there is, and review history that isn't recorded can't be recovered. So the schema is settled now, before the first feature writes to it.

## What Changes

Delivered in five sub-issues, each a PR into the integration branch `feat/data-layer`, then one PR into `dev`:

- **#37 System design:**
  - diagram 06 redrawn for the new model (13 tables, ownership rules, hot-path indexes);
  - diagrams 03, 04 and 05 updated to read and write the new tables;
  - diagram 08 gains `src/database` and Drizzle;
  - `system-design/README.md` records the decisions, a data model growth path and the `tts_clips` trade-off, and closes the scheduler and ORM open questions.
- **#38 Postgres in Docker and the Drizzle foundation:**
  - `compose.yaml` with a pinned `postgres:18` service and a `flashcards_test` database;
  - `DATABASE_URL` in the validated environment;
  - `src/database/`, a global Nest module that provides the Drizzle client;
  - `db:generate` and `db:migrate` scripts;
  - the `users` table;
  - a database test suite inside `pnpm --filter api test`;
  - an architecture rule that tables live only in `src/modules/<name>/schema/`.
- **#39 Content tables:**
  - `deck_presets`, `decks`, `note_types`, `note_type_fields`, `card_templates`, `notes` and `cards`, with composite foreign keys for ownership and partial indexes for the study queues;
  - the built-in note types (Basic, Basic (and reversed), Cloze) defined in code, with a function that copies them into a user's account.
- **#40 History, media and jobs:**
  - `review_logs`, `media`, `note_media`, `tts_clips` and `import_jobs`;
  - `db:seed`, which builds a realistic local dataset;
  - `EXPLAIN` checks that the study queues use their indexes.
- **#41 Conventions:**
  - a "Database" subsection and the `src/database/` folder in the API section of `CLAUDE.md`;
  - OpenSpec rules that make proposals state their data model impact and tasks cover migrations and database tests;
  - the API README's database commands.

API contract: no change. No endpoints are added, changed or removed, and `apps/api/openapi.json` stays as it is.

Data model:
- adds `users`, `deck_presets`, `decks`, `note_types`, `note_type_fields`, `card_templates`, `notes`, `cards`, `review_logs`, `media`, `note_media`, `tts_clips` and `import_jobs`;
- nothing is migrated or removed, because no database exists yet;
- relative to the old diagram, `review_states` is dropped (its state moves to `cards`), and `cards.front`, `cards.back`, `cards.text_hash` and `cards.audio_key` are replaced by notes, note types and `tts_clips`.

System design:
- **Update `06-data-model`:** redrawn with the 13 tables, keys, relationships, table conventions and hot-path queries with their indexes. The title covers Postgres in Docker locally and Neon in production.
- **Update `03-flow-study-session`:** steps 5 and 10 read and update the FSRS state on `cards` and insert into `review_logs`.
- **Update `04-flow-media-upload`:** step 7 records the file in `media` and links it to a note through `note_media`.
- **Update `05-flow-async-jobs`:** the TTS consumer checks and records `tts_clips` instead of `cards.audio_key`, and the import consumer inserts note types, notes and cards.
- **Update `08-api-structure`:** `src/database` among the cross-cutting code, `schema/` as Drizzle tables with `drizzle-kit` migrations, the planned modules (users, decks, note-types, notes, cards, reviews, media, imports, webhooks) and a Postgres database box.
- **`system-design/README.md`:**
  - descriptions of 06 and 08;
  - Decisions rows for the content model, FSRS, Drizzle with committed SQL migrations, copy-on-subscribe sharing and the table conventions, with the Database row naming Postgres 18 in Docker locally;
  - a "Data model growth path" section;
  - the `tts_clips` trade-off;
  - Open questions without the scheduler or the ORM.
- **No change to `01-context`, `02-aws-architecture` or `07-cicd`.** Neon stays the production database in 02, and 07 already runs migrations on deploy.

## Capabilities

### New Capabilities
- `data-model`: the tables and the rules they enforce, namely ownership by user with composite foreign keys, the note type / note / card content model, FSRS scheduling state, review history that outlives cards, media and the shared TTS cache, import jobs, and the indexes behind the study queues.
- `database-tooling`: the local Postgres in Docker, how migrations are generated, committed and applied, the database test suite, the dev seed, and how proposals declare their data model impact.

### Modified Capabilities
- `api-module-structure`: the layout gains `src/database/` for the database client, `schema/` holds Drizzle tables and is the only place a table may be defined (enforced by the architecture test), and the validated environment gains `DATABASE_URL`.

## Impact

- **Code (`apps/api`):**
  - new `src/database/` (module, client provider, seed);
  - new module folders `users`, `decks`, `note-types`, `notes`, `cards`, `reviews`, `media` and `imports`, each with a `<name>.module.ts` and a `schema/` folder, imported in `AppModule`;
  - `src/config/env.ts` gains `DATABASE_URL`;
  - new `drizzle.config.ts`, `drizzle/` migrations, `vitest.config.db.ts` and `test/db/` tests;
  - `package.json` scripts `db:generate`, `db:migrate` and `db:seed`, and `test` also runs the database suite;
  - new `.env.example`.
- **Repo root:** new `compose.yaml` and `docker/postgres/` init script; `.gitignore` gains `.env` rules.
- **Dependencies (`apps/api`):** `drizzle-orm`, `pg` and `uuid` (runtime); `drizzle-kit` and `@types/pg` (dev). All pinned to exact versions.
- **Developer workflow:** `pnpm --filter api test` and root `pnpm test` need `docker compose up -d --wait db` first.
- **Repo docs and rules:** a `CLAUDE.md` "Database" subsection, new `openspec/config.yaml` rules and the API README.
- **System design:** diagrams 03, 04, 05, 06 and 08 re-exported from their scenes, plus `system-design/README.md`.
- **Specs:** new `data-model` and `database-tooling`; `api-module-structure` modified.
- **Wiki:** Status, Changelog, Roadmap, Architecture and Decisions.
- **Out of scope** (from #36):
  - Neon setup and production migrations;
  - endpoints and business logic (deck and card CRUD, FSRS scheduling code, user sync, copying built-in note types at sign-up);
  - the card template renderer;
  - filtered decks, a tags table, shared-deck sync, sync tombstones, `review_logs` partitioning, full-text search and row-level security;
  - a Postgres service in CI.
