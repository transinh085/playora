import { z } from 'zod';
import { CampaignPrize, VoucherStatus } from './campaigns';
import { Id, IsoDateTime, OrgParams } from './common';
import { defineRoute } from './route';

/**
 * Counter redemption (docs/product/specs/prizes-redemption.md §6). Staff with the `redeemer` role
 * can only call these routes.
 */

/** Codes use an unambiguous alphabet (no 0/O, 1/I/L); input is normalised to upper case. */
export const VoucherCode = z
  .string()
  .trim()
  .min(4)
  .max(32)
  .transform((v) => v.toUpperCase().replace(/[\s-]/g, ''));

export const VoucherLookup = z.object({
  code: z.string(),
  status: VoucherStatus,
  rehearsal: z.boolean(),
  campaign: z.object({ id: Id, name: z.string() }),
  prize: CampaignPrize.pick({ id: true, name: true, image: true }),
  playerName: z.string().nullable(),
  issuedAt: IsoDateTime,
  expiresAt: IsoDateTime.nullable(),
  redeemedAt: IsoDateTime.nullable(),
  redeemedByName: z.string().nullable(),
  storeLabel: z.string().nullable().optional(),
});
export type VoucherLookup = z.infer<typeof VoucherLookup>;

export const SearchVouchersByPhoneQuery = z.object({
  phone: z.string().trim().min(8).max(20),
});
export type SearchVouchersByPhoneQuery = z.input<typeof SearchVouchersByPhoneQuery>;

export const RedeemVoucherBody = z
  .object({
    via: z.enum(['code', 'phone', 'qr']).optional(),
    storeLabel: z.string().trim().max(120).optional(),
  })
  .optional();
export type RedeemVoucherBody = z.input<typeof RedeemVoucherBody>;

export const ReopenVoucherBody = z.object({
  reason: z.string().trim().min(3).max(500),
});
export type ReopenVoucherBody = z.input<typeof ReopenVoucherBody>;

const VoucherParams = OrgParams.extend({ code: VoucherCode });

export const vouchersApi = {
  searchByPhone: defineRoute({
    method: 'GET',
    path: '/orgs/:orgId/vouchers/by-phone',
    summary: 'Look up active (issued, unredeemed, non-expired) vouchers by player phone number',
    tags: ['vouchers'],
    auth: 'session',
    permission: { voucher: ['redeem'] },
    params: OrgParams,
    query: SearchVouchersByPhoneQuery,
    response: z.object({ items: z.array(VoucherLookup) }),
  }),
  lookup: defineRoute({
    method: 'GET',
    path: '/orgs/:orgId/vouchers/:code',
    summary: 'Look up a voucher code at the counter',
    tags: ['vouchers'],
    auth: 'session',
    permission: { voucher: ['read'] },
    params: VoucherParams,
    response: VoucherLookup,
  }),
  redeem: defineRoute({
    method: 'POST',
    path: '/orgs/:orgId/vouchers/:code/redeem',
    summary: 'Mark a voucher as handed over; final, one time only',
    tags: ['vouchers'],
    auth: 'session',
    permission: { voucher: ['redeem'] },
    params: VoucherParams,
    body: RedeemVoucherBody,
    response: VoucherLookup,
  }),
  reopen: defineRoute({
    method: 'POST',
    path: '/orgs/:orgId/vouchers/:code/reopen',
    summary: 'Undo a mistaken redemption (owner only, reason required, audited)',
    tags: ['vouchers'],
    auth: 'session',
    permission: { voucher: ['reopen'] },
    params: VoucherParams,
    body: ReopenVoucherBody,
    response: VoucherLookup,
  }),
};
