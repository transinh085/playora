'use client';

import type { AssetSummary, TemplateAssetSlot } from '@playora/contracts';
import { Button, Empty, Flex, Modal, Typography } from 'antd';
import { useTranslations } from 'next-intl';
import { Caption } from '@/components/caption';
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
                <Button
                  key={asset.id}
                  data-testid={`asset-picker-item-${asset.id}`}
                  onClick={() => {
                    state?.onChange(asset.id);
                    onClose();
                  }}
                  className="!h-auto min-w-0 flex-col !p-2"
                >
                  {asset.kind === 'image' ? (
                    // biome-ignore lint/performance/noImgElement: presigned S3 asset URL
                    <img src={thumbUrl} alt={asset.id} className="h-20 w-full object-contain" />
                  ) : (
                    <Flex align="center" justify="center" className="h-20 w-full">
                      <Typography.Text code>{asset.kind}</Typography.Text>
                    </Flex>
                  )}
                  <Caption className="max-w-full truncate">{asset.id.slice(-8)}</Caption>
                </Button>
              );
            })}
          </div>
        )}
      </div>
    </Modal>
  );
}
