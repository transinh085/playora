'use client';

import { Button } from '@playora/ui/components/button';
import { Popover, PopoverContent, PopoverTrigger } from '@playora/ui/components/popover';
import { ImagePlus, Upload as UploadIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRef, useState } from 'react';
import { toast } from 'sonner';
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
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={t('changeImage', { name })}
          className="flex size-16 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-xl border border-dashed border-border bg-muted/30 p-1 text-muted-foreground hover:border-foreground/40 transition-colors"
        >
          {value ? (
            // biome-ignore lint/performance/noImgElement: data URLs / inline SVG
            <img src={value} alt="" className="size-full object-contain" />
          ) : (
            <ImagePlus className="size-6" />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-60 p-3 space-y-3 rounded-2xl" align="start">
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
              className={`flex aspect-square cursor-pointer items-center justify-center rounded-lg border p-1 transition-colors ${
                value === preset.src
                  ? 'border-primary ring-2 ring-primary/20 bg-muted/60'
                  : 'border-border bg-muted/30 hover:border-foreground/30'
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
            variant="outline"
            size="sm"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            className="w-full rounded-full"
          >
            <UploadIcon className="mr-1.5 size-4" />
            {t('upload')}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
