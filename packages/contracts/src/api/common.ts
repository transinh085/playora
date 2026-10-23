import { z } from 'zod';

export const Id = z.uuid();
/** Better Auth ids (users, organizations) are opaque strings, not UUIDs. */
export const AuthId = z.string().min(1).max(64);
export const Slug = z
  .string()
  .regex(/^[a-z0-9](?:[a-z0-9-]{1,62}[a-z0-9])$/, 'Chỉ dùng chữ thường, số và dấu gạch ngang');
export const IsoDateTime = z.iso.datetime({ offset: true });

export const OrgParams = z.object({ orgId: AuthId });

export const PageQuery = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number<number | string>().int().min(1).max(200).default(50),
});

export function Page<T extends z.ZodType>(item: T) {
  return z.object({ items: z.array(item), nextCursor: z.string().nullable() });
}

export const Ok = z.object({ ok: z.literal(true) });
