'use client';

import type { PlaybookKey } from '@playora/contracts';
import { Chip } from '@playora/ui/components/base/badges/chip';
import { Target } from '@playora/ui/icons';
import { useTranslations } from 'next-intl';

/** Which goal-led playbook a campaign started from (docs/product/specs/playbooks.md); nothing if none. */
export function PlaybookTag({ playbook }: { playbook: PlaybookKey | null }) {
  const t = useTranslations('campaigns.playbookTag');
  if (!playbook) return null;
  return (
    <Chip variant="subtle" color="purple" className="gap-1 font-normal" data-playbook={playbook}>
      <Target className="size-3" />
      {t(playbook)}
    </Chip>
  );
}
