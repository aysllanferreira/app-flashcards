import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiErrorResponses } from '../../common/decorators/api-error-responses.decorator.js';
import { ApiResponseSchema } from '../../common/decorators/api-response-schema.decorator.js';
import { Public } from '../../common/decorators/public.decorator.js';
import {
  type HealthResponse,
  HealthResponseSchema,
} from './dto/health-response.dto.js';
import { HealthService } from './health.service.js';

// Liveness checks run without a session token.
@Public()
@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({ summary: 'Check that the API is up' })
  @ApiResponseSchema(200, HealthResponseSchema)
  @ApiErrorResponses()
  check(): HealthResponse {
    return this.healthService.check();
  }
}
