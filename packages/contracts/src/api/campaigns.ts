import { z } from 'zod';
import { AuthId, Id, IsoDateTime, Ok, OrgParams, Page, PageQuery, Slug } from './common';
import { defineRoute } from './route';

/**
 * Campaigns ("Chương trình" in the UI). One campaign is stored as one `events` row with exactly
 * one `games` row in M1 (ADR-015). These routes are the facade the Studio uses; the older
 * `events`/`games` routes stay until the legacy UI is removed.
 */

export const CampaignTemplateKey = z.enum(['spin-wheel', 'scratch-card', 'gift-box']);
export type CampaignTemplateKey = z.infer<typeof CampaignTemplateKey>;

export const CampaignSkinKey = z.enum(['tet', 'grand-opening', 'everyday']);
export type CampaignSkinKey = z.infer<typeof CampaignSkinKey>;

/** Same values as `@playora/core/prize` `PrizeMode` (contracts cannot import core). */
export const CampaignPrizeMode = z.enum([
  'per_prize_probability',
  'overall_win_rate',
  'guaranteed',
]);
export type CampaignPrizeMode = z.infer<typeof CampaignPrizeMode>;

const HexColor = z.string().regex(/^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/, 'Màu phải ở dạng #RRGGBB');

export const CampaignBrand = z.object({
  primary: HexColor,
  accent: HexColor,
  background: HexColor,
  text: HexColor,
  surface: HexColor,
});
export type CampaignBrand = z.infer<typeof CampaignBrand>;

/**
 * Image references in a campaign are URLs (uploaded assets or bundled presets), never data URLs:
 * the Studio uploads through the assets API first so drafts stay small.
 */
export const CampaignImageRef = z
  .string()
  .trim()
  .min(1)
  .max(2048)
  .refine((v) => !v.startsWith('data:') || v.startsWith('data:image/svg+xml;utf8,'), {
    message: 'Ảnh phải được tải lên trước khi lưu',
  });

/** Prize ids are short stable keys chosen by the client (`p1`, a nanoid…), unique per campaign. */
export const CampaignPrizeKey = z
  .string()
  .trim()
  .min(1)
  .max(64)
  .regex(/^[A-Za-z0-9_-]+$/);

export const CampaignPrize = z.object({
  id: CampaignPrizeKey,
  name: z.string().trim().min(1).max(120),
  image: CampaignImageRef.optional(),
  quantity: z.number().int().min(0).max(1_000_000),
  /** Cost of the prize to the shop (giá vốn), used for the budget and outcome reports. */
  valueVnd: z.number().int().min(0).max(1_000_000_000),
  /** Only used in `per_prize_probability` mode (0..1). */
  probability: z.number().min(0).max(1).optional(),
});
export type CampaignPrize = z.infer<typeof CampaignPrize>;

const TimeOfDay = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$|^24:00$/, 'Giờ phải ở dạng HH:mm');

export const CampaignRules = z
  .object({
    mode: CampaignPrizeMode,
    /** `overall_win_rate` mode (0..1). */
    overallWinRate: z.number().min(0).max(1),
    /** Plays each player gets per day (campaign timezone). */
    playsPerDay: z.number().int().min(1).max(100),
    /** Prizes one player can win over the whole campaign. */
    maxWinsPerPlayer: z.number().int().min(1).max(100),
    startsAt: IsoDateTime,
    endsAt: IsoDateTime,
    /** Daily opening hours; null = all day. */
    openingHours: z.object({ start: TimeOfDay, end: TimeOfDay }).nullable(),
    /** Spread prizes evenly over the campaign (`time_uniform` pacing). */
    pacing: z.boolean(),
    budgetVnd: z.number().int().min(0).nullable(),
    /** Show the Form screen (name, phone, consent) before the game. */
    collectForm: z.boolean(),
    /** Days of week the campaign is open (0 = Sunday … 6 = Saturday); null = every day ("Lấp ngày vắng"). */
    openDays: z.array(z.number().int().min(0).max(6)).min(1).max(7).nullable().default(null),
    /**
     * A player with a won voucher not yet redeemed at the counter cannot play again
     * ("Khách quay lại lần 2": the next turn opens only after the first visit).
     */
    requireRedeemBeforeReplay: z.boolean().default(false),
    /** Anti-fraud level (docs/product/specs/participation.md §4); `high` arrives in M2. */
    antiFraud: z.enum(['low', 'standard']).default('standard'),
  })
  .refine((r) => Date.parse(r.startsAt) < Date.parse(r.endsAt), {
    message: 'Thời gian kết thúc phải sau thời gian bắt đầu',
    path: ['endsAt'],
  })
  .refine((r) => !r.openingHours || r.openingHours.start < r.openingHours.end, {
    message: 'Giờ đóng phải sau giờ mở',
    path: ['openingHours', 'end'],
  });
export type CampaignRules = z.infer<typeof CampaignRules>;
/** Rules as stored or sent; fields added after M1 launch may be missing from older drafts. */
export type CampaignRulesInput = z.input<typeof CampaignRules>;

export const CampaignScreenKey = z.enum(['cover', 'form', 'game', 'resultWin', 'resultLose']);
export type CampaignScreenKey = z.infer<typeof CampaignScreenKey>;

/**
 * Canvas screen documents (ADR-014). The server stores them as opaque layout data: it checks the
 * envelope and size, never reads prizes or outcomes from them. Element shapes are owned by the
 * renderer in `@playora/ui/campaign`.
 */
export const CampaignScreen = z.looseObject({
  height: z.number().int().min(400).max(4000),
  background: z.looseObject({
    color: z.string().max(64),
    gradientTo: z.string().max(64).optional(),
    image: CampaignImageRef.optional(),
  }),
  elements: z.array(z.looseObject({ id: z.string().max(64), type: z.string().max(32) })).max(200),
});
export type CampaignScreen = z.infer<typeof CampaignScreen>;

export const CampaignScreens = z.object({
  cover: CampaignScreen,
  form: CampaignScreen,
  game: CampaignScreen,
  resultWin: CampaignScreen,
  resultLose: CampaignScreen,
});
export type CampaignScreens = z.infer<typeof CampaignScreens>;

/** Stored lifecycle; the displayed phase (scheduled/live/paused/ended) is derived from it and the rules. */
export const CampaignStatus = z.enum(['draft', 'published']);
export type CampaignStatus = z.infer<typeof CampaignStatus>;

/** Goal-led starting points (docs/product/specs/playbooks.md §2); only seed the draft. */
export const PlaybookKey = z.enum(['tet_traffic', 'second_visit', 'slow_days']);
export type PlaybookKey = z.infer<typeof PlaybookKey>;

export const CampaignPhase = z.enum(['draft', 'scheduled', 'live', 'paused', 'ended']);
export type CampaignPhase = z.infer<typeof CampaignPhase>;

export const Campaign = z.object({
  id: Id,
  organizationId: AuthId,
  slug: Slug,
  name: z.string(),
  templateKey: CampaignTemplateKey,
  skinKey: CampaignSkinKey,
  /** Playbook the campaign was created from; drives which outcome the report leads with. */
  playbook: PlaybookKey.nullable(),
  brand: CampaignBrand,
  screens: CampaignScreens,
  prizes: z.array(CampaignPrize),
  rules: CampaignRules,
  status: CampaignStatus,
  phase: CampaignPhase,
  paused: z.boolean(),
  /** Last published version; 0 = never published. */
  version: z.number().int().min(0),
  publishedAt: IsoDateTime.nullable(),
  /** The draft differs from the published version (shown as "Có thay đổi chưa phát hành"). */
  hasUnpublishedChanges: z.boolean(),
  createdAt: IsoDateTime,
  updatedAt: IsoDateTime,
});
export type Campaign = z.infer<typeof Campaign>;

/** List rows skip the heavy screen documents. */
export const CampaignListItem = Campaign.omit({ screens: true });
export type CampaignListItem = z.infer<typeof CampaignListItem>;

export const CreateCampaignBody = z.object({
  name: z.string().trim().min(1).max(120),
  templateKey: CampaignTemplateKey,
  skinKey: CampaignSkinKey,
  /** Slug for the player link; generated from the name when omitted. */
  slug: Slug.optional(),
  playbook: PlaybookKey.nullable().optional(),
  /** The Studio builds the starter screens, prizes and rules from the template × skin (or a playbook). */
  brand: CampaignBrand,
  screens: CampaignScreens,
  prizes: z.array(CampaignPrize).max(20),
  rules: CampaignRules,
});
export type CreateCampaignBody = z.input<typeof CreateCampaignBody>;

/** Saves the draft. A published campaign keeps running on its published version until republished. */
export const UpdateCampaignBody = z
  .object({
    name: z.string().trim().min(1).max(120),
    skinKey: CampaignSkinKey,
    brand: CampaignBrand,
    screens: CampaignScreens,
    prizes: z.array(CampaignPrize).max(20),
    rules: CampaignRules,
  })
  .partial();
export type UpdateCampaignBody = z.input<typeof UpdateCampaignBody>;

/**
 * Outcome report (docs/product/specs/playbooks.md §3). "Visits" are counter redemptions
 * (North Star, D-16); returning visitors redeemed on two different local days.
 */
export const CampaignReport = z.object({
  visits: z.number().int(),
  uniqueVisitors: z.number().int(),
  returningVisitors: z.number().int(),
  /** Cost of prizes redeemed at the counter; issued-but-unredeemed shown separately. */
  prizeCostVnd: z.number().int(),
  outstandingCostVnd: z.number().int(),
  budgetVnd: z.number().int().nullable(),
  /** prizeCostVnd / visits; null when nobody visited yet. */
  costPerVisitVnd: z.number().int().nullable(),
  plays: z.number().int(),
  players: z.number().int(),
  issued: z.number().int(),
  /** redeemed / issued (0..1); null when nothing issued. */
  redemptionRate: z.number().nullable(),
  timezone: z.string(),
  byDay: z.array(
    z.object({
      day: z.string(),
      plays: z.number().int(),
      wins: z.number().int(),
      visits: z.number().int(),
    }),
  ),
  byChannel: z.array(
    z.object({
      channel: z.string().nullable(),
      plays: z.number().int(),
      wins: z.number().int(),
      visits: z.number().int(),
    }),
  ),
  byPrize: z.array(
    z.object({
      prizeId: CampaignPrizeKey,
      name: z.string(),
      valueVnd: z.number().int(),
      quantity: z.number().int(),
      issued: z.number().int(),
      redeemed: z.number().int(),
      remaining: z.number().int(),
    }),
  ),
});
export type CampaignReport = z.infer<typeof CampaignReport>;

export const CampaignPlayOutcome = z.enum(['win', 'lose', 'no_turns', 'closed']);
export type CampaignPlayOutcome = z.infer<typeof CampaignPlayOutcome>;

export const CampaignPlayRecord = z.object({
  id: Id,
  playerId: Id,
  playerName: z.string().nullable(),
  rehearsal: z.boolean(),
  at: IsoDateTime,
  outcome: CampaignPlayOutcome,
  /** Prize engine reason (`win`, `lose`, `paced`, `out_of_stock`, `limit`, `budget`, `closed`, `paused`, `redeem_first`). */
  reason: z.string(),
  prizeId: CampaignPrizeKey.nullable(),
  voucherCode: z.string().nullable(),
  channel: z.string().nullable(),
});
export type CampaignPlayRecord = z.infer<typeof CampaignPlayRecord>;

export const VoucherStatus = z.enum(['issued', 'redeemed', 'expired', 'void']);
export type VoucherStatus = z.infer<typeof VoucherStatus>;

export const CampaignVoucher = z.object({
  code: z.string(),
  campaignId: Id,
  prizeId: CampaignPrizeKey,
  prizeName: z.string(),
  playerId: Id,
  playerName: z.string().nullable(),
  rehearsal: z.boolean(),
  status: VoucherStatus,
  issuedAt: IsoDateTime,
  expiresAt: IsoDateTime.nullable(),
  redeemedAt: IsoDateTime.nullable(),
});
export type CampaignVoucher = z.infer<typeof CampaignVoucher>;

export const CampaignStats = z.object({
  plays: z.number().int(),
  players: z.number().int(),
  wins: z.number().int(),
  redeemed: z.number().int(),
  budgetUsedVnd: z.number().int(),
  /** Cost of prizes actually handed over at the counter. */
  redeemedValueVnd: z.number().int(),
  remainingByPrize: z.record(CampaignPrizeKey, z.number().int()),
  issuedByPrize: z.record(CampaignPrizeKey, z.number().int()),
});
export type CampaignStats = z.infer<typeof CampaignStats>;

/** Result of one play, shared by the public play route and the Studio rehearsal route. */
export const PlayResult = z.object({
  playId: Id.nullable(),
  outcome: CampaignPlayOutcome,
  reason: z.string(),
  prize: CampaignPrize.pick({ id: true, name: true, image: true }).nullable(),
  voucher: z.object({ code: z.string(), expiresAt: IsoDateTime.nullable() }).nullable(),
  turnsLeftToday: z.number().int().min(0),
});
export type PlayResult = z.infer<typeof PlayResult>;

export const RehearsalPlayBody = z.object({
  /** Stable id of the tester (one per browser), so turn limits behave like a real player's. */
  testerKey: z.string().trim().min(1).max(64),
  requestId: z.uuid(),
});
export type RehearsalPlayBody = z.input<typeof RehearsalPlayBody>;

const CampaignParams = OrgParams.extend({ campaignId: Id });

export const campaignsApi = {
  list: defineRoute({
    method: 'GET',
    path: '/orgs/:orgId/campaigns',
    summary: 'List campaigns of an organization, most recently updated first',
    tags: ['campaigns'],
    auth: 'session',
    permission: { campaign: ['read'] },
    params: OrgParams,
    query: PageQuery,
    response: Page(CampaignListItem),
  }),
  create: defineRoute({
    method: 'POST',
    path: '/orgs/:orgId/campaigns',
    summary: 'Create a draft campaign from a template and skin',
    tags: ['campaigns'],
    auth: 'session',
    permission: { campaign: ['create'] },
    params: OrgParams,
    body: CreateCampaignBody,
    response: Campaign,
    status: 201,
  }),
  get: defineRoute({
    method: 'GET',
    path: '/orgs/:orgId/campaigns/:campaignId',
    summary: 'Get a campaign with its draft content',
    tags: ['campaigns'],
    auth: 'session',
    permission: { campaign: ['read'] },
    params: CampaignParams,
    response: Campaign,
  }),
  update: defineRoute({
    method: 'PATCH',
    path: '/orgs/:orgId/campaigns/:campaignId',
    summary: 'Save the campaign draft',
    tags: ['campaigns'],
    auth: 'session',
    permission: { campaign: ['update'] },
    params: CampaignParams,
    body: UpdateCampaignBody,
    response: Campaign,
  }),
  remove: defineRoute({
    method: 'DELETE',
    path: '/orgs/:orgId/campaigns/:campaignId',
    summary: 'Delete a campaign that is not scheduled or live',
    tags: ['campaigns'],
    auth: 'session',
    permission: { campaign: ['delete'] },
    params: CampaignParams,
    response: Ok,
  }),
  publish: defineRoute({
    method: 'POST',
    path: '/orgs/:orgId/campaigns/:campaignId/publish',
    summary: 'Publish the draft as a new immutable version and sync prize stock',
    tags: ['campaigns'],
    auth: 'session',
    permission: { campaign: ['publish'] },
    params: CampaignParams,
    response: Campaign,
  }),
  pause: defineRoute({
    method: 'POST',
    path: '/orgs/:orgId/campaigns/:campaignId/pause',
    summary: 'Close plays until resumed',
    tags: ['campaigns'],
    auth: 'session',
    permission: { campaign: ['publish'] },
    params: CampaignParams,
    response: Campaign,
  }),
  resume: defineRoute({
    method: 'POST',
    path: '/orgs/:orgId/campaigns/:campaignId/resume',
    summary: 'Reopen plays after a pause',
    tags: ['campaigns'],
    auth: 'session',
    permission: { campaign: ['publish'] },
    params: CampaignParams,
    response: Campaign,
  }),
  end: defineRoute({
    method: 'POST',
    path: '/orgs/:orgId/campaigns/:campaignId/end',
    summary: 'End now by moving the end time; issued vouchers stay redeemable until they expire',
    tags: ['campaigns'],
    auth: 'session',
    permission: { campaign: ['publish'] },
    params: CampaignParams,
    response: Campaign,
  }),
  plays: defineRoute({
    method: 'GET',
    path: '/orgs/:orgId/campaigns/:campaignId/plays',
    summary: 'Live plays of a campaign, newest first',
    tags: ['campaigns'],
    auth: 'session',
    permission: { campaign: ['read'] },
    params: CampaignParams,
    query: PageQuery,
    response: Page(CampaignPlayRecord),
  }),
  vouchers: defineRoute({
    method: 'GET',
    path: '/orgs/:orgId/campaigns/:campaignId/vouchers',
    summary: 'Live vouchers issued by a campaign, newest first',
    tags: ['campaigns'],
    auth: 'session',
    permission: { campaign: ['read'] },
    params: CampaignParams,
    query: PageQuery.extend({ status: VoucherStatus.optional() }),
    response: Page(CampaignVoucher),
  }),
  stats: defineRoute({
    method: 'GET',
    path: '/orgs/:orgId/campaigns/:campaignId/stats',
    summary: 'Live numbers of a campaign',
    tags: ['campaigns'],
    auth: 'session',
    permission: { campaign: ['read'] },
    params: CampaignParams,
    response: CampaignStats,
  }),
  report: defineRoute({
    method: 'GET',
    path: '/orgs/:orgId/campaigns/:campaignId/report',
    summary: 'Outcome report: counter visits, returning visitors, prize cost, by day/channel/prize',
    tags: ['campaigns'],
    auth: 'session',
    permission: { campaign: ['read'] },
    params: CampaignParams,
    response: CampaignReport,
  }),
  rehearsalPlay: defineRoute({
    method: 'POST',
    path: '/orgs/:orgId/campaigns/:campaignId/rehearsal-plays',
    summary:
      'Play the current draft as a tester; uses rehearsal stock and never touches live numbers',
    tags: ['campaigns'],
    auth: 'session',
    permission: { campaign: ['read'] },
    params: CampaignParams,
    body: RehearsalPlayBody,
    response: PlayResult,
  }),
};
