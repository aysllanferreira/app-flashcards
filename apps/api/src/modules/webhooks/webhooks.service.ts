import type { UserJSON } from '@clerk/backend';
import { verifyWebhook, type WebhookEvent } from '@clerk/backend/webhooks';
import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../../config/env.js';
import { UsersService } from '../users/users.service.js';

/**
 * Verifies Clerk webhooks (Svix signatures over the raw body) and applies the
 * user.* events to the users table. Every handler is safe to replay, because
 * Svix retries any delivery that doesn't get a 2xx.
 */
@Injectable()
export class WebhooksService {
  constructor(
    private readonly config: ConfigService<Env, true>,
    private readonly users: UsersService,
  ) {}

  async receiveClerkEvent(request: Request): Promise<void> {
    const event = await this.verify(request);
    switch (event.type) {
      case 'user.created':
      case 'user.updated':
        await this.users.syncFromClerk(event.data.id, primaryEmail(event.data));
        return;
      case 'user.deleted':
        if (event.data.id) await this.users.deleteByClerkId(event.data.id);
        return;
      default:
        // Other event types are acknowledged and ignored.
        return;
    }
  }

  private async verify(request: Request): Promise<WebhookEvent> {
    const signingSecret = this.config.get('CLERK_WEBHOOK_SIGNING_SECRET', {
      infer: true,
    });
    if (!signingSecret) {
      throw new BadRequestException(
        'Webhook verification is not configured on this server',
      );
    }
    try {
      return await verifyWebhook(request, { signingSecret });
    } catch {
      throw new BadRequestException('Invalid or missing webhook signature');
    }
  }
}

// The address Clerk marks as primary, or null when the user has none.
function primaryEmail(user: UserJSON): string | null {
  return (
    user.email_addresses.find(
      (address) => address.id === user.primary_email_address_id,
    )?.email_address ?? null
  );
}
