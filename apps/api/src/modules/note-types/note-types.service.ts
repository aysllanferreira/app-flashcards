import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, eq, inArray } from 'drizzle-orm';
import { DB, type Database } from '../../database/database.providers.js';
import type { NoteType } from './dto/note-type.dto.js';
import { cardTemplates } from './schema/card-templates.js';
import { noteTypeFields } from './schema/note-type-fields.js';
import { noteTypes } from './schema/note-types.js';

type Reader = Pick<Database, 'select'>;

@Injectable()
export class NoteTypesService {
  constructor(@Inject(DB) private readonly db: Database) {}

  /** The user's note types, oldest first, with fields and templates. */
  list(userId: string): Promise<NoteType[]> {
    return this.load(this.db, userId);
  }

  /** One of the user's note types; 404 when it isn't theirs. */
  async get(userId: string, id: string, db: Reader = this.db): Promise<NoteType> {
    const [noteType] = await this.load(db, userId, id);
    if (!noteType) throw new NotFoundException('Note type not found');
    return noteType;
  }

  private async load(db: Reader, userId: string, id?: string): Promise<NoteType[]> {
    const types = await db
      .select({
        id: noteTypes.id,
        name: noteTypes.name,
        kind: noteTypes.kind,
        css: noteTypes.css,
        sortFieldKey: noteTypes.sortFieldKey,
      })
      .from(noteTypes)
      .where(
        and(eq(noteTypes.userId, userId), id ? eq(noteTypes.id, id) : undefined),
      )
      .orderBy(asc(noteTypes.createdAt), asc(noteTypes.id));
    if (types.length === 0) return [];

    const ids = types.map((t) => t.id);
    const fields = await db
      .select()
      .from(noteTypeFields)
      .where(inArray(noteTypeFields.noteTypeId, ids))
      .orderBy(asc(noteTypeFields.ord), asc(noteTypeFields.key));
    const templates = await db
      .select()
      .from(cardTemplates)
      .where(inArray(cardTemplates.noteTypeId, ids))
      .orderBy(asc(cardTemplates.ord));

    return types.map((type) => ({
      ...type,
      fields: fields
        .filter((f) => f.noteTypeId === type.id)
        .map(({ key, name, ord }) => ({ key, name, ord })),
      templates: templates
        .filter((t) => t.noteTypeId === type.id)
        .map(({ id, name, ord, frontHtml, backHtml }) => ({ id, name, ord, frontHtml, backHtml })),
    }));
  }
}
