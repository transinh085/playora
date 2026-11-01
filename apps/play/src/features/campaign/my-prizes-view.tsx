'use client';

import { ApiError } from '@playora/api-client';
import { type PublicCampaign, playsApi } from '@playora/contracts';
import { LiveClock, VoucherList, VoucherRestoreBox, ZaloOaCtaButton } from '@playora/ui/campaign';
import { buttonVariants } from '@playora/ui/components';
import { Gift } from '@playora/ui/icons';
import { useTranslations } from 'next-intl';
import { useMemo } from 'react';
import { api } from '@/lib/api';
import { CampaignFrame } from './campaign-frame';
import { getOrCreateDeviceId, usePlayerSession } from './session';
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
  campaign: Pick<
    PublicCampaign,
    'slug' | 'name' | 'brand' | 'skinKey' | 'organizationId' | 'zaloOaUrl'
  >;
}) {
  return (
    <CampaignFrame brand={campaign.brand} skinKey={campaign.skinKey}>
      <MyPrizes campaign={campaign} />
    </CampaignFrame>
  );
}

function MyPrizes({
  campaign,
}: {
  campaign: Pick<PublicCampaign, 'slug' | 'name' | 'organizationId' | 'zaloOaUrl'>;
}) {
  const t = useTranslations('play');
  const tErrors = useTranslations('errors');
  const labels = useCampaignPlayerLabels();
  const { session, hydrated, setSession, clearSession } = usePlayerSession(campaign.slug);
  const me = usePlayerState(campaign.slug, session?.playerToken ?? null, clearSession);
  usePolling(Boolean(session), me.refresh, VOUCHER_POLL_MS);
  const vouchers = useMemo(() => toPlayerVouchers(me.state?.vouchers ?? []), [me.state]);
  const gameHref = `/${campaign.slug}`;

  const studioBaseUrl = (process.env.NEXT_PUBLIC_STUDIO_URL ?? 'http://localhost:3000').replace(
    /\/$/,
    '',
  );
  const redeemUrl = (code: string) =>
    campaign.organizationId
      ? `${studioBaseUrl}/orgs/${campaign.organizationId}/redeem?code=${encodeURIComponent(code)}`
      : code;

  const onRestorePrizes = async (phone: string, codeSuffix: string) => {
    try {
      const res = await api.call(playsApi.restorePrizes, {
        params: { slug: campaign.slug },
        body: {
          phone,
          codeSuffix,
          deviceId: getOrCreateDeviceId(campaign.slug),
        },
      });
      setSession({ playerToken: res.playerToken, player: res.player });
      await me.refresh(res.playerToken);
    } catch (err) {
      if (err instanceof ApiError && tErrors.has(err.code)) {
        throw new Error(tErrors(err.code));
      }
      throw err;
    }
  };

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-4">
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <h2 className="m-0 text-lg font-bold tracking-tight text-foreground">{t('myPrizes')}</h2>
          <p className="truncate text-xs text-muted-foreground">{campaign.name}</p>
        </div>
      </div>

      {!hydrated ? null : !session ? (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col items-center justify-center gap-3 py-8 text-center text-muted-foreground">
            <Gift className="size-10 opacity-30" />
            <p className="text-sm">{t('noSession')}</p>
            <a
              href={gameHref}
              className={buttonVariants({
                variant: 'primary',
                className: 'mt-2 rounded-full px-6',
              })}
            >
              {t('playNow')}
            </a>
          </div>
          <VoucherRestoreBox labels={labels} onRestorePrizes={onRestorePrizes} defaultOpen />
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
            redeemUrl={redeemUrl}
          />
          {campaign.zaloOaUrl && (
            <ZaloOaCtaButton zaloOaUrl={campaign.zaloOaUrl} label={labels.zaloOaCta} />
          )}
          <VoucherRestoreBox labels={labels} onRestorePrizes={onRestorePrizes} />
          <a
            href={gameHref}
            className={buttonVariants({
              variant: 'secondary',
              fullWidth: true,
              className: 'mt-2 rounded-full',
            })}
          >
            {t('backToGame')}
          </a>
        </>
      )}
    </div>
  );
}
