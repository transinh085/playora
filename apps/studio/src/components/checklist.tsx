'use client';

import { Button } from '@playora/ui/components/button';
import { Card, CardContent, CardHeader, CardTitle } from '@playora/ui/components/card';
import { Progress } from '@playora/ui/components/progress';
import { CircleCheck, CircleDashed } from '@playora/ui/icons';
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
    <Card
      className="overflow-hidden rounded-lg border border-neutral-200 bg-white p-0 shadow-xs dark:border-white/10 dark:bg-[#0A0A0A]"
      data-testid={testId}
    >
      <CardHeader className="flex flex-row items-center justify-between border-b border-neutral-200 px-4 py-3 dark:border-white/10">
        <CardTitle className="text-sm font-semibold text-neutral-900 dark:text-[#FAFAFA]">
          {title}
        </CardTitle>
        {extra ?? (
          <span className="rounded-md border border-neutral-200 bg-neutral-50 px-2 py-0.5 text-xs font-medium tabular-nums text-neutral-600 dark:border-white/10 dark:bg-white/5 dark:text-[#A3A3A3]">
            {`${done}/${items.length}`}
          </span>
        )}
      </CardHeader>
      <CardContent className="space-y-4 p-4">
        <Progress value={percent} className="h-1.5" />
        <ul className="m-0 flex list-none flex-col divide-y divide-neutral-200 p-0 dark:divide-white/10">
          {items.map((item) => (
            <li
              key={item.key}
              data-testid={testId ? `${testId}-${item.key}` : undefined}
              data-done={item.done}
              className="py-3 first:pt-0 last:pb-0"
            >
              <div className="flex items-center gap-3">
                {item.done ? (
                  <CircleCheck className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <CircleDashed className="size-4 shrink-0 text-neutral-400 dark:text-neutral-600" />
                )}
                <div className="min-w-0 flex-1">
                  <p
                    className={`m-0 text-xs ${
                      item.done
                        ? 'line-through text-neutral-400 dark:text-neutral-500'
                        : 'font-medium text-neutral-900 dark:text-[#FAFAFA]'
                    }`}
                  >
                    {item.title}
                  </p>
                  {item.description && !item.done && (
                    <Caption className="mt-0.5 block text-[11px]">{item.description}</Caption>
                  )}
                </div>
                {!item.done && (
                  <Button
                    asChild
                    size="sm"
                    variant={item.key === nextKey ? 'default' : 'outline'}
                    className="h-7 rounded-md text-xs shadow-xs"
                    tabIndex={-1}
                  >
                    <Link href={item.href as Route}>{item.action}</Link>
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
