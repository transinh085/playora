import { encryptPii, hashLookup, normalizePhone, type PiiKeyring } from '@playora/core/pii';
import { parseRegistrationForm } from '@playora/core/registration';
import { type Database, schema } from '@playora/db';
import { and, eq, inArray, sql } from 'drizzle-orm';

const { events, players } = schema;

/** Keys always treated as a phone, even if the event's form no longer declares them. */
const LEGACY_PHONE_KEYS = ['phone'];

export interface EncryptPlayerPhonesResult {
  /** Players whose plaintext phone was removed from form_data. */
  scanned: number;
  /** Phones moved into phone_enc + phone_hash. */
  encrypted: number;
  /** Phones already held by another player of the event: stored in phone_enc only (no hash). */
  duplicates: number;
  /** Players that already had phone_hash (joined after the fix): only form_data was cleaned. */
  alreadyHashed: number;
  /** Values with no digits: dropped from form_data. */
  unusable: number;
}

/**
 * One-off, idempotent move of plaintext phones from players.form_data into phone_enc/phone_hash
 * (docs/operations/runbook.md §3.1, script `apps/api/scripts/encrypt-player-phones.ts`).
 * Only rows whose form_data still has a phone key are touched, so a second run is a no-op.
 */
export async function encryptPlayerPhones(
  db: Database,
  keys: { keyring: PiiKeyring; hmacKey: Uint8Array },
  options: {
    dryRun?: boolean;
    /** Limit to these events (tests); default all events. */
    eventIds?: string[];
    log?: (line: string) => void;
  } = {},
): Promise<EncryptPlayerPhonesResult> {
  const log = options.log ?? (() => {});
  const result: EncryptPlayerPhonesResult = {
    scanned: 0,
    encrypted: 0,
    duplicates: 0,
    alreadyHashed: 0,
    unusable: 0,
  };

  const allEvents = await db
    .select({
      id: events.id,
      organizationId: events.organizationId,
      registrationForm: events.registrationForm,
    })
    .from(events)
    .where(options.eventIds ? inArray(events.id, options.eventIds) : undefined);

  for (const event of allEvents) {
    const form = parseRegistrationForm(event.registrationForm);
    const phoneKeys = [
      ...new Set([
        ...form.fields.filter((f) => f.type === 'phone').map((f) => f.key),
        ...LEGACY_PHONE_KEYS,
      ]),
    ];
    const keyList = sql.join(
      phoneKeys.map((k) => sql`${k}`),
      sql`, `,
    );

    await db.transaction(async (tx) => {
      const rows = await tx
        .select()
        .from(players)
        .where(
          and(
            eq(players.organizationId, event.organizationId),
            eq(players.eventId, event.id),
            sql`${players.formData} ?| array[${keyList}]::text[]`,
          ),
        )
        .orderBy(players.id) // uuidv7: oldest first keeps the hash on duplicates
        .for('update');
      if (rows.length === 0) return;

      const taken = new Set(
        (
          await tx
            .select({ env: players.env, phoneHash: players.phoneHash })
            .from(players)
            .where(
              and(
                eq(players.organizationId, event.organizationId),
                eq(players.eventId, event.id),
                sql`${players.phoneHash} is not null`,
              ),
            )
        ).map((r) => `${r.env}:${r.phoneHash}`),
      );

      for (const row of rows) {
        result.scanned++;
        const formData = { ...row.formData };
        let raw: string | undefined;
        for (const key of phoneKeys) {
          const value = formData[key];
          if (raw === undefined && typeof value === 'string' && value.trim()) raw = value;
          delete formData[key];
        }
        const normalized = raw ? normalizePhone(raw) : null;
        const patch: Partial<typeof players.$inferInsert> = { formData };

        if (row.phoneHash) {
          result.alreadyHashed++;
        } else if (!normalized) {
          result.unusable++;
        } else {
          const phoneHash = hashLookup(normalized, keys.hmacKey);
          patch.phoneEnc = encryptPii(normalized, keys.keyring);
          if (taken.has(`${row.env}:${phoneHash}`)) {
            // Joined twice with one number before phones were unique: keep the number, no hash.
            result.duplicates++;
          } else {
            patch.phoneHash = phoneHash;
            taken.add(`${row.env}:${phoneHash}`);
            result.encrypted++;
          }
        }

        if (!options.dryRun) {
          await tx
            .update(players)
            .set({ ...patch, updatedAt: new Date() })
            .where(and(eq(players.organizationId, event.organizationId), eq(players.id, row.id)));
        }
      }
      log(`event ${event.id}: ${rows.length} player(s)`);
    });
  }

  return result;
}
