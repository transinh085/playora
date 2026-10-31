'use client';

import type { PublicCampaign } from '@playora/contracts';
import { LiveClock, VoucherList } from '@playora/ui/campaign';
import { ButtonLink } from '@playora/ui/components/base/buttons/button';
import { Gift } from '@playora/ui/icons';
import { useTranslations } from 'next-intl';
import { useMemo } from 'react';
import { CampaignFrame } from './campaign-frame';
import { usePlayerSession } from './session';
import { useCampaignPlayerLabels } from './use-labels';
import { usePlayerState, usePolling } from './use-player-state';
import { toPlayerVouchers, VOUCHER_POLL_MS } from './vouchers';

/**
 * `/[slug]/prizes` — "Quà của tôi" as its own page (ADR-012 §6), deep-linked from the result
 * screen. Shows the live server status (polled) and a running clock (anti-screenshot).
 */
export function MyPrizesView({
  campaign,
}: {
  campaign: Pick<PublicCampaign, 'slug' | 'name' | 'brand' | 'skinKey'>;
}) {
  return (
    <CampaignFrame brand={campaign.brand} skinKey={campaign.skinKey}>
      <MyPrizes campaign={campaign} />
    </CampaignFrame>
  );
}

function MyPrizes({ campaign }: { campaign: Pick<PublicCampaign, 'slug' | 'name'> }) {
  const t = useTranslations('play');
  const labels = useCampaignPlayerLabels();
  const { session, hydrated, clearSession } = usePlayerSession(campaign.slug);
  const me = usePlayerState(campaign.slug, session?.playerToken ?? null, clearSession);
  usePolling(Boolean(session), me.refresh, VOUCHER_POLL_MS);
  const vouchers = useMemo(() => toPlayerVouchers(me.state?.vouchers ?? []), [me.state]);
  const gameHref = `/${campaign.slug}`;

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-4">
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <h2 className="m-0 text-lg font-bold tracking-tight text-foreground">{t('myPrizes')}</h2>
          <p className="truncate text-xs text-muted-foreground">{campaign.name}</p>
        </div>
      </div>

      {!hydrated ? null : !session ? (
        <div className="flex flex-col items-center justify-center gap-3 py-12 text-center text-muted-foreground">
          <Gift className="size-10 opacity-30" />
          <p className="text-sm">{t('noSession')}</p>
          <ButtonLink href={gameHref} className="mt-2 rounded-full px-6">
            {t('playNow')}
          </ButtonLink>
        </div>
      ) : (
        <>
          <div className="flex justify-center">
            <LiveClock labels={labels} />
          </div>
          <VoucherList
            vouchers={vouchers}
            loading={me.loading || me.state === null}
            labels={labels}
          />
          <ButtonLink href={gameHref} variant="secondary" className="w-full rounded-full mt-2">
            {t('backToGame')}
          </ButtonLink>
        </>
      )}
    </div>
  );
}
