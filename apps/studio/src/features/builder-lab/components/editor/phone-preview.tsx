'use client';

import { Mechanism, toCanvasPrizes } from '@playora/ui/campaign';
import { PhoneMockup, Tabs } from '@playora/ui/components';
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
  const doc = campaign.screens[screen];

  return (
    <div className="flex w-full flex-col items-center gap-4">
      {!hideScreenSwitcher && (
        <div className="max-w-full overflow-x-auto">
          <Tabs selectedKey={screen} onSelectionChange={(key) => onScreenChange(key as ScreenKey)}>
            <Tabs.ListContainer>
              <Tabs.List aria-label="Screens">
                {SCREEN_KEYS.map((key) => (
                  <Tabs.Tab key={key} id={key} className="px-3 py-1 text-xs font-medium">
                    {t(key)}
                    <Tabs.Indicator />
                  </Tabs.Tab>
                ))}
              </Tabs.List>
            </Tabs.ListContainer>
          </Tabs>
        </div>
      )}

      <PhoneMockup size="md" data-testid="quick-edit-preview">
        <FitScreen
          key={screen}
          screen={doc}
          brand={campaign.brand}
          prizes={toCanvasPrizes(campaign)}
          scroll
          animate={0}
          stage={<CampaignStage campaign={campaign} />}
        />
      </PhoneMockup>
    </div>
  );
}
