import type { CampaignPrize } from '@playora/contracts';
import type { CanvasPrize } from './canvas-screen';

/**
 * Campaign prizes as shown by canvas `prizeList` elements; stock defaults to the full quantity, or
 * stays unknown (hidden) when the host does not know it (the public player).
 */
export function toCanvasPrizes(
  campaign: {
    prizes: readonly (Pick<CampaignPrize, 'id' | 'name' | 'image'> & { quantity?: number })[];
  },
  remaining?: Record<string, number>,
): CanvasPrize[] {
  return campaign.prizes.map((p) => ({
    name: p.name,
    image: p.image,
    remaining: remaining?.[p.id] ?? p.quantity,
  }));
}
