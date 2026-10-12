import {
  Global,
  Inject,
  Module,
  type OnApplicationShutdown,
} from '@nestjs/common';
import type pg from 'pg';
import { DB, PG_POOL, databaseProviders } from './database.providers.js';

// Provides the Drizzle client to every module: inject it with
// `@Inject(DB) private readonly db: Database`.
@Global()
@Module({
  providers: databaseProviders,
  exports: [DB],
})
export class DatabaseModule implements OnApplicationShutdown {
  constructor(@Inject(PG_POOL) private readonly pool: pg.Pool) {}

  async onApplicationShutdown() {
    await this.pool.end();
  }
}
