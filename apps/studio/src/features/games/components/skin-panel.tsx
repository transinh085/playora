'use client';

import { type BrandKitSummary, localize, type TemplateSkinSummary } from '@playora/contracts';
import { Card, Radio, Tag, Typography } from 'antd';
import { useLocale, useTranslations } from 'next-intl';

export interface SkinPanelProps {
  skins: readonly TemplateSkinSummary[];
  skinKey: string;
  onChangeSkinKey: (next: string) => void;
  activeBrandKit?: BrandKitSummary;
  brandPalette: readonly string[];
}

export function SkinPanel({
  skins,
  skinKey,
  onChangeSkinKey,
  activeBrandKit,
  brandPalette,
}: SkinPanelProps) {
  const t = useTranslations();
  const locale = useLocale();
  const effectiveSkin = skinKey || skins[0]?.key || '';

  return (
    <div className="flex flex-col gap-5" data-testid="skin-panel">
      <div className="flex flex-col gap-2">
        <Typography.Text strong className="text-sm">
          {t('games.skinLabel')}
        </Typography.Text>
        <div className="grid gap-2.5 sm:grid-cols-2" data-testid="skin-panel-options">
          {skins.map((skin) => {
            const isSelected = skin.key === effectiveSkin;
            return (
              <Card
                key={skin.key}
                size="small"
                hoverable
                data-testid={`skin-option-${skin.key}`}
                onClick={() => onChangeSkinKey(skin.key)}
                className={
                  isSelected
                    ? 'border-[var(--ant-color-primary)] bg-[var(--ant-color-primary-bg)]'
                    : ''
                }
              >
                <div className="flex items-center justify-between gap-2">
                  <Radio checked={isSelected}>
                    <span className="font-medium">{localize(skin.name, locale)}</span>
                  </Radio>
                </div>
                {skin.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {skin.tags.map((tag) => (
                      <Tag key={tag} variant="filled" className="!m-0 text-[10px]">
                        {tag}
                      </Tag>
                    ))}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Typography.Text strong className="text-sm">
          {t('games.brandKitTitle')}
        </Typography.Text>
        <Card size="small" data-testid="skin-panel-brand-kit">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <Typography.Text strong>
                {activeBrandKit ? activeBrandKit.name : t('events.noBrandKit')}
              </Typography.Text>
              {(activeBrandKit?.tokens.fontHeading || activeBrandKit?.tokens.fontBody) && (
                <Tag variant="filled" className="!m-0 text-xs">
                  {[activeBrandKit.tokens.fontHeading, activeBrandKit.tokens.fontBody]
                    .filter(Boolean)
                    .join(' / ')}
                </Tag>
              )}
            </div>
            <Typography.Text type="secondary" className="text-xs">
              {t('games.brandKitHint')}
            </Typography.Text>
            {brandPalette.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                {brandPalette.map((color) => (
                  <div key={color} className="inline-flex items-center gap-1.5 text-xs font-mono">
                    <span
                      className="inline-block size-4 rounded-full border border-[var(--ant-color-border)]"
                      style={{ backgroundColor: color }}
                    />
                    <span>{color}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
