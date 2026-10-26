import type { BrandKitSummary } from '@playora/contracts';
import type { Campaign } from '../mock/types';

/**
 * A new campaign wears the organization's brand colours (docs/product/specs/studio-ux.md §2). Only the accent colours are
 * taken: the skin's background and text were designed together and stay readable.
 */
export function brandFromKit(kit: BrandKitSummary | undefined): Partial<Campaign['brand']> {
  if (!kit) return {};
  const { primary, secondary } = kit.tokens.colors;
  return { primary, accent: secondary ?? primary };
}
