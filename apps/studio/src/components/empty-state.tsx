'use client';

import { Button } from '@playora/ui/components/base/buttons/button';
import type { LucideIcon } from '@playora/ui/icons';
import { cx } from '@playora/ui/utils/cx';
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
 * Consistent, delightful empty state following the Playora / BoardUI aesthetic.
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
      <Link href={actionHref as Route}>
        <Button tabIndex={-1}>{actionText}</Button>
      </Link>
    ) : onAction ? (
      <Button onClick={onAction}>{actionText}</Button>
    ) : null);

  return (
    <div
      className={cx(
        'rounded-3xl px-4 py-16 text-center',
        bordered
          ? 'border border-border-button-default bg-background-primary-default shadow-card'
          : 'border-0 bg-transparent shadow-none',
      )}
    >
      <div className="mx-auto flex max-w-md flex-col items-center justify-center">
        <div className="mb-3 flex size-10 items-center justify-center rounded-xl border border-border-button-default bg-background-secondary-default text-foreground-icon-secondary shadow-xs">
          <Icon className="size-5 stroke-[1.75]" />
        </div>
        <h3 className="m-0 mb-1 text-headline-semibold text-text-primary">{title}</h3>
        <p className="m-0 max-w-sm text-body-regular text-text-secondary">{description}</p>
        {(actionButton || extra) && (
          <div className="mt-4 flex items-center gap-2">
            {actionButton}
            {extra}
          </div>
        )}
      </div>
    </div>
  );
}
