import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module.js';
import { WebhooksController } from './webhooks.controller.js';
import { WebhooksService } from './webhooks.service.js';

// Receives signed third-party callbacks. Today: Clerk user.* events, which
// keep the users table in sync with Clerk.
@Module({
  imports: [UsersModule],
  controllers: [WebhooksController],
  providers: [WebhooksService],
})
export class WebhooksModule {}
