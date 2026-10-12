import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, asc, desc, eq, ilike, inArray, sql, type SQL } from 'drizzle-orm';
import { DB, type Database } from '../../database/database.providers.js';
import { DecksService } from '../decks/decks.service.js';
import { decks } from '../decks/schema/decks.js';
import { cardTemplates } from '../note-types/schema/card-templates.js';
import { notes } from '../notes/schema/notes.js';
import type {
  CardListQuery,
  CardListResponse,
  CardRow,
  CardSort,
} from './dto/card.dto.js';
import { cards } from './schema/cards.js';

// The last row of a page: where the next one starts.
interface Cursor {
  sort: CardSort;
  order: 'asc' | 'desc';
  v: string;
  id: string;
}

// Timestamps sort at millisecond precision: the cursor carries a JavaScript
// date, and Postgres keeps microseconds, so comparing the raw column would
// return a page's last row again on the next page. The card id breaks ties.
const SORT_KEYS: Record<CardSort, SQL> = {
  sortField: sql`${notes.sortField}`,
  createdAt: sql`date_trunc('milliseconds', ${cards.createdAt})`,
  dueAt: sql`date_trunc('milliseconds', ${cards.dueAt})`,
};

@Injectable()
export class CardsService {
  constructor(
    @Inject(DB) private readonly db: Database,
    private readonly decks: DecksService,
  ) {}

  /**
   * One page of the user's cards, ordered by the sort key then the card id,
   * so equal sort values still page without gaps or repeats (keyset paging).
   */
  async list(userId: string, query: CardListQuery): Promise<CardListResponse> {
    const key = SORT_KEYS[query.sort];
    const after = query.cursor ? decodeCursor(query.cursor, query) : undefined;
    const conditions: (SQL | undefined)[] = [eq(cards.userId, userId)];
    if (query.deckId) {
      conditions.push(inArray(cards.deckId, await this.decks.subtree(userId, query.deckId)));
    }
    if (query.q) {
      conditions.push(ilike(notes.sortField, `%${escapeLike(query.q)}%`));
    }
    if (after) {
      const value = query.sort === 'sortField' ? after.v : new Date(after.v);
      conditions.push(
        query.order === 'asc'
          ? sql`(${key}, ${cards.id}) > (${value}, ${after.id})`
          : sql`(${key}, ${cards.id}) < (${value}, ${after.id})`,
      );
    }
    const direction = query.order === 'asc' ? asc : desc;
    const rows = await this.rows()
      .where(and(...conditions))
      .orderBy(direction(key), direction(cards.id))
      .limit(query.limit + 1);

    const page = rows.slice(0, query.limit).map(toCardRow);
    const last = page.at(-1);
    return {
      cards: page,
      nextCursor:
        rows.length > query.limit && last
          ? encodeCursor({
              sort: query.sort,
              order: query.order,
              v: last[query.sort],
              id: last.id,
            })
          : null,
    };
  }

  /** Moves a card to another deck of the user; scheduling stays as it is. */
  async move(userId: string, id: string, deckId: string): Promise<CardRow> {
    await this.decks.requireDeck(this.db, userId, deckId);
    const moved = await this.db
      .update(cards)
      .set({ deckId })
      .where(and(eq(cards.id, id), eq(cards.userId, userId)))
      .returning({ id: cards.id });
    if (moved.length === 0) throw new NotFoundException('Card not found');
    const [row] = await this.rows().where(eq(cards.id, id));
    return toCardRow(row);
  }

  private rows() {
    return this.db
      .select({
        id: cards.id,
        noteId: cards.noteId,
        sortField: notes.sortField,
        deckId: cards.deckId,
        deckName: decks.name,
        templateName: cardTemplates.name,
        clozeIndex: cards.clozeIndex,
        state: cards.state,
        dueAt: cards.dueAt,
        createdAt: cards.createdAt,
      })
      .from(cards)
      .innerJoin(notes, eq(notes.id, cards.noteId))
      .innerJoin(decks, eq(decks.id, cards.deckId))
      .innerJoin(cardTemplates, eq(cardTemplates.id, cards.templateId))
      .$dynamic();
  }
}

type Row = Awaited<ReturnType<ReturnType<CardsService['rows']>['execute']>>[number];

function toCardRow(row: Row): CardRow {
  return {
    ...row,
    dueAt: row.dueAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
  };
}

function encodeCursor(cursor: Cursor): string {
  return Buffer.from(JSON.stringify(cursor)).toString('base64url');
}

/** The cursor, or 400 when it's malformed or from another sort or order. */
function decodeCursor(raw: string, query: CardListQuery): Cursor {
  let cursor: Partial<Cursor>;
  try {
    cursor = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8'));
  } catch {
    throw invalidCursor();
  }
  if (
    cursor?.sort !== query.sort ||
    cursor.order !== query.order ||
    typeof cursor.v !== 'string' ||
    typeof cursor.id !== 'string' ||
    !/^[0-9a-f-]{36}$/i.test(cursor.id) ||
    (query.sort !== 'sortField' && Number.isNaN(Date.parse(cursor.v)))
  ) {
    throw invalidCursor();
  }
  return cursor as Cursor;
}

function invalidCursor() {
  return new BadRequestException(
    'Invalid cursor: pass the nextCursor of a page with the same sort and order',
  );
}

/** Escapes LIKE wildcards so `q` matches literally. */
function escapeLike(text: string): string {
  return text.replace(/[\\%_]/g, (c) => `\\${c}`);
}
