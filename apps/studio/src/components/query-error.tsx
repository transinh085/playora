'use client';

import { Alert, Button } from 'antd';
import { useTranslations } from 'next-intl';

/** Inline failure state for a query: pale error Alert with a retry action (docs/13 §5). */
export function QueryError({ onRetry, title }: { onRetry?: () => void; title?: React.ReactNode }) {
  const t = useTranslations('common');

  return (
    <Alert
      type="error"
      showIcon
      title={title ?? t('unknownError')}
      action={
        onRetry && (
          <Button size="small" onClick={onRetry}>
            {t('retry')}
          </Button>
        )
      }
    />
  );
}
