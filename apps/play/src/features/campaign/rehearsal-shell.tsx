'use client';

import { ApiError } from '@playora/api-client';
import {
  type Campaign,
  type CampaignStats,
  campaignsApi,
  type PlayResult,
} from '@playora/contracts';
import {
  type ButtonElement,
  CampaignPlayer,
  type CampaignPlayerDocument,
  type CampaignPlayerHandle,
  type PlayerFormValues,
  type PlayerVoucher,
  toCanvasDoc,
} from '@playora/ui/campaign';
import { Chip } from '@playora/ui/components/base/badges/chip';
import { Button } from '@playora/ui/components/base/buttons/button';
import { toast } from '@playora/ui/components/base/toast/toast';
import { Tooltip, TooltipTrigger } from '@playora/ui/components/base/tooltip/tooltip';
import { ArrowLeft, ExternalLink, Gift, Loader2, RotateCcw, UserPlus } from '@playora/ui/icons';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { type CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '@/lib/api';
import { useCampaignPlayerLabels } from './use-labels';

const STUDIO_URL = process.env.NEXT_PUBLIC_STUDIO_URL ?? 'http://localhost:3001';
const storageKey = (campaignId: string) => `playora.builderLab.player.${campaignId}`;

function useTesterId(campaignId: string): [string, () => void] {
  const [id, setId] = useState('');

  useEffect(() => {
    let stored = '';
    try {
      stored = window.localStorage.getItem(storageKey(campaignId)) ?? '';
    } catch {}
    if (!stored) {
      stored = crypto.randomUUID();
      try {
        window.localStorage.setItem(storageKey(campaignId), stored);
      } catch {}
    }
    setId(stored);
  }, [campaignId]);

  const reset = useCallback(() => {
    const next = crypto.randomUUID();
    try {
      window.localStorage.setItem(storageKey(campaignId), next);
    } catch {}
    setId(next);
  }, [campaignId]);

  return [id, reset];
}

function toRehearsalDocument(campaign: Campaign): CampaignPlayerDocument {
  return {
    name: campaign.name,
    templateKey: campaign.templateKey,
    brand: campaign.brand,
    screens: toCanvasDoc(campaign.screens),
    prizes: campaign.prizes,
    rules: campaign.rules,
  };
}

/**
 * Rehearsal / preview player in `apps/play` (`/orgs/[orgId]/campaigns/[campaignId]/preview`),
 * with phone bezel and tester toolbar so preview is cleanly separated from live `/[slug]`.
 */
export function RehearsalShell({ orgId, campaignId }: { orgId: string; campaignId: string }) {
  const t = useTranslations('builderLab.player');
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [stats, setStats] = useState<CampaignStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);

    Promise.all([
      api.call(campaignsApi.get, { params: { orgId, campaignId } }),
      api.call(campaignsApi.stats, { params: { orgId, campaignId } }).catch(() => null),
    ])
      .then(([camp, st]) => {
        if (cancelled) return;
        setCampaign(camp);
        setStats(st);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setError(true);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [orgId, campaignId]);

  const listUrl = `${STUDIO_URL}/orgs/${orgId}/campaigns`;

  return (
    <div className="flex h-dvh flex-col bg-background">
      {loading ? (
        <div className="flex h-full flex-col items-center justify-center gap-3 p-4">
          <Loader2 className="size-6 animate-spin text-primary" />
          <span className="text-xs text-muted-foreground">{t('loading')}</span>
        </div>
      ) : error || !campaign ? (
        <div className="flex h-full flex-col items-center justify-center p-8 text-center">
          <h3 className="text-lg font-bold">{t('errors.notFoundTitle')}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{t('errors.notFoundBody')}</p>
          <a href={listUrl} className="mt-4">
            <Button>{t('errors.backToCampaigns')}</Button>
          </a>
        </div>
      ) : (
        <RehearsalSession orgId={orgId} campaign={campaign} stats={stats} />
      )}
    </div>
  );
}

function RehearsalSession({
  orgId,
  campaign,
  stats,
}: {
  orgId: string;
  campaign: Campaign;
  stats: CampaignStats | null;
}) {
  const t = useTranslations('builderLab.player');
  const tErrors = useTranslations('errors');
  const labels = useCampaignPlayerLabels();
  const [playerId, resetPlayer] = useTesterId(campaign.id);
  const [vouchers, setVouchers] = useState<PlayerVoucher[]>([]);
  const formRef = useRef<PlayerFormValues | null>(null);
  const player = useRef<CampaignPlayerHandle>(null);

  const playerDoc = useMemo(() => toRehearsalDocument(campaign), [campaign]);
  const editUrl = `${STUDIO_URL}/orgs/${orgId}/campaigns/${campaign.id}/edit`;
  const redeemUrl = (code: string) => `${STUDIO_URL}/orgs/${orgId}/redeem?code=${code}`;

  const onSubmitForm = async (values: PlayerFormValues) => {
    formRef.current = values;
  };

  const onPlay = async (): Promise<PlayResult> => {
    try {
      const name = formRef.current?.name.trim();
      const result = await api.call(campaignsApi.rehearsalPlay, {
        params: { orgId, campaignId: campaign.id },
        body: {
          testerKey: playerId,
          requestId: crypto.randomUUID(),
          ...(name ? { playerName: name } : {}),
        },
      });
      if (result.outcome === 'win' && result.voucher) {
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
      }
      return result;
    } catch (error) {
      const msg =
        error instanceof ApiError && tErrors.has(error.code)
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
    setVouchers([]);
    player.current?.reset();
    toast.success(t('newPlayerDone'));
  };

  return (
    <>
      <div className="flex items-center gap-2 border-b bg-card px-4 py-2.5 max-[479px]:hidden">
        <TooltipTrigger>
          <a
            href={editUrl}
            aria-label={t('backToEditor')}
            className="inline-flex size-8 items-center justify-center rounded-lg text-button-ghost-foreground hover:bg-button-ghost-hover"
          >
            <ArrowLeft className="size-4" />
          </a>
          <Tooltip>{t('backToEditor')}</Tooltip>
        </TooltipTrigger>

        <span className="min-w-0 truncate text-sm font-semibold">{campaign.name}</span>

        <Chip variant="caption" color="yellow">
          {t('rehearsal')}
        </Chip>

        <div className="flex-1" />

        {playerId && (
          <span className="font-mono text-xs text-muted-foreground max-md:hidden">
            {t('playerId', { id: playerId.slice(0, 6) })}
          </span>
        )}

        <Button
          variant="secondary"
          size="small"
          className="gap-1.5"
          onClick={() => player.current?.openVouchers()}
        >
          <Gift className="size-3.5" />
          {t('myPrizes')}
        </Button>
        <Button
          variant="secondary"
          size="small"
          className="gap-1.5"
          onClick={() => player.current?.restart()}
        >
          <RotateCcw className="size-3.5" />
          {t('restart')}
        </Button>
        <Button variant="secondary" size="small" className="gap-1.5" onClick={newPlayer}>
          <UserPlus className="size-3.5" />
          {t('newPlayer')}
        </Button>
        {campaign.status === 'published' && (
          <Link href={`/${campaign.slug}`}>
            <Button size="small" className="gap-1.5">
              <ExternalLink className="size-3.5" />
              {t('live')}
            </Button>
          </Link>
        )}
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
            campaign={playerDoc}
            labels={labels}
            onSubmitForm={onSubmitForm}
            onPlay={onPlay}
            onAction={onAction}
            vouchers={vouchers}
            remainingByPrize={stats?.remainingByPrize}
            playDisabled={!playerId}
            rehearsal
            redeemUrl={redeemUrl}
          />

          <Chip
            variant="caption"
            color="yellow"
            className="absolute left-2 top-2 z-10 min-[480px]:hidden"
          >
            {t('rehearsal')}
          </Chip>
        </div>
      </div>
    </>
  );
}
