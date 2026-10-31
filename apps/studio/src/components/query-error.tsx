'use client';

import { Button } from '@playora/ui/components/base/buttons/button';
import { AlertCircle } from '@playora/ui/icons';
import { useTranslations } from 'next-intl';
import type React from 'react';

/** Inline failure state for a query: pale error banner with a retry action. */
export function QueryError({ onRetry, title }: { onRetry?: () => void; title?: React.ReactNode }) {
  const t = useTranslations('common');

  return (
    <div
      role="alert"
      className="flex items-center justify-between gap-4 rounded-2xl border border-border-button-default bg-notification-error-background p-4 text-text-error-primary"
    >
      <div className="flex items-center gap-2.5">
        <AlertCircle className="size-4 shrink-0 text-text-error-primary" />
        <p className="m-0 text-body-medium text-text-error-primary">{title ?? t('unknownError')}</p>
      </div>
      {onRetry && (
        <Button size="small" variant="secondary" className="shrink-0" onClick={onRetry}>
          {t('retry')}
        </Button>
      )}
    </div>
  );
}
