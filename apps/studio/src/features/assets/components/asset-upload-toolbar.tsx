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
import { Loader2, Upload as UploadIcon } from '@playora/ui/icons';
import { cn } from '@playora/ui/lib/utils';
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
        <div className="inline-flex rounded-lg border border-neutral-200 bg-neutral-100/70 p-0.5 text-xs dark:border-white/10 dark:bg-white/5">
          {filterOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={cn(
                'rounded-md px-3 py-1 font-medium transition-all',
                filter === opt.value
                  ? 'bg-white text-neutral-900 shadow-xs dark:bg-[#171717] dark:text-[#FAFAFA]'
                  : 'text-neutral-500 hover:text-neutral-900 dark:text-[#A3A3A3] dark:hover:text-[#FAFAFA]',
              )}
              onClick={() => onFilterChange(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <Select value={cropPreset} onValueChange={(val) => onCropPresetChange(val as CropPreset)}>
            <SelectTrigger
              aria-label={t('assets.cropTitle')}
              className="h-8 w-36 rounded-md text-xs"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-lg">
              <SelectItem value="none" className="text-xs">
                {t('assets.cropNone')}
              </SelectItem>
              <SelectItem value="1:1" className="text-xs">
                {t('assets.cropSquare')}
              </SelectItem>
              <SelectItem value="16:9" className="text-xs">
                {t('assets.cropWide')}
              </SelectItem>
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
            size="sm"
            className="gap-2 rounded-md h-8 text-xs font-medium shadow-xs"
            disabled={uploadProgress !== null}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploadProgress !== null ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <UploadIcon className="size-3.5" />
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
