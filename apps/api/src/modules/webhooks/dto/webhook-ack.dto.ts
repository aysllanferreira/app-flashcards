import { z } from 'zod';

// The 2xx body Clerk (Svix) gets for every verified event, handled or not.
export const WebhookAckSchema = z
  .object({ received: z.literal(true) })
  .meta({ id: 'WebhookAck' });

export type WebhookAck = z.infer<typeof WebhookAckSchema>;
