'use client';

import { Chip } from '@playora/ui/components/base/badges/chip';
import { CircleCheck, CircleStop, Clock, Pause, PencilLine } from '@playora/ui/icons';
import { useTranslations } from 'next-intl';
import type { CampaignPhase } from '../../lib/phase';

const LOOK: Record<
  CampaignPhase,
  {
    color: 'neutral' | 'blue' | 'lime' | 'orange' | 'gray';
    className?: string;
    Icon: typeof Clock;
  }
> = {
  draft: { color: 'neutral', Icon: PencilLine },
  scheduled: { color: 'blue', Icon: Clock },
  live: {
    color: 'lime',
    Icon: CircleCheck,
  },
  paused: { color: 'orange', Icon: Pause },
  ended: { color: 'gray', Icon: CircleStop },
};

/** Lifecycle tag with an icon (docs/engineering/design-system.md §3.4): colour is never the only signal. */
export function PhaseTag({ phase }: { phase: CampaignPhase }) {
  const t = useTranslations('campaigns.phase');
  const { color, className, Icon } = LOOK[phase];
  return (
    <Chip
      variant="subtle"
      color={color}
      className={`gap-1.5 text-xs font-medium ${className ?? ''}`}
      data-phase={phase}
    >
      <Icon className="size-3.5" />
      {t(phase)}
    </Chip>
  );
}
