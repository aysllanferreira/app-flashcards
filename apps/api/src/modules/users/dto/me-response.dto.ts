import { z } from 'zod';

// The caller's account. email is null until a Clerk webhook supplies it.
export const MeResponseSchema = z
  .object({
    id: z.uuid(),
    email: z.string().nullable(),
    timezone: z.string(),
    dayRolloverHour: z.number().int().min(0).max(23),
    remindersOn: z.boolean(),
    createdAt: z.iso.datetime({ offset: true }),
  })
  .meta({ id: 'MeResponse' });

export type MeResponse = z.infer<typeof MeResponseSchema>;
