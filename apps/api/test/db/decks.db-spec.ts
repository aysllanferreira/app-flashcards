import { INestApplication } from '@nestjs/common';
import { and, asc, eq, sql } from 'drizzle-orm';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { ErrorResponseSchema } from '../../src/common/dto/error-response.dto.js';
import { DB } from '../../src/database/database.providers.js';
import { cards } from '../../src/modules/cards/schema/cards.js';
import { DeckListResponseSchema } from '../../src/modules/decks/dto/deck-list-response.dto.js';
import { DeckDetailSchema } from '../../src/modules/decks/dto/deck.dto.js';
import { decks } from '../../src/modules/decks/schema/decks.js';
import { cardTemplates } from '../../src/modules/note-types/schema/card-templates.js';
import { noteTypes } from '../../src/modules/note-types/schema/note-types.js';
import { notes } from '../../src/modules/notes/schema/notes.js';
import { reviewLogs } from '../../src/modules/reviews/schema/review-logs.js';
import { users } from '../../src/modules/users/schema/users.js';
import { signSessionToken } from '../support/clerk.js';
import { createTestApp } from '../support/create-app.js';
import { createReviewLog, useTestDatabase } from './helpers.js';

const t = useTestDatabase();

const HOUR = 3_600_000;

// The deck routes end to end against flashcards_test: signed session tokens,
// accounts provisioned on first request, responses parsed with their schemas.
describe('decks (e2e, database)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    app = await createTestApp({
      override: (builder) => builder.overrideProvider(DB).useValue(t.db),
    });
  });

  afterAll(async () => {
    await app.close();
  });

  let seq = 0;

  // A fresh Clerk account and request helpers that call as it.
  function caller() {
    const sub = `user_decks_${++seq}`;
    const token = () => `Bearer ${signSessionToken({ sub })}`;
    const http = () => request(app.getHttpServer());
    return {
      sub,
      get: (path: string) => http().get(path).set('Authorization', token()),
      post: (path: string, body: object) =>
        http().post(path).set('Authorization', token()).send(body),
      patch: (path: string, body: object) =>
        http().patch(path).set('Authorization', token()).send(body),
      del: (path: string) => http().delete(path).set('Authorization', token()),
      // Creates a deck through the API and returns it.
      async deck(name: string, parentId?: string) {
        const res = await this.post('/decks', { name, parentId }).expect(201);
        return DeckDetailSchema.parse(res.body);
      },
      // The provisioned user and its stock note types, for direct inserts.
      async account() {
        await this.get('/decks').expect(200);
        const [user] = await t.db
          .select()
          .from(users)
          .where(eq(users.clerkUserId, sub));
        const types = await t.db
          .select()
          .from(noteTypes)
          .where(eq(noteTypes.userId, user.id));
        const templatesOf = (name: string) => {
          const type = types.find((nt) => nt.name === name)!;
          return t.db
            .select()
            .from(cardTemplates)
            .where(eq(cardTemplates.noteTypeId, type.id))
            .orderBy(asc(cardTemplates.ord))
            .then((templates) => ({ type, templates }));
        };
        return {
          user,
          basic: await templatesOf('Basic'),
          reversed: await templatesOf('Basic (and reversed card)'),
        };
      },
    };
  }

  type Account = Awaited<ReturnType<ReturnType<typeof caller>['account']>>;

  // A note of `kind` with one card per entry of `cardsIn`, the i-th card on
  // the i-th template of the note type.
  async function noteWithCards(
    account: Account,
    kind: 'basic' | 'reversed',
    cardsIn: { deckId: string; values?: Partial<typeof cards.$inferInsert> }[],
  ) {
    const { type, templates } = account[kind];
    const [note] = await t.db
      .insert(notes)
      .values({ userId: account.user.id, noteTypeId: type.id, fields: { '1': 'x', '2': 'y' } })
      .returning();
    const created = await t.db
      .insert(cards)
      .values(
        cardsIn.map(({ deckId, values }, i) => ({
          userId: account.user.id,
          noteId: note.id,
          templateId: templates[i].id,
          deckId,
          ...values,
        })),
      )
      .returning();
    return { note, cards: created };
  }

  const deckRow = async (id: string) =>
    (await t.db.select().from(decks).where(eq(decks.id, id)))[0];

  describe('routes', () => {
    it('serve the five routes with bodies that parse with their schemas', async () => {
      const x = caller();

      const created = await x.deck('Spanish');
      expect(created).toMatchObject({
        name: 'Spanish',
        parentId: null,
        description: '',
        own: { new: 0, due: 0, total: 0 },
        deleteImpact: { subdecks: 0, cards: 0, notes: 0 },
      });

      const list = DeckListResponseSchema.parse(
        (await x.get('/decks').expect(200)).body,
      );
      expect(list.decks.map((d) => d.name)).toEqual(['Spanish']);

      const one = DeckDetailSchema.parse(
        (await x.get(`/decks/${created.id}`).expect(200)).body,
      );
      expect(one.id).toBe(created.id);

      const updated = DeckDetailSchema.parse(
        (
          await x
            .patch(`/decks/${created.id}`, { name: 'Español', description: 'Verbs too' })
            .expect(200)
        ).body,
      );
      expect(updated).toMatchObject({ name: 'Español', description: 'Verbs too' });

      const deleted = await x.del(`/decks/${created.id}`).expect(204);
      expect(deleted.body).toEqual({});
      await x.get(`/decks/${created.id}`).expect(404);
    });

    it('trims names and lists decks in tree order', async () => {
      const x = caller();
      const spanish = await x.deck('  Spanish ');
      await x.deck('French');
      await x.deck('Verbs', spanish.id);

      expect(spanish.name).toBe('Spanish');
      const { decks: listed } = DeckListResponseSchema.parse(
        (await x.get('/decks').expect(200)).body,
      );
      expect(listed.map((d) => d.name)).toEqual(['French', 'Spanish', 'Verbs']);
    });

    it.each([
      ['GET', '/decks'],
      ['POST', '/decks'],
      ['GET', '/decks/0192f7e0-0000-7000-8000-000000000000'],
      ['PATCH', '/decks/0192f7e0-0000-7000-8000-000000000000'],
      ['DELETE', '/decks/0192f7e0-0000-7000-8000-000000000000'],
    ])('%s %s answers 401 without a token', async (method, path) => {
      const res = await request(app.getHttpServer())
        [method.toLowerCase() as 'get'](path)
        .send({ name: 'x' })
        .expect(401);
      expect(ErrorResponseSchema.parse(res.body).statusCode).toBe(401);
    });
  });

  describe('ownership', () => {
    it("answers 404 for another user's deck and leaves it unchanged", async () => {
      const x = caller();
      const y = caller();
      const theirs = await y.deck('Private');

      for (const res of [
        await x.get(`/decks/${theirs.id}`),
        await x.patch(`/decks/${theirs.id}`, { name: 'Mine now' }),
        await x.del(`/decks/${theirs.id}`),
        await x.post('/decks', { name: 'Child', parentId: theirs.id }),
      ]) {
        expect(res.status).toBe(404);
        expect(ErrorResponseSchema.parse(res.body).statusCode).toBe(404);
      }
      expect(await deckRow(theirs.id)).toMatchObject({ name: 'Private', parentId: null });
    });
  });

  describe('names', () => {
    it('answers 409 when a sibling already has the name, and changes nothing', async () => {
      const x = caller();
      const spanish = await x.deck('Spanish');
      const french = await x.deck('French');
      const verbs = await x.deck('Verbs', spanish.id);
      await x.deck('Verbs', french.id);

      const duplicate = await x.post('/decks', { name: 'Spanish' });
      const rename = await x.patch(`/decks/${french.id}`, { name: 'Spanish' });
      // Moving Spanish › Verbs under French, next to French › Verbs.
      const move = await x.patch(`/decks/${verbs.id}`, { parentId: french.id });

      for (const res of [duplicate, rename, move]) {
        expect(res.status).toBe(409);
        expect(ErrorResponseSchema.parse(res.body).statusCode).toBe(409);
      }
      expect(await deckRow(french.id)).toMatchObject({ name: 'French' });
      expect(await deckRow(verbs.id)).toMatchObject({ parentId: spanish.id });
      const { decks: listed } = DeckListResponseSchema.parse(
        (await x.get('/decks').expect(200)).body,
      );
      expect(listed).toHaveLength(4);
    });

    it('answers 400 for a blank name', async () => {
      const x = caller();
      const deck = await x.deck('Spanish');

      const create = await x.post('/decks', { name: '   ' }).expect(400);
      const rename = await x.patch(`/decks/${deck.id}`, { name: '   ' }).expect(400);

      expect(ErrorResponseSchema.parse(create.body).statusCode).toBe(400);
      expect(ErrorResponseSchema.parse(rename.body).statusCode).toBe(400);
      expect(await deckRow(deck.id)).toMatchObject({ name: 'Spanish' });
    });

    it('allows the same name under different parents', async () => {
      const x = caller();
      const spanish = await x.deck('Spanish');
      const french = await x.deck('French');

      await x.post('/decks', { name: 'Verbs', parentId: spanish.id }).expect(201);
      await x.post('/decks', { name: 'Verbs', parentId: french.id }).expect(201);
    });
  });

  describe('moving', () => {
    it('answers 400 when a deck would move under itself or its subdeck', async () => {
      const x = caller();
      const a = await x.deck('A');
      const b = await x.deck('B', a.id);

      for (const parentId of [a.id, b.id]) {
        const res = await x.patch(`/decks/${a.id}`, { parentId }).expect(400);
        expect(ErrorResponseSchema.parse(res.body).statusCode).toBe(400);
      }
      expect(await deckRow(a.id)).toMatchObject({ parentId: null });
      expect(await deckRow(b.id)).toMatchObject({ parentId: a.id });
    });

    it('moves a deck under another and back to the top level', async () => {
      const x = caller();
      const a = await x.deck('A');
      const b = await x.deck('B');

      const moved = DeckDetailSchema.parse(
        (await x.patch(`/decks/${b.id}`, { parentId: a.id }).expect(200)).body,
      );
      expect(moved.parentId).toBe(a.id);
      const back = DeckDetailSchema.parse(
        (await x.patch(`/decks/${b.id}`, { parentId: null }).expect(200)).body,
      );
      expect(back.parentId).toBeNull();
    });

    // One round rarely overlaps enough to race; without the per-user lock,
    // 25 rounds reliably produce a cycle.
    it('never creates a cycle from two opposite moves at the same time', async () => {
      const x = caller();
      for (let round = 0; round < 25; round++) {
        const a = await x.deck(`A${round}`);
        const b = await x.deck(`B${round}`);

        const results = await Promise.all([
          x.patch(`/decks/${a.id}`, { parentId: b.id }),
          x.patch(`/decks/${b.id}`, { parentId: a.id }),
        ]);

        expect(results.map((r) => r.status).sort()).toEqual([200, 400]);
        // From each deck, walking up the parents reaches a top-level deck.
        for (const id of [a.id, b.id]) {
          const { rows } = await t.db.execute<{ reaches_root: boolean }>(sql`
            with recursive up(id, parent_id, depth) as (
              select id, parent_id, 0 from decks where id = ${id}
              union all
              select d.id, d.parent_id, up.depth + 1 from decks d
              join up on d.id = up.parent_id where up.depth < 10
            )
            select exists (select 1 from up where parent_id is null) as reaches_root
          `);
          expect(rows[0].reaches_root).toBe(true);
        }
      }
    });
  });

  describe('deleting', () => {
    it('deletes subdecks, their cards and the notes left with no cards', async () => {
      const x = caller();
      const a = await x.deck('A');
      const b = await x.deck('B', a.id);
      const c = await x.deck('C');
      const account = await x.account();

      const n1 = await noteWithCards(account, 'reversed', [
        { deckId: a.id },
        { deckId: b.id },
      ]);
      const n2 = await noteWithCards(account, 'reversed', [
        { deckId: a.id },
        { deckId: c.id },
      ]);
      const log = await createReviewLog(t.db, {
        userId: account.user.id,
        cardId: n1.cards[0].id,
        deckId: a.id,
      });

      await x.del(`/decks/${a.id}`).expect(204);

      expect(await deckRow(a.id)).toBeUndefined();
      expect(await deckRow(b.id)).toBeUndefined();
      expect(await t.db.select().from(notes).where(eq(notes.id, n1.note.id))).toEqual([]);
      const n2Cards = await t.db.select().from(cards).where(eq(cards.noteId, n2.note.id));
      expect(n2Cards.map((card) => card.deckId)).toEqual([c.id]);
      const [kept] = await t.db.select().from(reviewLogs).where(eq(reviewLogs.id, log.id));
      expect(kept).toMatchObject({ cardId: null, deckId: null });
    });
  });

  describe('counts', () => {
    it('counts new, due and total cards per deck and per subtree', async () => {
      const x = caller();
      const a = await x.deck('A');
      const b = await x.deck('B', a.id);
      const account = await x.account();
      const now = Date.now();
      const card = (deckId: string, values: Partial<typeof cards.$inferInsert> = {}) =>
        noteWithCards(account, 'basic', [{ deckId, values }]);

      await card(a.id);
      await card(a.id);
      await card(a.id, { state: 'review', dueAt: new Date(now - HOUR) });
      await card(a.id, { state: 'review', dueAt: new Date(now + 24 * HOUR) });
      await card(a.id, { suspended: true });
      await card(b.id);
      await card(b.id, { state: 'learning', dueAt: new Date(now - 1000) });

      const { decks: listed } = DeckListResponseSchema.parse(
        (await x.get('/decks').expect(200)).body,
      );
      const byName = Object.fromEntries(listed.map((d) => [d.name, d]));

      expect(byName.A.own).toEqual({ new: 2, due: 1, total: 5 });
      expect(byName.A.subtree).toEqual({ new: 3, due: 2, total: 7 });
      expect(byName.B.own).toEqual({ new: 1, due: 1, total: 2 });
      expect(byName.B.subtree).toEqual({ new: 1, due: 1, total: 2 });
    });

    it('does not count a buried card as due', async () => {
      const x = caller();
      const d = await x.deck('D');
      const account = await x.account();
      const now = Date.now();

      await noteWithCards(account, 'basic', [
        {
          deckId: d.id,
          values: {
            state: 'review',
            dueAt: new Date(now - HOUR),
            buriedUntil: new Date(now + 24 * HOUR),
          },
        },
      ]);

      const detail = DeckDetailSchema.parse((await x.get(`/decks/${d.id}`).expect(200)).body);
      expect(detail.own).toEqual({ new: 0, due: 0, total: 1 });
    });

    it('reports what deleting a deck would delete', async () => {
      const x = caller();
      const a = await x.deck('A');
      const b = await x.deck('B', a.id);
      const c = await x.deck('C');
      const account = await x.account();

      // 5 cards in A and B; 3 notes only there; 1 note also has a card in C.
      await noteWithCards(account, 'basic', [{ deckId: a.id }]);
      await noteWithCards(account, 'basic', [{ deckId: a.id }]);
      await noteWithCards(account, 'reversed', [{ deckId: a.id }, { deckId: b.id }]);
      await noteWithCards(account, 'reversed', [{ deckId: b.id }, { deckId: c.id }]);

      const detail = DeckDetailSchema.parse((await x.get(`/decks/${a.id}`).expect(200)).body);
      expect(detail.deleteImpact).toEqual({ subdecks: 1, cards: 5, notes: 3 });

      const inC = await t.db
        .select()
        .from(cards)
        .where(and(eq(cards.userId, account.user.id), eq(cards.deckId, c.id)));
      expect(inC).toHaveLength(1);
    });
  });
});
