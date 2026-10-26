import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ErrorCode, type VoucherLookup, type VoucherStatus } from '@playora/contracts';
import type { Actor } from '../../common/actor';
import { AuditService } from '../../common/audit/audit.service';
import { VouchersRepository } from './vouchers.repository';

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
    redeemedByName: row.redeemedAt ? (row.redeemedByName ?? null) : null,
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
  ) {}

  private async find(orgId: string, code: string) {
    const row = await this.repo.findByCode(orgId, code);
    if (!row) voucherNotFound();
    return row;
  }

  async lookup(orgId: string, code: string): Promise<VoucherLookup> {
    return toLookup(await this.find(orgId, code));
  }

  /** Final and one time only; the conditional UPDATE decides under concurrency. */
  async redeem(orgId: string, code: string, actor: Actor): Promise<VoucherLookup> {
    const updated = await this.repo.redeem(orgId, code, actor.userId);
    const row = await this.find(orgId, code);
    if (updated) return toLookup(row);

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
