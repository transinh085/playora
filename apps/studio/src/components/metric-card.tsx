'use client';

import { Card } from '@playora/ui/components/card';
import { Skeleton } from '@playora/ui/components/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@playora/ui/components/tooltip';
import { CircleHelp } from '@playora/ui/icons';
import type React from 'react';
import { IconTile, type Tone } from './icon-tile';

export interface MetricCardItem {
  label: string;
  value: React.ReactNode;
  subtext?: React.ReactNode;
  icon: React.ReactNode;
  tone?: Tone;
  tooltip?: React.ReactNode;
  highlighted?: boolean;
  testId?: string;
}

/** One headline number with its label and a tinted icon tile. Luma style rounded cards with soft elevation. */
export function MetricCard({
  label,
  value,
  subtext,
  icon,
  tone = 'primary',
  tooltip,
  highlighted,
  testId,
  loading,
}: MetricCardItem & { loading?: boolean }) {
  if (loading) {
    return (
      <Card className="rounded-lg border-neutral-200 bg-white p-3 shadow-sm dark:border-white/10 dark:bg-[#0A0A0A]">
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-16" />
          </div>
          <Skeleton className="size-9 rounded-md" />
        </div>
      </Card>
    );
  }

  return (
    <Card
      data-testid={testId}
      data-highlighted={highlighted ? 'true' : undefined}
      className={`flex flex-col justify-between gap-3 rounded-lg bg-white p-3 shadow-sm transition-colors dark:bg-[#0A0A0A] ${
        highlighted
          ? 'border-emerald-500/60 ring-1 ring-emerald-500/20'
          : 'border-neutral-200 dark:border-white/10'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="truncate text-sm font-medium text-neutral-600 dark:text-[#A3A3A3]">
            {label}
          </span>
          {tooltip && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="cursor-help text-neutral-400 hover:text-neutral-700 dark:hover:text-[#FAFAFA]">
                    <CircleHelp className="size-3.5" />
                  </span>
                </TooltipTrigger>
                <TooltipContent>{tooltip}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        <IconTile tone={tone}>{icon}</IconTile>
      </div>
      <div className="flex items-center gap-3">
        <p
          className={`text-[28px] leading-9 font-semibold tracking-tight tabular-nums ${
            highlighted
              ? 'text-emerald-600 dark:text-emerald-400'
              : 'text-neutral-900 dark:text-[#FAFAFA]'
          }`}
        >
          {value}
        </p>
      </div>
      {subtext && (
        <p className="line-clamp-2 text-[13px] leading-5 font-normal text-neutral-500 dark:text-[#A3A3A3]">
          {subtext}
        </p>
      )}
    </Card>
  );
}

/** Responsive row of MetricCards: 1 column on phones, 2 on tablets, 4 on desktop. */
export function MetricGrid({ items, loading }: { items: MetricCardItem[]; loading?: boolean }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <MetricCard key={item.label} {...item} loading={loading} />
      ))}
    </div>
  );
}
