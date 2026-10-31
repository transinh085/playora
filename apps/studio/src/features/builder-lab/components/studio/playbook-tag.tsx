'use client';

import type { PlaybookKey } from '@playora/contracts';
import { Badge } from '@playora/ui/components/badge';
import { Target } from '@playora/ui/icons';
import { useTranslations } from 'next-intl';

/** Which goal-led playbook a campaign started from (docs/product/specs/playbooks.md); nothing if none. */
export function PlaybookTag({ playbook }: { playbook: PlaybookKey | null }) {
  const t = useTranslations('campaigns.playbookTag');
  if (!playbook) return null;
  return (
    <Badge
      variant="secondary"
      className="gap-1 border-purple-500/20 bg-purple-500/10 text-purple-700 dark:text-purple-300 font-normal"
      data-playbook={playbook}
    >
      <Target className="size-3" />
      {t(playbook)}
    </Badge>
  );
}
