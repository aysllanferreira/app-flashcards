import { z } from 'zod';
import { CARD_STATES } from '../schema/cards.js';

// One card as the browser lists it.
export const CardRowSchema = z
  .object({
    id: z.uuid(),
    noteId: z.uuid(),
    // Plain text of the note's sort field.
    sortField: z.string(),
    deckId: z.uuid(),
    deckName: z.string(),
    templateName: z.string(),
    // The cloze number for cloze note types; 0 otherwise.
    clozeIndex: z.number().int().min(0),
    state: z.enum(CARD_STATES),
    dueAt: z.iso.datetime({ offset: true }),
    createdAt: z.iso.datetime({ offset: true }),
  })
  .meta({ id: 'CardRow' });

export type CardRow = z.infer<typeof CardRowSchema>;

export const CardListResponseSchema = z
  .object({
    cards: z.array(CardRowSchema),
    // Pass as `cursor` for the next page; null on the last page.
    nextCursor: z.string().nullable(),
  })
  .meta({ id: 'CardListResponse' });

export type CardListResponse = z.infer<typeof CardListResponseSchema>;

export const CARD_SORTS = ['sortField', 'createdAt', 'dueAt'] as const;
export type CardSort = (typeof CARD_SORTS)[number];

// Query parameters: never a named component (CLAUDE.md, DTOs).
export const CardListQuerySchema = z.object({
  // Includes the deck's subdecks.
  deckId: z.uuid().optional(),
  // Matches cards whose note's sort field contains it, regardless of case.
  q: z.string().trim().min(1).max(200).optional(),
  sort: z.enum(CARD_SORTS).default('sortField'),
  order: z.enum(['asc', 'desc']).default('asc'),
  cursor: z.string().max(500).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export type CardListQuery = z.infer<typeof CardListQuerySchema>;

export const MoveCardBodySchema = z
  .object({ deckId: z.uuid() })
  .meta({ id: 'MoveCardBody' });

export type MoveCardBody = z.infer<typeof MoveCardBodySchema>;

export const CardIdParamSchema = z.uuid();
