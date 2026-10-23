import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

export type Database = ReturnType<typeof createDb>['db'];

/** One pool per process. postgres.js works on both Bun and Node (see ADR-002/003). */
export function createDb(url: string, options: { max?: number } = {}) {
  const sql = postgres(url, { max: options.max ?? 10 });
  const db = drizzle(sql, { schema, casing: 'snake_case' });
  return { db, sql };
}
