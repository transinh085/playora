'use client';

import { Button, Card, Chip } from '@playora/ui/components';
import { Clock, Sparkles } from '@playora/ui/icons';
import { cx } from '@playora/ui/utils/cx';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

export interface AttentionItem {
  key: string;
  icon: typeof Clock;
  tone: 'error' | 'warning' | 'info';
  text: string;
  href: string;
  action: string;
}

export function AttentionHub({ items }: { items: readonly AttentionItem[] }) {
  const t = useTranslations('campaigns.home');

  return (
    <Card className="flex flex-col overflow-hidden p-0" data-testid="home-attention">
      <Card.Header className="flex flex-row items-center justify-between border-b border-separator-border px-4 py-3.5">
        <div className="flex items-center gap-2">
          <Card.Title className="text-body-medium text-text-primary">
            {t('attention.title')}
          </Card.Title>
        </div>
        <Chip
          variant="soft"
          size="sm"
          color={items.length > 0 ? 'warning' : 'success'}
          className="tabular-nums"
        >
          {items.length}
        </Chip>
      </Card.Header>

      <Card.Content className="flex flex-1 flex-col justify-center p-4">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-6 text-center">
            <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
              <Sparkles className="size-4.5" />
            </div>
            <p className="text-caption-1-medium text-text-secondary">{t('metrics.allGood')}</p>
          </div>
        ) : (
          <ul className="m-0 flex list-none flex-col divide-y divide-separator-border p-0">
            {items.map(({ key, icon: Icon, tone, text, href, action }) => {
              const iconToneClass =
                tone === 'error'
                  ? 'text-rose-500 bg-rose-500/10'
                  : tone === 'warning'
                    ? 'text-amber-500 bg-amber-500/10'
                    : 'text-blue-500 bg-blue-500/10';

              return (
                <li
                  key={key}
                  className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <div
                      className={cx(
                        'flex size-7 shrink-0 items-center justify-center rounded-lg',
                        iconToneClass,
                      )}
                    >
                      <Icon className="size-3.5" />
                    </div>
                    <span className="min-w-0 truncate text-caption-1-regular text-text-primary">
                      {text}
                    </span>
                  </div>
                  <Link href={href as never} className="shrink-0">
                    <Button variant="secondary" size="sm" excludeFromTabOrder>
                      {action}
                    </Button>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Card.Content>
    </Card>
  );
}
