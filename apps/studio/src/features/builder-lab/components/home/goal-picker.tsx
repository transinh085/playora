'use client';

import { Chip } from '@playora/ui/components/base/badges/chip';
import { Button } from '@playora/ui/components/base/buttons/button';
import { CalendarRange, Repeat, Sparkles, Target, TrendingUp } from '@playora/ui/icons';
import { useTranslations } from 'next-intl';
import { IconTile, type Tone } from '@/components/icon-tile';
import { PLAYBOOK_KEYS, PLAYBOOKS, type PlaybookKey } from '../../lib/playbooks';

const LOOK: Record<PlaybookKey, { Icon: typeof Sparkles; tone: Tone }> = {
  tet_traffic: { Icon: Sparkles, tone: 'error' },
  second_visit: { Icon: Repeat, tone: 'success' },
  slow_days: { Icon: CalendarRange, tone: 'info' },
};

/**
 * "Bạn muốn gì?" (docs/product/specs/playbooks.md §2.1): the create flow starts from the shop's
 * goal. Each card shows the goal, how the playbook gets there and the number that tells.
 */
export function GoalPicker({
  onPick,
  onCustom,
}: {
  onPick: (key: PlaybookKey) => void;
  onCustom: () => void;
}) {
  const t = useTranslations('builderLab.playbooks');
  const tl = useTranslations('builderLab.home');

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight text-neutral-900 dark:text-[#FAFAFA]">
          <Target className="size-5 text-teal-600 dark:text-teal-400" />
          {t('title')}
        </h2>
        <p className="text-xs text-neutral-500 dark:text-[#A3A3A3]">{t('hint')}</p>
      </div>

      <div className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(280px,1fr))]">
        {PLAYBOOK_KEYS.map((key) => {
          const pb = PLAYBOOKS[key];
          const { Icon, tone } = LOOK[key];
          const title = t(`items.${key}.title`);
          return (
            // biome-ignore lint/a11y/useSemanticElements: interactive card
            <div
              key={key}
              role="button"
              tabIndex={0}
              aria-label={title}
              data-testid={`playbook-${key}`}
              onClick={() => onPick(key)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onPick(key);
                }
              }}
              className="group flex cursor-pointer flex-col justify-between gap-4 rounded-lg border border-neutral-200 bg-white p-5 shadow-xs transition-all hover:border-neutral-400 hover:shadow-sm dark:border-white/10 dark:bg-[#0A0A0A] dark:hover:border-white/25"
            >
              <div className="space-y-3.5">
                <div className="flex items-center gap-3">
                  <IconTile tone={tone}>
                    <Icon className="size-5" />
                  </IconTile>
                  <div className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-neutral-900 dark:text-[#FAFAFA]">
                      {title}
                    </span>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      <Chip variant="caption" color="neutral">
                        {tl(`templates.${pb.templateKey}`)}
                      </Chip>
                      <Chip variant="caption" color="soft">
                        {t('daysTag', { days: pb.days })}
                      </Chip>
                    </div>
                  </div>
                </div>

                <div className="space-y-2.5 pt-1">
                  <Line label={t('goalLabel')} icon={<Target className="size-3.5" />}>
                    {t(`items.${key}.goal`)}
                  </Line>
                  <Line label={t('mechanismLabel')} icon={<Sparkles className="size-3.5" />}>
                    {t(`items.${key}.mechanism`)}
                  </Line>
                  <Line label={t('metricLabel')} icon={<TrendingUp className="size-3.5" />}>
                    {t(`items.${key}.metric`)}
                  </Line>
                </div>
              </div>

              <Button
                variant="secondary"
                size="small"
                className="mt-2 w-full rounded-md h-8 text-xs font-medium shadow-xs group-hover:bg-neutral-900 group-hover:text-white dark:group-hover:bg-[#FAFAFA] dark:group-hover:text-neutral-900 transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  onPick(key);
                }}
              >
                {t('choose')}
              </Button>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-neutral-200 bg-neutral-50/70 p-3.5 dark:border-white/10 dark:bg-white/5">
        <span className="text-xs text-neutral-600 dark:text-[#A3A3A3]">{t('customTitle')}</span>
        <Button
          variant="ghost"
          size="small"
          onClick={onCustom}
          className="h-auto p-0 text-xs font-medium text-teal-600 hover:underline dark:text-teal-400"
        >
          {t('custom')} →
        </Button>
      </div>
    </div>
  );
}

function Line({
  label,
  icon,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-0.5 text-xs">
      <div className="flex items-center gap-1 text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <p className="font-medium text-foreground">{children}</p>
    </div>
  );
}
