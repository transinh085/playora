/**
 * One-off: move plaintext phones from players.form_data into phone_enc (AES-GCM) + phone_hash
 * (HMAC). Idempotent — rerunning only touches rows that still have a phone in form_data.
 *
 *   bun run --cwd apps/api pii:encrypt-phones -- --dry-run   # report only
 *   bun run --cwd apps/api pii:encrypt-phones                # apply
 *
 * Uses DATABASE_URL and the PII_* keys from the API env (docs/operations/runbook.md).
 */
import { createDb } from '@playora/db';
import { apiEnvSchema, parseEnv } from '@playora/env';
import { encryptPlayerPhones } from '../src/common/pii/encrypt-player-phones';
import { piiKeysFromEnv } from '../src/common/pii/pii.service';

const dryRun = process.argv.includes('--dry-run');
const env = parseEnv(apiEnvSchema);
const { db, sql } = createDb(env.DATABASE_URL, { max: 1 });

try {
  const result = await encryptPlayerPhones(db, piiKeysFromEnv(env), {
    dryRun,
    log: (line) => console.log(line),
  });
  console.log(`${dryRun ? '[dry run] ' : ''}${JSON.stringify(result)}`);
} finally {
  await sql.end();
}
