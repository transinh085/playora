'use client';

import { Button, Card } from '@playora/ui/components';
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
 * Consistent, delightful empty state built on HeroUI v3 Card & Button.
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
        <Button excludeFromTabOrder>{actionText}</Button>
      </Link>
    ) : onAction ? (
      <Button onPress={onAction}>{actionText}</Button>
    ) : null);

  return (
    <Card
      variant={bordered ? 'default' : 'transparent'}
      className={cx('px-4 py-16 text-center', !bordered && 'border-0 shadow-none')}
    >
      <Card.Content className="mx-auto flex max-w-md flex-col items-center justify-center">
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
      </Card.Content>
    </Card>
  );
}
