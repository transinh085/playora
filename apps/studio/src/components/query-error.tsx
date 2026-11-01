'use client';

import { Alert, Button } from '@playora/ui/components';
import { useTranslations } from 'next-intl';
import type React from 'react';

/** Inline failure state for a query: HeroUI Alert with a retry action. */
export function QueryError({ onRetry, title }: { onRetry?: () => void; title?: React.ReactNode }) {
  const t = useTranslations('common');

  return (
    <Alert status="danger" className="items-center justify-between gap-4">
      <Alert.Indicator />
      <Alert.Content>
        <Alert.Title>{title ?? t('unknownError')}</Alert.Title>
      </Alert.Content>
      {onRetry && (
        <Button size="sm" variant="secondary" className="shrink-0" onPress={onRetry}>
          {t('retry')}
        </Button>
      )}
    </Alert>
  );
}
