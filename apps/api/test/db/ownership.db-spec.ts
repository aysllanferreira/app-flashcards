import { decks } from '../../src/modules/decks/schema/decks.js';
import {
  PG,
  createCard,
  createNote,
  createUserWithContent,
  expectPgError,
  useTestDatabase,
} from './helpers.js';

const t = useTestDatabase();

// Every required reference carries user_id, so the database itself refuses a
// row of user A that points at user B's data.
describe('ownership across users', () => {
  it("rejects a deck with another user's preset or parent deck", async () => {
    const a = await createUserWithContent(t.db);
    const b = await createUserWithContent(t.db);

    await expectPgError(
      t.db
        .insert(decks)
        .values({ userId: a.user.id, presetId: b.preset.id, name: 'X' }),
      PG.foreignKeyViolation,
    );
    await expectPgError(
      t.db.insert(decks).values({
        userId: a.user.id,
        presetId: a.preset.id,
        parentId: b.deck.id,
        name: 'Verbs',
      }),
      PG.foreignKeyViolation,
    );
  });

  it("rejects a note with another user's note type", async () => {
    const a = await createUserWithContent(t.db);
    const b = await createUserWithContent(t.db);

    await expectPgError(
      createNote(t.db, {
        userId: a.user.id,
        noteTypeId: b.noteTypes.basic.id,
      }),
      PG.foreignKeyViolation,
    );
  });

  it("rejects a card with another user's note, deck or template", async () => {
    const a = await createUserWithContent(t.db);
    const b = await createUserWithContent(t.db);
    const noteA = await createNote(t.db, {
      userId: a.user.id,
      noteTypeId: a.noteTypes.basic.id,
    });
    const noteB = await createNote(t.db, {
      userId: b.user.id,
      noteTypeId: b.noteTypes.basic.id,
    });
    const valid = {
      userId: a.user.id,
      noteId: noteA.id,
      templateId: a.templates.basic[0].id,
      deckId: a.deck.id,
    };

    await expectPgError(
      createCard(t.db, { ...valid, noteId: noteB.id }),
      PG.foreignKeyViolation,
    );
    await expectPgError(
      createCard(t.db, { ...valid, deckId: b.deck.id }),
      PG.foreignKeyViolation,
    );
    await expectPgError(
      createCard(t.db, { ...valid, templateId: b.templates.basic[0].id }),
      PG.foreignKeyViolation,
    );
    // The same card with A's own rows is accepted.
    await expect(createCard(t.db, valid)).resolves.toMatchObject({
      state: 'new',
      clozeIndex: 0,
    });
  });
});
