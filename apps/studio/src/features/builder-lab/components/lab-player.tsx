'use client';

import type { PlayResult } from '@playora/contracts';
import {
  type ButtonElement,
  CampaignPlayer,
  type CampaignPlayerHandle,
  type PlayerVoucher,
} from '@playora/ui/campaign';
import {
  App,
  Button,
  ConfigProvider,
  Flex,
  Result,
  Spin,
  Tag,
  Tooltip,
  Typography,
  theme,
} from 'antd';
import { ArrowLeft, Gift, RotateCcw, UserPlus } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { type CSSProperties, type ReactNode, useRef } from 'react';
import { useCampaignPlayerLabels } from '@/features/canvas-editor/components/use-canvas-labels';
import { campaignRoutes } from '../lib/routes';
import { LabApiError } from '../mock/api';
import {
  useCampaign,
  useCampaignStats,
  useLabSync,
  useMyVouchers,
  useStartPlay,
} from '../mock/hooks';
import type { Campaign, PlayResult as LabPlayResult } from '../mock/types';
import { usePlayerId } from './player/use-player-id';

/**
 * The playable campaign (docs/product/specs/builder.md §3.1), rendered by the shared
 * `CampaignPlayer` from `@playora/ui/campaign`. On desktop it sits in a phone frame with a lab
 * toolbar; on a phone it fills the screen. Every outcome comes from `startPlay` (the server); the mechanism
 * only animates towards it.
 */
export function LabPlayer({
  orgId,
  campaignId,
  rehearsal,
}: {
  orgId: string;
  campaignId: string;
  rehearsal: boolean;
}) {
  useLabSync();
  const t = useTranslations('builderLab.player');
  const campaign = useCampaign(campaignId);
  const routes = campaignRoutes(orgId);

  let content: ReactNode;
  if (campaign.isPending) {
    content = (
      <Flex vertical align="center" justify="center" gap="middle" className="h-full">
        <Spin />
        <Typography.Text type="secondary">{t('loading')}</Typography.Text>
      </Flex>
    );
  } else if (campaign.isError || !campaign.data) {
    content = (
      <Result
        status="404"
        title={t('errors.notFoundTitle')}
        subTitle={t('errors.notFoundBody')}
        extra={
          <Link href={routes.list}>
            <Button type="primary">{t('errors.backToCampaigns')}</Button>
          </Link>
        }
      />
    );
  } else if (!rehearsal && campaign.data.status !== 'published') {
    content = (
      <Result
        status="warning"
        title={t('errors.notPublishedTitle')}
        subTitle={t('errors.notPublishedBody')}
        extra={
          <Flex gap="small" justify="center" wrap>
            <Link href={routes.rehearsal(campaignId)}>
              <Button type="primary">{t('errors.openRehearsal')}</Button>
            </Link>
            <Link href={routes.edit(campaignId)}>
              <Button>{t('backToEditor')}</Button>
            </Link>
          </Flex>
        }
      />
    );
  }

  return (
    <ConfigProvider theme={{ algorithm: theme.darkAlgorithm }}>
      <Backdrop>
        {content ? (
          <div className="flex h-full items-center justify-center p-4">{content}</div>
        ) : (
          campaign.data && (
            <PlayerSession
              key={campaign.data.id}
              orgId={orgId}
              campaign={campaign.data}
              rehearsal={rehearsal}
            />
          )
        )}
      </Backdrop>
    </ConfigProvider>
  );
}

function Backdrop({ children }: { children: ReactNode }) {
  const { token } = theme.useToken();
  return (
    <div className="flex h-dvh flex-col" style={{ background: token.colorBgLayout }}>
      {children}
    </div>
  );
}

/** Mock play result in the contract shape the shared player renders. */
function toPlayResult(played: LabPlayResult): PlayResult {
  return {
    playId: null,
    outcome: played.outcome,
    reason: played.reason,
    prize: played.prize
      ? { id: played.prize.id, name: played.prize.name, image: played.prize.image }
      : null,
    voucher: played.voucherCode ? { code: played.voucherCode, expiresAt: null } : null,
    turnsLeftToday: played.turnsLeftToday,
  };
}

/**
 * Lab adapter around the shared `CampaignPlayer`: feeds it from the mock backend and adds the lab
 * toolbar (back, live/rehearsal, restart, new player) and the desktop phone frame.
 */
function PlayerSession({
  orgId,
  campaign,
  rehearsal,
}: {
  orgId: string;
  campaign: Campaign;
  rehearsal: boolean;
}) {
  const t = useTranslations('builderLab.player');
  const labels = useCampaignPlayerLabels();
  const { message } = App.useApp();
  const { token } = theme.useToken();
  const startPlay = useStartPlay();
  // Live stock for prize-list elements (rehearsal plays never change it).
  const stats = useCampaignStats(campaign.id).data;
  const [playerId, resetPlayer] = usePlayerId(campaign.id);
  const myVouchers = useMyVouchers(campaign.id, playerId);
  const player = useRef<CampaignPlayerHandle>(null);
  const routes = campaignRoutes(orgId);

  const vouchers: PlayerVoucher[] = (myVouchers.data ?? [])
    .filter((v) => v.rehearsal === rehearsal)
    .map((v) => ({
      code: v.code,
      prizeName: v.prize?.name ?? null,
      prizeImage: v.prize?.image,
      issuedAt: v.issuedAt,
      redeemedAt: v.redeemedAt,
    }));

  const onPlay = () =>
    startPlay
      .mutateAsync({ campaignId: campaign.id, playerId, rehearsal })
      .then(toPlayResult)
      .catch((error) => {
        message.error(
          error instanceof LabApiError && error.code === 'NOT_PUBLISHED'
            ? t('errors.notPublishedBody')
            : t('errors.playFailed'),
        );
        throw error;
      });

  const onAction = (element: ButtonElement) => {
    if (element.action === 'zalo' || element.action === 'phone' || element.action === 'link') {
      message.info(t(`actions.${element.action}`));
    }
  };

  const newPlayer = () => {
    resetPlayer();
    player.current?.reset();
    message.success(t('newPlayerDone'));
  };

  const redeemUrl = (code: string) =>
    typeof window === 'undefined' ? '' : `${window.location.origin}${routes.redeem}?code=${code}`;

  return (
    <>
      <Flex
        align="center"
        gap="small"
        className="px-4 py-3 max-[479px]:hidden"
        style={{ borderBottom: `1px solid ${token.colorBorderSecondary}` }}
      >
        <Tooltip title={t('backToEditor')}>
          <Link href={routes.edit(campaign.id)}>
            <Button type="text" icon={<ArrowLeft size={16} />} aria-label={t('backToEditor')} />
          </Link>
        </Tooltip>
        <Typography.Text strong ellipsis className="min-w-0">
          {campaign.name}
        </Typography.Text>
        {rehearsal ? (
          <Tag color="gold">{t('rehearsal')}</Tag>
        ) : (
          <Tag color="green">{t('live')}</Tag>
        )}
        <div className="flex-1" />
        {playerId && (
          <Typography.Text type="secondary" className="font-mono max-md:hidden">
            {t('playerId', { id: playerId.slice(0, 6) })}
          </Typography.Text>
        )}
        <Button icon={<Gift size={16} />} onClick={() => player.current?.openVouchers()}>
          {t('myPrizes')}
        </Button>
        <Button icon={<RotateCcw size={16} />} onClick={() => player.current?.restart()}>
          {t('restart')}
        </Button>
        <Button icon={<UserPlus size={16} />} onClick={newPlayer}>
          {t('newPlayer')}
        </Button>
      </Flex>

      <div className="flex min-h-0 flex-1 items-center justify-center min-[480px]:p-6">
        <ConfigProvider theme={{ algorithm: theme.defaultAlgorithm }}>
          <div
            className="relative h-full w-full overflow-hidden min-[480px]:h-[min(844px,100%)] min-[480px]:w-[390px] min-[480px]:rounded-[44px] min-[480px]:[box-shadow:var(--bezel)]"
            style={
              {
                '--bezel': `0 0 0 10px ${token.colorBgContainer}, 0 0 0 11px ${token.colorBorder}, 0 30px 80px rgba(0,0,0,.55)`,
              } as CSSProperties
            }
          >
            <CampaignPlayer
              ref={player}
              campaign={campaign}
              labels={labels}
              onPlay={onPlay}
              onAction={onAction}
              vouchers={vouchers}
              vouchersLoading={myVouchers.isLoading}
              remainingByPrize={stats?.remainingByPrize}
              playDisabled={!playerId}
              rehearsal={rehearsal}
              redeemUrl={redeemUrl}
            />

            {rehearsal && (
              <Tag color="gold" className="absolute top-2 left-2 z-10 min-[480px]:hidden">
                {t('rehearsal')}
              </Tag>
            )}
          </div>
        </ConfigProvider>
      </div>
    </>
  );
}
