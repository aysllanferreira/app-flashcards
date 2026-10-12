import { INestApplication } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';
import { App } from 'supertest/types.js';
import { ErrorResponseSchema } from '../../src/common/dto/error-response.dto.js';
import { DB } from '../../src/database/database.providers.js';
import {
  CardListResponseSchema,
  CardRowSchema,
  type CardRow,
} from '../../src/modules/cards/dto/card.dto.js';
import { cards } from '../../src/modules/cards/schema/cards.js';
import { createTestApp } from '../support/create-app.js';
import { apiCaller, bulkCards } from './api-caller.js';
import { useTestDatabase } from './helpers.js';

const t = useTestDatabase();

// The card browser and moving cards, end to end against flashcards_test.
describe('cards (e2e, database)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    app = await createTestApp({
      override: (builder) => builder.overrideProvider(DB).useValue(t.db),
    });
  });

  afterAll(async () => {
    await app.close();
  });

  const caller = () => apiCaller(app, t.db);
  type Caller = ReturnType<typeof caller>;

  // Follows nextCursor from the first page to the last.
  async function allPages(x: Caller, query: string) {
    const pages: CardRow[][] = [];
    let cursor: string | null = null;
    do {
      const path: string = `/cards?${query}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`;
      const page = CardListResponseSchema.parse((await x.get(path).expect(200)).body);
      pages.push(page.cards);
      cursor = page.nextCursor;
    } while (cursor && pages.length < 10);
    return pages;
  }

  describe('paging', () => {
    let x: Caller;
    let ids: string[];

    beforeEach(async () => {
      x = caller();
      const deck = await x.deck('Big');
      const account = await x.account();
      // Ten distinct sort fields, so most cards share theirs with 24 others.
      const created = await bulkCards(t.db, account, deck.id, 250, (i) => `word ${i % 10}`);
      ids = created.map((c) => c.id).sort();
      // Due dates with microseconds, which a JavaScript date can't hold.
      await t.db.execute(
        sql`update cards set due_at = now() + random() * interval '30 days' where user_id = ${account.user.id}`,
      );
    });

    it.each([
      ['sortField', 'asc'],
      ['dueAt', 'asc'],
      ['dueAt', 'desc'],
      ['createdAt', 'asc'],
    ])('returns every card exactly once when sorted by %s %s', async (sort, order) => {
      const pages = await allPages(x, `limit=100&sort=${sort}&order=${order}`);

      expect(pages.map((p) => p.length)).toEqual([100, 100, 50]);
      const seen = pages.flat();
      expect(seen.map((c) => c.id).sort()).toEqual(ids);
      // Sorted by the key across page boundaries.
      const keys = seen.map((c) => (sort === 'sortField' ? c.sortField : Date.parse(c[sort as 'dueAt'])));
      const sorted = [...keys].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
      expect(keys).toEqual(order === 'asc' ? sorted : sorted.reverse());
    });

    it('answers 400 for a malformed cursor or one from another sort', async () => {
      const first = CardListResponseSchema.parse(
        (await x.get('/cards?limit=10&sort=dueAt').expect(200)).body,
      );

      for (const path of [
        '/cards?cursor=not-a-cursor',
        `/cards?sort=createdAt&cursor=${first.nextCursor}`,
        '/cards?limit=101',
      ]) {
        const res = await x.get(path).expect(400);
        expect(ErrorResponseSchema.parse(res.body).statusCode).toBe(400);
      }
    });
  });

  describe('filters', () => {
    it("filters by deck, including the deck's subdecks", async () => {
      const x = caller();
      const a = await x.deck('A');
      const b = await x.deck('B', a.id);
      const c = await x.deck('C');
      const account = await x.account();
      const inA = await bulkCards(t.db, account, a.id, 2, (i) => `a${i}`);
      const inB = await bulkCards(t.db, account, b.id, 3, (i) => `b${i}`);
      await bulkCards(t.db, account, c.id, 4, (i) => `c${i}`);

      const res = CardListResponseSchema.parse((await x.get(`/cards?deckId=${a.id}`).expect(200)).body);

      expect(res.cards.map((card) => card.id).sort()).toEqual(
        [...inA, ...inB].map((card) => card.id).sort(),
      );
      expect(res.cards.find((card) => card.deckId === b.id)?.deckName).toBe('B');
    });

    it('matches the sort field regardless of case, with LIKE wildcards taken literally', async () => {
      const x = caller();
      const deck = await x.deck('Words');
      const account = await x.account();
      const names = ['Hola amigo', 'adiós', '100% sure', '1000 sure'];
      await bulkCards(t.db, account, deck.id, names.length, (i) => names[i]);

      const search = async (q: string) =>
        CardListResponseSchema.parse(
          (await x.get(`/cards?q=${encodeURIComponent(q)}`).expect(200)).body,
        ).cards.map((card) => card.sortField);

      expect(await search('HOLA')).toEqual(['Hola amigo']);
      expect(await search('0%')).toEqual(['100% sure']);
    });
  });

  describe('PATCH /cards/{id}', () => {
    it('moves a card to another deck and keeps its scheduling', async () => {
      const x = caller();
      const a = await x.deck('A');
      const b = await x.deck('B');
      const account = await x.account();
      const [card] = await bulkCards(t.db, account, a.id, 1, () => 'comer');
      const dueAt = new Date('2026-11-01T00:00:00.000Z');
      await t.db.update(cards).set({ state: 'review', dueAt }).where(eq(cards.id, card.id));

      const moved = CardRowSchema.parse(
        (await x.patch(`/cards/${card.id}`, { deckId: b.id }).expect(200)).body,
      );

      expect(moved).toMatchObject({ deckId: b.id, deckName: 'B', state: 'review', dueAt: dueAt.toISOString() });
      const [row] = await t.db.select().from(cards).where(eq(cards.id, card.id));
      expect(row).toMatchObject({ deckId: b.id, state: 'review', dueAt });
    });
  });
});
