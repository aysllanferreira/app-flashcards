import { INestApplication } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { ErrorResponseSchema } from '../../src/common/dto/error-response.dto.js';
import { DB } from '../../src/database/database.providers.js';
import { cards } from '../../src/modules/cards/schema/cards.js';
import { NoteWithCardsSchema } from '../../src/modules/notes/dto/note.dto.js';
import { notes } from '../../src/modules/notes/schema/notes.js';
import { createTestApp } from '../support/create-app.js';
import { apiCaller } from './api-caller.js';
import { useTestDatabase } from './helpers.js';

const t = useTestDatabase();

const SOME_ID = '0192f7e0-0000-7000-8000-000000000000';

// Every note, note type and card route keeps users apart: another user's
// records answer 404 whether they are the route's subject or named in its
// input, and every route needs a session token.
describe('notes and cards ownership (e2e, database)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    app = await createTestApp({
      override: (builder) => builder.overrideProvider(DB).useValue(t.db),
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it("answers 404 for another user's note, card, deck or note type and changes nothing", async () => {
    const x = apiCaller(app, t.db);
    const y = apiCaller(app, t.db);
    const xDeck = await x.deck('Mine');
    const xAccount = await x.account();
    const yDeck = await y.deck('Theirs');
    const yAccount = await y.account();
    const create = (caller: typeof x, noteTypeId: string, deckId: string) =>
      caller
        .post('/notes', { noteTypeId, deckId, fields: { '1': 'hola', '2': 'hello' } })
        .expect(201)
        .then((res) => NoteWithCardsSchema.parse(res.body));
    const yNote = await create(y, yAccount.basic.type.id, yDeck.id);
    const xNote = await create(x, xAccount.basic.type.id, xDeck.id);
    const yCard = yNote.cards[0];
    const snapshot = async () => ({
      note: await t.db.select().from(notes).where(eq(notes.id, yNote.id)),
      cards: await t.db.select().from(cards).where(eq(cards.noteId, yNote.id)),
    });
    const before = await snapshot();

    // Built one at a time: each supertest request starts and stops the server.
    const attempts = {
      'read their note': () => x.get(`/notes/${yNote.id}`),
      'edit their note': () => x.patch(`/notes/${yNote.id}`, { tags: ['mine'] }),
      'delete their note': () => x.del(`/notes/${yNote.id}`),
      'create with their note type': () => x.post('/notes', {
        noteTypeId: yAccount.basic.type.id,
        deckId: xDeck.id,
        fields: { '1': 'x' },
      }),
      'create in their deck': () => x.post('/notes', {
        noteTypeId: xAccount.basic.type.id,
        deckId: yDeck.id,
        fields: { '1': 'x' },
      }),
      'browse their deck': () => x.get(`/cards?deckId=${yDeck.id}`),
      'move their card': () => x.patch(`/cards/${yCard.id}`, { deckId: xDeck.id }),
      'move my card into their deck': () =>
        x.patch(`/cards/${xNote.cards[0].id}`, { deckId: yDeck.id }),
    };
    for (const [attempt, send] of Object.entries(attempts)) {
      const res = await send();
      expect(res.status, attempt).toBe(404);
      expect(ErrorResponseSchema.parse(res.body).statusCode, attempt).toBe(404);
    }

    expect(await snapshot()).toEqual(before);
    const [mine] = await t.db.select().from(cards).where(eq(cards.id, xNote.cards[0].id));
    expect(mine.deckId).toBe(xDeck.id);
  });

  it.each([
    ['GET', '/note-types'],
    ['POST', '/notes'],
    ['GET', `/notes/${SOME_ID}`],
    ['PATCH', `/notes/${SOME_ID}`],
    ['DELETE', `/notes/${SOME_ID}`],
    ['GET', '/cards'],
    ['PATCH', `/cards/${SOME_ID}`],
  ])('%s %s answers 401 without a token', async (method, path) => {
    const res = await request(app.getHttpServer())
      [method.toLowerCase() as 'get'](path)
      .send({})
      .expect(401);
    expect(ErrorResponseSchema.parse(res.body).statusCode).toBe(401);
  });
});
