import { eq } from 'drizzle-orm';
import { decks } from '../../src/modules/decks/schema/decks.js';
import { noteTypeFields } from '../../src/modules/note-types/schema/note-type-fields.js';
import { noteTypes } from '../../src/modules/note-types/schema/note-types.js';
import {
  PG,
  createCard,
  createNote,
  createUserWithContent,
  expectPgError,
  useTestDatabase,
} from './helpers.js';

const t = useTestDatabase();

describe('content constraints', () => {
  it('allows one card per note, template and cloze index', async () => {
    const a = await createUserWithContent(t.db);
    const note = await createNote(t.db, {
      userId: a.user.id,
      noteTypeId: a.noteTypes.cloze.id,
    });
    const card = {
      userId: a.user.id,
      noteId: note.id,
      templateId: a.templates.cloze[0].id,
      deckId: a.deck.id,
      clozeIndex: 1,
    };
    await createCard(t.db, card);
    // Another cloze deletion of the same note is a different card.
    await createCard(t.db, { ...card, clozeIndex: 2 });

    await expectPgError(createCard(t.db, card), PG.uniqueViolation);
  });

  it('keeps field keys unique within a note type', async () => {
    const a = await createUserWithContent(t.db);
    await expectPgError(
      t.db.insert(noteTypeFields).values({
        userId: a.user.id,
        noteTypeId: a.noteTypes.basic.id,
        key: 1,
        name: 'Extra',
        ord: 2,
      }),
      PG.uniqueViolation,
    );
  });

  it('keeps sibling deck names unique, top-level decks included', async () => {
    const a = await createUserWithContent(t.db); // has a top-level "Spanish"
    const deck = (name: string, parentId?: string) =>
      t.db.insert(decks).values({
        userId: a.user.id,
        presetId: a.preset.id,
        name,
        parentId,
      });

    await expectPgError(deck('Spanish'), PG.uniqueViolation);

    const [french] = await deck('French').returning();
    await deck('Verbs', a.deck.id);
    await expectPgError(deck('Verbs', a.deck.id), PG.uniqueViolation);
    // The same name under a different parent is fine.
    await expect(deck('Verbs', french.id)).resolves.toBeDefined();
  });

  it('rejects an unknown card state and a flag outside 0..7', async () => {
    const a = await createUserWithContent(t.db);
    const note = await createNote(t.db, {
      userId: a.user.id,
      noteTypeId: a.noteTypes.basic.id,
    });
    const card = {
      userId: a.user.id,
      noteId: note.id,
      templateId: a.templates.basic[0].id,
      deckId: a.deck.id,
    };

    await expectPgError(
      // @ts-expect-error -- not one of the card states
      createCard(t.db, { ...card, state: 'graduated' }),
      PG.checkViolation,
    );
    await expectPgError(
      createCard(t.db, { ...card, flag: 8 }),
      PG.checkViolation,
    );
  });

  it('refuses to delete a note type that still has notes', async () => {
    const a = await createUserWithContent(t.db);
    await createNote(t.db, {
      userId: a.user.id,
      noteTypeId: a.noteTypes.basic.id,
    });

    await expectPgError(
      t.db.delete(noteTypes).where(eq(noteTypes.id, a.noteTypes.basic.id)),
      PG.foreignKeyViolation,
    );
    // A note type without notes can be deleted.
    await t.db.delete(noteTypes).where(eq(noteTypes.id, a.noteTypes.cloze.id));
  });
});
