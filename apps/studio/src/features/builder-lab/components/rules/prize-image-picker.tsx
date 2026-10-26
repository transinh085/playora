'use client';

import { App, Button, Flex, Popover, theme, Upload } from 'antd';
import { ImagePlus, Upload as UploadIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Caption } from '@/components/caption';
import { IMAGE_PRESETS } from '@/features/canvas-editor/lib/model';
import { uploadCampaignImage } from '../../lib/upload-image';

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

/** Square prize thumbnail; click to pick a preset sticker or upload a photo through the assets API. */
export function PrizeImagePicker({
  orgId,
  value,
  name,
  onChange,
}: {
  orgId: string;
  value?: string;
  name: string;
  onChange: (src: string) => void;
}) {
  const t = useTranslations('builderLab.rules.prizes');
  const { token } = theme.useToken();
  const { message } = App.useApp();
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

  const content = (
    <Flex vertical gap={8} style={{ width: 232 }}>
      <Caption>{t('presets')}</Caption>
      <div className="grid grid-cols-4 gap-2">
        {IMAGE_PRESETS.map((preset) => (
          <button
            key={preset.key}
            type="button"
            aria-label={preset.key}
            onClick={() => {
              onChange(preset.src);
              setOpen(false);
            }}
            className="flex aspect-square items-center justify-center p-1"
            style={{
              border: `1px solid ${value === preset.src ? token.colorPrimary : token.colorBorderSecondary}`,
              borderRadius: token.borderRadius,
              background: token.colorFillQuaternary,
              cursor: 'pointer',
            }}
          >
            {/* biome-ignore lint/performance/noImgElement: inline SVG data URLs */}
            <img src={preset.src} alt="" className="size-full object-contain" />
          </button>
        ))}
      </div>
      <Upload
        accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
        showUploadList={false}
        beforeUpload={async (file) => {
          if (file.size > MAX_UPLOAD_BYTES) {
            message.error(t('uploadTooLarge'));
            return Upload.LIST_IGNORE;
          }
          setUploading(true);
          try {
            onChange(await uploadCampaignImage(orgId, file));
            setOpen(false);
          } catch {
            message.error(t('uploadFailed'));
          } finally {
            setUploading(false);
          }
          return Upload.LIST_IGNORE;
        }}
      >
        <Button block loading={uploading} icon={<UploadIcon className="size-4" />}>
          {t('upload')}
        </Button>
      </Upload>
    </Flex>
  );

  return (
    <Popover trigger="click" open={open} onOpenChange={setOpen} content={content}>
      <button
        type="button"
        aria-label={t('changeImage', { name })}
        className="flex size-16 shrink-0 items-center justify-center overflow-hidden p-1"
        style={{
          border: `1px dashed ${token.colorBorder}`,
          borderRadius: token.borderRadiusLG,
          background: token.colorFillQuaternary,
          color: token.colorTextTertiary,
          cursor: 'pointer',
        }}
      >
        {value ? (
          // biome-ignore lint/performance/noImgElement: data URLs / inline SVG
          <img src={value} alt="" className="size-full object-contain" />
        ) : (
          <ImagePlus className="size-6" />
        )}
      </button>
    </Popover>
  );
}
