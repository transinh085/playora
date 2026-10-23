import { type Database, schema } from '@playora/db';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { authOptions } from './options';

export interface CreateAuthOptions {
  db: Database;
  secret: string;
  baseURL: string;
  trustedOrigins: string[];
}

export function createAuth({ db, secret, baseURL, trustedOrigins }: CreateAuthOptions) {
  return betterAuth({
    ...authOptions,
    secret,
    baseURL,
    trustedOrigins,
    database: drizzleAdapter(db, { provider: 'pg', schema }),
  });
}

export type Auth = ReturnType<typeof createAuth>;
