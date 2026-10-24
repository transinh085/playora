'use client';

import {
  type AssetSlot,
  AutoForm,
  type AutoFormProps,
  type FormDescriptor,
} from '@playora/ui/auto-form';
import { Empty, Input, Typography } from 'antd';
import { useTranslations } from 'next-intl';

export interface ContentPanelProps {
  name: string;
  onChangeName: (next: string) => void;
  descriptor: FormDescriptor;
  value: Record<string, unknown>;
  onChangeConfig: (next: Record<string, unknown>) => void;
  locale: 'vi' | 'en';
  errors?: Record<string, string>;
  brandPalette?: readonly string[];
  assetSlots?: readonly AssetSlot[];
  onPickAsset?: AutoFormProps['onPickAsset'];
}

export function ContentPanel({
  name,
  onChangeName,
  descriptor,
  value,
  onChangeConfig,
  locale,
  errors,
  brandPalette,
  assetSlots,
  onPickAsset,
}: ContentPanelProps) {
  const t = useTranslations();
  const hasContentFields = descriptor.fields.some((f) => f.group === 'content');

  return (
    <div className="flex flex-col gap-4" data-testid="content-panel">
      <div className="flex flex-col gap-1.5">
        <Typography.Text strong className="text-sm">
          {t('games.gameNameLabel')}
        </Typography.Text>
        <Input
          value={name}
          onChange={(e) => onChangeName(e.target.value)}
          placeholder={t('games.gameNamePlaceholder')}
          data-testid="content-panel-game-name"
        />
      </div>

      {hasContentFields ? (
        <AutoForm
          descriptor={descriptor}
          activeGroup="content"
          value={value}
          onChange={(next) => onChangeConfig(next)}
          locale={locale}
          errors={errors}
          brandPalette={brandPalette}
          assetSlots={assetSlots}
          onPickAsset={onPickAsset}
        />
      ) : (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('games.contentEmpty')} />
      )}
    </div>
  );
}
