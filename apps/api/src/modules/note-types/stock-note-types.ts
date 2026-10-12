import type { NodePgQueryResultHKT } from 'drizzle-orm/node-postgres';
import type { PgDatabase } from 'drizzle-orm/pg-core';
import { cardTemplates } from './schema/card-templates.js';
import { noteTypeFields } from './schema/note-type-fields.js';
import { noteTypes, type NOTE_TYPE_KINDS } from './schema/note-types.js';

// A Drizzle database or a transaction on it.
type Db = PgDatabase<NodePgQueryResultHKT>;

interface StockNoteType {
  name: string;
  kind: (typeof NOTE_TYPE_KINDS)[number];
  css: string;
  fields: { key: number; name: string }[];
  templates: { name: string; frontHtml: string; backHtml: string }[];
}

// Anki's default card styling.
const CARD_CSS = `.card {
  font-family: arial;
  font-size: 20px;
  text-align: center;
  color: black;
  background-color: white;
}
`;

const FRONT_BACK = [
  { key: 1, name: 'Front' },
  { key: 2, name: 'Back' },
];

// The note types every account starts with, in Anki's template syntax so
// imported .apkg note types render the same way. They're definitions, not
// rows: copyStockNoteTypes() gives each user their own editable copies.
export const STOCK_NOTE_TYPES: readonly StockNoteType[] = [
  {
    name: 'Basic',
    kind: 'standard',
    css: CARD_CSS,
    fields: FRONT_BACK,
    templates: [
      {
        name: 'Card 1',
        frontHtml: '{{Front}}',
        backHtml: '{{FrontSide}}\n\n<hr id=answer>\n\n{{Back}}',
      },
    ],
  },
  {
    name: 'Basic (and reversed card)',
    kind: 'standard',
    css: CARD_CSS,
    fields: FRONT_BACK,
    templates: [
      {
        name: 'Card 1',
        frontHtml: '{{Front}}',
        backHtml: '{{FrontSide}}\n\n<hr id=answer>\n\n{{Back}}',
      },
      {
        name: 'Card 2',
        frontHtml: '{{Back}}',
        backHtml: '{{FrontSide}}\n\n<hr id=answer>\n\n{{Front}}',
      },
    ],
  },
  {
    name: 'Cloze',
    kind: 'cloze',
    css: `${CARD_CSS}
.cloze {
  font-weight: bold;
  color: blue;
}
`,
    fields: [
      { key: 1, name: 'Text' },
      { key: 2, name: 'Back Extra' },
    ],
    templates: [
      {
        name: 'Cloze',
        frontHtml: '{{cloze:Text}}',
        backHtml: '{{cloze:Text}}<br>\n{{Back Extra}}',
      },
    ],
  },
];

// Copies the built-in note types into a user's account in one transaction and
// returns the new note types in STOCK_NOTE_TYPES order.
export async function copyStockNoteTypes(db: Db, userId: string) {
  return db.transaction(async (tx) => {
    const created: (typeof noteTypes.$inferSelect)[] = [];
    for (const stock of STOCK_NOTE_TYPES) {
      const [noteType] = await tx
        .insert(noteTypes)
        .values({
          userId,
          name: stock.name,
          kind: stock.kind,
          css: stock.css,
          sortFieldKey: stock.fields[0].key,
          nextFieldKey: Math.max(...stock.fields.map((f) => f.key)) + 1,
        })
        .returning();
      await tx.insert(noteTypeFields).values(
        stock.fields.map((field, ord) => ({
          userId,
          noteTypeId: noteType.id,
          key: field.key,
          name: field.name,
          ord,
        })),
      );
      await tx.insert(cardTemplates).values(
        stock.templates.map((template, ord) => ({
          userId,
          noteTypeId: noteType.id,
          ord,
          ...template,
        })),
      );
      created.push(noteType);
    }
    return created;
  });
}
