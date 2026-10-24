'use client';

import type { AssetSummary, TemplateAssetSlot } from '@playora/contracts';
import { Button, Empty, Modal } from 'antd';
import { useTranslations } from 'next-intl';
import type { AssetPickerModalState } from '../lib/use-game-editor';

export function AssetPickerDialog({
  state,
  readyAssets,
  assetSlots,
  onClose,
}: {
  state: AssetPickerModalState | null;
  readyAssets: readonly AssetSummary[];
  assetSlots: readonly TemplateAssetSlot[];
  onClose: () => void;
}) {
  const t = useTranslations();

  const matchingAssets = readyAssets.filter((asset) => {
    const slot = assetSlots.find((s) => s.key === state?.slotKey);
    return !slot || slot.accept.includes(asset.kind);
  });

  return (
    <Modal
      title={t('games.pickAssetTitle')}
      open={Boolean(state?.open)}
      onCancel={onClose}
      footer={<Button onClick={onClose}>{t('common.cancel')}</Button>}
      destroyOnHidden
    >
      <div data-testid="asset-picker-dialog">
        {matchingAssets.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={t('games.pickAssetEmpty')}
            className="py-6"
          />
        ) : (
          <div className="grid max-h-80 grid-cols-2 gap-3 overflow-y-auto p-1 sm:grid-cols-3">
            {matchingAssets.map((asset) => {
              const thumbUrl = asset.variants.w320?.url ?? asset.url;
              return (
                <button
                  key={asset.id}
                  type="button"
                  data-testid={`asset-picker-item-${asset.id}`}
                  onClick={() => {
                    state?.onChange(asset.id);
                    onClose();
                  }}
                  className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border border-[var(--ant-color-border-secondary)] p-2 text-xs transition hover:border-[var(--ant-color-primary)]"
                >
                  {asset.kind === 'image' ? (
                    // biome-ignore lint/performance/noImgElement: presigned S3 asset URL
                    <img
                      src={thumbUrl}
                      alt={asset.id}
                      className="h-20 w-full rounded object-contain"
                    />
                  ) : (
                    <div className="flex h-20 w-full items-center justify-center rounded bg-[var(--ant-color-fill-tertiary)] font-mono">
                      {asset.kind}
                    </div>
                  )}
                  <span className="truncate font-mono text-[10px]">{asset.id.slice(-8)}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </Modal>
  );
}
