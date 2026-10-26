'use client';

import type { OrgBilling } from '@playora/contracts';
import { Alert, Button } from 'antd';
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
      <Button tabIndex={-1}>{t('viewPlan')}</Button>
    </Link>
  ) : undefined;

  if (level === 'blocked') {
    return (
      <Alert
        showIcon
        type="error"
        data-testid="redemption-usage-banner"
        title={t('redemptionsBlocked')}
        description={t('redemptionsBlockedBody')}
        action={action}
      />
    );
  }
  return (
    <Alert
      showIcon
      type="warning"
      data-testid="redemption-usage-banner"
      title={
        level === 'limit'
          ? t('redemptionsLimit', { limit })
          : t('redemptionsWarning', { percent: usagePercent(used, limit), used, limit })
      }
      description={
        level === 'limit'
          ? t('redemptionsLimitBody', { left: redemptionsLeft(used, hardLimit) })
          : t('redemptionsWarningBody', { limit, hardLimit })
      }
      action={action}
    />
  );
}
