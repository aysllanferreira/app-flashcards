import {
  BadRequestException,
  Controller,
  HttpCode,
  Post,
  type RawBodyRequest,
  Req,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request as ExpressRequest } from 'express';
import { ApiErrorResponses } from '../../common/decorators/api-error-responses.decorator.js';
import { ApiResponseSchema } from '../../common/decorators/api-response-schema.decorator.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { type WebhookAck, WebhookAckSchema } from './dto/webhook-ack.dto.js';
import { WebhooksService } from './webhooks.service.js';

const SVIX_HEADERS = ['svix-id', 'svix-timestamp', 'svix-signature'] as const;

// Signed third-party callbacks: no session token, the signature is the auth.
@Public()
@ApiTags('webhooks')
@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly webhooks: WebhooksService) {}

  @Post('clerk')
  @HttpCode(200)
  @ApiOperation({ summary: 'Receive Clerk user events' })
  @ApiResponseSchema(200, WebhookAckSchema)
  @ApiErrorResponses({ badRequest: true })
  async clerk(@Req() req: RawBodyRequest<ExpressRequest>): Promise<WebhookAck> {
    // The signature covers the exact bytes Clerk sent, so verify the raw
    // body (kept by APP_OPTIONS.rawBody), never the parsed JSON.
    if (!req.rawBody) {
      throw new BadRequestException('Missing webhook body');
    }
    const headers = new Headers();
    for (const name of SVIX_HEADERS) {
      const value = req.header(name);
      if (value) headers.set(name, value);
    }
    await this.webhooks.receiveClerkEvent(
      new Request(`http://localhost${req.originalUrl}`, {
        method: 'POST',
        headers,
        body: new Uint8Array(req.rawBody),
      }),
    );
    return { received: true };
  }
}
