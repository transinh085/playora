'use client';

import { Chip } from '@playora/ui/components/base/badges/chip';
import { cx } from '@playora/ui/utils/cx';
import {
  RiArrowDownSLine,
  RiArrowRightLine,
  RiCheckboxCircleFill,
  RiCloseLine,
  RiPaletteLine,
  RiQrCodeLine,
  RiRocket2Line,
  RiSparklingFill,
  RiSparklingLine,
  RiTeamLine,
  RiTimeLine,
} from '@remixicon/react';
import type { Route } from 'next';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { type ComponentType, useState } from 'react';
import {
  type OnboardingStep,
  useOnboardingDismissed,
  useOnboardingSteps,
} from './sidebar-onboarding';

const STEP_ICONS: Record<
  OnboardingStep['key'],
  ComponentType<{ className?: string; 'aria-hidden'?: boolean | 'true' | 'false' }>
> = {
  brand: RiPaletteLine,
  campaign: RiSparklingLine,
  publish: RiRocket2Line,
  share: RiQrCodeLine,
  team: RiTeamLine,
};

export function OnboardingLaunchpad({ orgId }: { orgId: string }) {
  const t = useTranslations('campaigns.home');
  const { steps, doneCount, totalCount, percent, allDone } = useOnboardingSteps(orgId);
  const { isDismissed, dismiss } = useOnboardingDismissed(orgId);
  const [isCollapsed, setIsCollapsed] = useState(false);

  if (isDismissed) {
    return null;
  }

  const nextStep = steps.find((s) => !s.done);

  return (
    <section
      data-testid="home-onboarding-launchpad"
      aria-label={t('launchpad.title')}
      className="overflow-hidden rounded-3xl border border-border-button-default bg-background-primary-default shadow-card"
    >
      {/* Top Header & Progress Bar */}
      <div className="flex flex-col gap-3 border-b border-separator-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-start gap-3 sm:items-center">
          <div
            className={cx(
              'flex size-10 shrink-0 items-center justify-center rounded-2xl',
              allDone
                ? 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20'
                : 'bg-accent-500/10 text-accent-600 dark:bg-accent-500/20',
            )}
          >
            <RiSparklingFill className="size-5" aria-hidden />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="m-0 text-body-semibold text-text-primary">
                {allDone ? t('setupComplete') : t('launchpad.title')}
              </h2>
              <Chip variant="caption" color={allDone ? 'lime' : 'cyan'}>
                {`${doneCount}/${totalCount}`}
              </Chip>
            </div>
            <p className="mt-0.5 mb-0 text-caption-1-regular text-text-secondary">
              {t('launchpad.subtitle', { done: doneCount, total: totalCount })}
            </p>
          </div>
        </div>

        {/* Right Controls: Progress Track + Collapse / Dismiss */}
        <div className="flex shrink-0 items-center gap-3">
          <div className="hidden w-32 overflow-hidden rounded-full bg-background-tertiary-default sm:block h-2">
            <div
              className={cx(
                'h-full rounded-full transition-all duration-300',
                allDone ? 'bg-emerald-500' : 'bg-linear-to-r from-accent-500 to-accent-600',
              )}
              style={{ width: `${percent}%` }}
            />
          </div>

          <button
            type="button"
            onClick={() => setIsCollapsed((prev) => !prev)}
            aria-expanded={!isCollapsed}
            aria-label={isCollapsed ? 'Expand' : 'Collapse'}
            className="flex size-8 cursor-pointer items-center justify-center rounded-xl border border-border-button-default bg-background-secondary-default text-foreground-icon-secondary transition-colors hover:bg-background-secondary-hover hover:text-foreground-icon-primary"
          >
            <RiArrowDownSLine
              className={cx(
                'size-4 transition-transform duration-200',
                !isCollapsed && 'rotate-180',
              )}
            />
          </button>

          <button
            type="button"
            onClick={dismiss}
            aria-label={t('dismiss')}
            title={t('dismiss')}
            className="flex size-8 cursor-pointer items-center justify-center rounded-xl border border-border-button-default bg-background-secondary-default text-foreground-icon-secondary transition-colors hover:bg-background-secondary-hover hover:text-foreground-icon-primary"
          >
            <RiCloseLine className="size-4" />
          </button>
        </div>
      </div>

      {/* 5-Step Interactive Grid */}
      {!isCollapsed && (
        <div className="grid grid-cols-1 divide-y divide-separator-border lg:grid-cols-5 lg:divide-x lg:divide-y-0">
          {steps.map((step, index) => {
            const Icon = STEP_ICONS[step.key];
            const isNext = nextStep?.key === step.key;

            return (
              <div
                key={step.key}
                data-testid={`launchpad-step-${step.key}`}
                data-done={String(step.done)}
                className={cx(
                  'flex flex-col justify-between gap-3 p-4 transition-colors',
                  isNext && 'bg-background-secondary-default/65',
                )}
              >
                <div className="flex flex-col gap-2">
                  {/* Step Number / Status Row */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {step.done ? (
                        <RiCheckboxCircleFill className="size-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <span
                          className={cx(
                            'flex size-5 shrink-0 items-center justify-center rounded-full text-caption-2-semibold tabular-nums',
                            isNext
                              ? 'bg-accent-600 text-white'
                              : 'border border-border-button-default bg-background-secondary-default text-text-tertiary',
                          )}
                        >
                          {index + 1}
                        </span>
                      )}
                      <Icon
                        className={cx(
                          'size-4 shrink-0',
                          step.done
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : isNext
                              ? 'text-accent-600'
                              : 'text-foreground-icon-tertiary',
                        )}
                        aria-hidden
                      />
                    </div>

                    {step.done ? (
                      <span className="text-caption-2-medium text-emerald-600 dark:text-emerald-400">
                        {t('launchpad.completedBadge')}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-caption-2-regular text-text-tertiary">
                        <RiTimeLine className="size-3" />
                        <span>{step.timeEstimate}</span>
                      </span>
                    )}
                  </div>

                  {/* Title & Description */}
                  <div>
                    <h3
                      className={cx(
                        'm-0 text-body-2-semibold',
                        step.done ? 'line-through text-text-tertiary' : 'text-text-primary',
                      )}
                    >
                      {step.title}
                    </h3>
                    <p className="mt-1 mb-0 text-caption-1-regular text-text-secondary">
                      {step.desc}
                    </p>
                  </div>
                </div>

                {/* Action Link */}
                {!step.done && (
                  <div className="pt-1">
                    <Link
                      href={step.href as Route}
                      className={cx(
                        'inline-flex w-full items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-caption-1-semibold transition-all',
                        isNext
                          ? 'bg-linear-to-b from-accent-500 to-accent-600 text-white shadow-xs hover:opacity-95'
                          : 'border border-border-button-default bg-background-primary-default text-text-primary hover:bg-background-secondary-hover',
                      )}
                    >
                      <span>{step.actionLabel}</span>
                      <RiArrowRightLine className="size-3.5 shrink-0" />
                    </Link>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
