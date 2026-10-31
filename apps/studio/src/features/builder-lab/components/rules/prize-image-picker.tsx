'use client';

import { Button } from '@playora/ui/components/base/buttons/button';
import { Popover, PopoverTrigger } from '@playora/ui/components/base/popover/popover';
import { toast } from '@playora/ui/components/base/toast/toast';
import { ImagePlus, Upload as UploadIcon } from '@playora/ui/icons';
import { useTranslations } from 'next-intl';
import { useRef, useState } from 'react';
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
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_UPLOAD_BYTES) {
      toast.error(t('uploadTooLarge'));
      return;
    }
    setUploading(true);
    try {
      const src = await uploadCampaignImage(orgId, file);
      onChange(src);
      setOpen(false);
    } catch {
      toast.error(t('uploadFailed'));
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <PopoverTrigger isOpen={open} onOpenChange={setOpen}>
      <button
        type="button"
        aria-label={t('changeImage', { name })}
        className="flex size-14 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-md border border-dashed border-neutral-200 bg-neutral-50/50 p-1 text-neutral-400 hover:border-neutral-400 transition-colors dark:border-white/10 dark:bg-white/[0.02] dark:hover:border-white/20"
      >
        {value ? (
          // biome-ignore lint/performance/noImgElement: data URLs / inline SVG
          <img src={value} alt="" className="size-full object-contain" />
        ) : (
          <ImagePlus className="size-5" />
        )}
      </button>
      <Popover
        aria-label={t('changeImage', { name })}
        placement="bottom start"
        className="w-60 p-3 space-y-3"
      >
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
              className={`flex aspect-square cursor-pointer items-center justify-center rounded-md border p-1 transition-colors ${
                value === preset.src
                  ? 'border-neutral-900 bg-neutral-100 ring-1 ring-neutral-900/10 dark:border-white dark:bg-white/10 dark:ring-white/20'
                  : 'border-neutral-200 bg-neutral-50/50 hover:border-neutral-300 dark:border-white/10 dark:bg-white/[0.02] dark:hover:border-white/20'
              }`}
            >
              {/* biome-ignore lint/performance/noImgElement: inline SVG data URLs */}
              <img src={preset.src} alt="" className="size-full object-contain" />
            </button>
          ))}
        </div>
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
            className="hidden"
            onChange={handleFileUpload}
          />
          <Button
            type="button"
            variant="secondary"
            size="small"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            className="w-full h-8 rounded-md text-xs"
          >
            <UploadIcon className="mr-1.5 size-3.5" />
            {t('upload')}
          </Button>
        </div>
      </Popover>
    </PopoverTrigger>
  );
}
