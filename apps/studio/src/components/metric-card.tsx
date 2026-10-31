'use client';

import { Card } from '@playora/ui/components/card';
import { Skeleton } from '@playora/ui/components/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@playora/ui/components/tooltip';
import { CircleHelp } from 'lucide-react';
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
      <Card className="rounded-2xl border-border/80 p-5 shadow-xs">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-2 flex-1">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-16" />
          </div>
          <Skeleton className="size-11 rounded-xl" />
        </div>
      </Card>
    );
  }

  return (
    <Card
      data-testid={testId}
      data-highlighted={highlighted ? 'true' : undefined}
      className={`rounded-2xl p-5 shadow-xs transition-shadow hover:shadow-md ${
        highlighted ? 'border-primary ring-1 ring-primary/20' : 'border-border/80'
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-xs font-medium text-muted-foreground">{label}</span>
            {tooltip && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="cursor-help text-muted-foreground hover:text-foreground">
                      <CircleHelp className="size-3" />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>{tooltip}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
          <p className="mt-1 text-2xl font-bold tracking-tight text-foreground">{value}</p>
          {subtext && <p className="mt-0.5 truncate text-xs text-muted-foreground">{subtext}</p>}
        </div>
        <IconTile tone={tone}>{icon}</IconTile>
      </div>
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
