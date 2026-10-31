'use client';

import { Button } from '@playora/ui/components/button';
import { Card, CardContent, CardHeader, CardTitle } from '@playora/ui/components/card';
import { Progress } from '@playora/ui/components/progress';
import { CircleCheck, CircleDashed } from 'lucide-react';
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
    <Card className="rounded-2xl border-border/80 shadow-xs" data-testid={testId}>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base font-bold">{title}</CardTitle>
        {extra ?? <Caption>{`${done}/${items.length}`}</Caption>}
      </CardHeader>
      <CardContent className="space-y-4">
        <Progress value={percent} className="h-1.5" />
        <ul className="m-0 flex list-none flex-col divide-y divide-border/60 p-0">
          {items.map((item) => (
            <li
              key={item.key}
              data-testid={testId ? `${testId}-${item.key}` : undefined}
              data-done={item.done}
              className="py-3 first:pt-0 last:pb-0"
            >
              <div className="flex items-center gap-3">
                {item.done ? (
                  <CircleCheck className="size-5 shrink-0 text-teal-600 dark:text-teal-400" />
                ) : (
                  <CircleDashed className="size-5 shrink-0 text-muted-foreground/50" />
                )}
                <div className="min-w-0 flex-1">
                  <p
                    className={`m-0 text-sm ${
                      item.done
                        ? 'line-through text-muted-foreground'
                        : 'font-medium text-foreground'
                    }`}
                  >
                    {item.title}
                  </p>
                  {item.description && !item.done && (
                    <Caption className="block mt-0.5">{item.description}</Caption>
                  )}
                </div>
                {!item.done && (
                  <Button
                    asChild
                    size="sm"
                    variant={item.key === nextKey ? 'default' : 'outline'}
                    className="rounded-full shadow-xs text-xs"
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
