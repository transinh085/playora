'use client';

import { ApiError } from '@playora/api-client';
import { type PlayResult, type PublicCampaign, playsApi, publicApi } from '@playora/contracts';
import {
  type ButtonElement,
  CampaignPlayer,
  type CampaignPlayerDocument,
  type CampaignPlayerHandle,
  type PlayerFormValues,
  toCanvasDoc,
} from '@playora/ui/campaign';
import { App, Badge, Button, Flex, Tag } from 'antd';
import Script from 'next/script';
import { useFormatter, useTranslations } from 'next-intl';
import { useEffect, useMemo, useRef, useState } from 'react';
import { TurnstileModal, type TurnstileModalHandle } from '@/features/captcha';
import { api, playerApi } from '@/lib/api';
import { buttonActionHref } from './button-action';
import { CampaignFrame } from './campaign-frame';
import { toJoinBody } from './join-body';
import { formatOpenDays } from './open-days';
import { executePlayWithCaptcha } from './play-captcha';
import { isRateLimitedError, PlayRequester } from './play-request';
import { getOrCreateDeviceId, type PlayerSession, usePlayerSession } from './session';
import { useCampaignPlayerLabels } from './use-labels';
import { usePlayerState, usePolling } from './use-player-state';
import { toPlayerVouchers, VOUCHER_POLL_MS } from './vouchers';

/** The token expired and the campaign needs the form again (the form values are not stored). */
class SessionExpiredError extends Error {}

/** The shared player's document from the public campaign. */
export function toPlayerDocument(campaign: PublicCampaign): CampaignPlayerDocument {
  return {
    name: campaign.name,
    templateKey: campaign.templateKey,
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
  };
}

/** Live campaign: the shared `CampaignPlayer` wired to the player API (docs/product/prd.md J2). */
export function CampaignShell({
  campaign,
  channel,
}: {
  campaign: PublicCampaign;
  channel?: string;
}) {
  return (
    <CampaignFrame brand={campaign.brand} skinKey={campaign.skinKey}>
      <CampaignPlay campaign={campaign} channel={channel} />
    </CampaignFrame>
  );
}

function CampaignPlay({ campaign, channel }: { campaign: PublicCampaign; channel?: string }) {
  const { slug } = campaign;
  const t = useTranslations('play');
  const tWeekdays = useTranslations('play.weekdays');
  const tErrors = useTranslations('errors');
  const format = useFormatter();
  const { message } = App.useApp();
  const labels = useCampaignPlayerLabels(
    campaign.collectForm ? campaign.registrationForm : undefined,
  );
  const playerDoc = useMemo(() => toPlayerDocument(campaign), [campaign]);

  const { session, hydrated, setSession, clearSession } = usePlayerSession(slug);
  const sessionRef = useRef<PlayerSession | null>(session);
  sessionRef.current = session;
  // Form values live in memory only (no personal data in localStorage); used to re-join on a 401.
  const formRef = useRef<PlayerFormValues | null>(null);
  const player = useRef<CampaignPlayerHandle>(null);

  const me = usePlayerState(slug, session?.playerToken ?? null, clearSession);
  const [vouchersOpen, setVouchersOpen] = useState(false);
  usePolling(vouchersOpen, me.refresh, VOUCHER_POLL_MS);

  // Turnstile state & ref
  const [captchaModalOpen, setCaptchaModalOpen] = useState(false);
  const turnstileModalRef = useRef<TurnstileModalHandle>(null);
  const captchaTokenRef = useRef<string | null>(null);
  const captchaResolverRef = useRef<{
    resolve: (token: string) => void;
    reject: (err: unknown) => void;
  } | null>(null);

  const acquireCaptchaToken = (): Promise<string> => {
    if (captchaTokenRef.current) return Promise.resolve(captchaTokenRef.current);
    setCaptchaModalOpen(true);
    return new Promise<string>((resolve, reject) => {
      captchaResolverRef.current = { resolve, reject };
    });
  };

  const onCaptchaSuccess = (token: string) => {
    captchaTokenRef.current = token;
    setCaptchaModalOpen(false);
    if (captchaResolverRef.current) {
      captchaResolverRef.current.resolve(token);
      captchaResolverRef.current = null;
    }
  };

  const onCaptchaClose = () => {
    setCaptchaModalOpen(false);
    if (captchaResolverRef.current) {
      captchaResolverRef.current.reject(new Error('Captcha cancelled'));
      captchaResolverRef.current = null;
    }
  };

  // Open Turnstile before first play of the session if captchaSiteKey is set
  useEffect(() => {
    if (campaign.captchaSiteKey && hydrated && !captchaTokenRef.current) {
      setCaptchaModalOpen(true);
    }
  }, [campaign.captchaSiteKey, hydrated]);

  const errorText = (error: unknown, fallback: string) => {
    if (error instanceof ApiError) return tErrors.has(error.code) ? tErrors(error.code) : fallback;
    return t('networkError');
  };

  const join = async (form: PlayerFormValues | null): Promise<string> => {
    const body = toJoinBody({
      deviceId: getOrCreateDeviceId(slug),
      registrationForm: campaign.registrationForm,
      form,
    });
    const joined = await api.call(publicApi.join, { params: { slug }, body });
    sessionRef.current = joined;
    setSession(joined);
    return joined.playerToken;
  };

  /** Joins anonymously on the first play, or again with the in-memory form after a 401. */
  const rejoin = () => {
    if (campaign.collectForm && !formRef.current) throw new SessionExpiredError();
    return join(campaign.collectForm ? formRef.current : null);
  };

  const withPlayerToken = async <T,>(call: (token: string) => Promise<T>): Promise<T> => {
    const token = sessionRef.current?.playerToken ?? (await rejoin());
    try {
      return await call(token);
    } catch (error) {
      if (!(error instanceof ApiError && error.status === 401)) throw error;
      clearSession();
      sessionRef.current = null;
      return call(await rejoin());
    }
  };

  const sendPlay = (requestId: string): Promise<PlayResult> =>
    executePlayWithCaptcha({
      requestId,
      captchaSiteKey: campaign.captchaSiteKey,
      currentCaptchaToken: captchaTokenRef.current,
      channel,
      acquireCaptchaToken,
      resetTurnstile: () => turnstileModalRef.current?.reset(),
      onTokenUpdated: (t) => {
        captchaTokenRef.current = t;
      },
      callPlayApi: (body) =>
        withPlayerToken((playerToken) =>
          playerApi(playerToken).call(playsApi.play, { params: { slug }, body }),
        ),
    });
  const sendRef = useRef(sendPlay);
  sendRef.current = sendPlay;
  const [requester] = useState(
    () => new PlayRequester<PlayResult>({ send: (requestId) => sendRef.current(requestId) }),
  );

  const onSubmitForm = async (values: PlayerFormValues) => {
    formRef.current = values;
    try {
      await join(values);
    } catch (error) {
      message.error(errorText(error, t('joinFailed')));
      throw error;
    }
  };

  const onPlay = async (): Promise<PlayResult> => {
    try {
      const result = await requester.play();
      void me.refresh(sessionRef.current?.playerToken ?? null);
      return result;
    } catch (error) {
      if (isRateLimitedError(error)) {
        message.warning(errorText(error, tErrors('RATE_LIMITED')));
      } else if (error instanceof SessionExpiredError) {
        message.warning(t('sessionExpired'));
        player.current?.reset();
      } else if (error instanceof Error && error.message === 'Captcha cancelled') {
        // user cancelled captcha modal
      } else {
        message.error(errorText(error, t('playFailed')));
      }
      throw error;
    }
  };

  const onAction = (element: ButtonElement) => {
    const href = buttonActionHref(element);
    if (!href) return;
    if (element.action === 'phone') window.location.href = href;
    else window.open(href, '_blank', 'noopener,noreferrer');
  };

  const vouchers = useMemo(() => toPlayerVouchers(me.state?.vouchers ?? []), [me.state]);
  const unredeemed = vouchers.filter((v) => v.status === 'issued').length;
  const turnsLeft = me.state?.turnsLeftToday;

  const nextTurnFormatted = me.state?.nextTurnAt
    ? format.dateTime(new Date(me.state.nextTurnAt), {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: campaign.timezone,
      })
    : null;

  const openDaysFormatted = useMemo(
    () => formatOpenDays(campaign.openDays, (d) => tWeekdays(String(d))),
    [campaign.openDays, tWeekdays],
  );

  return (
    <>
      <CampaignPlayer
        ref={player}
        campaign={playerDoc}
        labels={labels}
        onPlay={onPlay}
        onSubmitForm={onSubmitForm}
        onAction={onAction}
        vouchers={vouchers}
        vouchersLoading={me.loading}
        turnsLeft={turnsLeft}
        playDisabled={!hydrated}
        skipForm={Boolean(session)}
        onVouchersOpenChange={setVouchersOpen}
        prizesHref={`/${slug}/prizes`}
        blockedReason={me.state?.blockedReason ?? null}
        nextTurnAtFormatted={nextTurnFormatted}
        openDaysFormatted={openDaysFormatted}
      />
      <Flex gap="small" align="center" className="absolute top-3 right-3 z-10">
        {turnsLeft !== undefined && (
          <Tag className="m-0" data-testid="turns-left">
            {t('turnsLeft', { count: turnsLeft })}
            {turnsLeft === 0 &&
              nextTurnFormatted &&
              ` · ${t('nextTurnAt', { time: nextTurnFormatted })}`}
          </Tag>
        )}
        <Badge count={unredeemed} size="small">
          <Button shape="round" size="small" onClick={() => player.current?.openVouchers()}>
            {t('myPrizes')}
          </Button>
        </Badge>
      </Flex>
      {campaign.captchaSiteKey && (
        <>
          <Script
            src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
            strategy="lazyOnload"
          />
          <TurnstileModal
            ref={turnstileModalRef}
            open={captchaModalOpen}
            siteKey={campaign.captchaSiteKey}
            title={t('captchaTitle')}
            hint={t('captchaHint')}
            onSuccess={onCaptchaSuccess}
            onClose={onCaptchaClose}
          />
        </>
      )}
    </>
  );
}
