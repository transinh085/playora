import { sql } from 'drizzle-orm';
import {
  bigint,
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { createdAt, id, orgId, timestamps } from './_shared';
import { user } from './auth';
import { awardStatus, dataEnv, playOutcome, prizeType } from './enums';
import { events, games, gameVersions } from './events';
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
    /** Stable prize id inside the campaign document (`CampaignPrize.id`); unique per game. */
    key: text(),
    name: text().notNull(),
    type: prizeType().notNull().default('physical'),
    imageAssetId: uuid(),
    imageUrl: text(),
    quantity: integer().notNull(),
    issued: integer().notNull().default(0),
    remaining: integer().notNull(),
    valueVnd: bigint({ mode: 'number' }),
    sortOrder: integer().notNull().default(0),
    ...timestamps,
  },
  (t) => [
    index().on(t.eventId, t.gameId),
    uniqueIndex().on(t.gameId, t.key),
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
    playId: uuid(),
    env: dataEnv().notNull().default('live'),
    redeemCode: text().notNull(),
    status: awardStatus().notNull().default('issued'),
    voidReason: text(),
    expiresAt: timestamp({ withTimezone: true }),
    redeemedAt: timestamp({ withTimezone: true }),
    redeemedBy: text().references(() => user.id),
    ...timestamps,
  },
  (t) => [
    uniqueIndex().on(t.eventId, t.redeemCode),
    // The counter looks codes up by organization only (docs/product/specs/prizes-redemption.md §6).
    uniqueIndex().on(t.organizationId, t.redeemCode),
    uniqueIndex().on(t.playId),
    index().on(t.eventId, t.prizeId),
    index().on(t.playerId),
  ],
);

/**
 * One row per turn played (ADR-012 §4). `requestId` makes the play route idempotent per player.
 * Turns refused for lack of turns are not recorded; `play_counters` is the source of truth for turns.
 */
export const plays = pgTable(
  'plays',
  {
    id: id(),
    organizationId: orgId(),
    eventId: uuid()
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    gameId: uuid()
      .notNull()
      .references(() => games.id, { onDelete: 'cascade' }),
    /** null for rehearsal plays, which run on the draft. */
    gameVersionId: uuid().references(() => gameVersions.id),
    playerId: uuid()
      .notNull()
      .references(() => players.id, { onDelete: 'cascade' }),
    env: dataEnv().notNull().default('live'),
    requestId: text().notNull(),
    channelKey: text(),
    outcome: playOutcome().notNull(),
    /** Prize engine reason, or `paused`. */
    reason: text().notNull(),
    prizeId: uuid().references(() => prizes.id),
    /** Inputs and the random draw, kept for audit. */
    rngProof: jsonb(),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex().on(t.playerId, t.requestId), index().on(t.eventId, t.env, t.createdAt)],
);

/** Turns used per player, game and local day; claimed with a conditional upsert (ADR-012 §4). */
export const playCounters = pgTable(
  'play_counters',
  {
    organizationId: orgId(),
    playerId: uuid()
      .notNull()
      .references(() => players.id, { onDelete: 'cascade' }),
    gameId: uuid()
      .notNull()
      .references(() => games.id, { onDelete: 'cascade' }),
    /** `YYYY-MM-DD` in the campaign timezone. */
    day: text().notNull(),
    n: integer().notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.playerId, t.gameId, t.day] })],
);
