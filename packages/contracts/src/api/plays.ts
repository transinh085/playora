import { z } from 'zod';
import {
  CampaignBrand,
  CampaignPhase,
  CampaignPrize,
  CampaignScreens,
  CampaignSkinKey,
  CampaignTemplateKey,
  PlayResult,
  RehearsalPlayBody,
  VoucherStatus,
} from './campaigns';
import { AuthId, Id, IsoDateTime, Slug } from './common';
import { JoinedPlayer, PublicRegistrationForm } from './public';
import { defineRoute } from './route';

/**
 * Player side of a campaign (docs/adr/012-campaign-architecture.md §4, ADR-015). The player shell
 * reads the published version, joins with `publicApi.join`, then plays with the player token.
 */

export const PublicPrize = CampaignPrize.pick({ id: true, name: true, image: true }).extend({
  quantity: z.number().int().min(0).optional(),
  remaining: z.number().int().min(0).optional(),
});
export type PublicPrize = z.infer<typeof PublicPrize>;

/** What the player shell needs to render a published campaign. Odds are never exposed. */
export const PublicCampaign = z.object({
  id: Id,
  organizationId: AuthId.optional(),
  slug: Slug,
  name: z.string(),
  version: z.number().int().positive(),
  templateKey: CampaignTemplateKey,
  skinKey: CampaignSkinKey,
  brand: CampaignBrand,
  screens: CampaignScreens,
  prizes: z.array(PublicPrize),
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
  /** Free plan: the shell shows a small "Tạo bằng Playora" badge (BIL-02). */
  watermark: z.boolean(),
  /** Full terms ("thể lệ"): the shop's own text or the one generated from the settings. */
  terms: z.string(),
  /** Optional Zalo Official Account link for post-play follow CTA (RET-07). */
  zaloOaUrl: z.string().nullable().optional(),
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

export const RestorePrizesBody = z.object({
  phone: z.string().trim().min(8).max(20),
  codeSuffix: z
    .string()
    .trim()
    .min(4)
    .max(6)
    .transform((v) => v.toUpperCase().replace(/[\s-]/g, '')),
  deviceId: z.string().trim().min(1).max(128).optional(),
});
export type RestorePrizesBody = z.input<typeof RestorePrizesBody>;

export const RestorePrizesResponse = z.object({
  playerToken: z.string(),
  player: JoinedPlayer,
  vouchers: z.array(MyVoucher),
});
export type RestorePrizesResponse = z.infer<typeof RestorePrizesResponse>;

const SlugParams = z.object({ slug: Slug });
const DraftTokenParams = z.object({
  token: z
    .string()
    .trim()
    .min(16)
    .max(128)
    .regex(/^[A-Za-z0-9_-]+$/),
});

export const PublicDraftCampaign = z.object({
  id: Id,
  organizationId: AuthId.optional(),
  slug: Slug,
  name: z.string(),
  templateKey: CampaignTemplateKey,
  skinKey: CampaignSkinKey,
  brand: CampaignBrand,
  screens: CampaignScreens,
  prizes: z.array(PublicPrize),
  startsAt: IsoDateTime,
  endsAt: IsoDateTime,
  timezone: z.string(),
  openingHours: z.object({ start: z.string(), end: z.string() }).nullable(),
  playsPerDay: z.number().int(),
  openDays: z.array(z.number().int()).nullable(),
  requireRedeemBeforeReplay: z.boolean(),
  collectForm: z.boolean(),
  registrationForm: PublicRegistrationForm,
  terms: z.string(),
  /** Optional Zalo Official Account link for post-play follow CTA (RET-07). */
  zaloOaUrl: z.string().nullable().optional(),
  testerCount: z.number().int().min(0),
  maxTesters: z.number().int().positive(),
});
export type PublicDraftCampaign = z.infer<typeof PublicDraftCampaign>;

export const DraftResetBody = z
  .object({
    testerKey: z.string().trim().min(1).max(64).optional(),
  })
  .default({});
export type DraftResetBody = z.input<typeof DraftResetBody>;

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
    rateLimit: 'campaign',
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
  restorePrizes: defineRoute({
    method: 'POST',
    path: '/p/:slug/prizes/restore',
    summary: 'Restore player session and vouchers using phone + last 4 chars of a won voucher code',
    tags: ['player'],
    auth: 'public',
    rateLimit: 'public',
    params: SlugParams,
    body: RestorePrizesBody,
    response: RestorePrizesResponse,
  }),
  draftCampaign: defineRoute({
    method: 'GET',
    path: '/public/drafts/:token',
    summary: 'Load a draft campaign via its public rehearsal share token (BLD-23)',
    tags: ['player'],
    auth: 'public',
    rateLimit: 'public',
    params: DraftTokenParams,
    response: PublicDraftCampaign,
  }),
  draftPlay: defineRoute({
    method: 'POST',
    path: '/public/drafts/:token/play',
    summary: 'Play a rehearsal turn via a public draft share token (capped at 20 distinct testers)',
    tags: ['player'],
    auth: 'public',
    rateLimit: 'campaign',
    params: DraftTokenParams,
    body: RehearsalPlayBody,
    response: PlayResult,
  }),
  draftReset: defineRoute({
    method: 'POST',
    path: '/public/drafts/:token/reset',
    summary: 'Generate a fresh tester key / reset rehearsal state for a public draft tester',
    tags: ['player'],
    auth: 'public',
    rateLimit: 'public',
    params: DraftTokenParams,
    body: DraftResetBody,
    response: z.object({ ok: z.literal(true), testerCount: z.number().int().min(0) }),
  }),
};
