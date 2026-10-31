'use client';

import { Button } from '@playora/ui/components/base/buttons/button';
import { ProgressBar } from '@playora/ui/components/base/progress/progress';
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
    <div
      className="overflow-hidden rounded-3xl border border-border-button-default bg-background-primary-default shadow-card"
      data-testid={testId}
    >
      <div className="flex flex-row items-center justify-between border-b border-separator-border px-5 py-3.5">
        <h3 className="m-0 text-body-medium text-text-primary">{title}</h3>
        {extra ?? (
          <span className="rounded-md border border-border-button-default bg-background-secondary-default px-2 py-0.5 text-caption-1-medium tabular-nums text-text-secondary">
            {`${done}/${items.length}`}
          </span>
        )}
      </div>
      <div className="space-y-4 p-5">
        <ProgressBar
          value={percent}
          size="md"
          aria-label={typeof title === 'string' ? title : 'Progress'}
        />
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
                      size="small"
                      variant={item.key === nextKey ? 'primary' : 'secondary'}
                      tabIndex={-1}
                    >
                      {item.action}
                    </Button>
                  </Link>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
