import { z } from 'zod';
import {
  CampaignBrand,
  CampaignPhase,
  CampaignPrize,
  CampaignScreens,
  CampaignSkinKey,
  CampaignTemplateKey,
  PlayResult,
  VoucherStatus,
} from './campaigns';
import { Id, IsoDateTime, Slug } from './common';
import { PublicRegistrationForm } from './public';
import { defineRoute } from './route';

/**
 * Player side of a campaign (docs/adr/012-campaign-architecture.md §4, ADR-015). The player shell
 * reads the published version, joins with `publicApi.join`, then plays with the player token.
 */

/** What the player shell needs to render a published campaign. Odds and stock are never exposed. */
export const PublicCampaign = z.object({
  id: Id,
  slug: Slug,
  name: z.string(),
  version: z.number().int().positive(),
  templateKey: CampaignTemplateKey,
  skinKey: CampaignSkinKey,
  brand: CampaignBrand,
  screens: CampaignScreens,
  prizes: z.array(CampaignPrize.pick({ id: true, name: true, image: true })),
  phase: CampaignPhase,
  startsAt: IsoDateTime,
  endsAt: IsoDateTime,
  timezone: z.string(),
  openingHours: z.object({ start: z.string(), end: z.string() }).nullable(),
  playsPerDay: z.number().int(),
  openDays: z.array(z.number().int()).nullable(),
  requireRedeemBeforeReplay: z.boolean(),
  collectForm: z.boolean(),
  /** Cloudflare Turnstile site key when the anti-fraud level asks for a challenge. */
  captchaSiteKey: z.string().nullable(),
  registrationForm: PublicRegistrationForm,
});
export type PublicCampaign = z.infer<typeof PublicCampaign>;

export const StartPlayBody = z.object({
  /** Idempotency key: retrying with the same id returns the first result and never plays twice. */
  requestId: z.uuid(),
  /** Channel key from the link (`?c=table-qr`), for reports by channel (EVT-11). */
  channel: z
    .string()
    .trim()
    .max(64)
    .regex(/^[a-z0-9_-]*$/)
    .optional(),
  /** Cloudflare Turnstile token when the campaign's anti-fraud preset asks for it (EVT-13). */
  captchaToken: z.string().max(4096).optional(),
});
export type StartPlayBody = z.input<typeof StartPlayBody>;

export const MyVoucher = z.object({
  code: z.string(),
  prize: CampaignPrize.pick({ id: true, name: true, image: true }),
  status: VoucherStatus,
  issuedAt: IsoDateTime,
  expiresAt: IsoDateTime.nullable(),
  redeemedAt: IsoDateTime.nullable(),
});
export type MyVoucher = z.infer<typeof MyVoucher>;

export const PlayerState = z.object({
  turnsLeftToday: z.number().int().min(0),
  /** When the next turn opens if none are left today (start of the next open day). */
  nextTurnAt: IsoDateTime.nullable(),
  /** `redeem_first`: an unredeemed voucher must be used at the counter before playing again. */
  blockedReason: z.enum(['redeem_first']).nullable(),
  vouchers: z.array(MyVoucher),
});
export type PlayerState = z.infer<typeof PlayerState>;

const SlugParams = z.object({ slug: Slug });

export const playsApi = {
  campaign: defineRoute({
    method: 'GET',
    path: '/p/:slug/campaign',
    summary: 'Published campaign for the player shell',
    tags: ['player'],
    auth: 'public',
    rateLimit: 'public',
    params: SlugParams,
    response: PublicCampaign,
  }),
  play: defineRoute({
    method: 'POST',
    path: '/p/:slug/plays',
    summary: 'Play one turn: the server checks turns, decides the prize and issues the voucher',
    tags: ['player'],
    auth: 'player',
    params: SlugParams,
    body: StartPlayBody,
    response: PlayResult,
  }),
  me: defineRoute({
    method: 'GET',
    path: '/p/:slug/me',
    summary: 'Turns left today and the player’s vouchers (Quà của tôi)',
    tags: ['player'],
    auth: 'player',
    params: SlugParams,
    response: PlayerState,
  }),
};
