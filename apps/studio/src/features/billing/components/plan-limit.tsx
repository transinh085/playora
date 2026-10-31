'use client';

import { ApiError } from '@playora/api-client';
import { ErrorCode } from '@playora/contracts';
import { Alert, AlertDescription, AlertTitle } from '@playora/ui/components/alert';
import { Button } from '@playora/ui/components/button';
import { toast } from '@playora/ui/components/sonner';
import { AlertTriangle } from '@playora/ui/icons';
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
      className="border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200"
      data-testid="plan-campaign-limit"
    >
      <AlertTriangle className="size-4 text-amber-600 dark:text-amber-400" />
      <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <AlertTitle>{tErrors('PLAN_CAMPAIGN_LIMIT')}</AlertTitle>
          <AlertDescription className="text-amber-800/90 dark:text-amber-300/80">
            {t('campaignsLimitBody')}
          </AlertDescription>
        </div>
        <Link href={billingPath(orgId)}>
          <Button variant="outline" size="sm" tabIndex={-1} className="shrink-0">
            {t('viewPlan')}
          </Button>
        </Link>
      </div>
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
        action: {
          label: t('viewPlan'),
          onClick: () => router.push(billingPath(orgId)),
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
