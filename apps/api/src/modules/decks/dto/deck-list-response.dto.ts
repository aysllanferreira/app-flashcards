import { z } from 'zod';
import { DeckSchema } from './deck.dto.js';

// Every deck of the caller, in tree order: each deck is followed by its
// subdecks, and siblings are sorted by name.
export const DeckListResponseSchema = z
  .object({ decks: z.array(DeckSchema) })
  .meta({ id: 'DeckListResponse' });

export type DeckListResponse = z.infer<typeof DeckListResponseSchema>;
