import type { CanvasPrize } from '@/features/canvas-editor/components/canvas-screen';
import type { Campaign } from '../../mock/types';

/** Campaign prizes as shown by canvas `prizeList` elements; stock defaults to the full quantity. */
export function toCanvasPrizes(
  campaign: Pick<Campaign, 'prizes'>,
  remaining?: Record<string, number>,
): CanvasPrize[] {
  return campaign.prizes.map((p) => ({
    name: p.name,
    image: p.image,
    remaining: remaining?.[p.id] ?? p.quantity,
  }));
}
