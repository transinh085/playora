'use client';

import { Badge } from '@playora/ui/components/badge';
import { CircleCheck, CircleStop, Clock, Pause, PencilLine } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { CampaignPhase } from '../../lib/phase';

const LOOK: Record<
  CampaignPhase,
  {
    variant: 'default' | 'secondary' | 'outline' | 'destructive';
    className?: string;
    Icon: typeof Clock;
  }
> = {
  draft: { variant: 'outline', Icon: PencilLine },
  scheduled: { variant: 'secondary', className: 'text-blue-600 dark:text-blue-400', Icon: Clock },
  live: {
    variant: 'outline',
    className: 'border-emerald-500/30 text-emerald-600 dark:text-emerald-400',
    Icon: CircleCheck,
  },
  paused: { variant: 'secondary', className: 'text-amber-600 dark:text-amber-400', Icon: Pause },
  ended: { variant: 'outline', Icon: CircleStop },
};

/** Lifecycle tag with an icon (docs/engineering/design-system.md §3.4): colour is never the only signal. */
export function PhaseTag({ phase }: { phase: CampaignPhase }) {
  const t = useTranslations('campaigns.phase');
  const { variant, className, Icon } = LOOK[phase];
  return (
    <Badge variant={variant} className={`gap-1 font-normal ${className ?? ''}`} data-phase={phase}>
      <Icon className="size-3" />
      {t(phase)}
    </Badge>
  );
}
