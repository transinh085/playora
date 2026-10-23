import { index, integer, jsonb, pgTable, text } from 'drizzle-orm/pg-core';
import { id, orgId, timestamps } from './_shared';
import { user } from './auth';
import { assetKind, assetStatus } from './enums';

export const assets = pgTable(
  'assets',
  {
    id: id(),
    organizationId: orgId(),
    kind: assetKind().notNull(),
    mime: text().notNull(),
    bytes: integer().notNull(),
    width: integer(),
    height: integer(),
    storageKey: text().notNull(),
    variants: jsonb().notNull().default({}),
    status: assetStatus().notNull().default('pending'),
    createdBy: text()
      .notNull()
      .references(() => user.id),
    ...timestamps,
  },
  (t) => [index().on(t.organizationId, t.kind)],
);
