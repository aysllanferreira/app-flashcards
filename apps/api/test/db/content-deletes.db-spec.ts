import { eq, sql } from 'drizzle-orm';
import { cards } from '../../src/modules/cards/schema/cards.js';
import { decks } from '../../src/modules/decks/schema/decks.js';
import { cardTemplates } from '../../src/modules/note-types/schema/card-templates.js';
import { noteTypeFields } from '../../src/modules/note-types/schema/note-type-fields.js';
import { notes } from '../../src/modules/notes/schema/notes.js';
import { users } from '../../src/modules/users/schema/users.js';
import {
  createCard,
  createNote,
  createUserWithContent,
  useTestDatabase,
} from './helpers.js';

const t = useTestDatabase();

// A reversed note with its two cards in the given deck.
async function reversedNote(
  a: Awaited<ReturnType<typeof createUserWithContent>>,
  deckId = a.deck.id,
) {
  const note = await createNote(t.db, {
    userId: a.user.id,
    noteTypeId: a.noteTypes.reversed.id,
    fields: { '1': 'perro', '2': 'dog' },
  });
  for (const template of a.templates.reversed) {
    await createCard(t.db, {
      userId: a.user.id,
      noteId: note.id,
      templateId: template.id,
      deckId,
    });
  }
  return note;
}

const cardsOf = (noteId: string) =>
  t.db.select().from(cards).where(eq(cards.noteId, noteId));

describe('deletes', () => {
  it("deleting a template deletes only that template's cards", async () => {
    const a = await createUserWithContent(t.db);
    const note = await reversedNote(a);
    const [card1, card2] = a.templates.reversed;

    await t.db.delete(cardTemplates).where(eq(cardTemplates.id, card2.id));

    const left = await cardsOf(note.id);
    expect(left.map((c) => c.templateId)).toEqual([card1.id]);
  });

  it('deleting a note deletes its cards', async () => {
    const a = await createUserWithContent(t.db);
    const note = await reversedNote(a);

    await t.db.delete(notes).where(eq(notes.id, note.id));

    expect(await cardsOf(note.id)).toEqual([]);
  });

  it('deleting a deck deletes its subdecks and their cards', async () => {
    const a = await createUserWithContent(t.db);
    const [verbs] = await t.db
      .insert(decks)
      .values({
        userId: a.user.id,
        presetId: a.preset.id,
        parentId: a.deck.id,
        name: 'Verbs',
      })
      .returning();
    const note = await reversedNote(a, verbs.id);

    await t.db.delete(decks).where(eq(decks.id, a.deck.id));

    expect(
      await t.db.select().from(decks).where(eq(decks.userId, a.user.id)),
    ).toEqual([]);
    expect(await cardsOf(note.id)).toEqual([]);
  });

  it('renaming and reordering fields leaves notes untouched', async () => {
    const a = await createUserWithContent(t.db);
    const note = await reversedNote(a);
    const [front, back] = await t.db
      .select()
      .from(noteTypeFields)
      .where(eq(noteTypeFields.noteTypeId, a.noteTypes.reversed.id))
      .orderBy(noteTypeFields.ord);

    await t.db
      .update(noteTypeFields)
      .set({ name: 'Spanish', ord: 1 })
      .where(eq(noteTypeFields.id, front.id));
    await t.db
      .update(noteTypeFields)
      .set({ name: 'English', ord: 0 })
      .where(eq(noteTypeFields.id, back.id));

    const [after] = await t.db
      .select()
      .from(notes)
      .where(eq(notes.id, note.id));
    expect(after.fields).toEqual({ '1': 'perro', '2': 'dog' });
    expect(after.updatedAt).toEqual(note.updatedAt);
  });

  it("deleting a user deletes every row they own and nobody else's", async () => {
    const a = await createUserWithContent(t.db);
    const b = await createUserWithContent(t.db);
    await reversedNote(a);
    await reversedNote(b);

    await t.db.delete(users).where(eq(users.id, a.user.id));

    // Every table with a user_id column, including ones added later.
    const { rows: tables } = await t.db.execute<{ table_name: string }>(sql`
      select table_name from information_schema.columns
      where table_schema = 'public' and column_name = 'user_id'
      order by table_name`);
    expect(tables.length).toBeGreaterThanOrEqual(7);
    for (const { table_name } of tables) {
      const count = async (userId: string) => {
        const { rows } = await t.db.execute<{ n: string }>(
          sql`select count(*) as n from ${sql.identifier(table_name)} where user_id = ${userId}`,
        );
        return Number(rows[0].n);
      };
      expect(
        await count(a.user.id),
        `${table_name} rows of the deleted user`,
      ).toBe(0);
      expect(
        await count(b.user.id),
        `${table_name} rows of the other user`,
      ).toBeGreaterThan(0);
    }
  });
});
