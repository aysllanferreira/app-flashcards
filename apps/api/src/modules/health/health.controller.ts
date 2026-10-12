import { Controller, Get, SerializeOptions } from '@nestjs/common';
import {
  type HealthResponse,
  HealthResponseSchema,
} from './dto/health-response.dto.js';
import { HealthService } from './health.service.js';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @SerializeOptions({ schema: HealthResponseSchema })
  check(): HealthResponse {
    return this.healthService.check();
  }
}
