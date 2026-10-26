import type { Campaign } from '../mock/types';

/**
 * Where a campaign is in its life (docs/product/specs/builder.md §6), derived from publish state, pause and the
 * schedule in its rules instead of being picked by hand.
 */
export type CampaignPhase = 'draft' | 'scheduled' | 'live' | 'paused' | 'ended';

export function campaignPhase(
  campaign: Pick<Campaign, 'status' | 'paused' | 'rules'>,
  now = Date.now(),
): CampaignPhase {
  if (campaign.status === 'draft') return 'draft';
  if (Date.parse(campaign.rules.endsAt) <= now) return 'ended';
  if (campaign.paused) return 'paused';
  if (Date.parse(campaign.rules.startsAt) > now) return 'scheduled';
  return 'live';
}

/** Campaigns that may still hand out prizes: deleting them is blocked. */
export const isRunning = (phase: CampaignPhase) => phase === 'live' || phase === 'scheduled';
