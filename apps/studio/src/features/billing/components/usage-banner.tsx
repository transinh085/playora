'use client';

import type { OrgBilling } from '@playora/contracts';
import { Button } from '@playora/ui/components/base/buttons/button';
import { AlertCircle, AlertTriangle } from '@playora/ui/icons';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useOrgBillingIfAllowed } from '../api';
import { billingPath } from '../lib/plans';
import { redemptionsLeft, usageLevel, usagePercent } from '../lib/usage';

/**
 * Redemption quota warning (BIL-02, D-21) for the org Home and the redeem desk: nothing under 80%,
 * a warning from 80%, the grace explanation from 100%, and "paused" past the grace. Hidden for
 * members without `billing:read` (counter-only staff).
 */
export function RedemptionUsageBanner({ orgId }: { orgId: string }) {
  const { data } = useOrgBillingIfAllowed(orgId);
  if (!data) return null;
  return <RedemptionUsageAlert orgId={orgId} billing={data} withLink />;
}

export function RedemptionUsageAlert({
  orgId,
  billing,
  withLink,
}: {
  orgId: string;
  billing: OrgBilling;
  withLink?: boolean;
}) {
  const t = useTranslations('billing');
  const { redemptionsPerMonth: limit, redemptionsHardLimit: hardLimit } = billing.limits;
  const used = billing.usage.redemptionsThisMonth;
  const level = usageLevel(used, limit, hardLimit);
  if (level === 'ok') return null;

  const action = withLink ? (
    <Link href={billingPath(orgId)}>
      <Button variant="secondary" size="small" tabIndex={-1} className="shrink-0">
        {t('viewPlan')}
      </Button>
    </Link>
  ) : undefined;

  if (level === 'blocked') {
    return (
      <div
        role="alert"
        className="flex items-start gap-3 rounded-2xl border border-rose-500/30 bg-background-notification-error-secondary p-4 text-text-error-primary"
        data-testid="redemption-usage-banner"
      >
        <AlertCircle className="mt-0.5 size-4 shrink-0" />
        <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold">{t('redemptionsBlocked')}</p>
            <p className="text-xs opacity-90">{t('redemptionsBlockedBody')}</p>
          </div>
          {action}
        </div>
      </div>
    );
  }

  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-900 dark:text-amber-200"
      data-testid="redemption-usage-banner"
    >
      <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
      <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold">
            {level === 'limit'
              ? t('redemptionsLimit', { limit })
              : t('redemptionsWarning', { percent: usagePercent(used, limit), used, limit })}
          </p>
          <p className="text-xs text-amber-800/90 dark:text-amber-300/80">
            {level === 'limit'
              ? t('redemptionsLimitBody', { left: redemptionsLeft(used, hardLimit) })
              : t('redemptionsWarningBody', { limit, hardLimit })}
          </p>
        </div>
        {action}
      </div>
    </div>
  );
}
