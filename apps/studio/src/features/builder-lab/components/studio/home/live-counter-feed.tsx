'use client';

import { Button } from '@playora/ui/components/base/buttons/button';
import { ExternalLink, QrCode, Store, TicketCheck } from '@playora/ui/icons';
import Link from 'next/link';
import { useFormatter, useTranslations } from 'next-intl';
import type { CampaignListItem, CampaignVoucher } from '../../../api';

export function LiveCounterFeed({
  orgId,
  vouchers,
  campaigns,
}: {
  orgId: string;
  vouchers: readonly CampaignVoucher[];
  campaigns: readonly CampaignListItem[];
  isPending?: boolean;
}) {
  const t = useTranslations('campaigns.home.counter');
  const format = useFormatter();

  const campaignMap = new Map(campaigns.map((c) => [c.id, c.name]));

  // Filter vouchers that were redeemed, sorted by redeemedAt or issuedAt desc
  const redeemedVouchers = vouchers
    .filter((v) => v.status === 'redeemed' && !v.rehearsal)
    .sort((a, b) => {
      const timeA = Date.parse(a.redeemedAt ?? a.issuedAt);
      const timeB = Date.parse(b.redeemedAt ?? b.issuedAt);
      return timeB - timeA;
    })
    .slice(0, 5);

  return (
    <div
      className="flex flex-col overflow-hidden rounded-3xl border border-border-button-default bg-background-primary-default shadow-card"
      data-testid="home-live-counter"
    >
      {/* Header */}
      <div className="flex flex-row items-center justify-between border-b border-separator-border px-4 py-3.5">
        <div className="flex items-center gap-2">
          <Store className="size-4 text-text-tertiary" />
          <h3 className="text-body-medium text-text-primary">{t('title')}</h3>
        </div>
        <div className="flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-caption-2-medium text-emerald-700 dark:text-emerald-400">
          <span className="size-1.5 rounded-full bg-emerald-500 animate-live-pulse" />
          <span>{t('stationActive')}</span>
        </div>
      </div>

      {/* List or Empty State */}
      <div className="flex flex-1 flex-col justify-between p-4">
        {redeemedVouchers.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2.5 py-6 text-center">
            <div className="flex size-9 items-center justify-center rounded-xl bg-background-secondary-default text-text-tertiary shadow-xs">
              <QrCode className="size-4.5" />
            </div>
            <div className="max-w-[240px] space-y-0.5">
              <p className="text-caption-1-medium text-text-primary">{t('empty')}</p>
              <p className="text-[11px] text-text-tertiary">{t('emptyHint')}</p>
            </div>
          </div>
        ) : (
          <ul className="m-0 flex list-none flex-col divide-y divide-separator-border p-0">
            {redeemedVouchers.map((v) => {
              const timeStr = v.redeemedAt
                ? format.dateTime(new Date(v.redeemedAt), { hour: '2-digit', minute: '2-digit' })
                : t('justNow');
              const campaignName = campaignMap.get(v.campaignId) ?? '';

              return (
                <li
                  key={v.code}
                  className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      <TicketCheck className="size-3.5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-caption-1-semibold tracking-wider text-text-primary">
                          {v.code}
                        </span>
                        <span className="truncate text-caption-1-regular text-text-secondary">
                          · {v.prizeName}
                        </span>
                      </div>
                      <p className="truncate text-[11px] text-text-tertiary">
                        {campaignName} · {t('redeemedAt', { time: timeStr })}
                      </p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {/* Footer Link to Redeem Desk */}
        <div className="mt-3 border-t border-separator-border pt-3">
          <Link href={`/orgs/${orgId}/redeem` as never} className="block w-full">
            <Button
              variant="secondary"
              size="small"
              trailingIcon={ExternalLink}
              className="w-full justify-center"
            >
              {t('openDesk')}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
