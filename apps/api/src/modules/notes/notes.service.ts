import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { cardsFor, sanitizeFieldHtml, toPlainText } from 'card-templates';
import { and, asc, eq, sql } from 'drizzle-orm';
import { DB, type Database } from '../../database/database.providers.js';
import { cards } from '../cards/schema/cards.js';
import { DecksService, type Tx } from '../decks/decks.service.js';
import type { NoteType } from '../note-types/dto/note-type.dto.js';
import { NoteTypesService } from '../note-types/note-types.service.js';
import type { CreateNoteBody, UpdateNoteBody } from './dto/note-body.dto.js';
import type { NoteWithCards } from './dto/note.dto.js';
import { notes } from './schema/notes.js';

@Injectable()
export class NotesService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly decks: DecksService,
    private readonly noteTypes: NoteTypesService,
  ) {}

  /**
   * Creates the note and every card it produces, in one transaction, all new
   * cards in the given deck. 400 when the note would produce no card.
   */
  async create(userId: string, body: CreateNoteBody): Promise<NoteWithCards> {
    const id = await this.db.transaction(async (tx) => {
      const noteType = await this.noteTypes.get(userId, body.noteTypeId, tx);
      await this.decks.requireDeck(tx, userId, body.deckId);
      const fields = cleanFields(noteType, body.fields);
      const planned = cardsFor(noteType, fields);
      if (planned.length === 0) throw noCards(noteType);

      const [note] = await tx
        .insert(notes)
        .values({
          userId,
          noteTypeId: noteType.id,
          fields,
          sortField: sortFieldOf(noteType, fields),
          tags: body.tags ?? [],
        })
        .returning({ id: notes.id });
      const position = await nextPosition(tx, userId);
      await tx.insert(cards).values(
        planned.map((card) => ({
          userId,
          noteId: note.id,
          templateId: card.templateId,
          clozeIndex: card.clozeIndex,
          deckId: body.deckId,
          position,
        })),
      );
      return note.id;
    });
    return this.get(userId, id);
  }

  async get(userId: string, id: string): Promise<NoteWithCards> {
    const [note] = await this.db
      .select()
      .from(notes)
      .where(and(eq(notes.id, id), eq(notes.userId, userId)));
    if (!note) throw noteNotFound();
    const noteCards = await this.db
      .select()
      .from(cards)
      .where(eq(cards.noteId, id))
      .orderBy(asc(cards.clozeIndex), asc(cards.id));
    return {
      id: note.id,
      noteTypeId: note.noteTypeId,
      fields: note.fields,
      tags: note.tags,
      sortField: note.sortField,
      createdAt: note.createdAt.toISOString(),
      updatedAt: note.updatedAt.toISOString(),
      cards: noteCards.map((card) => ({
        id: card.id,
        deckId: card.deckId,
        templateId: card.templateId,
        clozeIndex: card.clozeIndex,
        state: card.state,
        dueAt: card.dueAt.toISOString(),
      })),
    };
  }

  /**
   * Replaces fields and tags, then adds every card the note now produces
   * that it doesn't have yet, in the deck of its earliest card. Never deletes
   * or resets a card, so review history survives an edit.
   */
  async update(
    userId: string,
    id: string,
    body: UpdateNoteBody,
  ): Promise<NoteWithCards> {
    await this.db.transaction(async (tx) => {
      const [note] = await tx
        .select()
        .from(notes)
        .where(and(eq(notes.id, id), eq(notes.userId, userId)))
        .for('update');
      if (!note) throw noteNotFound();
      const noteType = await this.noteTypes.get(userId, note.noteTypeId, tx);
      const fields = body.fields ? cleanFields(noteType, body.fields) : note.fields;

      await tx
        .update(notes)
        .set({
          fields,
          sortField: sortFieldOf(noteType, fields),
          tags: body.tags ?? note.tags,
        })
        .where(eq(notes.id, id));

      const [earliest] = await tx
        .select({ deckId: cards.deckId })
        .from(cards)
        .where(eq(cards.noteId, id))
        .orderBy(asc(cards.id))
        .limit(1);
      const planned = cardsFor(noteType, fields);
      if (!earliest || planned.length === 0) return;
      const position = await nextPosition(tx, userId);
      await tx
        .insert(cards)
        .values(
          planned.map((card) => ({
            userId,
            noteId: id,
            templateId: card.templateId,
            clozeIndex: card.clozeIndex,
            deckId: earliest.deckId,
            position,
          })),
        )
        .onConflictDoNothing({
          target: [cards.noteId, cards.templateId, cards.clozeIndex],
        });
    });
    return this.get(userId, id);
  }

  /** Deletes the note and its cards; their review logs remain. */
  async remove(userId: string, id: string): Promise<void> {
    const deleted = await this.db
      .delete(notes)
      .where(and(eq(notes.id, id), eq(notes.userId, userId)))
      .returning({ id: notes.id });
    if (deleted.length === 0) throw noteNotFound();
  }
}

/** Sanitized values for the note type's fields only, empty when missing. */
function cleanFields(
  noteType: NoteType,
  input: Record<string, string>,
): Record<string, string> {
  return Object.fromEntries(
    noteType.fields.map((f) => [String(f.key), sanitizeFieldHtml(input[String(f.key)] ?? '')]),
  );
}

function sortFieldOf(noteType: NoteType, fields: Record<string, string>): string {
  return toPlainText(fields[String(noteType.sortFieldKey)] ?? '');
}

/** The next new-card queue position for the user (shared by a note's cards). */
async function nextPosition(tx: Tx, userId: string): Promise<number> {
  const [{ next }] = await tx
    .select({
      next: sql<number>`coalesce(max(${cards.position}), 0) + 1`.mapWith(Number),
    })
    .from(cards)
    .where(eq(cards.userId, userId));
  return next;
}

function noteNotFound() {
  return new NotFoundException('Note not found');
}

function noCards(noteType: NoteType) {
  return new BadRequestException(
    noteType.kind === 'cloze'
      ? 'This note makes no cards: add a cloze deletion such as {{c1::text}}'
      : 'This note makes no cards: fill in the field its first card shows',
  );
}
