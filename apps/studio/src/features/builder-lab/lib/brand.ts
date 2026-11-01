import type { BrandKitSummary, CampaignBrand } from '@playora/contracts';
import type { CanvasDoc } from '@playora/ui/campaign';
import { writeSlot } from '../components/quick-edit/slots';
import { getPublicAssetUrl } from './upload-image';

/**
 * A new campaign inherits all 5 semantic brand colors from the organization's Brand Kit
 * (`primary`, `accent`, `background`, `surface`, `text`; docs/product/specs/builder.md §4.3).
 */
export function brandFromKit(kit: BrandKitSummary | undefined): Partial<CampaignBrand> {
  if (!kit) return {};
  const { primary, secondary, accent, background, surface, text } = kit.tokens.colors;
  return {
    primary,
    accent: accent ?? secondary ?? primary,
    background,
    surface: surface ?? background,
    text,
  };
}

/** Returns the permanent public asset URL for the Brand Kit's logo, if one is configured. */
export function logoUrlFromKit(kit: BrandKitSummary | undefined): string | undefined {
  const logoAssetId = kit?.tokens.logoAssetId;
  if (!logoAssetId) return undefined;
  return getPublicAssetUrl(logoAssetId);
}

/** Applies the Brand Kit's logo asset URL to the `logo` slot of a campaign's screens. */
export function applyBrandKitToScreens(
  screens: CanvasDoc,
  kit: BrandKitSummary | undefined,
): CanvasDoc {
  const logoUrl = logoUrlFromKit(kit);
  if (!logoUrl) return screens;
  return writeSlot(screens, 'logo', logoUrl);
}
