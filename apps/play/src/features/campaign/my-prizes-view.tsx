'use client';

import type { PublicCampaign } from '@playora/contracts';
import { LiveClock, VoucherList } from '@playora/ui/campaign';
import { Button, Empty, Flex, Typography } from 'antd';
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
      <Flex align="center" gap="small">
        <Flex vertical className="min-w-0">
          <Typography.Title level={4} className="!m-0">
            {t('myPrizes')}
          </Typography.Title>
          <Typography.Text type="secondary" ellipsis>
            {campaign.name}
          </Typography.Text>
        </Flex>
      </Flex>

      {!hydrated ? null : !session ? (
        <Empty description={t('noSession')}>
          <Button type="primary" href={gameHref}>
            {t('playNow')}
          </Button>
        </Empty>
      ) : (
        <>
          <LiveClock labels={labels} />
          <VoucherList
            vouchers={vouchers}
            loading={me.loading || me.state === null}
            labels={labels}
          />
          <Button block href={gameHref}>
            {t('backToGame')}
          </Button>
        </>
      )}
    </div>
  );
}
