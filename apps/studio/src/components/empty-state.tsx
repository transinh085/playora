'use client';

import { Button } from '@playora/ui/components/button';
import { Card } from '@playora/ui/components/card';
import type { LucideIcon } from '@playora/ui/icons';
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
      <Button asChild className="shadow-xs">
        <Link href={actionHref as Route}>{actionText}</Link>
      </Button>
    ) : onAction ? (
      <Button className="shadow-xs" onClick={onAction}>
        {actionText}
      </Button>
    ) : null);

  return (
    <Card
      className={`rounded-lg py-16 px-4 text-center shadow-xs ${
        bordered
          ? 'border border-neutral-200 dark:border-white/10'
          : 'border-0 shadow-none bg-transparent'
      }`}
    >
      <div className="mx-auto flex max-w-md flex-col items-center justify-center">
        <div className="mb-3 flex size-10 items-center justify-center rounded-lg border border-neutral-200 bg-neutral-50 text-neutral-400 shadow-xs dark:border-white/10 dark:bg-white/5 dark:text-[#737373]">
          <Icon className="size-5 stroke-[1.75]" />
        </div>
        <h3 className="m-0 mb-1 text-base font-semibold text-neutral-900 dark:text-[#FAFAFA]">
          {title}
        </h3>
        <p className="m-0 max-w-sm text-sm leading-relaxed text-neutral-500 dark:text-[#A3A3A3]">
          {description}
        </p>
        {(actionButton || extra) && (
          <div className="mt-4 flex items-center gap-2">
            {actionButton}
            {extra}
          </div>
        )}
      </div>
    </Card>
  );
}
