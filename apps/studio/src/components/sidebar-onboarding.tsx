'use client';

import { Popover, PopoverTrigger } from '@playora/ui/components';
import { ProgressCircle } from '@playora/ui/components/base/progress/progress';
import { cx } from '@playora/ui/utils/cx';
import {
  RiArrowRightSLine,
  RiArrowUpSLine,
  RiCheckboxBlankCircleLine,
  RiCheckboxCircleFill,
  RiCloseLine,
  RiSparklingLine,
} from '@remixicon/react';
import type { Route } from 'next';
import Link from 'next/link';
import { useNow, useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { useBrandKits } from '@/features/brand-kits/api';
import { useCampaigns, useCampaignsStats } from '@/features/builder-lab/api';
import { type CampaignPhase, campaignPhase } from '@/features/builder-lab/lib/phase';
import { campaignRoutes } from '@/features/builder-lab/lib/routes';
import { useOrgMembers } from '@/features/members/api';

const ORDER: Record<CampaignPhase, number> = {
  live: 0,
  paused: 1,
  scheduled: 2,
  draft: 3,
  ended: 4,
};

export interface OnboardingStep {
  key: 'brand' | 'campaign' | 'publish' | 'share' | 'team';
  done: boolean;
  title: string;
  desc: string;
  actionLabel: string;
  timeEstimate: string;
  href: string;
}

const DISMISS_EVENT = 'playora:onboarding-dismissed';

export function useOnboardingDismissed(orgId: string) {
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const storageKey = `playora_onboarding_dismissed_${orgId}`;
    const sync = () => {
      setIsDismissed(window.localStorage.getItem(storageKey) === 'true');
    };
    sync();
    window.addEventListener(DISMISS_EVENT, sync);
    return () => window.removeEventListener(DISMISS_EVENT, sync);
  }, [orgId]);

  const dismiss = () => {
    setIsDismissed(true);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(`playora_onboarding_dismissed_${orgId}`, 'true');
      window.dispatchEvent(new Event(DISMISS_EVENT));
    }
  };

  return { isDismissed, dismiss };
}

export function useOnboardingSteps(orgId: string) {
  const t = useTranslations('campaigns.home');
  const now = useNow({ updateInterval: 60_000 }).getTime();
  const campaigns = useCampaigns(orgId);
  const brandKits = useBrandKits(orgId);
  const members = useOrgMembers(orgId);
  const items = campaigns.data ?? [];
  const campaignIds = items.map((c) => c.id);

  const { data: statsById } = useCampaignsStats(orgId, campaignIds);
  const routes = campaignRoutes(orgId);

  const rows = items
    .map((campaign) => ({ campaign, phase: campaignPhase(campaign, now) }))
    .sort((a, b) => ORDER[a.phase] - ORDER[b.phase]);

  const published = rows.find((row) => row.campaign.status === 'published');
  const firstDraft = rows.find((row) => row.phase === 'draft');
  const anyPlays = statsById ? [...statsById.values()].some((s) => s.plays > 0) : false;
  const teamSize =
    (members.data?.members.length ?? 1) +
    (members.data?.invitations.filter((i) => i.status === 'pending').length ?? 0);

  const steps: OnboardingStep[] = [
    {
      key: 'brand',
      done: (brandKits.data?.items.length ?? 0) > 0,
      title: t('steps.brand'),
      desc: t('steps.brandDesc'),
      actionLabel: t('steps.brandAction'),
      timeEstimate: t('launchpad.timeBrand'),
      href: `/orgs/${orgId}/brand-kits`,
    },
    {
      key: 'campaign',
      done: items.length > 0,
      title: t('steps.campaign'),
      desc: t('steps.campaignDesc'),
      actionLabel: t('steps.campaignAction'),
      timeEstimate: t('launchpad.timeCampaign'),
      href: routes.create,
    },
    {
      key: 'publish',
      done: Boolean(published),
      title: t('steps.publish'),
      desc: t('steps.publishDesc'),
      actionLabel: t('steps.publishAction'),
      timeEstimate: t('launchpad.timePublish'),
      href: firstDraft ? routes.edit(firstDraft.campaign.id, 'rules') : routes.create,
    },
    {
      key: 'share',
      done: anyPlays,
      title: t('steps.share'),
      desc: t('steps.shareDesc'),
      actionLabel: t('steps.shareAction'),
      timeEstimate: t('launchpad.timeShare'),
      href: published ? `${routes.detail(published.campaign.id)}?tab=share` : routes.list,
    },
    {
      key: 'team',
      done: teamSize > 1,
      title: t('steps.team'),
      desc: t('steps.teamDesc'),
      actionLabel: t('steps.teamAction'),
      timeEstimate: t('launchpad.timeTeam'),
      href: `/orgs/${orgId}/settings`,
    },
  ];

  const doneCount = steps.filter((s) => s.done).length;
  const totalCount = steps.length;
  const percent = Math.round((doneCount / totalCount) * 100);
  const allDone = doneCount === totalCount;

  return {
    steps,
    doneCount,
    totalCount,
    percent,
    allDone,
  };
}

function OnboardingPopoverContent({
  steps,
  doneCount,
  totalCount,
  percent,
  allDone,
  onClose,
  onDismiss,
  onNavigate,
}: {
  steps: readonly OnboardingStep[];
  doneCount: number;
  totalCount: number;
  percent: number;
  allDone: boolean;
  onClose: () => void;
  onDismiss?: () => void;
  onNavigate?: () => void;
}) {
  const t = useTranslations('campaigns.home');

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <div
            className={cx(
              'flex size-6 shrink-0 items-center justify-center rounded-md',
              allDone
                ? 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20'
                : 'bg-accent-500/10 text-accent-600 dark:bg-accent-500/20',
            )}
          >
            <RiSparklingLine className="size-3.5" />
          </div>
          <span className="truncate text-body-2-semibold text-text-primary">
            {allDone ? t('setupComplete') : t('gettingStarted')}
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <span className="rounded-full bg-background-secondary-default px-2 py-0.5 text-caption-2-medium tabular-nums text-text-secondary">
            {`${doneCount}/${totalCount}`}
          </span>
          <button
            type="button"
            onClick={allDone && onDismiss ? onDismiss : onClose}
            className="flex size-6 cursor-pointer items-center justify-center rounded-lg text-foreground-icon-tertiary transition-colors hover:bg-background-secondary-hover hover:text-foreground-icon-primary"
            aria-label={allDone && onDismiss ? t('dismiss') : 'Close'}
            title={allDone && onDismiss ? t('dismiss') : undefined}
          >
            <RiCloseLine className="size-4" />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-background-tertiary-default">
        <div
          className={cx(
            'h-full rounded-full transition-all duration-300',
            allDone ? 'bg-emerald-500' : 'bg-linear-to-r from-accent-500 to-accent-600',
          )}
          style={{ width: `${percent}%` }}
        />
      </div>

      {/* Step Items list */}
      <ul className="mt-2.5 flex list-none flex-col gap-1 border-t border-separator-border p-0 pt-2">
        {steps.map((item) => (
          <li
            key={item.key}
            data-testid={`home-checklist-${item.key}`}
            data-done={String(item.done)}
          >
            <Link
              href={item.href as Route}
              onClick={() => {
                onClose();
                onNavigate?.();
              }}
              className={cx(
                'group flex items-start gap-2.5 rounded-xl px-2.5 py-2 transition-colors',
                item.done
                  ? 'hover:bg-background-secondary-hover/50'
                  : 'hover:bg-background-secondary-hover',
              )}
            >
              {item.done ? (
                <RiCheckboxCircleFill className="mt-0.5 size-4 shrink-0 text-accent-600" />
              ) : (
                <RiCheckboxBlankCircleLine className="mt-0.5 size-4 shrink-0 text-foreground-icon-tertiary group-hover:text-foreground-icon-secondary" />
              )}
              <span className="min-w-0 flex-1">
                <span
                  className={cx(
                    'block text-caption-1-medium leading-snug transition-colors',
                    item.done
                      ? 'line-through text-text-tertiary'
                      : 'text-text-primary group-hover:text-accent-600',
                  )}
                >
                  {item.title}
                </span>
                {!item.done && (
                  <span className="mt-0.5 block text-caption-2-regular text-text-tertiary">
                    {item.desc}
                  </span>
                )}
              </span>
              {!item.done && (
                <RiArrowRightSLine className="mt-0.5 size-4 shrink-0 text-foreground-icon-tertiary transition-transform group-hover:translate-x-0.5 group-hover:text-accent-600" />
              )}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SidebarOnboarding({
  orgId,
  isCollapsedDesktop = false,
  isMobile = false,
  onNavigate,
}: {
  orgId: string;
  isCollapsedDesktop?: boolean;
  isMobile?: boolean;
  onNavigate?: () => void;
}) {
  const t = useTranslations('campaigns.home');
  const { steps, doneCount, totalCount, percent, allDone } = useOnboardingSteps(orgId);
  const { isDismissed, dismiss: handleDismiss } = useOnboardingDismissed(orgId);
  const [isOpen, setIsOpen] = useState(false);

  if (allDone && isDismissed) {
    return null;
  }

  const nextStep = steps.find((s) => !s.done);

  // Collapsed desktop sidebar: render icon trigger with badge and popover
  if (isCollapsedDesktop) {
    return (
      <div className="flex w-full justify-center">
        <PopoverTrigger isOpen={isOpen} onOpenChange={setIsOpen}>
          <button
            type="button"
            data-testid="home-checklist"
            aria-label={t('gettingStarted')}
            title={`${t('gettingStarted')} (${doneCount}/${totalCount})`}
            className="relative flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-background-tertiary-default text-foreground-icon-secondary outline-none transition-colors hover:bg-background-tertiary-hover hover:text-foreground-icon-primary focus-visible:ring-2 focus-visible:ring-border-focus-ring"
          >
            <RiSparklingLine
              className={cx('size-4', allDone ? 'text-emerald-500' : 'text-accent-500')}
            />
            <span
              className={cx(
                'absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold text-white shadow-xs',
                allDone ? 'bg-emerald-600' : 'bg-accent-600',
              )}
            >
              {doneCount}
            </span>
          </button>
          <Popover
            placement="right bottom"
            className="w-[320px] rounded-2xl border border-border-button-default bg-background-primary-default p-2 shadow-dropdown"
          >
            <OnboardingPopoverContent
              steps={steps}
              doneCount={doneCount}
              totalCount={totalCount}
              percent={percent}
              allDone={allDone}
              onClose={() => setIsOpen(false)}
              onDismiss={handleDismiss}
              onNavigate={onNavigate}
            />
          </Popover>
        </PopoverTrigger>
      </div>
    );
  }

  // Standard expanded sidebar: compact trigger pill/card that opens a floating popover
  // so it never overlaps or crowds the sidebar navigation on small screens.
  return (
    <div data-testid="home-checklist" className="relative flex flex-col">
      <PopoverTrigger isOpen={isOpen} onOpenChange={setIsOpen}>
        <button
          type="button"
          aria-expanded={isOpen}
          className="group flex w-full cursor-pointer flex-col gap-1.5 rounded-xl border border-border-button-default bg-background-primary-default px-2.5 py-2 text-left shadow-xs outline-none transition-colors hover:border-border-button-hover hover:bg-background-primary-hover focus-visible:ring-2 focus-visible:ring-border-focus-ring"
        >
          <div className="flex w-full items-center justify-between gap-2">
            <span className="flex min-w-0 flex-1 items-center gap-2">
              <ProgressCircle
                size="sm"
                value={percent}
                aria-label={t('gettingStarted')}
                className={allDone ? 'text-emerald-500' : 'text-accent-500'}
              />
              <span className="truncate text-caption-1-semibold text-text-primary">
                {allDone ? t('setupComplete') : t('gettingStarted')}
              </span>
            </span>

            <span className="flex shrink-0 items-center gap-1">
              <span className="rounded-full bg-background-secondary-default px-1.5 py-0.5 text-caption-2-medium tabular-nums text-text-secondary">
                {`${doneCount}/${totalCount}`}
              </span>
              <RiArrowUpSLine
                className={cx(
                  'size-3.5 text-foreground-icon-tertiary transition-transform duration-200 group-hover:text-foreground-icon-primary',
                  isOpen && 'rotate-180',
                )}
                aria-hidden
              />
            </span>
          </div>

          {/* Slim progress bar */}
          <div className="h-1 w-full overflow-hidden rounded-full bg-background-tertiary-default">
            <div
              className={cx(
                'h-full rounded-full transition-all duration-300',
                allDone ? 'bg-emerald-500' : 'bg-linear-to-r from-accent-500 to-accent-600',
              )}
              style={{ width: `${percent}%` }}
            />
          </div>

          {nextStep && (
            <span className="flex w-full items-center justify-between gap-1.5 text-caption-2-regular text-text-secondary">
              <span className="truncate">{nextStep.title}</span>
              <RiArrowRightSLine className="size-3.5 shrink-0 text-foreground-icon-tertiary transition-transform group-hover:translate-x-0.5 group-hover:text-accent-600" />
            </span>
          )}
        </button>

        <Popover
          placement={isMobile ? 'top' : 'right bottom'}
          className="w-[320px] rounded-2xl border border-border-button-default bg-background-primary-default p-2 shadow-dropdown"
        >
          <OnboardingPopoverContent
            steps={steps}
            doneCount={doneCount}
            totalCount={totalCount}
            percent={percent}
            allDone={allDone}
            onClose={() => setIsOpen(false)}
            onDismiss={handleDismiss}
            onNavigate={onNavigate}
          />
        </Popover>
      </PopoverTrigger>

      {/* Keep step testids mounted in the DOM while popover is closed for SSR & e2e assertions */}
      {!isOpen && (
        <ul className="sr-only" aria-hidden="true">
          {steps.map((item) => (
            <li
              key={item.key}
              data-testid={`home-checklist-${item.key}`}
              data-done={String(item.done)}
            >
              {item.title}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
