'use client';

import { Alert, Grid } from 'antd';
import { useTranslations } from 'next-intl';
import { CanvasWorkspace } from '@/features/canvas-editor/components/canvas-workspace';
import type { Campaign } from '../../mock/types';
import { CampaignStage } from './phone-preview';
import { toCanvasPrizes } from './to-canvas-prizes';
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
  const wide = Grid.useBreakpoint().lg ?? true;

  return (
    <div className="flex h-full flex-col">
      {!wide && <Alert banner type="info" title={t('customizeNarrow')} />}
      <div className="min-h-0 flex-1 overflow-x-auto">
        <div className="h-full" style={{ minWidth: 1000 }}>
          <CanvasWorkspace
            value={campaign.screens}
            onChange={(screens) => onChange({ screens })}
            brand={campaign.brand}
            renderStage={() => <CampaignStage campaign={campaign} />}
            prizes={toCanvasPrizes(campaign)}
            hideHeader={true}
          />
        </div>
      </div>
    </div>
  );
}
