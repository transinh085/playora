import type { CampaignPhase, CampaignPrize, CampaignRules } from '@playora/contracts';
import type { PrizeRulesInput } from './schemas';

/**
 * Bridges a campaign document (`@playora/contracts` campaigns) to the prize engine. Shared by the
 * API play route, the Studio simulator and the 1M-play test so they can never disagree.
 */

export interface CampaignEngineOptions {
  /** Rehearsal (draft test link, docs/product/specs/builder.md §4.1) ignores schedule and pacing. */
  rehearsal: boolean;
  timezone?: string;
  now?: Date;
  /** Remaining stock per prize key; defaults to the full quantity. */
  remainingByPrize?: Record<string, number>;
}

export function toPrizeRules(
  rules: CampaignRules,
  prizes: readonly CampaignPrize[],
  opts: CampaignEngineOptions,
): PrizeRulesInput {
  const now = (opts.now ?? new Date()).getTime();
  const timezone = opts.timezone ?? 'Asia/Ho_Chi_Minh';
  return {
    mode: rules.mode,
    prizes: prizes.map((p, i) => ({
      id: p.id,
      quantity: p.quantity,
      remaining:
        opts.remainingByPrize?.[p.id] === undefined
          ? undefined
          : Math.min(p.quantity, Math.max(0, opts.remainingByPrize[p.id] ?? 0)),
      valueVnd: p.valueVnd,
      probability: rules.mode === 'per_prize_probability' ? (p.probability ?? 0) : undefined,
      sortOrder: i,
    })),
    overallWinRate: rules.mode === 'overall_win_rate' ? rules.overallWinRate : undefined,
    limits: { perPlayerTotal: Math.max(1, rules.maxWinsPerPlayer) },
    budgetVnd: rules.budgetVnd ?? undefined,
    pacing: { strategy: rules.pacing && !opts.rehearsal ? 'time_uniform' : 'none' },
    openingHours:
      rules.openingHours && !opts.rehearsal
        ? [{ start: rules.openingHours.start, end: rules.openingHours.end }]
        : undefined,
    window: opts.rehearsal
      ? { startsAt: now - 86_400_000, endsAt: now + 86_400_000, timezone }
      : { startsAt: rules.startsAt, endsAt: rules.endsAt, timezone },
  };
}

/**
 * Where a campaign is in its life (docs/product/specs/builder.md §6), derived from publish state,
 * pause and the schedule instead of being picked by hand.
 */
export function campaignPhase(
  campaign: {
    published: boolean;
    paused: boolean;
    startsAt: string | Date;
    endsAt: string | Date;
  },
  now = Date.now(),
): CampaignPhase {
  if (!campaign.published) return 'draft';
  if (new Date(campaign.endsAt).getTime() <= now) return 'ended';
  if (campaign.paused) return 'paused';
  if (new Date(campaign.startsAt).getTime() > now) return 'scheduled';
  return 'live';
}

/** Campaigns that may still hand out prizes: deleting them is blocked. */
export const isRunningPhase = (phase: CampaignPhase) => phase === 'live' || phase === 'scheduled';

/** `YYYY-MM-DD` of an instant in the campaign timezone; turn limits reset on this key. */
export function localDayKey(at: Date, timeZone = 'Asia/Ho_Chi_Minh'): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone }).format(at);
}

/** Default redemption deadline: end of campaign + 7 days (docs/product/specs/prizes-redemption.md §6.2). */
export const VOUCHER_GRACE_MS = 7 * 86_400_000;
