import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  and,
  asc,
  count,
  countDistinct,
  eq,
  inArray,
  notExists,
  notInArray,
  sql,
} from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { DB, type Database } from '../../database/database.providers.js';
import { isUniqueViolation } from '../../database/errors.js';
import { cards } from '../cards/schema/cards.js';
import { notes } from '../notes/schema/notes.js';
import type { CreateDeckBody, UpdateDeckBody } from './dto/deck-body.dto.js';
import type { Deck, DeckCounts, DeckDetail } from './dto/deck.dto.js';
import { deckPresets } from './schema/deck-presets.js';
import { decks } from './schema/decks.js';

export type Tx = Parameters<Parameters<Database['transaction']>[0]>[0];

const SIBLING_NAME_UNIQUE = 'decks_user_id_parent_id_name_unique';

const zero = (): DeckCounts => ({ new: 0, due: 0, total: 0 });

@Injectable()
export class DecksService {
  constructor(@Inject(DB) private readonly db: Database) {}

  /** Every deck of the user with its counts, in tree order. */
  async list(userId: string): Promise<Deck[]> {
    return (await this.tree(this.db, userId)).ordered;
  }

  /** One deck with its counts and what deleting it would delete. */
  async get(userId: string, id: string): Promise<DeckDetail> {
    const { byId, subtreeIds } = await this.tree(this.db, userId);
    const deck = byId.get(id);
    if (!deck) throw deckNotFound();
    const ids = subtreeIds(id);
    return {
      ...deck,
      deleteImpact: {
        subdecks: ids.length - 1,
        cards: deck.subtree.total,
        notes: await this.countNotesOnlyIn(userId, ids),
      },
    };
  }

  async create(userId: string, body: CreateDeckBody): Promise<DeckDetail> {
    const id = await this.writeDecks(userId, async (tx) => {
      if (body.parentId) await this.requireDeck(tx, userId, body.parentId);
      const [preset] = await tx
        .select({ id: deckPresets.id })
        .from(deckPresets)
        .where(eq(deckPresets.userId, userId))
        // Every account gets "Default" when it is provisioned.
        .orderBy(sql`${deckPresets.name} <> 'Default'`, asc(deckPresets.createdAt))
        .limit(1);
      const [created] = await tx
        .insert(decks)
        .values({
          userId,
          presetId: preset.id,
          parentId: body.parentId ?? null,
          name: body.name,
          description: body.description ?? '',
        })
        .returning({ id: decks.id });
      return created.id;
    });
    return this.get(userId, id);
  }

  async update(
    userId: string,
    id: string,
    body: UpdateDeckBody,
  ): Promise<DeckDetail> {
    await this.writeDecks(userId, async (tx) => {
      await this.requireDeck(tx, userId, id);
      if (body.parentId) {
        await this.requireDeck(tx, userId, body.parentId);
        if (await this.isInSubtreeOf(tx, userId, body.parentId, id)) {
          throw new BadRequestException(
            "A deck can't be moved under itself or one of its subdecks",
          );
        }
      }
      await tx
        .update(decks)
        .set({
          name: body.name,
          description: body.description,
          parentId: body.parentId,
        })
        .where(and(eq(decks.id, id), eq(decks.userId, userId)));
    });
    return this.get(userId, id);
  }

  /**
   * Deletes the deck, its subdecks and their cards, and every note left with
   * no cards, in one transaction. Review logs keep their rows; the foreign
   * keys clear their card and deck references.
   */
  async remove(userId: string, id: string): Promise<void> {
    await this.writeDecks(userId, async (tx) => {
      await this.requireDeck(tx, userId, id);
      const subtree = await this.subtreeIdsInDb(tx, userId, id);
      const touched = await tx
        .selectDistinct({ id: cards.noteId })
        .from(cards)
        .where(and(eq(cards.userId, userId), inArray(cards.deckId, subtree)));

      await tx
        .delete(decks)
        .where(and(eq(decks.id, id), eq(decks.userId, userId)));

      if (touched.length > 0) {
        await tx.delete(notes).where(
          and(
            eq(notes.userId, userId),
            inArray(
              notes.id,
              touched.map((n) => n.id),
            ),
            notExists(
              tx.select({ one: sql`1` }).from(cards).where(eq(cards.noteId, notes.id)),
            ),
          ),
        );
      }
    });
  }

  /**
   * Runs deck-tree writes for one user one at a time, so two concurrent moves
   * can't each pass the cycle check and create a cycle together. Sibling-name
   * clashes become 409.
   */
  private async writeDecks<T>(
    userId: string,
    work: (tx: Tx) => Promise<T>,
  ): Promise<T> {
    try {
      return await this.db.transaction(async (tx) => {
        await tx.execute(
          sql`select pg_advisory_xact_lock(hashtextextended(${userId}::text, 0))`,
        );
        return work(tx);
      });
    } catch (error) {
      if (isUniqueViolation(error, SIBLING_NAME_UNIQUE)) {
        throw new ConflictException(
          'A deck with this name already exists in the same place',
        );
      }
      throw error;
    }
  }

  /** Throws 404 unless `id` is one of the user's decks. */
  async requireDeck(tx: Tx | Database, userId: string, id: string) {
    const [deck] = await tx
      .select({ id: decks.id })
      .from(decks)
      .where(and(eq(decks.id, id), eq(decks.userId, userId)));
    if (!deck) throw deckNotFound();
  }

  /** True when `candidate` is `rootId` or one of its subdecks. */
  private async isInSubtreeOf(
    tx: Tx,
    userId: string,
    candidate: string,
    rootId: string,
  ): Promise<boolean> {
    // Walk up from the candidate; reaching rootId means it is below rootId.
    const { rows } = await tx.execute<{ found: boolean }>(sql`
      with recursive ancestors(id, parent_id) as (
        select id, parent_id from decks where id = ${candidate} and user_id = ${userId}
        union all
        select d.id, d.parent_id from decks d
        join ancestors a on d.id = a.parent_id
        where d.user_id = ${userId}
      )
      select exists (select 1 from ancestors where id = ${rootId}) as found
    `);
    return rows[0].found;
  }

  /** The deck and all its subdecks; 404 unless the deck is the user's. */
  async subtree(userId: string, rootId: string): Promise<string[]> {
    const ids = await this.subtreeIdsInDb(this.db, userId, rootId);
    if (ids.length === 0) throw deckNotFound();
    return ids;
  }

  private async subtreeIdsInDb(
    tx: Tx | Database,
    userId: string,
    rootId: string,
  ): Promise<string[]> {
    const { rows } = await tx.execute<{ id: string }>(sql`
      with recursive subtree(id) as (
        select id from decks where id = ${rootId} and user_id = ${userId}
        union all
        select d.id from decks d
        join subtree s on d.parent_id = s.id
        where d.user_id = ${userId}
      )
      select id from subtree
    `);
    return rows.map((r) => r.id);
  }

  /** Notes of the user whose every card is in one of `deckIds`. */
  private async countNotesOnlyIn(
    userId: string,
    deckIds: string[],
  ): Promise<number> {
    const elsewhere = alias(cards, 'elsewhere');
    const [{ n }] = await this.db
      .select({ n: countDistinct(cards.noteId) })
      .from(cards)
      .where(
        and(
          eq(cards.userId, userId),
          inArray(cards.deckId, deckIds),
          notExists(
            this.db
              .select({ one: sql`1` })
              .from(elsewhere)
              .where(
                and(
                  eq(elsewhere.noteId, cards.noteId),
                  notInArray(elsewhere.deckId, deckIds),
                ),
              ),
          ),
        ),
      );
    return n;
  }

  /**
   * Loads the user's decks and their own card counts (one grouped query, all
   * at the same instant), then sums each subtree in memory.
   */
  private async tree(db: Database | Tx, userId: string) {
    const now = new Date();
    const rows = await db
      .select({
        id: decks.id,
        parentId: decks.parentId,
        name: decks.name,
        description: decks.description,
      })
      .from(decks)
      .where(eq(decks.userId, userId))
      .orderBy(asc(decks.name), asc(decks.id));
    const counted = await db
      .select({
        deckId: cards.deckId,
        new: sql<number>`count(*) filter (where ${cards.state} = 'new' and not ${cards.suspended})`.mapWith(Number),
        due: sql<number>`count(*) filter (where ${cards.state} <> 'new' and not ${cards.suspended} and (${cards.buriedUntil} is null or ${cards.buriedUntil} <= ${now}) and ${cards.dueAt} <= ${now})`.mapWith(Number),
        total: count(),
      })
      .from(cards)
      .where(eq(cards.userId, userId))
      .groupBy(cards.deckId);
    const own = new Map(counted.map(({ deckId, ...c }) => [deckId, c]));

    const children = new Map<string | null, typeof rows>();
    for (const row of rows) {
      const siblings = children.get(row.parentId) ?? [];
      siblings.push(row);
      children.set(row.parentId, siblings);
    }

    const byId = new Map<string, Deck>();
    const ordered: Deck[] = [];
    const visit = (row: (typeof rows)[number]): DeckCounts => {
      const deck: Deck = {
        ...row,
        own: own.get(row.id) ?? zero(),
        subtree: zero(),
      };
      ordered.push(deck);
      byId.set(deck.id, deck);
      const sum = { ...deck.own };
      for (const child of children.get(row.id) ?? []) {
        const c = visit(child);
        sum.new += c.new;
        sum.due += c.due;
        sum.total += c.total;
      }
      deck.subtree = sum;
      return sum;
    };
    for (const root of children.get(null) ?? []) visit(root);

    const subtreeIds = (rootId: string): string[] => [
      rootId,
      ...(children.get(rootId) ?? []).flatMap((c) => subtreeIds(c.id)),
    ];
    return { ordered, byId, subtreeIds };
  }
}

function deckNotFound() {
  return new NotFoundException('Deck not found');
}
