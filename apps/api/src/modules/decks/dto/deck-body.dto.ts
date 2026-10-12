import { z } from 'zod';

const name = z.string().trim().min(1, 'Enter a deck name').max(200);
const description = z.string().max(2000);
// null makes the deck top-level.
const parentId = z.uuid().nullable();

export const CreateDeckBodySchema = z
  .object({
    name,
    description: description.optional(),
    parentId: parentId.optional(),
  })
  .meta({ id: 'CreateDeckBody' });

export type CreateDeckBody = z.infer<typeof CreateDeckBodySchema>;

export const UpdateDeckBodySchema = z
  .object({
    name: name.optional(),
    description: description.optional(),
    parentId: parentId.optional(),
  })
  .refine((body) => Object.values(body).some((v) => v !== undefined), {
    message: 'Change at least one of name, description or parentId',
  })
  .meta({ id: 'UpdateDeckBody' });

export type UpdateDeckBody = z.infer<typeof UpdateDeckBodySchema>;

// Path parameter: never a named component (CLAUDE.md, DTOs).
export const DeckIdParamSchema = z.uuid();
