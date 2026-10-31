'use client';

import { Alert, AlertTitle } from '@playora/ui/components/alert';
import { Button } from '@playora/ui/components/button';
import { AlertCircle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type React from 'react';

/** Inline failure state for a query: pale error Alert with a retry action. */
export function QueryError({ onRetry, title }: { onRetry?: () => void; title?: React.ReactNode }) {
  const t = useTranslations('common');

  return (
    <Alert
      variant="destructive"
      className="rounded-2xl border-destructive/20 bg-destructive/5 flex items-center justify-between gap-4 p-4"
    >
      <div className="flex items-center gap-3">
        <AlertCircle className="size-5 shrink-0 text-destructive" />
        <AlertTitle className="m-0 text-sm font-medium">{title ?? t('unknownError')}</AlertTitle>
      </div>
      {onRetry && (
        <Button size="sm" variant="outline" className="rounded-full shrink-0" onClick={onRetry}>
          {t('retry')}
        </Button>
      )}
    </Alert>
  );
}
