'use client';

import { Button, Progress, Segmented, Select, Upload } from 'antd';
import { Upload as UploadIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
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

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Segmented<FilterKind>
          value={filter}
          onChange={onFilterChange}
          options={[
            { value: 'all', label: t('assets.filterAll') },
            { value: 'image', label: t('assets.filterImage') },
            { value: 'audio', label: t('assets.filterAudio') },
            { value: 'video', label: t('assets.filterVideo') },
          ]}
        />

        <div className="flex items-center gap-3">
          <Select<CropPreset>
            value={cropPreset}
            onChange={onCropPresetChange}
            aria-label={t('assets.cropTitle')}
            className="w-40"
            options={[
              { value: 'none', label: t('assets.cropNone') },
              { value: '1:1', label: t('assets.cropSquare') },
              { value: '16:9', label: t('assets.cropWide') },
            ]}
          />

          <Upload
            showUploadList={false}
            accept="image/png,image/jpeg,image/webp,image/gif,audio/*,video/mp4,video/webm"
            beforeUpload={(file) => {
              onUpload(file);
              return false;
            }}
            disabled={uploadProgress !== null}
          >
            <Button
              type="primary"
              icon={<UploadIcon className="size-4" />}
              loading={uploadProgress !== null}
            >
              {uploadProgress !== null
                ? t('assets.uploading', { progress: uploadProgress })
                : t('assets.upload')}
            </Button>
          </Upload>
        </div>
      </div>

      {uploadProgress !== null && (
        <Progress percent={uploadProgress} status="active" showInfo={false} size="small" />
      )}
    </div>
  );
}
