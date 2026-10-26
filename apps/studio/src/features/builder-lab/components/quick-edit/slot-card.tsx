'use client';

import { App, Button, Card, Flex, Input, Tooltip, Typography, theme, Upload } from 'antd';
import { ImageUp } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Caption } from '@/components/caption';
import { IMAGE_PRESETS, type SlotKey } from '@/features/canvas-editor/lib/model';
import { uploadCampaignImage } from '../../lib/upload-image';
import { SLOT_KIND } from './slots';

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

/** Keys of `IMAGE_PRESETS` that have a translated name. */
type PresetKey =
  | 'logo'
  | 'trophy'
  | 'fire'
  | 'diamond'
  | 'ribbon'
  | 'apricot'
  | 'envelope'
  | 'lantern'
  | 'coin'
  | 'coffee'
  | 'gift'
  | 'star'
  | 'balloon';

/** One replaceable slot: change it here and every screen that shows it follows. */
export function SlotCard({
  orgId,
  slot,
  value,
  usage,
  onChange,
  onFocus,
}: {
  orgId: string;
  slot: SlotKey;
  value: string;
  usage: number;
  onChange: (value: string) => void;
  /** Lets the preview jump to a screen that shows this slot. */
  onFocus?: () => void;
}) {
  const t = useTranslations('builderLab.quickEdit');
  const { token } = theme.useToken();
  const { message } = App.useApp();
  const [uploading, setUploading] = useState(false);
  const kind = SLOT_KIND[slot];

  return (
    <Card
      variant="borderless"
      style={{ border: `1px solid ${token.colorBorderSecondary}` }}
      styles={{ body: { padding: 16 } }}
      onFocus={onFocus}
      data-testid={`slot-${slot}`}
    >
      <Flex vertical gap={10}>
        <Flex align="baseline" justify="space-between" gap={8}>
          <Typography.Text strong>{t(`slots.${slot}`)}</Typography.Text>
          <Caption>{t('usage', { count: usage })}</Caption>
        </Flex>

        {kind === 'image' ? (
          <Flex gap={12} align="center">
            <div
              className="flex shrink-0 items-center justify-center overflow-hidden"
              style={{
                width: 72,
                height: 72,
                borderRadius: token.borderRadius,
                background: token.colorFillTertiary,
                border: `1px solid ${token.colorBorderSecondary}`,
              }}
            >
              {/* biome-ignore lint/performance/noImgElement: data-URL uploads and stickers */}
              <img src={value} alt={t(`slots.${slot}`)} className="h-full w-full object-contain" />
            </div>
            <Flex vertical gap={8} className="min-w-0">
              <Upload
                accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                showUploadList={false}
                beforeUpload={async (file) => {
                  if (file.size > MAX_UPLOAD_BYTES) {
                    message.error(t('tooLarge'));
                    return Upload.LIST_IGNORE;
                  }
                  setUploading(true);
                  try {
                    onChange(await uploadCampaignImage(orgId, file));
                  } catch {
                    message.error(t('uploadFailed'));
                  } finally {
                    setUploading(false);
                  }
                  return Upload.LIST_IGNORE;
                }}
              >
                <Button loading={uploading} icon={<ImageUp className="size-4" />}>
                  {t('upload')}
                </Button>
              </Upload>
              <Caption>{t('uploadHint')}</Caption>
            </Flex>
          </Flex>
        ) : kind === 'text' ? (
          <Input.TextArea
            aria-label={t(`slots.${slot}`)}
            value={value}
            autoSize={{ minRows: 2, maxRows: 5 }}
            maxLength={slot === 'title' ? 60 : 160}
            showCount
            onChange={(e) => onChange(e.target.value)}
          />
        ) : (
          <Input
            aria-label={t(`slots.${slot}`)}
            value={value}
            maxLength={24}
            showCount
            onChange={(e) => onChange(e.target.value)}
          />
        )}

        {kind === 'image' && (
          <div>
            <Caption className="mb-1.5 block">{t('stickers')}</Caption>
            <Flex wrap gap={6}>
              {IMAGE_PRESETS.map((preset) => {
                const active = preset.src === value;
                const label = t(`presets.${preset.key as PresetKey}`);
                return (
                  <Tooltip key={preset.key} title={label}>
                    <button
                      type="button"
                      aria-label={label}
                      aria-pressed={active}
                      onClick={() => onChange(preset.src)}
                      className="flex cursor-pointer items-center justify-center p-1"
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: token.borderRadiusSM,
                        background: token.colorFillQuaternary,
                        border: `1.5px solid ${active ? token.colorPrimary : token.colorBorderSecondary}`,
                      }}
                    >
                      {/* biome-ignore lint/performance/noImgElement: built-in sticker */}
                      <img src={preset.src} alt="" className="h-full w-full" />
                    </button>
                  </Tooltip>
                );
              })}
            </Flex>
          </div>
        )}
      </Flex>
    </Card>
  );
}
