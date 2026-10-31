'use client';

import type { AssetSummary } from '@playora/contracts';
import { Chip } from '@playora/ui/components/base/badges/chip';
import { GameButton } from '@playora/ui/game/game-button';
import { GameRoot } from '@playora/ui/game/game-root';
import { useTranslations } from 'next-intl';
import { type Control, useWatch } from 'react-hook-form';
import { type BrandKitFormValues, DEFAULT_BRAND_KIT_VALUES } from './brand-kit-editor-card';

export function BrandKitPreviewCard({
  control,
  imageAssets,
  initialValues = DEFAULT_BRAND_KIT_VALUES,
}: {
  control: Control<BrandKitFormValues>;
  imageAssets: AssetSummary[];
  initialValues?: BrandKitFormValues;
}) {
  const t = useTranslations();

  const watchedName = useWatch({ control, name: 'name' }) ?? initialValues.name;
  const watchedTokens = useWatch({ control, name: 'tokens' }) ?? initialValues.tokens;

  const logoAsset = imageAssets.find((a) => a.id === watchedTokens?.logoAssetId);
  const bgAsset = imageAssets.find((a) => a.id === watchedTokens?.backgroundAssetId);

  return (
    <div className="h-fit rounded-3xl border border-border-button-default bg-background-primary-default p-5 shadow-card">
      <h3 className="mb-3 text-caption-1-semibold uppercase tracking-wider text-text-secondary">
        {t('brandKits.previewTitle')}
      </h3>
      <GameRoot
        brand={{
          primary: watchedTokens?.colors?.primary,
          accent: watchedTokens?.colors?.secondary,
          background: watchedTokens?.colors?.background,
          text: watchedTokens?.colors?.text,
          fontDisplay: watchedTokens?.fontHeading,
        }}
        style={
          bgAsset
            ? {
                backgroundImage: `url(${bgAsset.variants.w1280?.url ?? bgAsset.url})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }
            : undefined
        }
        className="flex min-h-80 flex-col items-center justify-between rounded-2xl p-6 text-center"
      >
        <div className="flex flex-col items-center gap-3">
          {logoAsset && (
            // biome-ignore lint/performance/noImgElement: presigned S3 URL
            <img
              src={logoAsset.variants.w320?.url ?? logoAsset.url}
              alt="Logo"
              className="h-12 w-auto object-contain"
            />
          )}
          <Chip
            variant="caption"
            className="border border-game-border bg-game-surface text-game-fg"
          >
            {watchedName || 'Playora'}
          </Chip>
        </div>

        <div className="grid gap-2">
          <h3
            className="text-xl font-bold text-game-fg"
            style={{ fontFamily: watchedTokens?.fontHeading }}
          >
            {t('brandKits.previewHeading')}
          </h3>
          <p className="text-sm text-game-muted" style={{ fontFamily: watchedTokens?.fontBody }}>
            {t('brandKits.previewSubtitle')}
          </p>
        </div>

        <GameButton variant="primary" size="md" type="button" className="w-full">
          {t('brandKits.previewCta')}
        </GameButton>
      </GameRoot>
    </div>
  );
}
