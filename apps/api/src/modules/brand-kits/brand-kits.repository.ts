import { Inject, Injectable } from '@nestjs/common';
import { type Database, schema } from '@playora/db';
import { and, desc, eq, lt, type SQL } from 'drizzle-orm';
import { DB } from '../../infra/tokens';

const { brandKits } = schema;

export type BrandKitRow = typeof brandKits.$inferSelect;
export type NewBrandKit = Omit<typeof brandKits.$inferInsert, 'organizationId'>;
export type BrandKitPatch = Partial<Pick<BrandKitRow, 'name' | 'clientId' | 'tokens'>>;

@Injectable()
export class BrandKitsRepository {
  constructor(@Inject(DB) private readonly db: Database) {}

  private scope(organizationId: string, ...conditions: Array<SQL | undefined>) {
    return and(eq(brandKits.organizationId, organizationId), ...conditions);
  }

  async list(organizationId: string, opts: { limit: number; cursor?: string }) {
    const rows = await this.db
      .select()
      .from(brandKits)
      .where(this.scope(organizationId, opts.cursor ? lt(brandKits.id, opts.cursor) : undefined))
      .orderBy(desc(brandKits.id))
      .limit(opts.limit + 1);

    const hasMore = rows.length > opts.limit;
    const items = hasMore ? rows.slice(0, opts.limit) : rows;
    return { items, nextCursor: hasMore ? (items.at(-1)?.id ?? null) : null };
  }

  async findById(organizationId: string, id: string) {
    const [row] = await this.db
      .select()
      .from(brandKits)
      .where(this.scope(organizationId, eq(brandKits.id, id)));
    return row;
  }

  async insert(organizationId: string, data: NewBrandKit) {
    const [row] = await this.db
      .insert(brandKits)
      .values({ ...data, organizationId })
      .returning();
    return row as BrandKitRow;
  }

  async update(organizationId: string, id: string, patch: BrandKitPatch) {
    const [row] = await this.db
      .update(brandKits)
      .set(patch)
      .where(this.scope(organizationId, eq(brandKits.id, id)))
      .returning();
    return row;
  }

  async delete(organizationId: string, id: string, tx: Pick<Database, 'delete'> = this.db) {
    const [row] = await tx
      .delete(brandKits)
      .where(this.scope(organizationId, eq(brandKits.id, id)))
      .returning({ id: brandKits.id });
    return row;
  }

  transaction<T>(fn: (tx: Parameters<Parameters<Database['transaction']>[0]>[0]) => Promise<T>) {
    return this.db.transaction(fn);
  }
}
