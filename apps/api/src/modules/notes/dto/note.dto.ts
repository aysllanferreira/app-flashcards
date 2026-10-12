import { z } from 'zod';
import { CARD_STATES } from '../../cards/schema/cards.js';

const isoDate = z.iso.datetime({ offset: true });

// A card as part of its note: where it lives and its scheduling state.
export const CardSummarySchema = z
  .object({
    id: z.uuid(),
    deckId: z.uuid(),
    templateId: z.uuid(),
    // The cloze number for cloze note types; 0 otherwise.
    clozeIndex: z.number().int().min(0),
    state: z.enum(CARD_STATES),
    dueAt: isoDate,
  })
  .meta({ id: 'CardSummary' });

export type CardSummary = z.infer<typeof CardSummarySchema>;

export const NoteWithCardsSchema = z
  .object({
    id: z.uuid(),
    noteTypeId: z.uuid(),
    // Sanitized field HTML, keyed by the note type's field key.
    fields: z.record(z.string(), z.string()),
    tags: z.array(z.string()),
    // Plain text of the note type's sort field.
    sortField: z.string(),
    createdAt: isoDate,
    updatedAt: isoDate,
    cards: z.array(CardSummarySchema),
  })
  .meta({ id: 'NoteWithCards' });

export type NoteWithCards = z.infer<typeof NoteWithCardsSchema>;
