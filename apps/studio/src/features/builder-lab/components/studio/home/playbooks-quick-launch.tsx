'use client';

import { ArrowRight, Calendar, Gift, Repeat, Sparkles } from '@playora/ui/icons';
import { cx } from '@playora/ui/utils/cx';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { campaignRoutes } from '../../../lib/routes';

interface PlaybookQuickItem {
  key: 'slow_days' | 'second_visit' | 'grand_opening' | 'custom';
  hrefParam: string;
  icon: typeof Calendar;
  gradient: string;
  iconColor: string;
}

const PLAYBOOK_ITEMS: PlaybookQuickItem[] = [
  {
    key: 'slow_days',
    hrefParam: '?playbook=slow_days',
    icon: Calendar,
    gradient: 'from-amber-500/10 to-orange-500/10 dark:from-amber-500/20 dark:to-orange-500/20',
    iconColor: 'text-amber-600 dark:text-amber-400',
  },
  {
    key: 'second_visit',
    hrefParam: '?playbook=second_visit',
    icon: Repeat,
    gradient: 'from-blue-500/10 to-indigo-500/10 dark:from-blue-500/20 dark:to-indigo-500/20',
    iconColor: 'text-blue-600 dark:text-blue-400',
  },
  {
    key: 'grand_opening',
    hrefParam: '?playbook=tet_traffic',
    icon: Sparkles,
    gradient: 'from-rose-500/10 to-pink-500/10 dark:from-rose-500/20 dark:to-pink-500/20',
    iconColor: 'text-rose-600 dark:text-rose-400',
  },
  {
    key: 'custom',
    hrefParam: '?start=templates',
    icon: Gift,
    gradient: 'from-emerald-500/10 to-teal-500/10 dark:from-emerald-500/20 dark:to-teal-500/20',
    iconColor: 'text-teal-600 dark:text-teal-400',
  },
];

export function PlaybooksQuickLaunch({ orgId }: { orgId: string }) {
  const t = useTranslations('campaigns.home.playbooks');
  const routes = campaignRoutes(orgId);

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between">
        <h3 className="text-body-medium text-text-secondary">{t('title')}</h3>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {PLAYBOOK_ITEMS.map((item) => {
          const Icon = item.icon;
          const href = `${routes.create}${item.hrefParam}`;
          return (
            <Link
              key={item.key}
              href={href as never}
              className={cx(
                'group flex items-start gap-3 rounded-2xl border border-border-button-default bg-background-primary-default p-3.5 shadow-card transition-all hover:border-border-focus-ring/60 hover:shadow-dropdown',
              )}
            >
              <div
                className={cx(
                  'flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br',
                  item.gradient,
                  item.iconColor,
                )}
              >
                <Icon className="size-4.5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1">
                  <h4 className="truncate text-caption-1-semibold text-text-primary group-hover:text-accent-600 dark:group-hover:text-accent-400 transition-colors">
                    {t(
                      item.key === 'slow_days'
                        ? 'slowDays'
                        : item.key === 'second_visit'
                          ? 'secondVisit'
                          : item.key === 'grand_opening'
                            ? 'grandOpening'
                            : 'custom',
                    )}
                  </h4>
                  <ArrowRight className="size-3.5 shrink-0 text-text-tertiary transition-transform group-hover:translate-x-0.5 group-hover:text-text-primary" />
                </div>
                <p className="mt-0.5 line-clamp-1 text-[11px] text-text-tertiary">
                  {t(
                    item.key === 'slow_days'
                      ? 'slowDaysDesc'
                      : item.key === 'second_visit'
                        ? 'secondVisitDesc'
                        : item.key === 'grand_opening'
                          ? 'grandOpeningDesc'
                          : 'customDesc',
                  )}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
