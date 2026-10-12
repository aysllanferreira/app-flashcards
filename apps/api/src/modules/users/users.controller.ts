import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiErrorResponses } from '../../common/decorators/api-error-responses.decorator.js';
import { ApiResponseSchema } from '../../common/decorators/api-response-schema.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { type MeResponse, MeResponseSchema } from './dto/me-response.dto.js';
import type { User } from './provision-user.js';

@ApiTags('users')
@Controller()
export class UsersController {
  @Get('me')
  @ApiOperation({ summary: "Get the caller's account" })
  @ApiResponseSchema(200, MeResponseSchema)
  @ApiErrorResponses({ unauthorized: true })
  me(@CurrentUser() user: User): MeResponse {
    // The response schema drops the columns it doesn't declare.
    return { ...user, createdAt: user.createdAt.toISOString() };
  }
}
