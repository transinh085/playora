import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { createdAt, id, orgId, timestamps } from './_shared';
import { user } from './auth';
import { eventMode, eventStatus, gameStatus, identityMode } from './enums';

export const clients = pgTable(
  'clients',
  {
    id: id(),
    organizationId: orgId(),
    name: text().notNull(),
    logoAssetId: uuid(),
    ...timestamps,
  },
  (t) => [index().on(t.organizationId)],
);

export const brandKits = pgTable(
  'brand_kits',
  {
    id: id(),
    organizationId: orgId(),
    clientId: uuid().references(() => clients.id, { onDelete: 'set null' }),
    name: text().notNull(),
    /** colors, fonts, logo/background/sound asset ids — validated by @playora/contracts */
    tokens: jsonb().notNull(),
    ...timestamps,
  },
  (t) => [index().on(t.organizationId, t.clientId)],
);

export const events = pgTable(
  'events',
  {
    id: id(),
    organizationId: orgId(),
    clientId: uuid().references(() => clients.id, { onDelete: 'set null' }),
    brandKitId: uuid().references(() => brandKits.id, { onDelete: 'set null' }),
    slug: text().notNull(),
    name: text().notNull(),
    mode: eventMode().notNull().default('live'),
    status: eventStatus().notNull().default('draft'),
    timezone: text().notNull().default('Asia/Ho_Chi_Minh'),
    startsAt: timestamp({ withTimezone: true }),
    endsAt: timestamp({ withTimezone: true }),
    identity: identityMode().notNull().default('anonymous'),
    identityConfig: jsonb().notNull().default({}),
    registrationForm: jsonb(),
    playerLimit: integer().notNull().default(100),
    isCritical: boolean().notNull().default(false),
    deletedAt: timestamp({ withTimezone: true }),
    ...timestamps,
  },
  (t) => [uniqueIndex().on(t.slug), index().on(t.organizationId, t.status), index().on(t.startsAt)],
);

export const eventScreens = pgTable(
  'event_screens',
  {
    id: id(),
    organizationId: orgId(),
    eventId: uuid()
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    name: text().notNull(),
    /** sha256 of the screen key; the raw key is shown once in Studio. */
    screenKeyHash: text().notNull(),
    layout: jsonb(),
    revokedAt: timestamp({ withTimezone: true }),
    ...timestamps,
  },
  (t) => [uniqueIndex().on(t.screenKeyHash)],
);

export const games = pgTable(
  'games',
  {
    id: id(),
    organizationId: orgId(),
    eventId: uuid()
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    templateKey: text().notNull(),
    templateVersion: text().notNull(),
    skinKey: text(),
    name: text().notNull(),
    draftConfig: jsonb().notNull(),
    /** hotEditable fields changed while live, merged over the published version. */
    hotConfig: jsonb().notNull().default({}),
    status: gameStatus().notNull().default('draft'),
    currentVersionId: uuid(),
    sortOrder: integer().notNull().default(0),
    deletedAt: timestamp({ withTimezone: true }),
    ...timestamps,
  },
  (t) => [index().on(t.organizationId, t.eventId)],
);

export const gameVersions = pgTable(
  'game_versions',
  {
    id: id(),
    organizationId: orgId(),
    gameId: uuid()
      .notNull()
      .references(() => games.id, { onDelete: 'cascade' }),
    version: integer().notNull(),
    templateKey: text().notNull(),
    templateVersion: text().notNull(),
    skinKey: text(),
    config: jsonb().notNull(),
    configHash: text().notNull(),
    publishedBy: text()
      .notNull()
      .references(() => user.id),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex().on(t.gameId, t.version)],
);
