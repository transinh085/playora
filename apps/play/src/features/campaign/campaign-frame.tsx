'use client';

import type { CampaignBrand, CampaignSkinKey } from '@playora/contracts';
import { GameRoot } from '@playora/ui/game/game-root';
import type { BrandKitTheme, Skin } from '@playora/ui/lib/game-theme';
import { type ReactNode, useMemo } from 'react';

/** Game theme from the campaign brand (game content: the colours are the shop's, not ours). */
export function campaignTheme(brand: CampaignBrand, skinKey: CampaignSkinKey) {
  const skin: Skin = skinKey === 'tet' ? 'tet' : 'classic';
  const theme: BrandKitTheme = {
    primary: brand.primary,
    accent: brand.accent,
    background: brand.background,
    text: brand.text,
  };
  return { skin, theme };
}

/**
 * Full screen on a phone; a centred phone-width column on larger screens. Children render inside
 * the themed antd `App` (toasts via `App.useApp()`).
 */
export function CampaignFrame({
  brand,
  skinKey,
  children,
}: {
  brand: CampaignBrand;
  skinKey: CampaignSkinKey;
  children: ReactNode;
}) {
  const { skin, theme } = useMemo(() => campaignTheme(brand, skinKey), [brand, skinKey]);
  return (
    <GameRoot
      skin={skin}
      brand={theme}
      className="flex h-dvh justify-center overflow-hidden"
      style={{ background: brand.background }}
    >
      <main className="relative h-dvh w-full max-w-[480px] overflow-hidden">{children}</main>
    </GameRoot>
  );
}
