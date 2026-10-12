import { z } from 'zod';

// Values by field key ("1", "2", ...). Missing keys are empty; keys the note
// type doesn't have are ignored. Values are sanitized before they're stored.
const fields = z.record(z.string().regex(/^\d+$/, 'Field keys are numbers'), z.string().max(100_000));

// Anki-style tags: no spaces. Duplicates are dropped.
const tags = z
  .array(
    z
      .string()
      .trim()
      .min(1)
      .max(100)
      .regex(/^\S+$/, 'Tags have no spaces'),
  )
  .max(100)
  .transform((list) => [...new Set(list)]);

export const CreateNoteBodySchema = z
  .object({
    noteTypeId: z.uuid(),
    // The deck the note's cards go to.
    deckId: z.uuid(),
    fields,
    tags: tags.optional(),
  })
  .meta({ id: 'CreateNoteBody' });

export type CreateNoteBody = z.infer<typeof CreateNoteBodySchema>;

export const UpdateNoteBodySchema = z
  .object({ fields: fields.optional(), tags: tags.optional() })
  .refine((body) => body.fields !== undefined || body.tags !== undefined, {
    message: 'Change at least one of fields or tags',
  })
  .meta({ id: 'UpdateNoteBody' });

export type UpdateNoteBody = z.infer<typeof UpdateNoteBodySchema>;

// Path parameter: never a named component (CLAUDE.md, DTOs).
export const NoteIdParamSchema = z.uuid();
