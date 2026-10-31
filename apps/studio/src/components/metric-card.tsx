'use client';

import { Skeleton } from '@playora/ui/components/base/skeleton/skeleton';
import { CircleHelp } from '@playora/ui/icons';
import { cx } from '@playora/ui/utils/cx';
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

/** One headline number with its label and a tinted icon tile. BoardUI rounded cards with soft elevation. */
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
      <div className="rounded-3xl border border-border-button-default bg-background-primary-default p-5 shadow-card">
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-16" />
          </div>
          <Skeleton className="size-9 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div
      data-testid={testId}
      data-highlighted={highlighted ? 'true' : undefined}
      className={cx(
        'flex flex-col justify-between gap-3 rounded-3xl border bg-background-primary-default p-5 shadow-card transition-colors',
        highlighted
          ? 'border-accent-500/60 ring-1 ring-accent-500/20'
          : 'border-border-button-default',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="truncate text-body-medium text-text-secondary">{label}</span>
          {tooltip && (
            <span
              className="cursor-help text-foreground-icon-tertiary hover:text-text-primary"
              title={typeof tooltip === 'string' ? tooltip : undefined}
            >
              <CircleHelp className="size-3.5" />
            </span>
          )}
        </div>
        <IconTile tone={tone}>{icon}</IconTile>
      </div>
      <div className="flex items-center gap-3">
        <p
          className={cx(
            'text-title-1-semibold tabular-nums',
            highlighted ? 'text-accent-600' : 'text-text-primary',
          )}
        >
          {value}
        </p>
      </div>
      {subtext && <p className="line-clamp-2 text-body-2-regular text-text-secondary">{subtext}</p>}
    </div>
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
