'use client';

import { Button } from '@playora/ui/components/base/buttons/button';
import { ChevronUp, Sparkles } from '@playora/ui/icons';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Checklist, type ChecklistItem } from '@/components/checklist';

export function SmartOnboardingBanner({
  items,
  testId = 'home-checklist',
}: {
  items: readonly ChecklistItem[];
  testId?: string;
}) {
  const t = useTranslations('campaigns.home');
  const allDone = items.every((i) => i.done);
  const [collapsed, setCollapsed] = useState(allDone);

  if (allDone && collapsed) {
    return (
      <div className="flex items-center justify-between rounded-2xl border border-separator-border bg-background-primary-default px-4 py-2.5 shadow-xs">
        <div className="flex items-center gap-2 text-caption-1-medium text-text-secondary">
          <Sparkles className="size-4 text-emerald-500" />
          <span>{t('metrics.allGood')}</span>
        </div>
        <Button
          variant="ghost"
          size="small"
          onClick={() => setCollapsed(false)}
          className="text-caption-1-regular"
        >
          {t('gettingStarted')}
        </Button>
      </div>
    );
  }

  return (
    <div className="relative">
      <Checklist
        title={t('gettingStarted')}
        extra={
          allDone ? (
            <Button
              variant="ghost"
              size="small"
              onClick={() => setCollapsed(true)}
              className="size-7 p-0"
              aria-label="Collapse"
            >
              <ChevronUp className="size-4" />
            </Button>
          ) : undefined
        }
        items={items}
        testId={testId}
      />
    </div>
  );
}
