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
});
export type VoucherLookup = z.infer<typeof VoucherLookup>;

export const ReopenVoucherBody = z.object({
  reason: z.string().trim().min(3).max(500),
});
export type ReopenVoucherBody = z.input<typeof ReopenVoucherBody>;

const VoucherParams = OrgParams.extend({ code: VoucherCode });

export const vouchersApi = {
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
