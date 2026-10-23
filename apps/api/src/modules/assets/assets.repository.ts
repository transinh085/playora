import { Inject, Injectable } from '@nestjs/common';
import type { AssetKind } from '@playora/contracts';
import { type Database, schema } from '@playora/db';
import { and, desc, eq, lt, type SQL } from 'drizzle-orm';
import { DB } from '../../infra/tokens';

const { assets } = schema;

export type AssetRow = typeof assets.$inferSelect;
export type NewAsset = Omit<typeof assets.$inferInsert, 'organizationId'>;
export type AssetPatch = Partial<
  Pick<AssetRow, 'bytes' | 'width' | 'height' | 'variants' | 'status'>
>;

@Injectable()
export class AssetsRepository {
  constructor(@Inject(DB) private readonly db: Database) {}

  private scope(organizationId: string, ...conditions: Array<SQL | undefined>) {
    return and(eq(assets.organizationId, organizationId), ...conditions);
  }

  async list(organizationId: string, opts: { limit: number; cursor?: string; kind?: AssetKind }) {
    const rows = await this.db
      .select()
      .from(assets)
      .where(
        this.scope(
          organizationId,
          opts.kind ? eq(assets.kind, opts.kind) : undefined,
          opts.cursor ? lt(assets.id, opts.cursor) : undefined,
        ),
      )
      .orderBy(desc(assets.id))
      .limit(opts.limit + 1);

    const hasMore = rows.length > opts.limit;
    const items = hasMore ? rows.slice(0, opts.limit) : rows;
    return { items, nextCursor: hasMore ? (items.at(-1)?.id ?? null) : null };
  }

  async findById(organizationId: string, id: string) {
    const [row] = await this.db
      .select()
      .from(assets)
      .where(this.scope(organizationId, eq(assets.id, id)));
    return row;
  }

  async insert(organizationId: string, data: NewAsset) {
    const [row] = await this.db
      .insert(assets)
      .values({ ...data, organizationId })
      .returning();
    return row as AssetRow;
  }

  async update(organizationId: string, id: string, patch: AssetPatch) {
    const [row] = await this.db
      .update(assets)
      .set(patch)
      .where(this.scope(organizationId, eq(assets.id, id)))
      .returning();
    return row;
  }

  async delete(organizationId: string, id: string, tx: Pick<Database, 'delete'> = this.db) {
    const [row] = await tx
      .delete(assets)
      .where(this.scope(organizationId, eq(assets.id, id)))
      .returning();
    return row;
  }

  transaction<T>(fn: (tx: Parameters<Parameters<Database['transaction']>[0]>[0]) => Promise<T>) {
    return this.db.transaction(fn);
  }
}
