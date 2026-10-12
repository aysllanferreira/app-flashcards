import { eq } from 'drizzle-orm';
import { v7 as uuidv7 } from 'uuid';
import { cards } from '../../src/modules/cards/schema/cards.js';
import { decks } from '../../src/modules/decks/schema/decks.js';
import { reviewLogs } from '../../src/modules/reviews/schema/review-logs.js';
import {
  PG,
  createNoteWithCard,
  createReviewLog,
  createUserWithContent,
  expectPgError,
  useTestDatabase,
} from './helpers.js';

const t = useTestDatabase();

describe('review_logs', () => {
  it('keeps the history when the card is deleted, with card_id cleared', async () => {
    const a = await createUserWithContent(t.db);
    const { card } = await createNoteWithCard(t.db, a);
    const log = await createReviewLog(t.db, {
      userId: a.user.id,
      cardId: card.id,
      deckId: a.deck.id,
    });

    await t.db.delete(cards).where(eq(cards.id, card.id));

    const [after] = await t.db
      .select()
      .from(reviewLogs)
      .where(eq(reviewLogs.id, log.id));
    expect(after).toMatchObject({ cardId: null, deckId: a.deck.id });
  });

  it('keeps the history when the deck is deleted, with deck_id cleared', async () => {
    const a = await createUserWithContent(t.db);
    const { card } = await createNoteWithCard(t.db, a);
    const log = await createReviewLog(t.db, {
      userId: a.user.id,
      cardId: card.id,
      deckId: a.deck.id,
    });

    // The deck's cards go with it, so both references are cleared.
    await t.db.delete(decks).where(eq(decks.id, a.deck.id));

    const [after] = await t.db
      .select()
      .from(reviewLogs)
      .where(eq(reviewLogs.id, log.id));
    expect(after).toMatchObject({ cardId: null, deckId: null });
  });

  it('stores a retried submission once (client-supplied id)', async () => {
    const a = await createUserWithContent(t.db);
    const id = uuidv7();
    await createReviewLog(t.db, { userId: a.user.id, id });

    await expectPgError(
      createReviewLog(t.db, { userId: a.user.id, id }),
      PG.uniqueViolation,
    );
    const rows = await t.db
      .select()
      .from(reviewLogs)
      .where(eq(reviewLogs.userId, a.user.id));
    expect(rows).toHaveLength(1);
  });

  it('rejects a rating outside 1..4', async () => {
    const a = await createUserWithContent(t.db);
    await expectPgError(
      createReviewLog(t.db, { userId: a.user.id, rating: 5 }),
      PG.checkViolation,
    );
    await expectPgError(
      createReviewLog(t.db, { userId: a.user.id, rating: 0 }),
      PG.checkViolation,
    );
  });
});
