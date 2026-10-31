'use client';

import { Badge } from '@playora/ui/components/badge';
import { Button } from '@playora/ui/components/button';
import { Card, CardContent, CardHeader, CardTitle } from '@playora/ui/components/card';
import { CalendarRange, Repeat, Sparkles, Target, TrendingUp } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Caption } from '@/components/caption';
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
    <Card className="rounded-2xl border">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <Target className="size-4" />
          {t('title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <Caption>{t('hint')}</Caption>
        <div className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(260px,1fr))]">
          {PLAYBOOK_KEYS.map((key) => {
            const pb = PLAYBOOKS[key];
            const { Icon, tone } = LOOK[key];
            const title = t(`items.${key}.title`);
            return (
              <Card
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
                className="flex cursor-pointer flex-col rounded-2xl border transition-all hover:border-primary/50 hover:shadow-sm"
              >
                <CardContent className="flex h-full flex-col gap-3.5 p-4 sm:p-5">
                  <div className="flex items-center gap-3">
                    <IconTile tone={tone}>
                      <Icon className="size-5" />
                    </IconTile>
                    <div className="min-w-0">
                      <span className="block truncate text-base font-semibold">{title}</span>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        <Badge variant="secondary" className="font-normal">
                          {tl(`templates.${pb.templateKey}`)}
                        </Badge>
                        <Badge variant="outline" className="font-normal">
                          {t('daysTag', { days: pb.days })}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <Line label={t('goalLabel')} icon={<Target className="size-3.5" />}>
                    {t(`items.${key}.goal`)}
                  </Line>
                  <Line label={t('mechanismLabel')} icon={<Sparkles className="size-3.5" />}>
                    {t(`items.${key}.mechanism`)}
                  </Line>
                  <Line label={t('metricLabel')} icon={<TrendingUp className="size-3.5" />}>
                    {t(`items.${key}.metric`)}
                  </Line>

                  <Button
                    className="mt-auto w-full rounded-full"
                    onClick={(e) => {
                      e.stopPropagation();
                      onPick(key);
                    }}
                  >
                    {t('choose')}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-muted/40 p-4">
          <span className="text-xs text-muted-foreground">{t('customTitle')}</span>
          <Button variant="link" onClick={onCustom} className="h-auto p-0 text-xs">
            {t('custom')}
          </Button>
        </div>
      </CardContent>
    </Card>
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
