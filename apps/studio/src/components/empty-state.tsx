'use client';

import { Button } from '@playora/ui/components/base/buttons/button';
import { Sparkles } from '@playora/ui/icons';
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
          <div className="relative mb-5 flex items-center justify-center">
            {/* Ambient warm aura */}
            <div className="absolute size-28 rounded-full bg-linear-to-tr from-accent-500/15 via-brand-primary/10 to-amber-400/15 blur-xl" />

            {/* Mascot pedestal card */}
            <div className="relative flex size-24 items-center justify-center rounded-3xl border border-border-button-default bg-linear-to-b from-background-primary-default to-background-secondary-default p-3 shadow-sm transition-transform duration-300 hover:scale-105">
              <LogoMark className="size-16 object-contain drop-shadow-xs" alt="Ora mascot" />
              <span className="absolute -bottom-1.5 -right-1.5 flex size-6 items-center justify-center rounded-full border border-background-primary-default bg-accent-600 text-white shadow-xs">
                {Icon ? <Icon className="size-3.5" /> : <Sparkles className="size-3.5" />}
              </span>
            </div>
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
