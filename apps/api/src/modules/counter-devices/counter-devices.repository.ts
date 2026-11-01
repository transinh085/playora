import { Inject, Injectable } from '@nestjs/common';
import { type Database, schema } from '@playora/db';
import { and, count, desc, eq, gt, isNull } from 'drizzle-orm';
import { DB } from '../../infra/tokens';

const { counterDevices, organization } = schema;

export type CounterDeviceRow = typeof counterDevices.$inferSelect;

@Injectable()
export class CounterDevicesRepository {
  constructor(@Inject(DB) private readonly db: Database) {}

  async listByOrganization(organizationId: string): Promise<CounterDeviceRow[]> {
    return this.db
      .select()
      .from(counterDevices)
      .where(eq(counterDevices.organizationId, organizationId))
      .orderBy(desc(counterDevices.createdAt));
  }

  async countActiveByOrganization(organizationId: string): Promise<number> {
    const [row] = await this.db
      .select({ total: count() })
      .from(counterDevices)
      .where(
        and(eq(counterDevices.organizationId, organizationId), isNull(counterDevices.revokedAt)),
      );
    return Number(row?.total ?? 0);
  }

  async create(
    organizationId: string,
    values: {
      label: string;
      storeLabel: string | null;
      pairingCodeHash: string;
      pairingExpiresAt: Date;
      createdBy: string;
    },
  ): Promise<CounterDeviceRow> {
    const [row] = await this.db
      .insert(counterDevices)
      .values({
        organizationId,
        label: values.label,
        storeLabel: values.storeLabel,
        pairingCodeHash: values.pairingCodeHash,
        pairingExpiresAt: values.pairingExpiresAt,
        createdBy: values.createdBy,
      })
      .returning();
    if (!row) throw new Error('Failed to insert counter device');
    return row;
  }

  async revoke(
    organizationId: string,
    deviceId: string,
    now = new Date(),
  ): Promise<CounterDeviceRow | undefined> {
    const [row] = await this.db
      .update(counterDevices)
      .set({
        revokedAt: now,
        tokenHash: null,
        pairingCodeHash: null,
        pairingExpiresAt: null,
      })
      .where(
        and(eq(counterDevices.organizationId, organizationId), eq(counterDevices.id, deviceId)),
      )
      .returning();
    return row;
  }

  /**
   * Public one-time pairing exchange (ADR-017): matches a non-revoked, unexpired pairing code hash,
   * clears it immediately, and stores the hashed persistent device token.
   */
  async exchangePairingCode(
    pairingCodeHash: string,
    tokenHash: string,
    now = new Date(),
  ): Promise<{
    id: string;
    organizationId: string;
    organizationName: string;
    label: string;
    storeLabel: string | null;
  } | null> {
    const [updated] = await this.db
      .update(counterDevices)
      .set({
        pairingCodeHash: null,
        pairingExpiresAt: null,
        tokenHash,
        lastUsedAt: now,
      })
      .where(
        and(
          eq(counterDevices.pairingCodeHash, pairingCodeHash),
          isNull(counterDevices.revokedAt),
          gt(counterDevices.pairingExpiresAt, now),
        ),
      )
      .returning({
        id: counterDevices.id,
        organizationId: counterDevices.organizationId,
        label: counterDevices.label,
        storeLabel: counterDevices.storeLabel,
      });

    if (!updated) return null;

    const [org] = await this.db
      .select({ name: organization.name })
      .from(organization)
      .where(eq(organization.id, updated.organizationId))
      .limit(1);

    return {
      id: updated.id,
      organizationId: updated.organizationId,
      organizationName: org?.name ?? '',
      label: updated.label,
      storeLabel: updated.storeLabel ?? null,
    };
  }
}
