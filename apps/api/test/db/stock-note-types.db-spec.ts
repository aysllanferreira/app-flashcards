import { asc, eq } from 'drizzle-orm';
import { cardTemplates } from '../../src/modules/note-types/schema/card-templates.js';
import { noteTypeFields } from '../../src/modules/note-types/schema/note-type-fields.js';
import { noteTypes } from '../../src/modules/note-types/schema/note-types.js';
import { copyStockNoteTypes } from '../../src/modules/note-types/stock-note-types.js';
import { createUser, useTestDatabase } from './helpers.js';

const t = useTestDatabase();

describe('built-in note types', () => {
  it('copies Basic, Basic (and reversed card) and Cloze into a user', async () => {
    const user = await createUser(t.db);
    const created = await copyStockNoteTypes(t.db, user.id);

    const rows = await t.db
      .select()
      .from(noteTypes)
      .where(eq(noteTypes.userId, user.id))
      .orderBy(asc(noteTypes.name));
    expect(rows.map((r) => [r.name, r.kind])).toEqual([
      ['Basic', 'standard'],
      ['Basic (and reversed card)', 'standard'],
      ['Cloze', 'cloze'],
    ]);

    const templateCount = async (noteTypeId: string) =>
      (
        await t.db
          .select()
          .from(cardTemplates)
          .where(eq(cardTemplates.noteTypeId, noteTypeId))
      ).length;
    const [basic, reversed, cloze] = created;
    expect(await templateCount(basic.id)).toBe(1);
    expect(await templateCount(reversed.id)).toBe(2);
    expect(await templateCount(cloze.id)).toBe(1);
  });

  it('gives fields stable keys and owns every row by the user', async () => {
    const user = await createUser(t.db);
    const [, reversed] = await copyStockNoteTypes(t.db, user.id);

    const fields = await t.db
      .select()
      .from(noteTypeFields)
      .where(eq(noteTypeFields.noteTypeId, reversed.id))
      .orderBy(asc(noteTypeFields.ord));
    expect(fields.map((f) => [f.key, f.name, f.userId])).toEqual([
      [1, 'Front', user.id],
      [2, 'Back', user.id],
    ]);
    expect(reversed).toMatchObject({ sortFieldKey: 1, nextFieldKey: 3 });

    const templates = await t.db
      .select()
      .from(cardTemplates)
      .where(eq(cardTemplates.noteTypeId, reversed.id))
      .orderBy(asc(cardTemplates.ord));
    expect(templates.map((tpl) => [tpl.name, tpl.frontHtml])).toEqual([
      ['Card 1', '{{Front}}'],
      ['Card 2', '{{Back}}'],
    ]);
  });

  it('gives each user their own copies', async () => {
    const a = await createUser(t.db);
    const b = await createUser(t.db);
    const [basicA] = await copyStockNoteTypes(t.db, a.id);
    const [basicB] = await copyStockNoteTypes(t.db, b.id);

    expect(basicA.id).not.toBe(basicB.id);
    expect([basicA.userId, basicB.userId]).toEqual([a.id, b.id]);
  });
});
