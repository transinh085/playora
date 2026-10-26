import type { MyVoucher } from '@playora/contracts';
import type { PlayerVoucher } from '@playora/ui/campaign';

/** `playsApi.me` vouchers as the shared "Quà của tôi" list shows them. */
export function toPlayerVouchers(vouchers: readonly MyVoucher[]): PlayerVoucher[] {
  return vouchers.map((v) => ({
    code: v.code,
    prizeName: v.prize.name,
    prizeImage: v.prize.image,
    issuedAt: v.issuedAt,
    redeemedAt: v.redeemedAt,
    status: v.status,
    expiresAt: v.expiresAt,
  }));
}

/** How often an open "Quà của tôi" refetches, so a code redeemed at the counter flips to "Đã đổi". */
export const VOUCHER_POLL_MS = 15_000;
