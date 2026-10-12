import { z } from 'zod';

// Nest's default error body. Validation errors carry one message per invalid
// field; other errors carry a single message and may omit `error`.
export const ErrorResponseSchema = z
  .object({
    statusCode: z.number().int(),
    message: z.union([z.string(), z.array(z.string())]),
    error: z.string().optional(),
  })
  .meta({ id: 'ErrorResponse' });

export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;
