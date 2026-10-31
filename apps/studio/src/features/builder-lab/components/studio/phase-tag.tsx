'use client';

import { Badge } from '@playora/ui/components/badge';
import { CircleCheck, CircleStop, Clock, Pause, PencilLine } from '@playora/ui/icons';
import { useTranslations } from 'next-intl';
import type { CampaignPhase } from '../../lib/phase';

const LOOK: Record<
  CampaignPhase,
  {
    variant: 'default' | 'secondary' | 'outline' | 'destructive' | 'teal' | 'orange' | 'blue';
    className?: string;
    Icon: typeof Clock;
  }
> = {
  draft: { variant: 'outline', Icon: PencilLine },
  scheduled: { variant: 'blue', Icon: Clock },
  live: {
    variant: 'teal',
    Icon: CircleCheck,
  },
  paused: { variant: 'orange', Icon: Pause },
  ended: { variant: 'secondary', Icon: CircleStop },
};

/** Lifecycle tag with an icon (docs/engineering/design-system.md §3.4): colour is never the only signal. */
export function PhaseTag({ phase }: { phase: CampaignPhase }) {
  const t = useTranslations('campaigns.phase');
  const { variant, className, Icon } = LOOK[phase];
  return (
    <Badge
      variant={variant}
      className={`gap-1.5 text-xs font-medium ${className ?? ''}`}
      data-phase={phase}
    >
      <Icon className="size-3.5" />
      {t(phase)}
    </Badge>
  );
}
