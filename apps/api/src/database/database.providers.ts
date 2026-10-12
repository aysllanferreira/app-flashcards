import { Logger, type Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import type { Env } from '../config/env.js';

// Tables declare camelCase keys; the database sees snake_case columns.
// drizzle.config.ts sets the same casing for migrations.
export const DB_CASING = 'snake_case';

export const PG_POOL = Symbol('PG_POOL');
export const DB = Symbol('DB');

export type Database = NodePgDatabase;

export const databaseProviders: Provider[] = [
  {
    provide: PG_POOL,
    inject: [ConfigService],
    // A pool only connects on its first query, so the API starts (and
    // /health answers) while the database is unreachable.
    useFactory: (config: ConfigService<Env, true>) => {
      const pool = new pg.Pool({
        connectionString: config.get('DATABASE_URL', { infer: true }),
      });
      // An idle client losing its connection must not crash the process.
      pool.on('error', (error) =>
        new Logger('Database').error(`Idle client error: ${error.message}`),
      );
      return pool;
    },
  },
  {
    provide: DB,
    inject: [PG_POOL],
    useFactory: (pool: pg.Pool): Database =>
      drizzle({ client: pool, casing: DB_CASING }),
  },
];
