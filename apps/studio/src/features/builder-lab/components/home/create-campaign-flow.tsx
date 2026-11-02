'use client';

import { Tab, TabList, Tabs } from '@playora/ui/components/base/tabs/tabs';
import { RiGamepadLine, RiTargetLine } from '@remixicon/react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { TemplatesCatalog } from '@/features/templates';
import { PLAYBOOK_KEYS, type PlaybookKey } from '../../lib/playbooks';
import { GoalPicker } from './goal-picker';
import { PlaybookSetupForm } from './playbook-setup';

const isPlaybook = (value: string | null): value is PlaybookKey =>
  PLAYBOOK_KEYS.includes(value as PlaybookKey);

/**
 * New campaign creation flow:
 * Defaults to the rich visual TemplatesCatalog (Kho mẫu), with an option to switch
 * to Goal-based Playbooks for strategic suggestions.
 */
export function CreateCampaignFlow({ orgId }: { orgId: string }) {
  const t = useTranslations('builderLab.playbooks');
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const go = (query: string) => router.push(`${pathname}${query}` as never);

  // Default mode is 'templates' (Kho mẫu minigame), or 'playbooks'
  const currentMode = params.get('mode') === 'playbooks' ? 'playbooks' : 'templates';
  const [mode, setMode] = useState<'templates' | 'playbooks'>(currentMode);

  const playbook = params.get('playbook');
  if (isPlaybook(playbook)) {
    return (
      <PlaybookSetupForm
        key={playbook}
        orgId={orgId}
        playbook={playbook}
        onBack={() => go('?mode=playbooks')}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Creation Mode Tabs */}
      <Tabs
        selectedKey={mode}
        onSelectionChange={(key) => {
          const next = String(key) as 'templates' | 'playbooks';
          setMode(next);
          go(next === 'playbooks' ? '?mode=playbooks' : '');
        }}
      >
        <TabList aria-label={t('title')}>
          <Tab id="templates" className="gap-2">
            <RiGamepadLine className="size-4" />
            <span>{t('tabTemplates')}</span>
          </Tab>
          <Tab id="playbooks" className="gap-2">
            <RiTargetLine className="size-4" />
            <span>{t('tabPlaybooks')}</span>
          </Tab>
        </TabList>
      </Tabs>

      {mode === 'templates' ? (
        <TemplatesCatalog orgId={orgId} />
      ) : (
        <GoalPicker
          onPick={(key) => go(`?playbook=${key}`)}
          onCustom={() => {
            setMode('templates');
            go('');
          }}
        />
      )}
    </div>
  );
}
