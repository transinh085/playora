'use client';

import type { PreviewBrand, PreviewOutcomePreset } from '@playora/game-sdk';
import { Card, Select } from 'antd';
import { useTranslations } from 'next-intl';
import { PLAY_URL } from '@/lib/env';
import { usePreviewChannel } from '../lib/use-preview-channel';

export interface PreviewFrameProps {
  templateId: string;
  config: Record<string, unknown>;
  skinKey?: string;
  brand: PreviewBrand;
  locale: 'vi' | 'en';
  outcome: PreviewOutcomePreset;
  onChangeOutcome: (next: PreviewOutcomePreset) => void;
  assets: Record<string, string>;
  playUrl?: string;
}

export function PreviewFrame({
  templateId,
  config,
  skinKey,
  brand,
  locale,
  outcome,
  onChangeOutcome,
  assets,
  playUrl = PLAY_URL,
}: PreviewFrameProps) {
  const t = useTranslations();
  const { iframeRef, previewSrc, onLoad } = usePreviewChannel({
    templateId,
    config,
    skinKey,
    brand,
    locale,
    outcome,
    assets,
    playUrl,
  });

  return (
    <Card
      data-testid="editor-preview-column"
      title={t('games.previewTitle')}
      extra={
        <Select
          value={outcome}
          onChange={onChangeOutcome}
          options={[
            { value: 'win', label: t('games.previewOutcomeWin') },
            { value: 'lose', label: t('games.previewOutcomeLose') },
            { value: 'out_of_stock', label: t('games.previewOutcomeOutOfStock') },
          ]}
          className="w-44"
          data-testid="preview-outcome-select"
          aria-label={t('games.previewOutcomeLabel')}
        />
      }
    >
      <div className="flex items-center justify-center rounded-xl bg-[var(--ant-color-fill-quaternary)] p-4">
        <div
          data-testid="preview-frame-wrapper"
          className="aspect-[9/16] w-full max-w-[340px] overflow-hidden rounded-2xl border border-[var(--ant-color-border)] shadow-lg"
        >
          <iframe
            ref={iframeRef}
            title={t('games.previewTitle')}
            src={previewSrc}
            data-testid="preview-iframe"
            onLoad={onLoad}
            className="h-full w-full border-0"
          />
        </div>
      </div>
    </Card>
  );
}
