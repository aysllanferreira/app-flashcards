import { INestApplication } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { ErrorResponseSchema } from '../../src/common/dto/error-response.dto.js';
import { DB } from '../../src/database/database.providers.js';
import { cards } from '../../src/modules/cards/schema/cards.js';
import { NoteTypeListResponseSchema } from '../../src/modules/note-types/dto/note-type.dto.js';
import { NoteWithCardsSchema } from '../../src/modules/notes/dto/note.dto.js';
import { notes } from '../../src/modules/notes/schema/notes.js';
import { reviewLogs } from '../../src/modules/reviews/schema/review-logs.js';
import { createTestApp } from '../support/create-app.js';
import { apiCaller } from './api-caller.js';
import { createReviewLog, useTestDatabase } from './helpers.js';

const t = useTestDatabase();

// Note types and notes end to end against flashcards_test, with card
// generation from the shared card-templates package.
describe('note types and notes (e2e, database)', () => {
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

  // A caller with a deck and its note type ids by stock name.
  async function setup() {
    const x = caller();
    const deck = await x.deck('Spanish');
    const account = await x.account();
    return {
      x,
      deck,
      account,
      ids: {
        basic: account.basic.type.id,
        reversed: account.reversed.type.id,
        cloze: account.cloze.type.id,
      },
    };
  }

  const notesOf = (userId: string) =>
    t.db.select().from(notes).where(eq(notes.userId, userId));

  describe('GET /note-types', () => {
    it("lists a new account's stock note types with fields and templates", async () => {
      const x = caller();
      const res = await x.get('/note-types').expect(200);
      const { noteTypes } = NoteTypeListResponseSchema.parse(res.body);

      expect(noteTypes.map((nt) => nt.name)).toEqual([
        'Basic',
        'Basic (and reversed card)',
        'Cloze',
      ]);
      const [, reversed, cloze] = noteTypes;
      expect(reversed.fields.map((f) => [f.key, f.name])).toEqual([
        [1, 'Front'],
        [2, 'Back'],
      ]);
      expect(reversed.templates.map((tpl) => tpl.name)).toEqual(['Card 1', 'Card 2']);
      expect(cloze).toMatchObject({ kind: 'cloze', templates: [{ frontHtml: '{{cloze:Text}}' }] });
    });

    it('answers 401 without a token', async () => {
      const res = await request(app.getHttpServer()).get('/note-types').expect(401);
      expect(ErrorResponseSchema.parse(res.body).statusCode).toBe(401);
    });
  });

  describe('POST /notes', () => {
    it('creates two cards for Basic (and reversed card) with both fields', async () => {
      const { x, deck, ids } = await setup();

      const res = await x
        .post('/notes', {
          noteTypeId: ids.reversed,
          deckId: deck.id,
          fields: { '1': 'hola', '2': 'hello' },
          tags: ['spanish', 'greetings', 'spanish'],
        })
        .expect(201);
      const note = NoteWithCardsSchema.parse(res.body);

      expect(note.cards).toHaveLength(2);
      expect(note.cards.every((c) => c.deckId === deck.id && c.state === 'new')).toBe(true);
      expect(note).toMatchObject({ sortField: 'hola', tags: ['spanish', 'greetings'] });
    });

    it('creates one card when the reversed side is empty', async () => {
      const { x, deck, ids } = await setup();

      const res = await x
        .post('/notes', { noteTypeId: ids.reversed, deckId: deck.id, fields: { '1': 'hola', '2': '' } })
        .expect(201);

      expect(NoteWithCardsSchema.parse(res.body).cards).toHaveLength(1);
    });

    it('creates one card per cloze number', async () => {
      const { x, deck, ids } = await setup();

      const res = await x
        .post('/notes', {
          noteTypeId: ids.cloze,
          deckId: deck.id,
          fields: { '1': '{{c1::Madrid}} is the capital of {{c2::Spain}}' },
        })
        .expect(201);
      const note = NoteWithCardsSchema.parse(res.body);

      expect(note.cards.map((c) => c.clozeIndex)).toEqual([1, 2]);
      expect(note.sortField).toBe('{{c1::Madrid}} is the capital of {{c2::Spain}}');
    });

    it('gives all of a note’s cards the same new-card position, after earlier notes', async () => {
      const { x, deck, ids } = await setup();
      const body = (front: string) => ({
        noteTypeId: ids.reversed,
        deckId: deck.id,
        fields: { '1': front, '2': 'x' },
      });

      const first = NoteWithCardsSchema.parse((await x.post('/notes', body('uno')).expect(201)).body);
      const second = NoteWithCardsSchema.parse((await x.post('/notes', body('dos')).expect(201)).body);

      const positions = async (noteId: string) =>
        (await t.db.select().from(cards).where(eq(cards.noteId, noteId))).map((c) => c.position);
      const [a1, a2] = await positions(first.id);
      const [b1, b2] = await positions(second.id);
      expect(a1).toBe(a2);
      expect(b1).toBe(b2);
      expect(b1).toBeGreaterThan(a1);
    });

    it.each([
      ['a Basic note with an empty Front', 'basic', { '1': '', '2': 'hello' }],
      ['a Cloze note with no deletion', 'cloze', { '1': 'Madrid is the capital' }],
    ] as const)('answers 400 for %s and stores nothing', async (_case, kind, fields) => {
      const { x, deck, ids, account } = await setup();

      const res = await x
        .post('/notes', { noteTypeId: ids[kind], deckId: deck.id, fields })
        .expect(400);

      expect(ErrorResponseSchema.parse(res.body).statusCode).toBe(400);
      expect(await notesOf(account.user.id)).toEqual([]);
    });

    it('stores fields sanitized and fills the sort field with plain text', async () => {
      const { x, deck, ids, account } = await setup();

      const res = await x
        .post('/notes', {
          noteTypeId: ids.basic,
          deckId: deck.id,
          fields: { '1': '<b>hola</b> amigo', '2': '<img src=x onerror=alert(1)><b>hi</b>' },
        })
        .expect(201);
      const note = NoteWithCardsSchema.parse(res.body);

      expect(note.fields).toEqual({ '1': '<b>hola</b> amigo', '2': '<b>hi</b>' });
      expect(note.sortField).toBe('hola amigo');
      const [stored] = await notesOf(account.user.id);
      expect(stored.fields).toEqual({ '1': '<b>hola</b> amigo', '2': '<b>hi</b>' });
    });

    it('answers 400 for invalid input', async () => {
      const { x, deck, ids } = await setup();

      const res = await x
        .post('/notes', { noteTypeId: ids.basic, deckId: deck.id, fields: { front: 'x' }, tags: ['two words'] })
        .expect(400);

      expect(ErrorResponseSchema.parse(res.body).message).toEqual(
        expect.arrayContaining([expect.stringContaining('fields'), expect.stringContaining('tags')]),
      );
    });
  });

  describe('GET and PATCH /notes/{id}', () => {
    it('reads a note with its cards', async () => {
      const { x, deck, ids } = await setup();
      const created = NoteWithCardsSchema.parse(
        (
          await x
            .post('/notes', { noteTypeId: ids.reversed, deckId: deck.id, fields: { '1': 'a', '2': 'b' } })
            .expect(201)
        ).body,
      );

      const read = NoteWithCardsSchema.parse((await x.get(`/notes/${created.id}`).expect(200)).body);

      expect(read).toEqual(created);
    });

    it('adds the card for a new cloze and never deletes or resets cards', async () => {
      const { x, deck, ids } = await setup();
      const created = NoteWithCardsSchema.parse(
        (
          await x
            .post('/notes', {
              noteTypeId: ids.cloze,
              deckId: deck.id,
              fields: { '1': '{{c1::a}} {{c2::b}}' },
            })
            .expect(201)
        ).body,
      );
      // Give the first card some review history to preserve.
      const reviewed = {
        state: 'review' as const,
        dueAt: new Date('2026-11-01T00:00:00.000Z'),
        stability: 12.5,
        difficulty: 4.2,
        reps: 3,
        lapses: 1,
      };
      await t.db.update(cards).set(reviewed).where(eq(cards.id, created.cards[0].id));
      const before = await t.db.select().from(cards).where(eq(cards.noteId, created.id));

      const withC3 = NoteWithCardsSchema.parse(
        (
          await x.patch(`/notes/${created.id}`, { fields: { '1': '{{c1::a}} {{c2::b}} {{c3::c}}' } }).expect(200)
        ).body,
      );
      expect(withC3.cards.map((c) => c.clozeIndex)).toEqual([1, 2, 3]);
      expect(withC3.cards.slice(0, 2).map((c) => c.id)).toEqual(created.cards.map((c) => c.id));
      const after = await t.db.select().from(cards).where(eq(cards.noteId, created.id));
      const pick = ({ id, state, dueAt, stability, difficulty, reps, lapses }: (typeof after)[number]) => ({
        id,
        state,
        dueAt,
        stability,
        difficulty,
        reps,
        lapses,
      });
      for (const card of before) {
        expect(pick(after.find((c) => c.id === card.id)!)).toEqual(pick(card));
      }

      const withoutC2 = NoteWithCardsSchema.parse(
        (await x.patch(`/notes/${created.id}`, { fields: { '1': '{{c1::a}} {{c3::c}}' } }).expect(200)).body,
      );
      expect(withoutC2.cards).toHaveLength(3);
    });

    it('updates tags and the sort field', async () => {
      const { x, deck, ids } = await setup();
      const created = NoteWithCardsSchema.parse(
        (
          await x
            .post('/notes', { noteTypeId: ids.basic, deckId: deck.id, fields: { '1': 'uno', '2': 'one' } })
            .expect(201)
        ).body,
      );

      const updated = NoteWithCardsSchema.parse(
        (
          await x
            .patch(`/notes/${created.id}`, { fields: { '1': '<i>dos</i>', '2': 'two' }, tags: ['numbers'] })
            .expect(200)
        ).body,
      );

      expect(updated).toMatchObject({ sortField: 'dos', tags: ['numbers'], fields: { '1': '<i>dos</i>' } });
    });
  });

  describe('DELETE /notes/{id}', () => {
    it('deletes the note and its cards and keeps their review logs', async () => {
      const { x, deck, ids, account } = await setup();
      const created = NoteWithCardsSchema.parse(
        (
          await x
            .post('/notes', { noteTypeId: ids.reversed, deckId: deck.id, fields: { '1': 'a', '2': 'b' } })
            .expect(201)
        ).body,
      );
      const log = await createReviewLog(t.db, {
        userId: account.user.id,
        cardId: created.cards[0].id,
        deckId: deck.id,
      });

      const res = await x.del(`/notes/${created.id}`).expect(204);

      expect(res.body).toEqual({});
      expect(await notesOf(account.user.id)).toEqual([]);
      expect(await t.db.select().from(cards).where(eq(cards.noteId, created.id))).toEqual([]);
      const [kept] = await t.db.select().from(reviewLogs).where(eq(reviewLogs.id, log.id));
      expect(kept).toMatchObject({ cardId: null, deckId: deck.id });
      await x.get(`/notes/${created.id}`).expect(404);
    });
  });
});
