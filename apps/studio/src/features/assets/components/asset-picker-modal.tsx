'use client';

import {
  ALLOWED_ASSET_MIMES,
  type AssetSummary,
  assetsApi,
  type ErrorCode,
} from '@playora/contracts';
import { Button, Input, Modal, Skeleton, toast } from '@playora/ui/components';
import { Check, ImageIcon, Loader2, Search, Upload as UploadIcon } from '@playora/ui/icons';
import { cx } from '@playora/ui/utils/cx';
import { useTranslations } from 'next-intl';
import { useMemo, useRef, useState } from 'react';
import { Caption } from '@/components/caption';
import { EmptyState } from '@/components/empty-state';
import { getPublicAssetUrl } from '@/features/builder-lab/lib/upload-image';
import { api } from '@/lib/api';
import { useAssets, useInvalidateAssets } from '../api';
import { formatBytes } from '../lib/asset-helpers';

const MAX_PICKER_UPLOAD_BYTES = 5 * 1024 * 1024;

export interface AssetPickerModalProps {
  orgId: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  selectedAssetId?: string | null;
  selectedUrl?: string | null;
  onSelect: (asset: AssetSummary, publicUrl: string) => void;
}

export function AssetPickerModal(props: AssetPickerModalProps) {
  if (!props.isOpen) return null;
  return <AssetPickerModalOpen {...props} />;
}

function AssetPickerModalOpen({
  orgId,
  isOpen,
  onOpenChange,
  title,
  selectedAssetId,
  selectedUrl,
  onSelect,
}: AssetPickerModalProps) {
  const t = useTranslations();
  const invalidateAssets = useInvalidateAssets();
  const [search, setSearch] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const query = useAssets(orgId, { limit: 50, kind: 'image' });
  const items = query.data?.items ?? [];

  const filteredItems = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return items;
    return items.filter((item) => {
      const name = (item.filename ?? item.mime).toLowerCase();
      return name.includes(needle);
    });
  }, [items, search]);

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_PICKER_UPLOAD_BYTES) {
      toast.error(t('builderLab.quickEdit.tooLarge'));
      return;
    }
    setIsUploading(true);
    try {
      const mime = ALLOWED_ASSET_MIMES.image.includes(file.type) ? file.type : 'image/png';
      const ticket = await api.call(assetsApi.createUpload, {
        params: { orgId },
        body: {
          kind: 'image',
          mime,
          bytes: file.size || 1,
          filename: file.name || 'image.png',
        },
      });
      const putRes = await fetch(ticket.uploadUrl, {
        method: 'PUT',
        headers: ticket.headers,
        body: file,
      });
      if (!putRes.ok) {
        throw new Error(`Upload failed (${putRes.status})`);
      }
      const completed = await api.call(assetsApi.completeUpload, {
        params: { orgId, assetId: ticket.assetId },
        body: {},
      });
      await invalidateAssets();
      toast.success(t('assets.uploaded'));
      onSelect(completed, getPublicAssetUrl(completed.id));
      onOpenChange(false);
    } catch (err) {
      const code = (err as { code?: ErrorCode })?.code;
      toast.error(code ? t(`errors.${code}`) : t('builderLab.quickEdit.uploadFailed'));
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }

  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
      <Modal.Backdrop isDismissable>
        <Modal.Container size="lg">
          <Modal.Dialog>
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading>{title ?? t('assets.picker.title')}</Modal.Heading>
              <p className="mt-1 text-caption-1-regular text-text-secondary">
                {t('assets.picker.subtitle')}
              </p>
            </Modal.Header>

            <Modal.Body className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="relative min-w-[200px] flex-1">
                  <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-text-tertiary" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={t('assets.picker.searchPlaceholder')}
                    aria-label={t('assets.picker.searchPlaceholder')}
                    className="pl-9"
                    fullWidth
                  />
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  className="hidden"
                  onChange={handleFileUpload}
                />
                <Button
                  type="button"
                  size="sm"
                  isDisabled={isUploading}
                  onPress={() => fileInputRef.current?.click()}
                >
                  {isUploading ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <UploadIcon className="size-4" />
                  )}
                  {t('assets.upload')}
                </Button>
              </div>

              {query.isPending ? (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="aspect-video w-full rounded-xl" />
                  ))}
                </div>
              ) : filteredItems.length === 0 ? (
                <EmptyState
                  icon={ImageIcon}
                  title={t('assets.picker.emptySearch')}
                  description={t('assets.subtitle')}
                />
              ) : (
                <div className="grid max-h-[380px] grid-cols-2 gap-3 overflow-y-auto pr-1 sm:grid-cols-3">
                  {filteredItems.map((asset) => {
                    const publicUrl = getPublicAssetUrl(asset.id);
                    const isSelected =
                      asset.id === selectedAssetId ||
                      (Boolean(selectedUrl) &&
                        (selectedUrl === publicUrl || selectedUrl === asset.url));
                    const thumbUrl =
                      asset.variants.cropped?.url ?? asset.variants.w320?.url ?? asset.url;
                    const displayName = asset.filename || `${asset.mime} (${asset.id.slice(-6)})`;

                    return (
                      <button
                        key={asset.id}
                        type="button"
                        onClick={() => {
                          onSelect(asset, publicUrl);
                          onOpenChange(false);
                        }}
                        className={cx(
                          'group relative flex cursor-pointer flex-col overflow-hidden rounded-xl border text-left transition-all',
                          isSelected
                            ? 'border-accent ring-2 ring-accent/25 bg-surface-secondary'
                            : 'border-border bg-surface hover:border-border/80',
                        )}
                      >
                        <div className="relative flex aspect-video w-full items-center justify-center overflow-hidden border-b border-separator-border bg-surface-secondary">
                          {/* biome-ignore lint/performance/noImgElement: dynamic asset URL */}
                          <img
                            src={thumbUrl}
                            alt={displayName}
                            className="size-full object-contain"
                          />
                          {isSelected && (
                            <span className="absolute top-2 right-2 flex size-5 items-center justify-center rounded-full bg-accent text-white shadow-xs">
                              <Check className="size-3" />
                            </span>
                          )}
                        </div>
                        <div className="flex flex-col gap-0.5 p-2.5">
                          <span
                            className="truncate text-caption-1-semibold text-text-primary"
                            title={displayName}
                          >
                            {displayName}
                          </span>
                          <Caption className="truncate">
                            {formatBytes(asset.bytes)}
                            {asset.width && asset.height ? ` · ${asset.width}×${asset.height}` : ''}
                          </Caption>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </Modal.Body>

            <Modal.Footer>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onPress={() => onOpenChange(false)}
              >
                {t('common.cancel')}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
