import { index, jsonb, pgTable, text } from 'drizzle-orm/pg-core';
import { createdAt, id } from './_shared';

export const auditLogs = pgTable(
  'audit_logs',
  {
    id: id(),
    organizationId: text(),
    actorType: text().notNull(),
    actorId: text(),
    action: text().notNull(),
    targetType: text(),
    targetId: text(),
    diff: jsonb(),
    ip: text(),
    createdAt: createdAt(),
  },
  (t) => [index().on(t.organizationId, t.createdAt)],
);
