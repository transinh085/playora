import type { CampaignPhase } from '@playora/contracts';
import { campaignPhase as coreCampaignPhase, isRunningPhase } from '@playora/core/prize';

export type { CampaignPhase };

export interface PhaseInput {
  status: 'draft' | 'published';
  paused: boolean;
  rules: { startsAt: string; endsAt: string };
  phase?: CampaignPhase;
}

/**
 * Resolves a campaign's lifecycle phase using the server's `phase` when no custom timestamp is
 * given, or `@playora/core/prize`'s `campaignPhase` when evaluating at a specific `now`.
 */
export function campaignPhase(campaign: PhaseInput, now?: number): CampaignPhase {
  if (now === undefined && campaign.phase) return campaign.phase;
  return coreCampaignPhase(
    {
      published: campaign.status === 'published',
      paused: campaign.paused,
      startsAt: campaign.rules.startsAt,
      endsAt: campaign.rules.endsAt,
    },
    now,
  );
}

export const isRunning = isRunningPhase;
