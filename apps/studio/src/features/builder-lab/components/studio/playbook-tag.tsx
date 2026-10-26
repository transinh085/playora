'use client';

import type { PlaybookKey } from '@playora/contracts';
import { Tag } from 'antd';
import { Target } from 'lucide-react';
import { useTranslations } from 'next-intl';

/** Which goal-led playbook a campaign started from (docs/product/specs/playbooks.md); nothing if none. */
export function PlaybookTag({ playbook }: { playbook: PlaybookKey | null }) {
  const t = useTranslations('campaigns.playbookTag');
  if (!playbook) return null;
  return (
    <Tag
      className="!m-0"
      color="purple"
      icon={<Target className="mr-1 inline size-3 align-[-2px]" />}
      data-playbook={playbook}
    >
      {t(playbook)}
    </Tag>
  );
}
