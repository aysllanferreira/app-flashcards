import type { INestApplication } from '@nestjs/common';
import { asc, eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { cards } from '../../src/modules/cards/schema/cards.js';
import { DeckDetailSchema } from '../../src/modules/decks/dto/deck.dto.js';
import { cardTemplates } from '../../src/modules/note-types/schema/card-templates.js';
import { noteTypes } from '../../src/modules/note-types/schema/note-types.js';
import { notes } from '../../src/modules/notes/schema/notes.js';
import { users } from '../../src/modules/users/schema/users.js';
import { signSessionToken } from '../support/clerk.js';

let seq = 0;

export const STOCK = {
  basic: 'Basic',
  reversed: 'Basic (and reversed card)',
  cloze: 'Cloze',
} as const;

/**
 * A fresh Clerk account and helpers that call the API as it. The account is
 * provisioned by its first request, as in production.
 */
export function apiCaller(app: INestApplication<App>, db: NodePgDatabase) {
  const sub = `user_api_${++seq}_${Date.now()}`;
  const auth = () => `Bearer ${signSessionToken({ sub })}`;
  const http = () => request(app.getHttpServer());

  const caller = {
    sub,
    get: (path: string) => http().get(path).set('Authorization', auth()),
    post: (path: string, body: object) =>
      http().post(path).set('Authorization', auth()).send(body),
    patch: (path: string, body: object) =>
      http().patch(path).set('Authorization', auth()).send(body),
    del: (path: string) => http().delete(path).set('Authorization', auth()),

    /** Creates a deck through the API. */
    async deck(name: string, parentId?: string) {
      const res = await caller.post('/decks', { name, parentId }).expect(201);
      return DeckDetailSchema.parse(res.body);
    },

    /** The provisioned user and its stock note types with their templates. */
    async account() {
      await caller.get('/decks').expect(200);
      const [user] = await db.select().from(users).where(eq(users.clerkUserId, sub));
      const types = await db.select().from(noteTypes).where(eq(noteTypes.userId, user.id));
      const load = async (name: string) => {
        const type = types.find((nt) => nt.name === name)!;
        const templates = await db
          .select()
          .from(cardTemplates)
          .where(eq(cardTemplates.noteTypeId, type.id))
          .orderBy(asc(cardTemplates.ord));
        return { type, templates };
      };
      return {
        user,
        basic: await load(STOCK.basic),
        reversed: await load(STOCK.reversed),
        cloze: await load(STOCK.cloze),
      };
    },
  };
  return caller;
}

export type Account = Awaited<ReturnType<ReturnType<typeof apiCaller>['account']>>;

/**
 * Inserts `count` Basic notes with one card each into `deckId`, directly in
 * the database: fast enough for paging tests. `sortField(i)` names note i.
 */
export async function bulkCards(
  db: NodePgDatabase,
  account: Account,
  deckId: string,
  count: number,
  sortField: (i: number) => string,
) {
  const created = await db
    .insert(notes)
    .values(
      Array.from({ length: count }, (_, i) => ({
        userId: account.user.id,
        noteTypeId: account.basic.type.id,
        fields: { '1': sortField(i), '2': 'back' },
        sortField: sortField(i),
      })),
    )
    .returning({ id: notes.id });
  return db
    .insert(cards)
    .values(
      created.map((note) => ({
        userId: account.user.id,
        noteId: note.id,
        templateId: account.basic.templates[0].id,
        deckId,
      })),
    )
    .returning();
}
