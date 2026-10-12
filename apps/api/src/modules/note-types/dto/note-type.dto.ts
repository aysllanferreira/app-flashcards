import { z } from 'zod';
import { NOTE_TYPE_KINDS } from '../schema/note-types.js';

export const NoteTypeFieldSchema = z
  .object({
    // Notes store their values under this key; it never changes.
    key: z.number().int().positive(),
    name: z.string(),
    ord: z.number().int().min(0),
  })
  .meta({ id: 'NoteTypeField' });

export const CardTemplateSchema = z
  .object({
    id: z.uuid(),
    name: z.string(),
    ord: z.number().int().min(0),
    frontHtml: z.string(),
    backHtml: z.string(),
  })
  .meta({ id: 'CardTemplate' });

// A note type with its fields and card templates, both in display order.
export const NoteTypeSchema = z
  .object({
    id: z.uuid(),
    name: z.string(),
    kind: z.enum(NOTE_TYPE_KINDS),
    css: z.string(),
    // The field whose plain text is the note's sort field.
    sortFieldKey: z.number().int().positive(),
    fields: z.array(NoteTypeFieldSchema),
    templates: z.array(CardTemplateSchema),
  })
  .meta({ id: 'NoteType' });

export type NoteType = z.infer<typeof NoteTypeSchema>;

export const NoteTypeListResponseSchema = z
  .object({ noteTypes: z.array(NoteTypeSchema) })
  .meta({ id: 'NoteTypeListResponse' });

export type NoteTypeListResponse = z.infer<typeof NoteTypeListResponseSchema>;
