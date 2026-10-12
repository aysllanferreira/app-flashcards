import { HealthService } from './health.service.js';

describe('HealthService', () => {
  it('reports status ok', () => {
    expect(new HealthService().check()).toEqual({ status: 'ok' });
  });
});
