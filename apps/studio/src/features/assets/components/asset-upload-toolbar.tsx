'use client';

import { Button } from '@playora/ui/components/base/buttons/button';
import { ProgressBar } from '@playora/ui/components/base/progress/progress';
import { Select, SelectItem } from '@playora/ui/components/base/select/select';
import { Loader2, Upload as UploadIcon } from '@playora/ui/icons';
import { cx } from '@playora/ui/utils/cx';
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
        <div className="inline-flex rounded-xl border border-border-button-default bg-background-secondary-default p-0.5 text-xs">
          {filterOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={cx(
                'rounded-lg px-3 py-1 font-medium transition-all',
                filter === opt.value
                  ? 'bg-background-primary-default text-text-primary shadow-xs'
                  : 'text-text-secondary hover:text-text-primary',
              )}
              onClick={() => onFilterChange(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <Select
            aria-label={t('assets.cropTitle')}
            size="sm"
            selectedKey={cropPreset}
            onSelectionChange={(key) => key && onCropPresetChange(String(key) as CropPreset)}
            className="w-36"
          >
            <SelectItem id="none">{t('assets.cropNone')}</SelectItem>
            <SelectItem id="1:1">{t('assets.cropSquare')}</SelectItem>
            <SelectItem id="16:9">{t('assets.cropWide')}</SelectItem>
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
            size="small"
            disabled={uploadProgress !== null}
            leadingIcon={uploadProgress !== null ? Loader2 : UploadIcon}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploadProgress !== null
              ? t('assets.uploading', { progress: uploadProgress })
              : t('assets.upload')}
          </Button>
        </div>
      </div>

      {uploadProgress !== null && (
        <ProgressBar value={uploadProgress} aria-label={t('assets.upload')} size="sm" />
      )}
    </div>
  );
}
