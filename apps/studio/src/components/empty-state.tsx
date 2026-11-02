'use client';

import { Button } from '@playora/ui/components/base/buttons/button';
import { cx } from '@playora/ui/utils/cx';
import type { Route } from 'next';
import Link from 'next/link';
import type { ComponentType, ReactNode } from 'react';
import { LogoMark } from '@/components/logo';

export interface EmptyStateProps {
  icon?: ComponentType<{ className?: string }>;
  title: string;
  description: string;
  actionText?: string;
  actionHref?: Route | string;
  onAction?: () => void;
  extra?: ReactNode;
  bordered?: boolean;
  mascot?: boolean;
}

/**
 * Consistent, delightful empty state following the Playora / BoardUI aesthetic with Ora mascot styling.
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
  mascot = true,
}: EmptyStateProps) {
  const actionButton =
    actionText &&
    (actionHref ? (
      <Link href={actionHref as Route}>
        <Button size="medium" tabIndex={-1}>
          {actionText}
        </Button>
      </Link>
    ) : onAction ? (
      <Button size="medium" onClick={onAction}>
        {actionText}
      </Button>
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
        {mascot ? (
          <div className="mb-4 flex items-center justify-center">
            <LogoMark
              className="size-24 shrink-0 object-contain drop-shadow-xs transition-transform duration-300 hover:scale-105 sm:size-28"
              alt="Playora"
            />
          </div>
        ) : (
          Icon && (
            <div className="mb-3 flex size-10 items-center justify-center rounded-xl border border-border-button-default bg-background-secondary-default text-foreground-icon-secondary shadow-xs">
              <Icon className="size-5 stroke-[1.75]" />
            </div>
          )
        )}
        <h3 className="m-0 mb-1.5 text-title-2-semibold text-text-primary">{title}</h3>
        <p className="m-0 max-w-sm text-body-medium text-text-secondary">{description}</p>
        {(actionButton || extra) && (
          <div className="mt-5 flex items-center justify-center gap-3">
            {actionButton}
            {extra}
          </div>
        )}
      </div>
    </div>
  );
}
