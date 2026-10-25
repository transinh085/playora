'use client';

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
import type { Route } from 'next';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { type CSSProperties, type ReactNode, useEffect, useRef, useState } from 'react';
import {
  type CanvasRuntime,
  CanvasScreen,
} from '@/features/canvas-editor/components/canvas-screen';
import { useCanvasLabels } from '@/features/canvas-editor/components/use-canvas-labels';
import { ARTBOARD_WIDTH, resolveColor, type ScreenKey } from '@/features/canvas-editor/lib/model';
import { Mechanism } from '../mechanisms/mechanism';
import { useReducedMotion } from '../mechanisms/use-play-round';
import { LabApiError } from '../mock/api';
import { useCampaign, useCampaignStats, useLabSync, useStartPlay } from '../mock/hooks';
import type { Campaign, PlayResult } from '../mock/types';
import { toCanvasPrizes } from './editor/to-canvas-prizes';
import {
  EMPTY_FORM,
  type PlayerFormErrors,
  type PlayerFormValues,
  validatePlayerForm,
} from './player/form-validation';
import { PlayerForm } from './player/player-form';
import { MyPrizesSheet, NoticeSheet, RulesSheet, VoucherCard } from './player/player-sheets';
import { usePlayerId } from './player/use-player-id';

/**
 * The playable campaign (docs/12 §3.1): Cover → Form? → Game → Result → award detail, drawn from
 * the campaign's canvas screens. On desktop it sits in a phone frame with a lab toolbar; on a
 * phone it fills the screen. Every outcome comes from `startPlay` (the server); the mechanism
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
  const base = `/orgs/${orgId}/labs`;

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
          <Link href={`${base}/builder` as Route}>
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
            <Link href={`${base}/play/${campaignId}?rehearsal=1` as Route}>
              <Button type="primary">{t('errors.openRehearsal')}</Button>
            </Link>
            <Link href={`${base}/builder/${campaignId}` as Route}>
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

type Sheet = 'noTurns' | 'closed' | 'vouchers' | 'rules' | null;

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
  const labels = useCanvasLabels();
  const { message } = App.useApp();
  const { token } = theme.useToken();
  const reduced = useReducedMotion();
  const startPlay = useStartPlay();
  // Live stock for prize-list elements (rehearsal plays never change it).
  const stats = useCampaignStats(campaign.id).data;
  const [playerId, resetPlayer] = usePlayerId(campaign.id);

  const [screen, setScreen] = useState<ScreenKey>('cover');
  const [visit, setVisit] = useState(0);
  const [round, setRound] = useState(0);
  const [result, setResult] = useState<PlayResult | null>(null);
  const [form, setForm] = useState<PlayerFormValues>(EMPTY_FORM);
  const [errors, setErrors] = useState<PlayerFormErrors>({});
  const [formDone, setFormDone] = useState(false);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [voucherExpanded, setVoucherExpanded] = useState(true);

  const scrollRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const measure = () => setWidth(el.clientWidth);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const doc = campaign.screens[screen];
  const scale = width / ARTBOARD_WIDTH;
  const fillColor = resolveColor(doc.background.gradientTo ?? doc.background.color, campaign.brand);

  const go = (next: ScreenKey) => {
    setScreen(next);
    setVisit((v) => v + 1);
    scrollRef.current?.scrollTo({ top: 0 });
  };

  const restart = () => {
    setResult(null);
    setSheet(null);
    setRound((r) => r + 1);
    go('cover');
  };

  const newPlayer = () => {
    resetPlayer();
    setForm(EMPTY_FORM);
    setErrors({});
    setFormDone(false);
    restart();
    message.success(t('newPlayerDone'));
  };

  const start = () => go(campaign.rules.collectForm && !formDone ? 'form' : 'game');

  const submitForm = () => {
    const found = validatePlayerForm(form);
    setErrors(found);
    if (Object.keys(found).length === 0) {
      setFormDone(true);
      go('game');
    }
  };

  const changeForm = (patch: Partial<PlayerFormValues>) => {
    const next = { ...form, ...patch };
    setForm(next);
    // Once errors are showing, re-check as the player fixes them.
    if (Object.keys(errors).length) setErrors(validatePlayerForm(next));
  };

  const onPlay = () =>
    startPlay.mutateAsync({ campaignId: campaign.id, playerId, rehearsal }).catch((error) => {
      message.error(
        error instanceof LabApiError && error.code === 'NOT_PUBLISHED'
          ? t('errors.notPublishedBody')
          : t('errors.playFailed'),
      );
      throw error;
    });

  const onDone = (played: PlayResult) => {
    switch (played.outcome) {
      case 'win':
        setResult(played);
        setVoucherExpanded(true);
        go('resultWin');
        break;
      case 'lose':
        // Out of stock, paced, limit and budget all read as "not this time" to the player.
        setResult(played);
        go('resultLose');
        break;
      case 'no_turns':
        setSheet('noTurns');
        setRound((r) => r + 1);
        break;
      case 'closed':
        setSheet('closed');
        setRound((r) => r + 1);
        break;
    }
  };

  const runtime: CanvasRuntime = {
    prizes: toCanvasPrizes(campaign, stats?.remainingByPrize),
    variables: {
      'player.name': form.name.trim() || t('defaultName'),
      'event.name': campaign.name,
      ...(result?.prize ? { 'prize.name': result.prize.name } : {}),
    },
    renderStage: () => (
      <Mechanism
        key={round}
        mechanism={campaign.templateKey}
        brand={campaign.brand}
        prizes={campaign.prizes}
        play={{ onPlay, onDone, disabled: !playerId }}
      />
    ),
    renderForm: (element) => (
      <PlayerForm
        element={element}
        brand={campaign.brand}
        labels={labels}
        values={form}
        errors={errors}
        onChange={changeForm}
      />
    ),
    onButton: (element) => {
      switch (element.action) {
        case 'start':
          start();
          break;
        case 'next':
          if (screen === 'cover') start();
          else if (screen === 'form') submitForm();
          else if (screen === 'resultWin') setSheet('vouchers');
          else if (screen === 'resultLose') go('cover');
          break;
        case 'rules':
          setSheet('rules');
          break;
        case 'zalo':
        case 'phone':
        case 'link':
          message.info(t(`actions.${element.action}`));
          break;
      }
    },
  };

  const redeemUrl =
    result?.voucherCode && typeof window !== 'undefined'
      ? `${window.location.origin}/orgs/${orgId}/labs/redeem?code=${result.voucherCode}`
      : '';

  return (
    <>
      <Flex
        align="center"
        gap="small"
        className="px-4 py-3 max-[479px]:hidden"
        style={{ borderBottom: `1px solid ${token.colorBorderSecondary}` }}
      >
        <Tooltip title={t('backToEditor')}>
          <Link href={`/orgs/${orgId}/labs/builder/${campaign.id}` as Route}>
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
        <Button icon={<Gift size={16} />} onClick={() => setSheet('vouchers')}>
          {t('myPrizes')}
        </Button>
        <Button icon={<RotateCcw size={16} />} onClick={restart}>
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
                background: fillColor,
              } as CSSProperties
            }
          >
            <div ref={scrollRef} className="absolute inset-0 overflow-y-auto overflow-x-hidden">
              {width > 0 && (
                <CanvasScreen
                  screen={doc}
                  brand={campaign.brand}
                  scale={scale}
                  labels={labels}
                  animate={reduced ? undefined : visit}
                  runtime={runtime}
                />
              )}
            </div>

            {rehearsal && (
              <Tag color="gold" className="absolute top-2 left-2 z-10 min-[480px]:hidden">
                {t('rehearsal')}
              </Tag>
            )}

            {screen === 'resultWin' && result && (
              <VoucherCard
                result={result}
                redeemUrl={redeemUrl}
                expanded={voucherExpanded}
                onToggle={() => setVoucherExpanded((v) => !v)}
                onOpenPrizes={() => setSheet('vouchers')}
              />
            )}

            <NoticeSheet
              kind={sheet === 'noTurns' || sheet === 'closed' ? sheet : null}
              onClose={() => setSheet(null)}
            />
            <RulesSheet
              open={sheet === 'rules'}
              onClose={() => setSheet(null)}
              campaign={campaign}
              rehearsal={rehearsal}
            />
            <MyPrizesSheet
              open={sheet === 'vouchers'}
              onClose={() => setSheet(null)}
              campaignId={campaign.id}
              playerId={playerId}
              rehearsal={rehearsal}
            />
          </div>
        </ConfigProvider>
      </div>
    </>
  );
}
