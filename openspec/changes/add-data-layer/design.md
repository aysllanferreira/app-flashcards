## Context

See proposal.md for why. The current state that shapes the approach:

- **`apps/api`:**
  - an ESM package (`"type": "module"`, `module: nodenext`), so relative imports carry `.js` extensions;
  - built by `nest build` with `rootDir: src`, so `src/x/y.ts` lands in `dist/x/y.js`;
  - scripts that need compiled decorators run from `dist`, as `pnpm --filter api openapi` already does.
- **Tests:** `pnpm --filter api test` runs two Vitest suites, unit (`*.spec.ts`) and e2e (`*.e2e-spec.ts`). `test/architecture.spec.ts` enforces the module layout.
- **Config:** `ConfigModule.forRoot({ validate })` checks `NODE_ENV`, `PORT` and `SWAGGER_UI` and loads `apps/api/.env` by default. Nothing ignores `apps/api/.env` today: the root `.gitignore` has no `.env` rule, and only `apps/web` has one.
- **Local machine:** Node 24.15 and Docker 29 (OrbStack). There is no PR CI workflow yet, only `versioning.yml`.
- **No database, ORM or table exists yet.** The model to build is the one agreed for issue #36 and drawn in the redesigned `06-data-model` (sub-issue #37).
- **Versions checked on 2026-10-12:**
  - `drizzle-orm` `latest` is 0.45.4 (released 2026-10-08) and `drizzle-kit` `latest` is 0.31.11;
  - the 1.0 line's last tagged release is `1.0.0-rc.4` (2026-06-27), with only preview builds since;
  - `pg` is 8.23.1, `uuid` is 14.0.3, and the newest Postgres 18 image is `postgres:18.6`.

## Goals / Non-Goals

**Goals:**
- Every rule in `specs/data-model` is enforced by Postgres itself and proven by a database test.
- One command starts the database, and migrations are generated, never hand-written from scratch.
- Each later feature only adds tables or columns, through the same tooling.

**Non-Goals:**
- Drizzle relational queries (`relations()`): features add them when they need them (see decision 1).
- Repositories or data-access services: features write their own queries in their services.
- Triggers, views and stored functions.
- Migrating any existing data, since there is none.

## Decisions

### 1. Drizzle 0.45 stable, pinned exactly, not the 1.0 release candidate

Pin `drizzle-orm@0.45.4` and `drizzle-kit@0.31.11`, with no caret.

- **Alternative, 1.0 RC:** it brings per-migration folders (no `_journal.json` merge conflicts) and built-in Zod generation. But its last tagged RC is three and a half months old while 0.45 keeps getting patch releases, and this code is heading to production.
- **Upgrade path:** `drizzle-kit up` converts existing migration folders to the 1.0 layout. To keep the rest of the upgrade small, the code avoids the `relations()` API, whose 1.0 replacement (`defineRelations`) differs most.
- **We don't need built-in Zod generation:** DTOs stay hand-written (decision 13).
- **Alternative, Prisma:** its central schema file fights the per-module `schema/` folders our API conventions prescribe.

### 2. node-postgres with a lazy pool

`pg` (8.23.1) through `drizzle-orm/node-postgres`, with one `Pool` per process.

- A `Pool` connects on its first query, which gives the "starts without a database" requirement for free.
- `pg` is Drizzle's primary Postgres driver and works with Neon's pooled TCP URL from a long-running server.
- **Alternative, `postgres` (postgres.js):** equally capable, with no advantage here.
- **Alternative, Neon's serverless driver:** built for edge and HTTP runtimes, not a container on EC2.

### 3. snake_case columns from camelCase keys

Tables declare camelCase keys (`userId`). Both `drizzle.config.ts` and the client pass `casing: 'snake_case'`, so the SQL reads `user_id`.

- If the two settings ever disagree, every database test fails on the first query, so a mismatch can't hide.
- **Alternative, explicit names (`uuid('user_id')`):** rejected as noise on about 120 columns.

### 4. Where tables live

Each module's `schema/` folder holds one file per table, named after the table in kebab-case: `deck-presets.ts`, `note-type-fields.ts` and so on.

| Module | Tables |
|---|---|
| `users` | `users` |
| `decks` | `deck_presets`, `decks` |
| `note-types` | `note_types`, `note_type_fields`, `card_templates` (plus `stock-note-types.ts`, decision 12) |
| `notes` | `notes`, `note_media` |
| `cards` | `cards` |
| `reviews` | `review_logs` |
| `media` | `media`, `tts_clips` |
| `imports` | `import_jobs` |

- Every module folder gets an empty `@Module({})` `<name>.module.ts`, imported in `AppModule`, to satisfy the existing layout test. Controllers and services arrive with the features.
- Cross-module foreign keys import the other module's table. The dependency graph has no cycles: users, then decks and note-types, then notes, then cards, then reviews; media is linked through `note_media`.
- `drizzle.config.ts` uses `schema: './src/modules/*/schema/*.ts'` and `out: './drizzle'`.
- The architecture test gains a rule: any file under `src/` containing `pgTable(` must sit in `modules/<name>/schema/`.

### 5. IDs: UUIDv7 from the app, with the database as fallback

A shared column helper in `src/database/columns.ts` returns `uuid().primaryKey().$defaultFn(() => uuidv7()).default(sql\`uuidv7()\`)`, using `v7` from the `uuid` package.

- `$defaultFn` runs only inside Drizzle inserts, so the app knows IDs before it writes. That lets one transaction insert a note and its cards, and lets clients supply review log IDs.
- The SQL default (Postgres 18's native `uuidv7()`) covers raw SQL and the seed.
- Node's `crypto.randomUUID()` produces v4, which scatters inserts across the index; v7 is time-ordered.
- The same file also exports the `createdAt`/`updatedAt` pair (`timestamp({ withTimezone: true }).notNull().defaultNow()`, with `updatedAt` using `$onUpdate(() => new Date())`).
- The `userId()` owner column (`uuid().notNull()` referencing `users` with ON DELETE CASCADE) is exported next to the table, from `src/modules/users/schema/users.ts`. That way `src/database/` never imports from `src/modules`.

### 6. Ownership through composite foreign keys, with NO ACTION for "in use"

**Composite keys.** Every referenced user-owned table declares `unique().on(t.id, t.userId)`. Required references use `foreignKey({ columns: [t.deckId, t.userId], foreignColumns: [decks.id, decks.userId] })`, so a reference can't cross users.

**`user_id` on child tables.** `note_type_fields`, `card_templates` and `note_media` also carry `user_id`. That makes "every user-owned row has `user_id`" literally true and lets `cards` reference `(template_id, user_id)`.

**Delete actions:**

| Reference | On delete | Why |
|---|---|---|
| anything to `users` | CASCADE | account deletion removes everything |
| `decks.parent_id` | CASCADE | subdecks go with their parent, as in Anki |
| `decks.preset_id`, `notes.note_type_id` | **NO ACTION** | "in use" can't be deleted |
| `note_type_fields`, `card_templates` to `note_types` | CASCADE | parts of the note type |
| `cards` to `notes`, `card_templates`, `decks` | CASCADE | a card can't exist without them |
| `note_media` to `notes`, `media` | CASCADE | a link without both ends is meaningless |
| `review_logs.card_id`, `review_logs.deck_id`, `import_jobs.deck_id` | SET NULL | history and job records outlive their targets |

- **NO ACTION, not RESTRICT.** RESTRICT is checked immediately, so deleting a user could fail when the cascade reaches `deck_presets` before `decks`. NO ACTION is checked at the end of the statement, after the cascade has removed the decks too. The "deleting a user removes everything" test proves this.
- **SET NULL references are single-column.** Drizzle can't emit Postgres's column-list form `ON DELETE SET NULL (card_id)`. A composite foreign key with plain SET NULL would also null `user_id`, which is NOT NULL. So these three are single-column foreign keys, and the services that write them look targets up by `user_id` (spec: Every user-owned row belongs to exactly one user).

### 7. Columns

Every table follows these defaults:
- `id` from decision 5;
- `user_id` (except `tts_clips`);
- `created_at`, plus `updated_at` on tables whose rows change (not on `review_logs`, `note_media` or `tts_clips`);
- NOT NULL unless the column is marked null below.

Enumerations are `text` with a TypeScript union (`text({ enum: [...] })`) and a `check()` constraint. A Postgres enum type can't drop a value.

- **users:**
  - `clerk_user_id text` unique;
  - `email text` null (Clerk accounts can be phone- or username-only);
  - `timezone text` default `'UTC'`;
  - `day_rollover_hour smallint` default 4, check 0–23;
  - `reminders_on boolean` default true.
- **deck_presets:**
  - `name text`;
  - `new_per_day integer` default 20, and `reviews_per_day integer` default 200, both ≥ 0;
  - `learning_steps_s integer[]` default `{60,600}`, and `relearning_steps_s integer[]` default `{600}`;
  - `desired_retention real` default 0.9, check 0.7–0.99;
  - `max_interval_days integer` default 36500, > 0;
  - `fsrs_params real[]` null (null means the FSRS defaults).
- **decks:**
  - `name text`, check non-empty;
  - `parent_id uuid` null;
  - `preset_id uuid`;
  - `description text` default `''`;
  - `unique (user_id, parent_id, name) nulls not distinct`.
- **note_types:**
  - `name text`;
  - `kind text`, `standard|cloze`;
  - `css text` default `''`;
  - `sort_field_key smallint`;
  - `next_field_key smallint`;
  - `source_guid text` null.
- **note_type_fields:**
  - `note_type_id uuid`;
  - `key smallint`;
  - `name text`;
  - `ord smallint`;
  - `lang text` null (BCP 47 code, for TTS);
  - `rtl boolean` default false;
  - `options jsonb` default `{}`;
  - unique `(note_type_id, key)` and `(note_type_id, name)`.

  `ord` is deliberately not unique, so reordering fields needs no deferred constraints.
- **card_templates:**
  - `note_type_id uuid`;
  - `name text`;
  - `ord smallint`;
  - `front_html text`;
  - `back_html text`;
  - unique `(note_type_id, name)`.
- **notes:**
  - `note_type_id uuid`;
  - `fields jsonb` default `{}`, check `jsonb_typeof(fields) = 'object'`;
  - `sort_field text` default `''`;
  - `tags text[]` default `{}`, with a GIN index;
  - `guid text` default `gen_random_uuid()::text`, unique `(user_id, guid)`.
- **cards:**
  - `note_id uuid`, `template_id uuid`, `cloze_index smallint` default 0, `deck_id uuid`, `position integer`;
  - `state text`, `new|learning|review|relearning`, default `new`;
  - `due_at timestamptz` default now;
  - `stability real` null, `difficulty real` null;
  - `step smallint` default 0, `reps integer` default 0, `lapses integer` default 0;
  - `last_review_at timestamptz` null;
  - `suspended boolean` default false;
  - `buried_until timestamptz` null;
  - `flag smallint` default 0, check 0–7;
  - unique `(note_id, template_id, cloze_index)`.
- **review_logs:**
  - `card_id uuid` null, `deck_id uuid` null;
  - `rating smallint`, check 1–4;
  - `kind text`, `learn|review|relearn|manual`;
  - `state_before text`, `state_after text`, both checked against the card states;
  - `due_before timestamptz` null, `due_after timestamptz`;
  - `stability_before`, `stability_after`, `difficulty_before` and `difficulty_after`, all `real` and nullable. The `*_before` values are null on a card's first review, and the `*_after` values are null after a manual reset, which returns a card to `new`;
  - `elapsed_days real`;
  - `scheduled_days integer`;
  - `duration_ms integer`, ≥ 0;
  - `reviewed_at timestamptz`.

  Because the state before and after is stored, an undo restores the card from `*_before`.
- **media:**
  - `sha256 text`, check 64 hex characters, unique `(user_id, sha256)`;
  - `s3_key text` unique;
  - `filename text`;
  - `content_type text`;
  - `size_bytes integer`, ≥ 0.
- **note_media:** `user_id`, `note_id`, `media_id`, with primary key `(note_id, media_id)`.
- **tts_clips:**
  - `hash text` primary key (hex SHA-256 of `lang|voice|text`);
  - `lang text`, `voice text`;
  - `s3_key text` unique;
  - `created_at`, `last_used_at timestamptz`.
- **import_jobs:**
  - `deck_id uuid` null;
  - `s3_key text`;
  - `format text`, `csv|apkg`;
  - `status text`, `pending|running|done|failed`, default `pending`;
  - `notes_total integer` null, `notes_done integer` default 0;
  - `error text` null;
  - `finished_at timestamptz` null;
  - an index on `deck_id`, so a deck delete doesn't scan every job.

### 8. Indexes

**Study queues (partial):**

```sql
cards_review_queue_idx   ON cards (deck_id, due_at)   WHERE state <> 'new' AND suspended = false
cards_new_queue_idx      ON cards (deck_id, position) WHERE state =  'new' AND suspended = false
cards_reminders_idx      ON cards (user_id, due_at)   WHERE state <> 'new' AND suspended = false
```

Queries must repeat the predicates exactly (`state <> 'new' AND suspended = false`) so the planner can use these indexes. Burying is filtered at query time (`buried_until IS NULL OR buried_until <= now()`): `now()` isn't immutable, so it can't appear in an index predicate.

**Foreign keys that cascade or are checked often** get an index that starts with the foreign key column:
- `cards (template_id)` and `cards (deck_id)`;
- `cards (note_id)`, served by the unique `(note_id, template_id, cloze_index)`;
- `notes (note_type_id)`;
- `review_logs (card_id, reviewed_at)` and `review_logs (deck_id, reviewed_at)`, which also serve per-deck statistics;
- `review_logs (user_id, reviewed_at)`, for daily limits and statistics;
- `note_media (media_id)`.

`user_id` alone isn't indexed on `cards`. Deleting an account scans `cards`, which is acceptable for a rare operation (see Risks).

### 9. Local Postgres in Docker

`compose.yaml` at the repo root:
- **Image and credentials:** service `db`, image `postgres:18.6`. `POSTGRES_USER`, `POSTGRES_PASSWORD` and `POSTGRES_DB` are all `flashcards`, local-only credentials that are safe to commit.
- **Port:** `127.0.0.1:5432:5432`, so only this machine can reach it.
- **Volume:** `pgdata:/var/lib/postgresql`. The Postgres 18 images keep data in a versioned subfolder of that path, so the volume mounts the parent.
- **Init script:** `./docker/postgres/init:/docker-entrypoint-initdb.d:ro` with `01-test-database.sql`, which runs `CREATE DATABASE flashcards_test`. Init scripts only run on an empty volume.
- **Health check:** `pg_isready -U flashcards -d flashcards` every 2 s, so `--wait` returns only once the database is ready.

The local URLs are `postgres://flashcards:flashcards@localhost:5432/flashcards` (app) and `.../flashcards_test` (tests).

### 10. Environment and the database module

**`src/config/env.ts`:**
- `DATABASE_URL` is `z.url({ protocol: /^postgres(ql)?$/ })`, optional in the schema.
- A refinement adds an error on `DATABASE_URL` when `NODE_ENV` is `production` and the variable is missing; otherwise it defaults to the local URL.
- `validateEnv` already names the failing path in its message.
- The default keeps `dev`, the e2e tests and `pnpm --filter api openapi` working without any `.env`.

**`src/database/`:**
- `database.module.ts`: a `@Global()` module exporting a `DB` injection token (the Drizzle instance, typed `Database`).
- `database.providers.ts`: builds the `Pool` from `ConfigService` and the Drizzle client with `casing: 'snake_case'`, and closes the pool in `onApplicationShutdown`.
- The module and its providers import nothing from `src/modules`, and no file is named `*.service.ts`, so the existing layout rule holds. `AppModule` imports `DatabaseModule`. The seed script (decision 14) is the one file here that imports module tables, because it fills them.

**`.env` handling:**
- `apps/api/.env.example` documents `DATABASE_URL`.
- The root `.gitignore` gains `.env`, `.env.*` and `!.env.example`, so a real `apps/api/.env` is never committed.
- `drizzle.config.ts` reads `process.env.DATABASE_URL` with the same local default.

### 11. Scripts and the database test suite

**Scripts** in `apps/api/package.json`:
- `db:generate`: `drizzle-kit generate`;
- `db:migrate`: `drizzle-kit migrate`;
- `db:seed`: `nest build && node dist/database/seed.js`;
- `test`: `vitest run && vitest run --config ./vitest.config.e2e.ts && vitest run --config ./vitest.config.db.ts`;
- `test:db`: the database suite alone.

**`vitest.config.db.ts`:**
- includes `test/db/**/*.db-spec.ts`. The unit pattern `**/*.spec.ts` doesn't match `*.db-spec.ts`, so the suites don't overlap;
- runs `fileParallelism: false`;
- uses `globalSetup: test/db/global-setup.ts`.

**Global setup:**
- connects to `TEST_DATABASE_URL`, defaulting to the local `flashcards_test` URL;
- refuses any database whose name doesn't end in `_test`, so the suite can never touch the app database;
- on a connection failure, throws `Database unreachable at <host>:<port>. Start it with "docker compose up -d --wait db" from the repo root.`;
- otherwise runs `migrate(db, { migrationsFolder: 'drizzle' })`. It uses the same migrations table as `drizzle-kit migrate`.

**`test/db/test-database.ts`:** the test URL, the `_test` name guard and a `connectTestDatabase()` helper shared by the global setup and the test files.

**`test/db/helpers.ts`:**
- `resetDatabase()` truncates every table in the `public` schema in `beforeEach`, so tables added later are covered without changing it;
- small factories (`createUser`, `createDeck`, `createNote` and so on);
- `expectPgError(promise, code)`, which reads the code from `err.cause.code` (Drizzle 0.45 wraps driver errors in `DrizzleQueryError`) or `err.code`: `23505` unique, `23503` foreign key, `23514` check.

### 12. Built-in note types in code

`src/modules/note-types/stock-note-types.ts` exports the definitions and `copyStockNoteTypes(db, userId)`, which inserts them in one transaction and accepts a Drizzle database or transaction. Templates use Anki's syntax, so `.apkg` note types render the same way later:

- **Basic:**
  - fields Front (key 1) and Back (key 2);
  - template "Card 1": front `{{Front}}`, back `{{FrontSide}}<hr id=answer>{{Back}}`.
- **Basic (and reversed):** the Basic fields, plus template "Card 2": front `{{Back}}`, back `{{FrontSide}}<hr id=answer>{{Front}}`.
- **Cloze:**
  - kind `cloze`, with fields Text (key 1) and Back Extra (key 2);
  - template "Cloze": front `{{cloze:Text}}`, back `{{cloze:Text}}<br>{{Back Extra}}`.

Each gets `sort_field_key = 1` and `next_field_key = 3`. It's a plain function, not a service, because the seed calls it outside Nest. User sync (a later change) will call it from a service.

### 13. DTOs stay independent of tables

This change adds no DTOs. Later features keep hand-writing Zod schemas in `dto/` rather than deriving them from tables, so a column change can't silently change the public contract in `openapi.json`.

### 14. The seed

`src/database/seed.ts`:
- **Refuses to run** when `NODE_ENV=production`, and also when the URL's host isn't `localhost` or `127.0.0.1`, so a mistyped URL can't reach Neon.
- **Clears everything** by truncating every table in the `public` schema, then creates, with a fixed-seed random generator so runs are reproducible:
  - user `seed_demo_user` and a "Default" preset;
  - decks `Spanish`, `Spanish::Verbs`, `Spanish::Nouns` and `French` (nested through `parent_id`);
  - the built-in note types;
  - 4,500 Basic (and reversed) notes (9,000 cards), 500 Basic notes (500 cards) and 250 two-deletion Cloze notes (500 cards), 10,000 cards in all.
- **Spreads the cards** across states (about 60% new, 10% learning, 25% review, 5% relearning), due dates from -30 to +90 days, and about 2% suspended.
- **Adds 2–5 review logs** per non-new card.
- **Batches inserts** 1,000 rows at a time and ends with `ANALYZE`, so `EXPLAIN` sees real statistics.

### 15. System design edits

All edits go through the Excalidraw+ MCP on the existing scenes, checked with `take_screenshot`, and each pair is exported from the scene:
- **06** is rebuilt from scratch in the `06-data-model` scene, keeping the existing colours: blue for content, green for study, orange for jobs, plus a new group for media and TTS. It shows all 13 tables, a conventions note and a hot-path note with the indexes from decision 8.
- **03, 04, 05 and 08** get targeted `edit_scene_content` changes to the labels named in the proposal.

## Risks / Trade-offs

- **[drizzle-kit can't resolve the `.js` import specifiers between schema files]** → `db:generate` runs as early as sub-issue #38 on the `users` table alone, and cross-module imports start in #39. If resolution fails there, point `drizzle.config.ts` at the compiled `dist/modules/*/schema/*.js` (`nest build` first, as `openapi` does) and record the change in this design.
- **[Upgrading to Drizzle 1.0 later]** → `drizzle-kit up` converts the migration folders, and avoiding `relations()` keeps the code change small. Pinned versions mean nothing moves until we choose to.
- **[The database can't check that a card's template belongs to its note's note type]** → that would need `note_type_id` on `cards`. The card-generation code (decks and cards feature) owns this rule and tests it.
- **[Ownership of the three SET NULL references is checked in code, not by the database]** → the services that write review logs and import jobs look targets up by `user_id`. Their features add tests for it.
- **[`updated_at` is set by Drizzle, not by a trigger]** → raw SQL updates must set it themselves. Acceptable while every write goes through Drizzle; add a trigger if that changes.
- **[`pnpm test` now needs Docker]** → the database suite fails fast with the exact command to run. The CI/CD roadmap item adds a Postgres service to CI.
- **[Deleting an account scans `cards`]** → it's rare and can move to a background job later; add `cards (user_id)` if it shows up in monitoring.
- **[The `UNIQUE (id, user_id)` on every referenced table adds one index each]** → the cost of database-enforced ownership. These tables are written far less often than they are read.
- **[The shared `tts_clips` cache keeps audio of a deleted user's text]** → recorded as an accepted trade-off in the system design. A later job deletes clips whose `last_used_at` is older than N days.
- **[`docker compose up` fails when port 5432 is already in use by a local Postgres]** → the README tells the developer to stop it. The port stays 5432 because the acceptance criteria name it.

## Migration Plan

Nothing is deployed yet, so there is no data to migrate and no rollback beyond `docker compose down -v`. Drizzle has no down migrations, so a bad migration is fixed with a new forward migration. When the AWS environment ships, the deploy runs `db:migrate` against Neon's direct URL before switching containers, as `07-cicd` already shows.

## Open Questions

- Does Neon offer Postgres 18 in the chosen region when production is set up? If not, drop the SQL `uuidv7()` default in a migration and rely on the app-side default, which all Drizzle inserts already use.
