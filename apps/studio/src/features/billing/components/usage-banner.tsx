'use client';

import type { OrgBilling } from '@playora/contracts';
import { Alert, Button } from '@playora/ui/components';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useOrgBillingIfAllowed } from '../api';
import { billingPath } from '../lib/plans';
import { redemptionsLeft, usageLevel, usagePercent } from '../lib/usage';

/**
 * Redemption quota warning (BIL-02, D-23) for the org Home and the redeem desk: nothing under 80%,
 * a warning from 80%, the grace explanation from 100%, and "prize issuance paused" past the grace.
 * Counter redemption itself is never blocked. Hidden for members without `billing:read`.
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
  const used = billing.usage.redemptionsThisMonth + (billing.usage.activeIssuedVouchers ?? 0);
  const level = usageLevel(used, limit, hardLimit);
  if (level === 'ok') return null;

  const action = withLink ? (
    <Link href={billingPath(orgId)}>
      <Button variant="secondary" size="sm" excludeFromTabOrder className="shrink-0">
        {t('viewPlan')}
      </Button>
    </Link>
  ) : undefined;

  if (level === 'blocked') {
    return (
      <Alert status="danger" data-testid="redemption-usage-banner">
        <Alert.Indicator />
        <Alert.Content>
          <Alert.Title>{t('redemptionsBlocked')}</Alert.Title>
          <Alert.Description>{t('redemptionsBlockedBody')}</Alert.Description>
        </Alert.Content>
        {action}
      </Alert>
    );
  }

  return (
    <Alert status="warning" data-testid="redemption-usage-banner">
      <Alert.Indicator />
      <Alert.Content>
        <Alert.Title>
          {level === 'limit'
            ? t('redemptionsLimit', { limit })
            : t('redemptionsWarning', { percent: usagePercent(used, limit), used, limit })}
        </Alert.Title>
        <Alert.Description>
          {level === 'limit'
            ? t('redemptionsLimitBody', { left: redemptionsLeft(used, hardLimit) })
            : t('redemptionsWarningBody', { limit, hardLimit })}
        </Alert.Description>
      </Alert.Content>
      {action}
    </Alert>
  );
}
