'use client';

import { ApiError, createApiClient } from '@playora/api-client';
import { routePrefix } from '@playora/api-client/react';
import { campaignsApi, type PlayResult, playsApi, publicApi } from '@playora/contracts';
import {
  type ButtonElement,
  CampaignPlayer,
  type CampaignPlayerHandle,
  normalizePhone,
  type PlayerFormValues,
  type PlayerVoucher,
} from '@playora/ui/campaign';
import { Badge } from '@playora/ui/components/badge';
import { Button } from '@playora/ui/components/button';
import { toast } from '@playora/ui/components/sonner';
import { Tooltip, TooltipContent, TooltipTrigger } from '@playora/ui/components/tooltip';
import { ArrowLeft, Gift, Loader2, RotateCcw, UserPlus } from '@playora/ui/icons';
import { useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { type CSSProperties, type ReactNode, useCallback, useRef, useState } from 'react';
import { useCampaignPlayerLabels } from '@/features/canvas-editor/components/use-canvas-labels';
import { api } from '@/lib/api';
import { API_URL } from '@/lib/env';
import { type Campaign, useCampaign, useCampaignStats, useRehearsalPlay } from '../api';
import { campaignRoutes } from '../lib/routes';
import { usePlayerId } from './player/use-player-id';

function playerClient(token: string) {
  return createApiClient({
    baseUrl: API_URL,
    credentials: 'omit',
    headers: () => ({ Authorization: `Bearer ${token}` }),
  });
}

/**
 * The playable campaign (docs/product/specs/builder.md §3.1), rendered by the shared
 * `CampaignPlayer` from `@playora/ui/campaign`. On desktop it sits in a phone frame with a lab
 * toolbar; on a phone it fills the screen.
 * - Rehearsal mode (`?rehearsal=1`) calls `campaignsApi.rehearsalPlay` with a per-browser `testerKey`
 *   and a fresh `requestId` per play.
 * - Live mode calls `publicApi.join` + `playsApi.play` on the published campaign.
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
  const t = useTranslations('builderLab.player');
  const campaign = useCampaign(orgId, campaignId);
  const routes = campaignRoutes(orgId);

  let content: ReactNode;
  if (campaign.isPending) {
    content = (
      <div className="flex h-full flex-col items-center justify-center gap-3">
        <Loader2 className="size-6 animate-spin text-primary" />
        <span className="text-xs text-muted-foreground">{t('loading')}</span>
      </div>
    );
  } else if (campaign.isError || !campaign.data) {
    content = (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <h3 className="text-lg font-bold">{t('errors.notFoundTitle')}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{t('errors.notFoundBody')}</p>
        <Link href={routes.list} className="mt-4">
          <Button>{t('errors.backToCampaigns')}</Button>
        </Link>
      </div>
    );
  } else if (!rehearsal && campaign.data.status !== 'published') {
    content = (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <h3 className="text-lg font-bold">{t('errors.notPublishedTitle')}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{t('errors.notPublishedBody')}</p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <Link href={routes.rehearsal(campaignId)}>
            <Button>{t('errors.openRehearsal')}</Button>
          </Link>
          <Link href={routes.edit(campaignId)}>
            <Button variant="outline">{t('backToEditor')}</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-dvh flex-col bg-background">
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
    </div>
  );
}

/**
 * Studio adapter around the shared `CampaignPlayer`: feeds it from the real API (`rehearsalPlay`
 * for rehearsal, `publicApi.join` + `playsApi.play` for live) and adds the toolbar and phone frame.
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
  const tErrors = useTranslations('errors');
  const labels = useCampaignPlayerLabels();
  const qc = useQueryClient();
  const rehearsalPlay = useRehearsalPlay(orgId, campaign.id);
  const stats = useCampaignStats(orgId, campaign.id).data;
  const [playerId, resetPlayer] = usePlayerId(campaign.id);
  const [vouchers, setVouchers] = useState<PlayerVoucher[]>([]);
  const [vouchersLoading, setVouchersLoading] = useState(false);
  const formRef = useRef<PlayerFormValues | null>(null);
  const tokenRef = useRef<string | null>(null);
  const player = useRef<CampaignPlayerHandle>(null);
  const routes = campaignRoutes(orgId);

  const joinLive = useCallback(
    async (form: PlayerFormValues | null): Promise<string> => {
      const name = form?.name.trim() ?? '';
      const phone = form ? normalizePhone(form.phone) : '';
      const joined = await api.call(publicApi.join, {
        params: { slug: campaign.slug },
        body: {
          deviceId: playerId,
          ...(name ? { displayName: name } : {}),
          ...(campaign.rules.collectForm && form
            ? {
                fields: { name, phone },
                consents: { participation: Boolean(form.consent), marketing: false },
              }
            : {}),
        },
      });
      tokenRef.current = joined.playerToken;
      return joined.playerToken;
    },
    [campaign.slug, campaign.rules.collectForm, playerId],
  );

  const refreshLiveVouchers = useCallback(
    async (playerToken?: string | null) => {
      const tok = playerToken ?? tokenRef.current;
      if (rehearsal || !tok) return;
      setVouchersLoading(true);
      try {
        const state = await playerClient(tok).call(playsApi.me, {
          params: { slug: campaign.slug },
        });
        setVouchers(
          state.vouchers.map((v) => ({
            code: v.code,
            prizeName: v.prize.name,
            prizeImage: v.prize.image,
            issuedAt: v.issuedAt,
            redeemedAt: v.redeemedAt,
            status: v.status,
            expiresAt: v.expiresAt,
          })),
        );
      } catch {
        // Ignore refresh errors; keep current list.
      } finally {
        setVouchersLoading(false);
      }
    },
    [campaign.slug, rehearsal],
  );

  const onSubmitForm = async (values: PlayerFormValues) => {
    formRef.current = values;
    if (rehearsal) return;
    try {
      const tok = await joinLive(values);
      void refreshLiveVouchers(tok);
    } catch (error) {
      const msg =
        error instanceof ApiError && tErrors.has(error.code)
          ? tErrors(error.code)
          : t('errors.playFailed');
      toast.error(msg);
      throw error;
    }
  };

  const appendVoucherFromResult = (result: PlayResult) => {
    if (result.outcome !== 'win' || !result.voucher) return;
    const code = result.voucher.code;
    setVouchers((prev) => {
      if (prev.some((v) => v.code === code)) return prev;
      return [
        {
          code,
          prizeName: result.prize?.name ?? null,
          prizeImage: result.prize?.image,
          issuedAt: new Date().toISOString(),
          redeemedAt: null,
          status: 'issued',
          expiresAt: result.voucher?.expiresAt ?? null,
        },
        ...prev,
      ];
    });
  };

  const onPlay = async (): Promise<PlayResult> => {
    try {
      if (rehearsal) {
        const name = formRef.current?.name.trim();
        const result = await rehearsalPlay.mutateAsync({
          testerKey: playerId,
          requestId: crypto.randomUUID(),
          ...(name ? { playerName: name } : {}),
        });
        appendVoucherFromResult(result);
        return result;
      }

      const tok = tokenRef.current ?? (await joinLive(formRef.current));
      const result = await playerClient(tok).call(playsApi.play, {
        params: { slug: campaign.slug },
        body: { requestId: crypto.randomUUID() },
      });
      appendVoucherFromResult(result);
      void refreshLiveVouchers(tok);
      void qc.invalidateQueries({ queryKey: routePrefix(campaignsApi.stats) });
      void qc.invalidateQueries({ queryKey: routePrefix(campaignsApi.plays) });
      void qc.invalidateQueries({ queryKey: routePrefix(campaignsApi.vouchers) });
      return result;
    } catch (error) {
      const msg =
        error instanceof ApiError && error.code === 'CAMPAIGN_NOT_PUBLISHED'
          ? t('errors.notPublishedBody')
          : error instanceof ApiError && tErrors.has(error.code)
            ? tErrors(error.code)
            : t('errors.playFailed');
      toast.error(msg);
      throw error;
    }
  };

  const onAction = (element: ButtonElement) => {
    if (element.action === 'zalo' || element.action === 'phone' || element.action === 'link') {
      toast.info(t(`actions.${element.action}`));
    }
  };

  const newPlayer = () => {
    resetPlayer();
    formRef.current = null;
    tokenRef.current = null;
    setVouchers([]);
    player.current?.reset();
    toast.success(t('newPlayerDone'));
  };

  const redeemUrl = (code: string) =>
    typeof window === 'undefined' ? '' : `${window.location.origin}${routes.redeem}?code=${code}`;

  return (
    <>
      <div className="flex items-center gap-2 border-b bg-card px-4 py-2.5 max-[479px]:hidden">
        <Tooltip>
          <TooltipTrigger asChild>
            <Link href={routes.edit(campaign.id)}>
              <Button variant="ghost" size="icon" className="size-8" aria-label={t('backToEditor')}>
                <ArrowLeft className="size-4" />
              </Button>
            </Link>
          </TooltipTrigger>
          <TooltipContent>{t('backToEditor')}</TooltipContent>
        </Tooltip>

        <span className="min-w-0 truncate text-sm font-semibold">{campaign.name}</span>

        {rehearsal ? (
          <Badge variant="outline" className="border-amber-500/40 text-amber-600">
            {t('rehearsal')}
          </Badge>
        ) : (
          <Badge variant="outline" className="border-emerald-500/30 text-emerald-600">
            {t('live')}
          </Badge>
        )}

        <div className="flex-1" />

        {playerId && (
          <span className="font-mono text-xs text-muted-foreground max-md:hidden">
            {t('playerId', { id: playerId.slice(0, 6) })}
          </span>
        )}

        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => player.current?.openVouchers()}
        >
          <Gift className="size-3.5" />
          {t('myPrizes')}
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => player.current?.restart()}
        >
          <RotateCcw className="size-3.5" />
          {t('restart')}
        </Button>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={newPlayer}>
          <UserPlus className="size-3.5" />
          {t('newPlayer')}
        </Button>
      </div>

      <div className="flex min-h-0 flex-1 items-center justify-center min-[480px]:p-6">
        <div
          className="relative h-full w-full overflow-hidden min-[480px]:h-[min(844px,100%)] min-[480px]:w-[390px] min-[480px]:rounded-[44px] min-[480px]:[box-shadow:var(--bezel)]"
          style={
            {
              '--bezel': '0 0 0 10px #18181b, 0 0 0 11px #27272a, 0 30px 80px rgba(0,0,0,.55)',
            } as CSSProperties
          }
        >
          <CampaignPlayer
            ref={player}
            campaign={campaign}
            labels={labels}
            onSubmitForm={onSubmitForm}
            onPlay={onPlay}
            onAction={onAction}
            vouchers={vouchers}
            vouchersLoading={vouchersLoading}
            onVouchersOpenChange={(open) => {
              if (open && !rehearsal) void refreshLiveVouchers();
            }}
            remainingByPrize={stats?.remainingByPrize}
            playDisabled={!playerId}
            rehearsal={rehearsal}
            redeemUrl={redeemUrl}
          />

          {rehearsal && (
            <Badge
              variant="outline"
              className="absolute left-2 top-2 z-10 border-amber-500/40 bg-card/80 text-amber-600 backdrop-blur-xs min-[480px]:hidden"
            >
              {t('rehearsal')}
            </Badge>
          )}
        </div>
      </div>
    </>
  );
}
