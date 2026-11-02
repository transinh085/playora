'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { TemplatesCatalog } from '@/features/templates';
import { PLAYBOOK_KEYS, type PlaybookKey } from '../../lib/playbooks';
import { GoalPicker } from './goal-picker';
import { PlaybookSetupForm } from './playbook-setup';

const isPlaybook = (value: string | null): value is PlaybookKey =>
  PLAYBOOK_KEYS.includes(value as PlaybookKey);

/**
 * Unified campaign creation flow (ADR/Decision D-43 & D-44):
 * Directly presents the visual Templates Catalog with ORA Mascot guidance & smart goal filters.
 * Seamlessly supports playbook presets when triggered via `?playbook=` deep links.
 */
export function CreateCampaignFlow({ orgId }: { orgId: string }) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const go = (query: string) => router.push(`${pathname}${query}` as never);

  const playbook = params.get('playbook');
  if (isPlaybook(playbook)) {
    return (
      <PlaybookSetupForm key={playbook} orgId={orgId} playbook={playbook} onBack={() => go('')} />
    );
  }

  if (params.get('mode') === 'playbooks') {
    return <GoalPicker onPick={(key) => go(`?playbook=${key}`)} onCustom={() => go('')} />;
  }

  return <TemplatesCatalog orgId={orgId} />;
}
