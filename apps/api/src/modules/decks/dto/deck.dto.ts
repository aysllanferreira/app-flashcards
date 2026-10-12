import { z } from 'zod';

// Card counts for one deck. Due cards are reviews and relearning or learning
// cards whose due date has passed and that are neither suspended nor buried.
export const DeckCountsSchema = z
  .object({
    new: z.number().int().min(0),
    due: z.number().int().min(0),
    total: z.number().int().min(0),
  })
  .meta({ id: 'DeckCounts' });

export type DeckCounts = z.infer<typeof DeckCountsSchema>;

// One deck with its own counts and the counts of it and all its subdecks.
export const DeckSchema = z
  .object({
    id: z.uuid(),
    parentId: z.uuid().nullable(),
    name: z.string(),
    description: z.string(),
    own: DeckCountsSchema,
    subtree: DeckCountsSchema,
  })
  .meta({ id: 'Deck' });

export type Deck = z.infer<typeof DeckSchema>;

// What deleting the deck would delete: its subdecks, every card in it and its
// subdecks, and the notes left with no cards.
export const DeckDeleteImpactSchema = z
  .object({
    subdecks: z.number().int().min(0),
    cards: z.number().int().min(0),
    notes: z.number().int().min(0),
  })
  .meta({ id: 'DeckDeleteImpact' });

export const DeckDetailSchema = DeckSchema.extend({
  deleteImpact: DeckDeleteImpactSchema,
}).meta({ id: 'DeckDetail' });

export type DeckDetail = z.infer<typeof DeckDetailSchema>;
