'use client';

import { Button } from '@playora/ui/components/button';
import { Card } from '@playora/ui/components/card';
import type { LucideIcon } from 'lucide-react';
import type { Route } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';

export interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionText?: string;
  actionHref?: Route | string;
  onAction?: () => void;
  extra?: ReactNode;
  bordered?: boolean;
}

/**
 * Consistent, delightful empty state following the Playora / Luma aesthetic.
 * Clean neutral surface, muted icon tile, clear typography, and a prominent call-to-action.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  actionText,
  actionHref,
  onAction,
  extra,
  bordered = true,
}: EmptyStateProps) {
  const actionButton =
    actionText &&
    (actionHref ? (
      <Button asChild className="rounded-full shadow-xs">
        <Link href={actionHref as Route}>{actionText}</Link>
      </Button>
    ) : onAction ? (
      <Button className="rounded-full shadow-xs" onClick={onAction}>
        {actionText}
      </Button>
    ) : null);

  return (
    <Card
      className={`rounded-2xl p-12 text-center shadow-xs ${
        bordered ? 'border-border/80' : 'border-0 shadow-none'
      }`}
    >
      <div className="mx-auto flex max-w-md flex-col items-center justify-center gap-4">
        <div className="flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Icon className="size-7 stroke-[1.75]" />
        </div>
        <div className="space-y-1">
          <h3 className="m-0 text-base font-semibold text-foreground">{title}</h3>
          <p className="m-0 text-xs text-muted-foreground leading-relaxed">{description}</p>
        </div>
        {(actionButton || extra) && (
          <div className="mt-2 flex items-center gap-2">
            {actionButton}
            {extra}
          </div>
        )}
      </div>
    </Card>
  );
}
