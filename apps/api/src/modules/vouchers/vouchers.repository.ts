import { Inject, Injectable } from '@nestjs/common';
import { type Database, type DbOrTx, schema, type Tx } from '@playora/db';
import { and, desc, eq, gt, isNotNull, isNull, ne, or, sql } from 'drizzle-orm';
import { DB } from '../../infra/tokens';

const { awards, counterDevices, events, prizes, players, user } = schema;

/**
 * Counter redemption data access. Codes are unique per organization
 * (`awards(organization_id, redeem_code)`); every query filters by `organizationId`.
 */
@Injectable()
export class VouchersRepository {
  constructor(@Inject(DB) private readonly db: Database) {}

  async findByCode(organizationId: string, code: string, tx: DbOrTx = this.db) {
    const [row] = await tx
      .select({
        id: awards.id,
        code: awards.redeemCode,
        status: awards.status,
        env: awards.env,
        createdAt: awards.createdAt,
        expiresAt: awards.expiresAt,
        redeemedAt: awards.redeemedAt,
        redeemedBy: awards.redeemedBy,
        redeemedByName: user.name,
        redeemedByDeviceId: awards.redeemedByDeviceId,
        redeemedByDeviceLabel: counterDevices.label,
        redeemedStoreLabel: awards.redeemedStoreLabel,
        campaignId: events.id,
        campaignName: events.name,
        prizeRowId: prizes.id,
        prizeKey: prizes.key,
        prizeName: prizes.name,
        prizeImageUrl: prizes.imageUrl,
        playerName: players.displayName,
      })
      .from(awards)
      .innerJoin(
        events,
        and(eq(events.organizationId, organizationId), eq(events.id, awards.eventId)),
      )
      .innerJoin(
        prizes,
        and(eq(prizes.organizationId, organizationId), eq(prizes.id, awards.prizeId)),
      )
      .leftJoin(
        players,
        and(eq(players.organizationId, organizationId), eq(players.id, awards.playerId)),
      )
      .leftJoin(user, eq(user.id, awards.redeemedBy))
      .leftJoin(
        counterDevices,
        and(
          eq(counterDevices.organizationId, organizationId),
          eq(counterDevices.id, awards.redeemedByDeviceId),
        ),
      )
      .where(and(eq(awards.organizationId, organizationId), eq(awards.redeemCode, code)));
    return row;
  }

  /**
   * Active (live, issued, unredeemed, non-expired) vouchers belonging to players matching
   * `phoneHash` within `organizationId` (PRZ-15).
   */
  async findActiveByPhoneHash(organizationId: string, phoneHash: string, tx: DbOrTx = this.db) {
    return tx
      .select({
        id: awards.id,
        code: awards.redeemCode,
        status: awards.status,
        env: awards.env,
        createdAt: awards.createdAt,
        expiresAt: awards.expiresAt,
        redeemedAt: awards.redeemedAt,
        redeemedBy: awards.redeemedBy,
        redeemedByName: user.name,
        redeemedByDeviceId: awards.redeemedByDeviceId,
        redeemedByDeviceLabel: counterDevices.label,
        redeemedStoreLabel: awards.redeemedStoreLabel,
        campaignId: events.id,
        campaignName: events.name,
        prizeRowId: prizes.id,
        prizeKey: prizes.key,
        prizeName: prizes.name,
        prizeImageUrl: prizes.imageUrl,
        playerName: players.displayName,
      })
      .from(awards)
      .innerJoin(
        events,
        and(eq(events.organizationId, organizationId), eq(events.id, awards.eventId)),
      )
      .innerJoin(
        prizes,
        and(eq(prizes.organizationId, organizationId), eq(prizes.id, awards.prizeId)),
      )
      .innerJoin(
        players,
        and(
          eq(players.organizationId, organizationId),
          eq(players.id, awards.playerId),
          eq(players.phoneHash, phoneHash),
        ),
      )
      .leftJoin(user, eq(user.id, awards.redeemedBy))
      .leftJoin(
        counterDevices,
        and(
          eq(counterDevices.organizationId, organizationId),
          eq(counterDevices.id, awards.redeemedByDeviceId),
        ),
      )
      .where(
        and(
          eq(awards.organizationId, organizationId),
          eq(awards.env, 'live'),
          eq(awards.status, 'issued'),
          isNull(awards.redeemedAt),
          or(isNull(awards.expiresAt), gt(awards.expiresAt, sql`now()`)),
        ),
      )
      .orderBy(desc(awards.createdAt));
  }

  /**
   * One conditional UPDATE: of N concurrent redeems exactly one matches the row
   * (docs/product/specs/prizes-redemption.md §9.3). Returns nothing when the code is missing,
   * void, already redeemed or expired.
   */
  async redeem(
    organizationId: string,
    code: string,
    redeemed: {
      userId: string | null;
      deviceId?: string | null;
      storeLabel?: string | null;
    },
  ) {
    const [row] = await this.db
      .update(awards)
      .set({
        status: 'redeemed',
        redeemedAt: sql`now()`,
        redeemedBy: redeemed.userId,
        redeemedByDeviceId: redeemed.deviceId ?? null,
        redeemedStoreLabel: redeemed.storeLabel ?? null,
      })
      .where(
        and(
          eq(awards.organizationId, organizationId),
          eq(awards.redeemCode, code),
          isNull(awards.redeemedAt),
          ne(awards.status, 'void'),
          or(isNull(awards.expiresAt), gt(awards.expiresAt, sql`now()`)),
        ),
      )
      .returning({ id: awards.id });
    return row;
  }

  /** Clears a redemption; only a redeemed, non-void code matches. */
  async reopen(organizationId: string, code: string, tx: DbOrTx = this.db) {
    const [row] = await tx
      .update(awards)
      .set({
        status: 'issued',
        redeemedAt: null,
        redeemedBy: null,
        redeemedByDeviceId: null,
        redeemedStoreLabel: null,
      })
      .where(
        and(
          eq(awards.organizationId, organizationId),
          eq(awards.redeemCode, code),
          isNotNull(awards.redeemedAt),
          ne(awards.status, 'void'),
        ),
      )
      .returning({ id: awards.id });
    return row;
  }

  transaction<T>(fn: (tx: Tx) => Promise<T>) {
    return this.db.transaction(fn);
  }
}
