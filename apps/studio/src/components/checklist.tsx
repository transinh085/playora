'use client';

import { Button, Card, Chip, ProgressBar } from '@playora/ui/components';
import { CircleCheck, CircleDashed } from '@playora/ui/icons';
import { cx } from '@playora/ui/utils/cx';
import type { Route } from 'next';
import Link from 'next/link';
import type React from 'react';
import { Caption } from './caption';

export interface ChecklistItem {
  key: string;
  done: boolean;
  title: string;
  description?: string;
  href: string;
  action: string;
}

/**
 * Ordered "what to do next" list with progress: every open item links to the exact
 * place that finishes it, so pages hand the user to the next step instead of leaving them on a list.
 */
export function Checklist({
  title,
  extra,
  items,
  testId,
}: {
  title: React.ReactNode;
  extra?: React.ReactNode;
  items: readonly ChecklistItem[];
  testId?: string;
}) {
  const done = items.filter((item) => item.done).length;
  const percent = Math.round((done / items.length) * 100);
  const nextKey = items.find((item) => !item.done)?.key;

  return (
    <Card className="overflow-hidden p-0" data-testid={testId}>
      <Card.Header className="flex flex-row items-center justify-between border-b border-separator-border px-5 py-3.5">
        <Card.Title className="m-0 text-body-medium text-text-primary">{title}</Card.Title>
        {extra ?? (
          <Chip variant="soft" size="sm" color="default" className="tabular-nums">
            {`${done}/${items.length}`}
          </Chip>
        )}
      </Card.Header>
      <Card.Content className="space-y-4 p-5">
        <ProgressBar
          value={percent}
          size="md"
          color="accent"
          aria-label={typeof title === 'string' ? title : 'Progress'}
        >
          <ProgressBar.Track>
            <ProgressBar.Fill />
          </ProgressBar.Track>
        </ProgressBar>
        <ul className="m-0 flex list-none flex-col divide-y divide-separator-border p-0">
          {items.map((item) => (
            <li
              key={item.key}
              data-testid={testId ? `${testId}-${item.key}` : undefined}
              data-done={item.done}
              className="py-3 first:pt-0 last:pb-0"
            >
              <div className="flex items-center gap-3">
                {item.done ? (
                  <CircleCheck className="size-4 shrink-0 text-accent-600" />
                ) : (
                  <CircleDashed className="size-4 shrink-0 text-foreground-icon-tertiary" />
                )}
                <div className="min-w-0 flex-1">
                  <p
                    className={cx(
                      'm-0 text-body-2-medium',
                      item.done ? 'line-through text-text-tertiary' : 'text-text-primary',
                    )}
                  >
                    {item.title}
                  </p>
                  {item.description && !item.done && (
                    <Caption className="mt-0.5 block text-caption-1-medium">
                      {item.description}
                    </Caption>
                  )}
                </div>
                {!item.done && (
                  <Link href={item.href as Route}>
                    <Button
                      size="sm"
                      variant={item.key === nextKey ? 'primary' : 'secondary'}
                      excludeFromTabOrder
                    >
                      {item.action}
                    </Button>
                  </Link>
                )}
              </div>
            </li>
          ))}
        </ul>
      </Card.Content>
    </Card>
  );
}
