import { sql } from 'drizzle-orm';
import {
  bigint,
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { createdAt, id, orgId, timestamps } from './_shared';
import { user } from './auth';
import { awardStatus, dataEnv, prizeType } from './enums';
import { events, games } from './events';
import { players } from './players';

export const prizes = pgTable(
  'prizes',
  {
    id: id(),
    organizationId: orgId(),
    eventId: uuid()
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    /** null = event-wide prize used by lucky draw */
    gameId: uuid().references(() => games.id, { onDelete: 'cascade' }),
    name: text().notNull(),
    type: prizeType().notNull().default('physical'),
    imageAssetId: uuid(),
    quantity: integer().notNull(),
    issued: integer().notNull().default(0),
    remaining: integer().notNull(),
    valueVnd: bigint({ mode: 'number' }),
    sortOrder: integer().notNull().default(0),
    ...timestamps,
  },
  (t) => [
    index().on(t.eventId, t.gameId),
    check('prizes_remaining_non_negative', sql`${t.remaining} >= 0`),
  ],
);

export const drawSpins = pgTable(
  'draw_spins',
  {
    id: id(),
    organizationId: orgId(),
    eventId: uuid()
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    env: dataEnv().notNull().default('live'),
    prizeId: uuid()
      .notNull()
      .references(() => prizes.id),
    spinNo: integer().notNull(),
    poolSize: integer().notNull(),
    poolHash: text().notNull(),
    /** sha256(serverSeed), committed before the spin */
    seedCommit: text().notNull(),
    /** encrypted until the event ends, then revealed in the draw minutes */
    serverSeedEnc: text().notNull(),
    winners: jsonb().$type<string[]>().notNull(),
    operatorId: text()
      .notNull()
      .references(() => user.id),
    voided: boolean().notNull().default(false),
    voidReason: text(),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex().on(t.eventId, t.env, t.spinNo)],
);

export const awards = pgTable(
  'awards',
  {
    id: id(),
    organizationId: orgId(),
    eventId: uuid()
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    prizeId: uuid()
      .notNull()
      .references(() => prizes.id),
    playerId: uuid()
      .notNull()
      .references(() => players.id, { onDelete: 'cascade' }),
    drawSpinId: uuid().references(() => drawSpins.id),
    redeemCode: text().notNull(),
    status: awardStatus().notNull().default('issued'),
    voidReason: text(),
    ...timestamps,
  },
  (t) => [
    uniqueIndex().on(t.eventId, t.redeemCode),
    index().on(t.eventId, t.prizeId),
    index().on(t.playerId),
  ],
);
