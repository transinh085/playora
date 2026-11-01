'use client';

import { Chip } from '@playora/ui/components';
import { CircleCheck, CircleStop, Clock, Pause, PencilLine } from '@playora/ui/icons';
import { useTranslations } from 'next-intl';
import type { CampaignPhase } from '../../lib/phase';

const LOOK: Record<
  CampaignPhase,
  {
    color: 'default' | 'accent' | 'success' | 'warning';
    className?: string;
    Icon: typeof Clock;
  }
> = {
  draft: { color: 'default', Icon: PencilLine },
  scheduled: { color: 'accent', Icon: Clock },
  live: {
    color: 'success',
    Icon: CircleCheck,
  },
  paused: { color: 'warning', Icon: Pause },
  ended: { color: 'default', Icon: CircleStop },
};

/** Lifecycle tag with an icon (docs/engineering/design-system.md §3.4): colour is never the only signal. */
export function PhaseTag({ phase }: { phase: CampaignPhase }) {
  const t = useTranslations('campaigns.phase');
  const { color, className, Icon } = LOOK[phase];
  return (
    <Chip
      variant="soft"
      color={color}
      className={`gap-1.5 text-xs font-medium ${className ?? ''}`}
      data-phase={phase}
    >
      <Icon className="size-3.5" />
      {t(phase)}
    </Chip>
  );
}
