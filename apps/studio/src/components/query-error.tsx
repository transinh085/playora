'use client';

import { Alert, AlertTitle } from '@playora/ui/components/alert';
import { Button } from '@playora/ui/components/button';
import { AlertCircle } from '@playora/ui/icons';
import { useTranslations } from 'next-intl';
import type React from 'react';

/** Inline failure state for a query: pale error Alert with a retry action. */
export function QueryError({ onRetry, title }: { onRetry?: () => void; title?: React.ReactNode }) {
  const t = useTranslations('common');

  return (
    <Alert
      variant="destructive"
      className="flex items-center justify-between gap-4 rounded-lg border border-destructive/20 bg-destructive/5 p-3.5"
    >
      <div className="flex items-center gap-2.5">
        <AlertCircle className="size-4 shrink-0 text-destructive" />
        <AlertTitle className="m-0 text-xs font-medium text-destructive">
          {title ?? t('unknownError')}
        </AlertTitle>
      </div>
      {onRetry && (
        <Button
          size="sm"
          variant="outline"
          className="h-7 shrink-0 rounded-md px-2.5 text-xs shadow-xs"
          onClick={onRetry}
        >
          {t('retry')}
        </Button>
      )}
    </Alert>
  );
}
