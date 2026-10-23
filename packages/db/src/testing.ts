import { fileURLToPath } from 'node:url';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

const migrationsFolder = fileURLToPath(new URL('../drizzle', import.meta.url));

/** `postgres://…/playora` → `postgres://…/playora_test` */
export function testDatabaseUrl(baseUrl: string): string {
  const url = new URL(baseUrl);
  const name = url.pathname.replace(/^\//, '') || 'postgres';
  url.pathname = `/${name.endsWith('_test') ? name : `${name}_test`}`;
  return url.toString();
}

/**
 * Creates the `<db>_test` database if needed and applies all migrations.
 * Integration tests never touch the dev database.
 */
export async function prepareTestDatabase(baseUrl: string): Promise<string> {
  const testUrl = testDatabaseUrl(baseUrl);
  const dbName = new URL(testUrl).pathname.slice(1);

  const admin = postgres(baseUrl, { max: 1, onnotice: () => {} });
  try {
    const [exists] = await admin`select 1 from pg_database where datname = ${dbName}`;
    if (!exists) await admin.unsafe(`create database "${dbName}"`);
  } finally {
    await admin.end();
  }

  const sql = postgres(testUrl, { max: 1, onnotice: () => {} });
  try {
    await migrate(drizzle(sql), { migrationsFolder });
  } finally {
    await sql.end();
  }
  return testUrl;
}
