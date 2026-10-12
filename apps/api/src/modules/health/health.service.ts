import { Injectable } from '@nestjs/common';
import type { HealthResponse } from './dto/health-response.dto.js';

@Injectable()
export class HealthService {
  check(): HealthResponse {
    return { status: 'ok' };
  }
}
