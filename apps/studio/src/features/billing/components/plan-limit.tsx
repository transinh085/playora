'use client';

import { ApiError } from '@playora/api-client';
import { ErrorCode } from '@playora/contracts';
import { Alert, App, Button } from 'antd';
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
    <Alert
      showIcon
      type="warning"
      data-testid="plan-campaign-limit"
      title={tErrors('PLAN_CAMPAIGN_LIMIT')}
      description={t('campaignsLimitBody')}
      action={
        <Link href={billingPath(orgId)}>
          <Button tabIndex={-1}>{t('viewPlan')}</Button>
        </Link>
      }
    />
  );
}

/**
 * Error handler for lifecycle mutations (resume…): a plan limit opens a dialog that explains it and
 * links to the plan page; anything else is a toast with the API message.
 */
export function useCampaignActionError(orgId: string) {
  const t = useTranslations('billing');
  const tErrors = useTranslations('errors');
  const tCommon = useTranslations('common');
  const { modal, message } = App.useApp();
  const router = useRouter();

  return (error: unknown) => {
    if (isPlanCampaignLimit(error)) {
      modal.confirm({
        title: tErrors('PLAN_CAMPAIGN_LIMIT'),
        content: t('campaignsLimitBody'),
        okText: t('viewPlan'),
        cancelText: tCommon('cancel'),
        onOk: () => router.push(billingPath(orgId)),
      });
      return;
    }
    message.error(
      error instanceof ApiError && tErrors.has(error.code)
        ? tErrors(error.code)
        : tCommon('unknownError'),
    );
  };
}
