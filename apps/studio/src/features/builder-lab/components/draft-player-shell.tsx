'use client';

import { ApiError } from '@playora/api-client';
import { ErrorCode, type PlayResult, type PublicDraftCampaign, playsApi } from '@playora/contracts';
import {
  type ButtonElement,
  CampaignPlayer,
  type CampaignPlayerDocument,
  type CampaignPlayerHandle,
  type PlayerFormValues,
  type PlayerVoucher,
  toCanvasDoc,
} from '@playora/ui/campaign';
import { Button, Card, Chip, PhoneMockup, Switch, toast } from '@playora/ui/components';
import { Gift, Loader2, RotateCcw, UserPlus } from '@playora/ui/icons';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useCampaignPlayerLabels } from '@/features/canvas-editor/components/use-canvas-labels';
import { api } from '@/lib/api';

const storageKey = (token: string) => `playora.draft.tester.${token}`;

function useDraftTesterId(token: string): [string, () => void] {
  const [id, setId] = useState('');

  useEffect(() => {
    let stored = '';
    try {
      stored = window.localStorage.getItem(storageKey(token)) ?? '';
    } catch {}
    if (!stored) {
      stored = crypto.randomUUID();
      try {
        window.localStorage.setItem(storageKey(token), stored);
      } catch {}
    }
    setId(stored);
  }, [token]);

  const reset = useCallback(() => {
    const next = crypto.randomUUID();
    try {
      window.localStorage.setItem(storageKey(token), next);
    } catch {}
    setId(next);
  }, [token]);

  return [id, reset];
}

function toDraftDocument(campaign: PublicDraftCampaign): CampaignPlayerDocument {
  return {
    name: campaign.name,
    templateKey: campaign.templateKey,
    skinKey: campaign.skinKey,
    brand: campaign.brand,
    screens: toCanvasDoc(campaign.screens),
    prizes: campaign.prizes,
    rules: {
      startsAt: campaign.startsAt,
      endsAt: campaign.endsAt,
      openingHours: campaign.openingHours,
      playsPerDay: campaign.playsPerDay,
      openDays: campaign.openDays,
      collectForm: campaign.collectForm,
    },
    terms: campaign.terms,
    zaloOaUrl: campaign.zaloOaUrl ?? null,
  };
}

/**
 * Public draft rehearsal player (`/draft/[token]`, `BLD-23`, `BLD-26`).
 * Allows up to 20 distinct testers (`testerKey`s) to test-play the live draft without logging in.
 */
export function DraftPlayerShell({ token }: { token: string }) {
  const t = useTranslations('builderLab.player');
  const tErrors = useTranslations('errors');
  const labels = useCampaignPlayerLabels();
  const [campaign, setCampaign] = useState<PublicDraftCampaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [limitReached, setLimitReached] = useState(false);
  const [enforceSchedule, setEnforceSchedule] = useState(false);
  const [testerId, newTester] = useDraftTesterId(token);
  const [vouchers, setVouchers] = useState<PlayerVoucher[]>([]);
  const formRef = useRef<PlayerFormValues | null>(null);
  const player = useRef<CampaignPlayerHandle>(null);

  const loadDraft = useCallback(() => {
    setLoading(true);
    setError(false);
    api
      .call(playsApi.draftCampaign, { params: { token } })
      .then((res) => {
        setCampaign(res);
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, [token]);

  useEffect(() => {
    loadDraft();
  }, [loadDraft]);

  const playerDoc = useMemo(() => (campaign ? toDraftDocument(campaign) : null), [campaign]);
  const remainingByPrize = useMemo(() => {
    if (!campaign) return undefined;
    const map: Record<string, number> = {};
    for (const p of campaign.prizes) {
      if (p.remaining !== undefined) map[p.id] = p.remaining;
    }
    return map;
  }, [campaign]);

  const onSubmitForm = async (values: PlayerFormValues) => {
    formRef.current = values;
  };

  const onPlay = async (): Promise<PlayResult> => {
    try {
      const name = formRef.current?.name.trim();
      const result = await api.call(playsApi.draftPlay, {
        params: { token },
        body: {
          testerKey: testerId,
          requestId: crypto.randomUUID(),
          ...(name ? { playerName: name } : {}),
          ...(enforceSchedule ? { enforceSchedule: true } : {}),
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
      void api
        .call(playsApi.draftCampaign, { params: { token } })
        .then((res) => setCampaign(res))
        .catch(() => {});
      return result;
    } catch (err) {
      if (err instanceof ApiError && err.code === ErrorCode.DRAFT_TESTER_LIMIT_REACHED) {
        setLimitReached(true);
      }
      const msg =
        err instanceof ApiError && tErrors.has(err.code)
          ? tErrors(err.code)
          : t('errors.playFailed');
      toast.error(msg);
      throw err;
    }
  };

  const onAction = (element: ButtonElement) => {
    if (element.action === 'zalo' || element.action === 'phone' || element.action === 'link') {
      toast.info(t(`actions.${element.action}`));
    }
  };

  const resetTurns = async () => {
    try {
      const res = await api.call(playsApi.draftReset, {
        params: { token },
        body: { testerKey: testerId },
      });
      setVouchers([]);
      player.current?.reset();
      setCampaign((prev) => (prev ? { ...prev, testerCount: res.testerCount } : prev));
      toast.success(t('newPlayerDone'));
    } catch {
      toast.error(t('errors.playFailed'));
    }
  };

  if (loading) {
    return (
      <div className="flex h-dvh flex-col items-center justify-center gap-3 bg-background p-4">
        <Loader2 className="size-6 animate-spin text-primary" />
        <span className="text-xs text-muted-foreground">{t('loading')}</span>
      </div>
    );
  }

  if (error || !campaign || !playerDoc) {
    return (
      <div className="flex h-dvh items-center justify-center bg-background p-4">
        <Card className="flex max-w-md flex-col items-center justify-center p-8 text-center">
          <Card.Header className="items-center p-0">
            <Card.Title className="m-0 text-lg font-bold">{t('errors.notFoundTitle')}</Card.Title>
            <Card.Description className="mt-1 text-sm text-muted-foreground">
              {t('errors.notFoundBody')}
            </Card.Description>
          </Card.Header>
        </Card>
      </div>
    );
  }

  if (limitReached) {
    return (
      <div className="flex h-dvh items-center justify-center bg-background p-4">
        <Card
          className="flex max-w-md flex-col items-center justify-center p-8 text-center"
          data-testid="draft-tester-limit-reached"
        >
          <Card.Header className="items-center p-0">
            <Card.Title className="m-0 text-lg font-bold">{t('testerLimitTitle')}</Card.Title>
            <Card.Description className="mt-1 text-sm text-muted-foreground">
              {t('testerLimitBody')}
            </Card.Description>
          </Card.Header>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex h-dvh flex-col bg-background">
      <div className="flex items-center gap-2 border-b bg-card px-4 py-2.5 max-[479px]:hidden">
        <span className="min-w-0 truncate text-sm font-semibold">{campaign.name}</span>
        <Chip variant="soft" color="warning" size="sm">
          {t('rehearsal')}
        </Chip>
        <Chip variant="soft" color="default" size="sm" data-testid="draft-tester-count">
          {campaign.testerCount} / {campaign.maxTesters}
        </Chip>

        <div className="flex-1" />

        <Switch
          size="sm"
          isSelected={enforceSchedule}
          onChange={setEnforceSchedule}
          aria-label={t('testSchedule')}
        >
          <Switch.Control>
            <Switch.Thumb />
          </Switch.Control>
          <Switch.Content>
            <span className="text-xs text-muted-foreground max-md:hidden">{t('testSchedule')}</span>
          </Switch.Content>
        </Switch>

        <Button
          variant="secondary"
          size="sm"
          className="gap-1.5"
          onClick={() => player.current?.openVouchers()}
        >
          <Gift className="size-3.5" />
          {t('myPrizes')}
        </Button>
        <Button variant="secondary" size="sm" className="gap-1.5" onClick={resetTurns}>
          <RotateCcw className="size-3.5" />
          {t('restart')}
        </Button>
        <Button
          variant="secondary"
          size="sm"
          className="gap-1.5"
          onClick={() => {
            newTester();
            formRef.current = null;
            setVouchers([]);
            player.current?.reset();
          }}
        >
          <UserPlus className="size-3.5" />
          {t('newPlayer')}
        </Button>
      </div>

      <div className="flex min-h-0 flex-1 items-center justify-center min-[480px]:p-6">
        <PhoneMockup size="lg" responsiveFrame className="h-full min-[480px]:h-[min(856px,100%)]">
          <CampaignPlayer
            ref={player}
            campaign={playerDoc}
            labels={labels}
            onSubmitForm={onSubmitForm}
            onPlay={onPlay}
            onAction={onAction}
            vouchers={vouchers}
            remainingByPrize={remainingByPrize}
            playDisabled={!testerId}
            rehearsal
          />
          <Chip
            variant="soft"
            color="warning"
            size="sm"
            className="absolute left-2 top-2 z-10 min-[480px]:hidden"
          >
            {t('rehearsal')}
          </Chip>
        </PhoneMockup>
      </div>
    </div>
  );
}
