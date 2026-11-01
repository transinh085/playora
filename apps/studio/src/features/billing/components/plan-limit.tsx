'use client';

import { ApiError } from '@playora/api-client';
import { ErrorCode } from '@playora/contracts';
import { Alert, Button, toast } from '@playora/ui/components';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { billingPath } from '../lib/plans';

export function isPlanCampaignLimit(error: unknown): boolean {
  return error instanceof ApiError && error.code === ErrorCode.PLAN_CAMPAIGN_LIMIT;
}

/** "Your plan is full" with a way to the plan page; shown where publishing or resuming failed. */
export function PlanCampaignLimitAlert({ orgId }: { orgId: string }) {
  const t = useTranslations('billing');
  const tErrors = useTranslations('errors');
  return (
    <Alert status="warning" data-testid="plan-campaign-limit">
      <Alert.Indicator />
      <Alert.Content>
        <Alert.Title>{tErrors('PLAN_CAMPAIGN_LIMIT')}</Alert.Title>
        <Alert.Description>{t('campaignsLimitBody')}</Alert.Description>
      </Alert.Content>
      <Link href={billingPath(orgId)}>
        <Button variant="secondary" size="sm" excludeFromTabOrder className="shrink-0">
          {t('viewPlan')}
        </Button>
      </Link>
    </Alert>
  );
}

/**
 * Error handler for lifecycle mutations (resume…): a plan limit notifies with action
 * to link to the plan page; anything else is a toast with the API message.
 */
export function useCampaignActionError(orgId: string) {
  const t = useTranslations('billing');
  const tErrors = useTranslations('errors');
  const tCommon = useTranslations('common');
  const router = useRouter();

  return (error: unknown) => {
    if (isPlanCampaignLimit(error)) {
      toast.error(tErrors('PLAN_CAMPAIGN_LIMIT'), {
        description: t('campaignsLimitBody'),
        actionProps: {
          children: t('viewPlan'),
          onPress: () => router.push(billingPath(orgId)),
        },
      });
      return;
    }
    toast.error(
      error instanceof ApiError && tErrors.has(error.code)
        ? tErrors(error.code)
        : tCommon('unknownError'),
    );
  };
}
