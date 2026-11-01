'use client';

import { Button, ListBox, ProgressBar, Select, Tabs } from '@playora/ui/components';
import { Loader2, Upload as UploadIcon } from '@playora/ui/icons';
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
        <Tabs
          selectedKey={filter}
          onSelectionChange={(key) => onFilterChange(String(key) as FilterKind)}
        >
          <Tabs.ListContainer>
            <Tabs.List aria-label={t('assets.filterAll')}>
              {filterOptions.map((opt) => (
                <Tabs.Tab key={opt.value} id={opt.value}>
                  {opt.label}
                  <Tabs.Indicator />
                </Tabs.Tab>
              ))}
            </Tabs.List>
          </Tabs.ListContainer>
        </Tabs>

        <div className="flex items-center gap-3">
          <Select
            aria-label={t('assets.cropTitle')}
            selectedKey={cropPreset}
            onSelectionChange={(key) => key && onCropPresetChange(String(key) as CropPreset)}
            className="w-36"
          >
            <Select.Trigger>
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
              <ListBox>
                <ListBox.Item id="none" textValue={t('assets.cropNone')}>
                  {t('assets.cropNone')}
                </ListBox.Item>
                <ListBox.Item id="1:1" textValue={t('assets.cropSquare')}>
                  {t('assets.cropSquare')}
                </ListBox.Item>
                <ListBox.Item id="16:9" textValue={t('assets.cropWide')}>
                  {t('assets.cropWide')}
                </ListBox.Item>
              </ListBox>
            </Select.Popover>
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
            isDisabled={uploadProgress !== null}
            onPress={() => fileInputRef.current?.click()}
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

      {uploadProgress !== null && (
        <ProgressBar
          value={uploadProgress}
          aria-label={t('assets.upload')}
          size="sm"
          color="accent"
        >
          <ProgressBar.Track>
            <ProgressBar.Fill />
          </ProgressBar.Track>
        </ProgressBar>
      )}
    </div>
  );
}
