'use client';

import type { AssetSummary } from '@playora/contracts';
import { GameButton } from '@playora/ui/game/game-button';
import { GameRoot } from '@playora/ui/game/game-root';
import { Card, Form, type FormInstance, Tag } from 'antd';
import { useTranslations } from 'next-intl';
import { type BrandKitFormValues, DEFAULT_BRAND_KIT_VALUES } from './brand-kit-editor-card';

export function BrandKitPreviewCard({
  form,
  imageAssets,
  initialValues = DEFAULT_BRAND_KIT_VALUES,
}: {
  form: FormInstance<BrandKitFormValues>;
  imageAssets: AssetSummary[];
  initialValues?: BrandKitFormValues;
}) {
  const t = useTranslations();

  const watchedName = Form.useWatch('name', form) ?? initialValues.name;
  const watchedTokens = Form.useWatch('tokens', form) ?? initialValues.tokens;

  const logoAsset = imageAssets.find((a) => a.id === watchedTokens?.logoAssetId);
  const bgAsset = imageAssets.find((a) => a.id === watchedTokens?.backgroundAssetId);

  return (
    <Card
      title={<span className="text-base font-semibold">{t('brandKits.previewTitle')}</span>}
      className="h-fit"
    >
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
        className="flex min-h-80 flex-col items-center justify-between rounded-xl p-6 text-center"
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
          <Tag className="m-0 border-game-border bg-game-surface text-game-fg">
            {watchedName || 'Playora'}
          </Tag>
        </div>

        <div className="grid gap-2">
          <h3
            className="text-game-fg text-xl font-bold"
            style={{ fontFamily: watchedTokens?.fontHeading }}
          >
            {t('brandKits.previewHeading')}
          </h3>
          <p className="text-game-muted text-sm" style={{ fontFamily: watchedTokens?.fontBody }}>
            {t('brandKits.previewSubtitle')}
          </p>
        </div>

        <GameButton variant="primary" size="md" type="button" className="w-full">
          {t('brandKits.previewCta')}
        </GameButton>
      </GameRoot>
    </Card>
  );
}
