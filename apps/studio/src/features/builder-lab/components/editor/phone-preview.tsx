'use client';

import { Mechanism, toCanvasPrizes } from '@playora/ui/campaign';
import { Flex, Segmented, theme } from 'antd';
import { useTranslations } from 'next-intl';
import { useMechanismLabels } from '@/features/canvas-editor/components/use-canvas-labels';
import { SCREEN_KEYS, type ScreenKey } from '@/features/canvas-editor/lib/model';
import type { Campaign } from '../../api';
import { getTemplate } from '../../lib/starter';
import { FitScreen } from './fit-screen';

/** The idle mechanism for a campaign, drawn inside its game stage. */
export function CampaignStage({
  campaign,
}: {
  campaign: Pick<Campaign, 'templateKey' | 'brand' | 'prizes'>;
}) {
  const labels = useMechanismLabels();
  return (
    <Mechanism
      mechanism={getTemplate(campaign.templateKey).mechanism}
      brand={campaign.brand}
      prizes={campaign.prizes}
      labels={labels}
    />
  );
}

/** Live phone preview of one screen, with a screen switcher and realistic smartphone frame. */
export function PhonePreview({
  campaign,
  screen,
  onScreenChange,
  hideScreenSwitcher = false,
}: {
  campaign: Campaign;
  screen: ScreenKey;
  onScreenChange: (screen: ScreenKey) => void;
  hideScreenSwitcher?: boolean;
}) {
  const t = useTranslations('builderLab.editor.screens');
  const { token } = theme.useToken();
  const doc = campaign.screens[screen];

  return (
    <Flex vertical align="center" gap={16} className="w-full">
      {!hideScreenSwitcher && (
        <div className="max-w-full overflow-x-auto">
          <Segmented
            value={screen}
            onChange={(value) => onScreenChange(value as ScreenKey)}
            options={SCREEN_KEYS.map((key) => ({ value: key, label: t(key) }))}
          />
        </div>
      )}
      {/* Premium iPhone mockup with realistic titanium border, dynamic island, and home bar */}
      <div
        className="relative shrink-0 overflow-hidden shadow-2xl transition-all duration-300"
        style={{
          width: 'min(350px, 100%)',
          aspectRatio: '9 / 18.5',
          borderRadius: 38,
          border: '8px solid #1c1917',
          boxShadow:
            '0 25px 50px -12px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(255, 255, 255, 0.08) inset',
          background: token.colorBgContainer,
        }}
        data-testid="quick-edit-preview"
      >
        {/* Dynamic Island pill */}
        <div
          className="absolute top-2 left-1/2 -translate-x-1/2 z-30 pointer-events-none flex items-center justify-end px-2"
          style={{ width: 84, height: 18, background: '#000', borderRadius: 12 }}
        >
          <span className="size-2 rounded-full bg-[#1c1917] border border-[#292524]" />
        </div>

        {/* Screen Content */}
        <div className="h-full w-full overflow-hidden">
          <FitScreen
            key={screen}
            screen={doc}
            brand={campaign.brand}
            prizes={toCanvasPrizes(campaign)}
            scroll
            animate={0}
            stage={<CampaignStage campaign={campaign} />}
          />
        </div>

        {/* Bottom home indicator line */}
        <div
          className="absolute bottom-1.5 left-1/2 -translate-x-1/2 z-30 pointer-events-none"
          style={{ width: 110, height: 4, background: 'rgba(0, 0, 0, 0.3)', borderRadius: 4 }}
        />
      </div>
    </Flex>
  );
}
