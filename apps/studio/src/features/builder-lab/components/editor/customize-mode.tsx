'use client';

import { toCanvasPrizes } from '@playora/ui/campaign';
import { Info } from '@playora/ui/icons';
import { useTranslations } from 'next-intl';
import { useCallback, useMemo } from 'react';
import { CanvasWorkspace } from '@/features/canvas-editor/components/canvas-workspace';
import type { Campaign } from '../../api';
import { uploadCampaignImage } from '../../lib/upload-image';
import { CampaignStage } from './phone-preview';
import type { DraftPatch } from './use-campaign-draft';

/** "Customize": the full canvas (ADR-014) on the campaign's own screens and brand. */
export function CustomizeMode({
  campaign,
  onChange,
}: {
  campaign: Campaign;
  onChange: (patch: DraftPatch) => void;
}) {
  const t = useTranslations('builderLab.editor');
  // Stable between autosaves that only touch the screens, so the canvas does not redraw the stage.
  const { organizationId, templateKey, brand, prizes } = campaign;
  const renderStage = useCallback(
    () => <CampaignStage campaign={{ templateKey, brand, prizes }} />,
    [templateKey, brand, prizes],
  );
  const uploadImage = useCallback(
    (file: File) => uploadCampaignImage(organizationId, file),
    [organizationId],
  );
  const canvasPrizes = useMemo(() => toCanvasPrizes({ prizes }), [prizes]);

  return (
    <div className="flex h-full flex-col">
      <div className="lg:hidden">
        <div
          role="alert"
          className="flex items-center gap-2 border-b border-border-button-default bg-background-secondary-default px-4 py-2.5 text-xs font-medium text-text-primary"
        >
          <Info className="size-4 shrink-0" />
          <span>{t('customizeNarrow')}</span>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-x-auto">
        <div className="h-full min-w-[1000px]">
          <CanvasWorkspace
            value={campaign.screens}
            onChange={(screens) => onChange({ screens })}
            brand={brand}
            renderStage={renderStage}
            prizes={canvasPrizes}
            onUploadImage={uploadImage}
            hideHeader={true}
          />
        </div>
      </div>
    </div>
  );
}
