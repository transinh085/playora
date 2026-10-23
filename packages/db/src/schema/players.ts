import {
  boolean,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { createdAt, id, orgId, timestamps } from './_shared';
import { dataEnv } from './enums';
import { events } from './events';

export const guestListEntries = pgTable(
  'guest_list_entries',
  {
    id: id(),
    organizationId: orgId(),
    eventId: uuid()
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    externalCode: text().notNull(),
    displayName: text().notNull(),
    team: text(),
    attributes: jsonb().notNull().default({}),
    ...timestamps,
  },
  (t) => [uniqueIndex().on(t.eventId, t.externalCode)],
);

export const players = pgTable(
  'players',
  {
    id: id(),
    organizationId: orgId(),
    eventId: uuid()
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    env: dataEnv().notNull().default('live'),
    guestListEntryId: uuid().references(() => guestListEntries.id, { onDelete: 'set null' }),
    displayName: text(),
    /** AES-GCM ciphertext; lookups go through the HMAC column. */
    phoneEnc: text(),
    phoneHash: text(),
    deviceId: text(),
    team: text(),
    checkedInAt: timestamp({ withTimezone: true }),
    flagged: boolean().notNull().default(false),
    ...timestamps,
  },
  (t) => [
    index().on(t.eventId, t.env),
    uniqueIndex().on(t.eventId, t.env, t.phoneHash),
    uniqueIndex().on(t.eventId, t.env, t.guestListEntryId),
  ],
);

export const consents = pgTable(
  'consents',
  {
    id: id(),
    organizationId: orgId(),
    playerId: uuid()
      .notNull()
      .references(() => players.id, { onDelete: 'cascade' }),
    purpose: text().notNull(),
    granted: boolean().notNull(),
    textVersion: text().notNull(),
    textHash: text().notNull(),
    ip: text(),
    userAgent: text(),
    createdAt: createdAt(),
    withdrawnAt: timestamp({ withTimezone: true }),
  },
  (t) => [index().on(t.playerId)],
);
