/**
 * Only used by `bun run generate:schema` to emit packages/db/src/schema/auth.ts.
 * It must not import @playora/db (that schema is what we are generating).
 */
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { authOptions } from './options';

const db = drizzle(postgres(process.env.DATABASE_URL ?? 'postgres://localhost/playora'));

export const auth = betterAuth({
  ...authOptions,
  database: drizzleAdapter(db, { provider: 'pg' }),
});
