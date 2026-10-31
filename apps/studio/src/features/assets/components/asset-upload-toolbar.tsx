'use client';

import { Button } from '@playora/ui/components/button';
import { Progress } from '@playora/ui/components/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@playora/ui/components/select';
import { cn } from '@playora/ui/lib/utils';
import { Loader2, Upload as UploadIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRef } from 'react';
import type { CropPreset, FilterKind } from '../lib/asset-helpers';

interface AssetUploadToolbarProps {
  filter: FilterKind;
  onFilterChange: (filter: FilterKind) => void;
  cropPreset: CropPreset;
  onCropPresetChange: (preset: CropPreset) => void;
  uploadProgress: number | null;
  onUpload: (file: File) => void;
}

export function AssetUploadToolbar({
  filter,
  onFilterChange,
  cropPreset,
  onCropPresetChange,
  uploadProgress,
  onUpload,
}: AssetUploadToolbarProps) {
  const t = useTranslations();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filterOptions: { value: FilterKind; label: string }[] = [
    { value: 'all', label: t('assets.filterAll') },
    { value: 'image', label: t('assets.filterImage') },
    { value: 'audio', label: t('assets.filterAudio') },
    { value: 'video', label: t('assets.filterVideo') },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="inline-flex rounded-full border bg-muted/50 p-0.5 text-xs">
          {filterOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={cn(
                'rounded-full px-3 py-1 font-medium transition-all',
                filter === opt.value
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
              onClick={() => onFilterChange(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <Select value={cropPreset} onValueChange={(val) => onCropPresetChange(val as CropPreset)}>
            <SelectTrigger aria-label={t('assets.cropTitle')} className="w-40 rounded-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">{t('assets.cropNone')}</SelectItem>
              <SelectItem value="1:1">{t('assets.cropSquare')}</SelectItem>
              <SelectItem value="16:9">{t('assets.cropWide')}</SelectItem>
            </SelectContent>
          </Select>

          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/png,image/jpeg,image/webp,image/gif,audio/*,video/mp4,video/webm"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                onUpload(file);
                e.target.value = '';
              }
            }}
          />

          <Button
            type="button"
            className="gap-2 rounded-full"
            disabled={uploadProgress !== null}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploadProgress !== null ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <UploadIcon className="size-4" />
            )}
            {uploadProgress !== null
              ? t('assets.uploading', { progress: uploadProgress })
              : t('assets.upload')}
          </Button>
        </div>
      </div>

      {uploadProgress !== null && <Progress value={uploadProgress} className="h-1.5 w-full" />}
    </div>
  );
}
