'use client';

import { Tag } from 'antd';
import { CircleCheck, CircleStop, Clock, Pause, PencilLine } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { CampaignPhase } from '../../lib/phase';

const icon = 'mr-1 inline size-3 align-[-2px]';
const LOOK: Record<CampaignPhase, { color?: string; Icon: typeof Clock }> = {
  draft: { Icon: PencilLine },
  scheduled: { color: 'processing', Icon: Clock },
  live: { color: 'success', Icon: CircleCheck },
  paused: { color: 'warning', Icon: Pause },
  ended: { Icon: CircleStop },
};

/** Lifecycle tag with an icon (docs/engineering/design-system.md §3.4): colour is never the only signal. */
export function PhaseTag({ phase }: { phase: CampaignPhase }) {
  const t = useTranslations('campaigns.phase');
  const { color, Icon } = LOOK[phase];
  return (
    <Tag className="!m-0" color={color} icon={<Icon className={icon} />} data-phase={phase}>
      {t(phase)}
    </Tag>
  );
}
