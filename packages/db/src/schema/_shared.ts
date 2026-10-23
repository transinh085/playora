import { text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { uuidv7 } from 'uuidv7';
import { organization } from './auth';

export const id = () =>
  uuid()
    .primaryKey()
    .$defaultFn(() => uuidv7());

/** Better Auth uses text ids, so tenant keys are text. */
export const orgId = () =>
  text()
    .notNull()
    .references(() => organization.id, { onDelete: 'cascade' });

export const createdAt = () => timestamp({ withTimezone: true }).notNull().defaultNow();

export const timestamps = {
  createdAt: createdAt(),
  updatedAt: timestamp({ withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};
