import type { CampaignPrize } from '@playora/contracts';
import type { CanvasPrize } from './canvas-screen';

/** Campaign prizes as shown by canvas `prizeList` elements; stock defaults to the full quantity. */
export function toCanvasPrizes(
  campaign: { prizes: readonly Pick<CampaignPrize, 'id' | 'name' | 'image' | 'quantity'>[] },
  remaining?: Record<string, number>,
): CanvasPrize[] {
  return campaign.prizes.map((p) => ({
    name: p.name,
    image: p.image,
    remaining: remaining?.[p.id] ?? p.quantity,
  }));
}
