'use client';

import { Card, Skeleton, Tooltip } from '@playora/ui/components';
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

/** One headline number with its label and a tinted icon tile, rendered with HeroUI v3 Card & Tooltip. */
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
      <Card className="p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-16" />
          </div>
          <Skeleton className="size-9 rounded-xl" />
        </div>
      </Card>
    );
  }

  return (
    <Card
      data-testid={testId}
      data-highlighted={highlighted ? 'true' : undefined}
      className={cx(
        'flex flex-col justify-between gap-3 p-5 transition-colors',
        highlighted && 'border-accent-500/60 ring-1 ring-accent-500/20',
      )}
    >
      <Card.Header className="flex flex-row items-center justify-between gap-2 p-0">
        <div className="flex min-w-0 items-center gap-1.5">
          <Card.Description className="m-0 truncate text-body-medium text-text-secondary">
            {label}
          </Card.Description>
          {tooltip && (
            <Tooltip delay={150}>
              <Tooltip.Trigger aria-label={typeof tooltip === 'string' ? tooltip : label}>
                <span className="cursor-help text-foreground-icon-tertiary hover:text-text-primary">
                  <CircleHelp className="size-3.5" />
                </span>
              </Tooltip.Trigger>
              <Tooltip.Content>{tooltip}</Tooltip.Content>
            </Tooltip>
          )}
        </div>
        <IconTile tone={tone}>{icon}</IconTile>
      </Card.Header>
      <Card.Content className="flex flex-col gap-1 p-0">
        <div className="flex items-center gap-3">
          <Card.Title
            className={cx(
              'm-0 text-title-1-semibold tabular-nums',
              highlighted ? 'text-accent-600' : 'text-text-primary',
            )}
          >
            {value}
          </Card.Title>
        </div>
        {subtext && (
          <p className="m-0 line-clamp-2 text-body-2-regular text-text-secondary">{subtext}</p>
        )}
      </Card.Content>
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
