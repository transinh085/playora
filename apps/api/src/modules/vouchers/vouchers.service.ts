import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ErrorCode,
  type RedeemVoucherBody,
  type VoucherLookup,
  type VoucherStatus,
} from '@playora/contracts';
import type { Redis } from 'ioredis';
import type { Actor } from '../../common/actor';
import { AuditService } from '../../common/audit/audit.service';
import type { CounterDeviceActor } from '../../common/auth/auth.types';
import { PiiService } from '../../common/pii/pii.service';
import { REDIS } from '../../infra/tokens';
import { VouchersRepository } from './vouchers.repository';

export const VOUCHER_PHONE_LOOKUP_LIMIT_PER_HOUR = 20;
const HOUR_S = 3600;

type VoucherRow = NonNullable<Awaited<ReturnType<VouchersRepository['findByCode']>>>;

/** Status shown at the counter: void → redeemed → expired → issued. */
export function voucherStatus(
  row: { status: string; redeemedAt: Date | null; expiresAt: Date | null },
  now = Date.now(),
): VoucherStatus {
  if (row.status === 'void') return 'void';
  if (row.redeemedAt) return 'redeemed';
  if (row.expiresAt && row.expiresAt.getTime() <= now) return 'expired';
  return 'issued';
}

function toLookup(row: VoucherRow): VoucherLookup {
  return {
    code: row.code,
    status: voucherStatus(row),
    rehearsal: row.env === 'rehearsal',
    campaign: { id: row.campaignId, name: row.campaignName },
    prize: {
      id: row.prizeKey ?? row.prizeRowId,
      name: row.prizeName,
      ...(row.prizeImageUrl ? { image: row.prizeImageUrl } : {}),
    },
    playerName: row.playerName ?? null,
    issuedAt: row.createdAt.toISOString(),
    expiresAt: row.expiresAt?.toISOString() ?? null,
    redeemedAt: row.redeemedAt?.toISOString() ?? null,
    redeemedByName: row.redeemedAt
      ? (row.redeemedByDeviceLabel ?? row.redeemedByName ?? null)
      : null,
    ...(row.redeemedStoreLabel ? { storeLabel: row.redeemedStoreLabel } : {}),
  };
}

function voucherNotFound(): never {
  throw new NotFoundException({ code: ErrorCode.VOUCHER_NOT_FOUND, message: 'Voucher not found' });
}

@Injectable()
export class VouchersService {
  constructor(
    private readonly repo: VouchersRepository,
    private readonly audit: AuditService,
    private readonly pii: PiiService,
    @Inject(REDIS) private readonly redis: Redis,
  ) {}

  private async find(orgId: string, code: string) {
    const row = await this.repo.findByCode(orgId, code);
    if (!row) voucherNotFound();
    return row;
  }

  async lookup(orgId: string, code: string): Promise<VoucherLookup> {
    return toLookup(await this.find(orgId, code));
  }

  /**
   * Counter phone lookup (PRZ-15): rate-limited to 20 requests/hour per actor, normalizes
   * Vietnamese phone numbers and searches `players.phone_hash` for active `issued` vouchers
   * in `orgId`. Audits `voucher.lookup_phone` without storing raw phone in audit logs.
   */
  async searchByPhone(
    orgId: string,
    rawPhone: string,
    actor: Actor,
    counterDevice?: CounterDeviceActor | null,
  ): Promise<{ items: VoucherLookup[] }> {
    const actorKey = counterDevice?.id || actor.userId || actor.ip || 'anon';
    const rateKey = `rl:voucher-phone:${orgId}:${actorKey}`;
    const count = await this.redis.incr(rateKey);
    if (count === 1) await this.redis.expire(rateKey, HOUR_S);
    if (count > VOUCHER_PHONE_LOOKUP_LIMIT_PER_HOUR) {
      throw new HttpException(
        { code: ErrorCode.RATE_LIMITED, message: 'Too many phone lookups, please try again later' },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const protectedPhone = this.pii.protectPhone(rawPhone);
    if (!protectedPhone) {
      throw new BadRequestException({
        code: ErrorCode.VALIDATION_FAILED,
        message: 'Số điện thoại không hợp lệ',
        details: { field: 'phone' },
      });
    }

    const rows = await this.repo.findActiveByPhoneHash(orgId, protectedPhone.phoneHash);
    await this.audit.record({
      organizationId: orgId,
      actorType: counterDevice ? 'counter_device' : 'user',
      actorId: counterDevice ? counterDevice.id : actor.userId,
      action: 'voucher.lookup_phone',
      targetType: 'organization',
      targetId: orgId,
      diff: {
        matchCount: rows.length,
        ...(counterDevice ? { deviceId: counterDevice.id, deviceLabel: counterDevice.label } : {}),
      },
      ip: actor.ip,
    });
    return { items: rows.map(toLookup) };
  }

  /**
   * Final and one time only for live vouchers; the conditional UPDATE decides under concurrency.
   * Rehearsal vouchers run in repeatable Training Mode (PRZ-19): confirming returns a simulated
   * redeemed response and audits `voucher.training_redeem` while keeping the award reusable in DB.
   * Counter redemption is never blocked by plan limits (D-23, BIL-02).
   */
  async redeem(
    orgId: string,
    code: string,
    actor: Actor,
    body?: RedeemVoucherBody,
    counterDevice?: CounterDeviceActor | null,
  ): Promise<VoucherLookup> {
    const via = body?.via ?? 'code';
    const storeLabel = body?.storeLabel ?? counterDevice?.storeLabel ?? null;
    const actorType = counterDevice ? 'counter_device' : 'user';
    const actorId = counterDevice ? counterDevice.id : actor.userId;
    const current = await this.find(orgId, code);
    if (current.env === 'rehearsal' && voucherStatus(current) === 'issued') {
      await this.audit.record({
        organizationId: orgId,
        actorType,
        actorId,
        action: 'voucher.training_redeem',
        targetType: 'award',
        targetId: current.id,
        diff: {
          code: current.code,
          campaignId: current.campaignId,
          via,
          ...(counterDevice
            ? { deviceId: counterDevice.id, deviceLabel: counterDevice.label }
            : {}),
          ...(storeLabel ? { storeLabel } : {}),
        },
        ip: actor.ip,
      });
      return {
        ...toLookup(current),
        status: 'redeemed',
        rehearsal: true,
        redeemedAt: new Date().toISOString(),
        redeemedByName: counterDevice?.label ?? current.redeemedByName ?? null,
        ...(storeLabel ? { storeLabel } : {}),
      };
    }

    const updated = await this.repo.redeem(orgId, code, {
      userId: counterDevice ? null : actor.userId,
      deviceId: counterDevice?.id ?? null,
      storeLabel,
    });
    const row = await this.find(orgId, code);
    if (updated) {
      await this.audit.record({
        organizationId: orgId,
        actorType,
        actorId,
        action: 'voucher.redeem',
        targetType: 'award',
        targetId: row.id,
        diff: {
          code: row.code,
          campaignId: row.campaignId,
          via,
          ...(counterDevice
            ? { deviceId: counterDevice.id, deviceLabel: counterDevice.label }
            : {}),
          ...(storeLabel ? { storeLabel } : {}),
        },
        ip: actor.ip,
      });
      return toLookup(row);
    }

    const status = voucherStatus(row);
    const details = { status, redeemedAt: row.redeemedAt?.toISOString() ?? null };
    if (status === 'void') {
      throw new ConflictException({
        code: ErrorCode.VOUCHER_VOID,
        message: 'Voucher is void',
        details,
      });
    }
    if (status === 'redeemed') {
      throw new ConflictException({
        code: ErrorCode.VOUCHER_ALREADY_REDEEMED,
        message: 'Voucher already redeemed',
        details,
      });
    }
    // 'expired', or 'issued' when the expiry passed between the update and this read.
    throw new ConflictException({
      code: ErrorCode.VOUCHER_EXPIRED,
      message: 'Voucher has expired',
      details,
    });
  }

  /** Owner-only undo of a mistaken redemption, with the reason in the audit log. */
  async reopen(orgId: string, code: string, reason: string, actor: Actor): Promise<VoucherLookup> {
    const before = await this.find(orgId, code);
    await this.repo.transaction(async (tx) => {
      const row = await this.repo.reopen(orgId, code, tx);
      if (!row) {
        throw new ConflictException({
          code: before.status === 'void' ? ErrorCode.VOUCHER_VOID : ErrorCode.CONFLICT,
          message: 'Only a redeemed voucher can be reopened',
          details: { status: voucherStatus(before) },
        });
      }
      await this.audit.record(
        {
          organizationId: orgId,
          actorType: 'user',
          actorId: actor.userId,
          action: 'voucher.reopen',
          targetType: 'award',
          targetId: row.id,
          diff: {
            code,
            reason,
            redeemedAt: before.redeemedAt?.toISOString() ?? null,
            redeemedBy: before.redeemedBy,
          },
          ip: actor.ip,
        },
        tx,
      );
    });
    return this.lookup(orgId, code);
  }
}
