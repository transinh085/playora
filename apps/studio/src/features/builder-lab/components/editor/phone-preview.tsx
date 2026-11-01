'use client';

import type { PlayResult } from '@playora/contracts';
import { Mechanism, toCanvasPrizes } from '@playora/ui/campaign';
import { Button, PhoneMockup, Popover, QRCodeSvg, Tabs, toast } from '@playora/ui/components';
import { Copy, Play, QrCode, RotateCcw, Users } from '@playora/ui/icons';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { useMechanismLabels } from '@/features/canvas-editor/components/use-canvas-labels';
import { SCREEN_KEYS, type ScreenKey } from '@/features/canvas-editor/lib/model';
import { type Campaign, type RehearsalLinkResponse, useRehearsalLink } from '../../api';
import { getTemplate } from '../../lib/starter';
import { FitScreen } from './fit-screen';

/** The idle or interactive mechanism for a campaign, drawn inside its game stage. */
export function CampaignStage({
  campaign,
  interactive = false,
  onPlayed,
}: {
  campaign: Pick<Campaign, 'templateKey' | 'brand' | 'prizes'>;
  interactive?: boolean;
  onPlayed?: (result: PlayResult) => void;
}) {
  const labels = useMechanismLabels();
  const [round, setRound] = useState(0);

  return (
    <Mechanism
      key={round}
      mechanism={getTemplate(campaign.templateKey).mechanism}
      brand={campaign.brand}
      prizes={campaign.prizes}
      labels={labels}
      play={
        interactive
          ? {
              onPlay: async () => {
                const stocked = campaign.prizes.filter((p) => p.quantity > 0);
                const chosen = stocked[round % Math.max(1, stocked.length)] ?? campaign.prizes[0];
                if (!chosen) {
                  return {
                    playId: `preview-${round}`,
                    outcome: 'lose',
                    reason: 'lose',
                    prize: null,
                    voucher: null,
                    turnsLeftToday: 2,
                  };
                }
                return {
                  playId: `preview-${round}`,
                  outcome: 'win',
                  reason: 'win',
                  prize: { id: chosen.id, name: chosen.name, image: chosen.image },
                  voucher: { code: 'DEMO88', expiresAt: null },
                  turnsLeftToday: 2,
                };
              },
              onDone: (res) => {
                setRound((r) => r + 1);
                onPlayed?.(res);
              },
            }
          : undefined
      }
    />
  );
}

/** Live phone preview of one screen, with a screen switcher, interactive test-play, win-prize selector and Mobile QR popover. */
export function PhonePreview({
  campaign,
  screen,
  onScreenChange,
  hideScreenSwitcher = false,
  flush,
}: {
  campaign: Campaign;
  screen: ScreenKey;
  onScreenChange: (screen: ScreenKey) => void;
  hideScreenSwitcher?: boolean;
  flush?: () => Promise<boolean>;
}) {
  const t = useTranslations('builderLab.editor.screens');
  const tEditor = useTranslations('builderLab.editor');
  const [selectedPrizeId, setSelectedPrizeId] = useState<string | null>(
    campaign.prizes[0]?.id ?? null,
  );
  const [interactive, setInteractive] = useState(true);
  const doc = campaign.screens[screen];

  useEffect(() => {
    if (!campaign.prizes.some((p) => p.id === selectedPrizeId)) {
      setSelectedPrizeId(campaign.prizes[0]?.id ?? null);
    }
  }, [campaign.prizes, selectedPrizeId]);

  const activePrize =
    campaign.prizes.find((p) => p.id === selectedPrizeId) ?? campaign.prizes[0] ?? null;

  return (
    <div className="flex w-full flex-col items-center gap-3">
      {!hideScreenSwitcher && (
        <div className="flex flex-wrap items-center justify-center gap-2 max-w-full">
          <div className="max-w-full overflow-x-auto">
            <Tabs
              selectedKey={screen}
              onSelectionChange={(key) => onScreenChange(key as ScreenKey)}
            >
              <Tabs.ListContainer>
                <Tabs.List aria-label="Screens">
                  {SCREEN_KEYS.map((key) => (
                    <Tabs.Tab key={key} id={key} className="px-3 py-1 text-xs font-medium">
                      {t(key)}
                      <Tabs.Indicator />
                    </Tabs.Tab>
                  ))}
                </Tabs.List>
              </Tabs.ListContainer>
            </Tabs>
          </div>
          <MobileQrPopover campaign={campaign} flush={flush} />
        </div>
      )}

      {screen === 'resultWin' && campaign.prizes.length > 0 && (
        <div
          data-testid="preview-prize-selector"
          className="flex flex-wrap items-center justify-center gap-1.5 px-2"
        >
          <span className="text-[11px] font-medium text-text-secondary">
            {tEditor('previewWinPrize')}
          </span>
          {campaign.prizes.map((prize) => {
            const active = prize.id === (activePrize?.id ?? '');
            return (
              <button
                key={prize.id}
                type="button"
                data-testid={`preview-prize-pill-${prize.id}`}
                onClick={() => setSelectedPrizeId(prize.id)}
                className={`cursor-pointer rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors ${
                  active
                    ? 'border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-neutral-900'
                    : 'border-neutral-200 bg-card text-text-secondary hover:border-neutral-400 dark:border-white/15'
                }`}
              >
                {prize.name}
              </button>
            );
          })}
        </div>
      )}

      {screen === 'game' && (
        <div className="flex items-center justify-center">
          <Button
            type="button"
            size="sm"
            variant={interactive ? 'primary' : 'secondary'}
            data-testid="interactive-preview-toggle"
            onPress={() => setInteractive((v) => !v)}
            className="h-7 gap-1.5 rounded-full px-3 text-xs"
          >
            <Play className="size-3" />
            <span>{interactive ? tEditor('interactivePreview') : tEditor('staticPreview')}</span>
          </Button>
        </div>
      )}

      <PhoneMockup size="md" data-testid="quick-edit-preview">
        <FitScreen
          key={`${screen}-${activePrize?.id ?? 'none'}`}
          screen={doc}
          brand={campaign.brand}
          prizes={toCanvasPrizes(campaign)}
          endsAt={campaign.rules.endsAt}
          variables={{
            'event.name': campaign.name,
            ...(activePrize ? { 'prize.name': activePrize.name } : {}),
          }}
          onButton={(el) => {
            if (el.action === 'start') {
              onScreenChange(campaign.rules.collectForm ? 'form' : 'game');
            } else if (el.action === 'next') {
              onScreenChange(screen === 'cover' || screen === 'form' ? 'game' : 'cover');
            }
          }}
          scroll
          animate={0}
          stage={
            <CampaignStage
              campaign={campaign}
              interactive={interactive}
              onPlayed={(res) => {
                if (res.prize) setSelectedPrizeId(res.prize.id);
                onScreenChange(res.outcome === 'win' ? 'resultWin' : 'resultLose');
              }}
            />
          }
        />
      </PhoneMockup>
    </div>
  );
}

function MobileQrPopover({
  campaign,
  flush,
}: {
  campaign: Campaign;
  flush?: () => Promise<boolean>;
}) {
  const tEditor = useTranslations('builderLab.editor');
  const [open, setOpen] = useState(false);
  const [linkInfo, setLinkInfo] = useState<RehearsalLinkResponse | null>(null);
  const rehearsalLink = useRehearsalLink(campaign.organizationId, campaign.id);

  const loadLink = async (rotate = false) => {
    await flush?.();
    try {
      const res = await rehearsalLink.mutateAsync({ rotate });
      setLinkInfo(res);
      if (rotate) {
        toast.success(tEditor('mobileQrRotated'));
      }
    } catch {
      // Fallback remains accessible via rehearsal URL
    }
  };

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen && !linkInfo && !rehearsalLink.isPending) {
      void loadLink(false);
    }
  };

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const draftPath = linkInfo
    ? `/draft/${linkInfo.token}`
    : `/orgs/${campaign.organizationId}/campaigns/${campaign.id}/rehearsal`;
  const fullUrl = `${origin}${draftPath}`;

  return (
    <Popover isOpen={open} onOpenChange={handleOpenChange}>
      <Popover.Trigger>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          data-testid="mobile-qr-trigger"
          aria-label={tEditor('mobileQr')}
          className="h-8 gap-1.5 rounded-lg text-xs"
        >
          <QrCode className="size-3.5" />
          <span className="hidden sm:inline">{tEditor('mobileQr')}</span>
        </Button>
      </Popover.Trigger>
      <Popover.Content placement="bottom end">
        <Popover.Dialog
          aria-label={tEditor('mobileQrTitle')}
          data-testid="mobile-qr-popover"
          className="w-72 space-y-3 p-4"
        >
          <div>
            <p className="font-semibold text-sm">{tEditor('mobileQrTitle')}</p>
            <p className="mt-0.5 text-xs text-text-secondary">
              {tEditor('mobileQrHint', { max: linkInfo?.maxTesters ?? 20 })}
            </p>
          </div>
          <div className="flex justify-center rounded-xl border bg-white p-3">
            <QRCodeSvg value={fullUrl} size={160} />
          </div>
          <div className="flex items-center justify-between text-xs text-text-secondary">
            <span
              className="inline-flex items-center gap-1 font-medium"
              data-testid="mobile-qr-testers"
            >
              <Users className="size-3.5" />
              {tEditor('mobileQrTesters', {
                count: linkInfo?.testerCount ?? 0,
                max: linkInfo?.maxTesters ?? 20,
              })}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              isDisabled={rehearsalLink.isPending}
              data-testid="mobile-qr-rotate"
              onPress={() => void loadLink(true)}
              className="h-7 gap-1 px-2 text-xs"
            >
              <RotateCcw className="size-3" />
              <span>{tEditor('mobileQrRotate')}</span>
            </Button>
          </div>
          <div className="flex items-center gap-1.5">
            <input
              readOnly
              value={fullUrl}
              data-testid="mobile-qr-url"
              className="h-8 min-w-0 flex-1 rounded-md border bg-muted/40 px-2 font-mono text-[11px]"
            />
            <Button
              type="button"
              variant="secondary"
              size="sm"
              data-testid="mobile-qr-copy"
              onPress={() => {
                void navigator.clipboard?.writeText(fullUrl);
                toast.success(tEditor('mobileQrCopied'));
              }}
              className="h-8 shrink-0 gap-1 px-2.5 text-xs"
            >
              <Copy className="size-3.5" />
              <span>{tEditor('mobileQrCopy')}</span>
            </Button>
          </div>
        </Popover.Dialog>
      </Popover.Content>
    </Popover>
  );
}
