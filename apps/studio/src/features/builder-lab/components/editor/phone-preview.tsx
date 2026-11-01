'use client';

import { Mechanism, toCanvasPrizes } from '@playora/ui/campaign';
import { PhoneMockup } from '@playora/ui/components/foundations/phone-mockup/phone-mockup';
import { cx } from '@playora/ui/utils/cx';
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
          <div className="inline-flex rounded-full border border-border-button-default bg-background-secondary-default p-0.5 text-xs">
            {SCREEN_KEYS.map((key) => (
              <button
                key={key}
                type="button"
                className={cx(
                  'rounded-full px-3 py-1 font-medium transition-all',
                  screen === key
                    ? 'bg-background-primary-default text-text-primary shadow-xs'
                    : 'text-text-secondary hover:text-text-primary',
                )}
                onClick={() => onScreenChange(key)}
              >
                {t(key)}
              </button>
            ))}
          </div>
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
