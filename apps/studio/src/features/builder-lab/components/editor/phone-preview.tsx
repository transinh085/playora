'use client';

import { Mechanism, toCanvasPrizes } from '@playora/ui/campaign';
import { cn } from '@playora/ui/lib/utils';
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
          <div className="inline-flex rounded-full border bg-muted/50 p-0.5 text-xs">
            {SCREEN_KEYS.map((key) => (
              <button
                key={key}
                type="button"
                className={cn(
                  'rounded-full px-3 py-1 font-medium transition-all',
                  screen === key
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
                onClick={() => onScreenChange(key)}
              >
                {t(key)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Premium iPhone mockup with realistic border, dynamic island, and home bar */}
      <div
        className="relative shrink-0 overflow-hidden rounded-[38px] border-[8px] border-zinc-900 bg-background shadow-2xl transition-all duration-300"
        style={{
          width: 'min(350px, 100%)',
          aspectRatio: '9 / 18.5',
          boxShadow:
            '0 25px 50px -12px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(255, 255, 255, 0.08) inset',
        }}
        data-testid="quick-edit-preview"
      >
        {/* Dynamic Island pill */}
        <div className="pointer-events-none absolute left-1/2 top-2 z-30 flex h-[18px] w-[84px] -translate-x-1/2 items-center justify-end rounded-xl bg-black px-2">
          <span className="size-2 rounded-full border border-zinc-800 bg-zinc-900" />
        </div>

        {/* Screen Content */}
        <div className="size-full overflow-hidden">
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
        <div className="pointer-events-none absolute bottom-1.5 left-1/2 z-30 h-1 w-28 -translate-x-1/2 rounded-full bg-black/30" />
      </div>
    </div>
  );
}
