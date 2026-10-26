'use client';

import type {
  CampaignBrand,
  CampaignPrize,
  CampaignTemplateKey,
  PlayResult,
} from '@playora/contracts';
import { type Ref, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { toCanvasPrizes } from './canvas-prizes';
import { type CanvasRuntime, CanvasScreen } from './canvas-screen';
import {
  EMPTY_FORM,
  type PlayerFormErrors,
  type PlayerFormValues,
  validatePlayerForm,
} from './form-validation';
import type { CampaignPlayerLabels } from './labels';
import { Mechanism } from './mechanism';
import {
  ARTBOARD_WIDTH,
  type ButtonElement,
  type CanvasDoc,
  resolveColor,
  type ScreenKey,
} from './model';
import { PlayerForm } from './player-form';
import {
  type CampaignPlayerRules,
  MyPrizesSheet,
  NoticeSheet,
  type PlayerVoucher,
  RulesSheet,
  VoucherCard,
} from './player-sheets';
import { useReducedMotion } from './use-play-round';

/** What the player renders. Build `screens` from the contract with `toCanvasDoc`. */
export interface CampaignPlayerDocument {
  name: string;
  templateKey: CampaignTemplateKey;
  brand: CampaignBrand;
  screens: CanvasDoc;
  prizes: readonly CampaignPrize[];
  rules: CampaignPlayerRules;
}

/** Imperative controls for host chrome (the Studio lab toolbar). */
export interface CampaignPlayerHandle {
  /** Back to the cover with a fresh round; keeps the form. */
  restart: () => void;
  /** `restart` and forget the form (a new player). */
  reset: () => void;
  openVouchers: () => void;
}

export interface CampaignPlayerProps {
  campaign: CampaignPlayerDocument;
  labels: CampaignPlayerLabels;
  /** Asks the server for one play. The mechanism animates to whatever it returns; reject to let the player retry. */
  onPlay: () => Promise<PlayResult>;
  /** Called with valid form values before the game; reject to stay on the form. */
  onSubmitForm?: (values: PlayerFormValues) => void | Promise<void>;
  /** `link`, `zalo` and `phone` buttons. */
  onAction?: (element: ButtonElement) => void;
  /** "Quà của tôi" content. */
  vouchers: readonly PlayerVoucher[];
  vouchersLoading?: boolean;
  /** Live stock for `prizeList` elements; full quantity otherwise. */
  remainingByPrize?: Record<string, number>;
  /** Turns left today before the first play (`{turns.left}`); later plays report their own. */
  turnsLeft?: number;
  /** Blocks plays (e.g. until the player id is known). */
  playDisabled?: boolean;
  /** Rehearsal note in the rules sheet. */
  rehearsal?: boolean;
  /** What the voucher QR encodes; the bare code otherwise. */
  redeemUrl?: (code: string) => string;
  ref?: Ref<CampaignPlayerHandle>;
}

type Sheet = 'noTurns' | 'closed' | 'vouchers' | 'rules' | null;

/**
 * The playable campaign (docs/product/specs/builder.md §3.1): Cover → Form? → Game → Result, drawn
 * from the campaign's canvas screens, with the voucher card and the "Quà của tôi", rules and
 * notice sheets. Fills its parent (give it a sized, `position: relative` box). No data fetching:
 * every outcome comes from `onPlay` (the server); the mechanism only animates towards it.
 */
export function CampaignPlayer({
  campaign,
  labels,
  onPlay,
  onSubmitForm,
  onAction,
  vouchers,
  vouchersLoading = false,
  remainingByPrize,
  turnsLeft,
  playDisabled = false,
  rehearsal = false,
  redeemUrl,
  ref,
}: CampaignPlayerProps) {
  const reduced = useReducedMotion();

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

  useImperativeHandle(ref, () => ({
    restart,
    reset: () => {
      setForm(EMPTY_FORM);
      setErrors({});
      setFormDone(false);
      restart();
    },
    openVouchers: () => setSheet('vouchers'),
  }));

  const start = () => go(campaign.rules.collectForm && !formDone ? 'form' : 'game');

  const submitForm = async () => {
    const found = validatePlayerForm(form);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    try {
      await onSubmitForm?.(form);
    } catch {
      return;
    }
    setFormDone(true);
    go('game');
  };

  const changeForm = (patch: Partial<PlayerFormValues>) => {
    const next = { ...form, ...patch };
    setForm(next);
    // Once errors are showing, re-check as the player fixes them.
    if (Object.keys(errors).length) setErrors(validatePlayerForm(next));
  };

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

  const turns = result?.turnsLeftToday ?? turnsLeft;
  const runtime: CanvasRuntime = {
    prizes: toCanvasPrizes(campaign, remainingByPrize),
    variables: {
      'player.name': form.name.trim() || labels.defaultName,
      'event.name': campaign.name,
      ...(result?.prize ? { 'prize.name': result.prize.name } : {}),
      ...(turns === undefined ? {} : { 'turns.left': String(turns) }),
    },
    renderStage: () => (
      <Mechanism
        key={round}
        mechanism={campaign.templateKey}
        brand={campaign.brand}
        prizes={campaign.prizes}
        labels={labels.mechanism}
        play={{ onPlay, onDone, disabled: playDisabled }}
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
          else if (screen === 'form') void submitForm();
          else if (screen === 'resultWin') setSheet('vouchers');
          else if (screen === 'resultLose') go('cover');
          break;
        case 'rules':
          setSheet('rules');
          break;
        case 'zalo':
        case 'phone':
        case 'link':
          onAction?.(element);
          break;
      }
    },
  };

  const voucherCode = result?.voucher?.code;

  return (
    <div className="absolute inset-0 overflow-hidden" style={{ background: fillColor }}>
      <div ref={scrollRef} className="absolute inset-0 overflow-y-auto overflow-x-hidden">
        {width > 0 && (
          <CanvasScreen
            screen={doc}
            brand={campaign.brand}
            scale={scale}
            labels={labels.canvas}
            animate={reduced ? undefined : visit}
            runtime={runtime}
          />
        )}
      </div>

      {screen === 'resultWin' && result && voucherCode && (
        <VoucherCard
          result={result}
          redeemUrl={redeemUrl ? redeemUrl(voucherCode) : voucherCode}
          expanded={voucherExpanded}
          onToggle={() => setVoucherExpanded((v) => !v)}
          onOpenPrizes={() => setSheet('vouchers')}
          labels={labels}
        />
      )}

      <NoticeSheet
        kind={sheet === 'noTurns' || sheet === 'closed' ? sheet : null}
        onClose={() => setSheet(null)}
        labels={labels}
      />
      <RulesSheet
        open={sheet === 'rules'}
        onClose={() => setSheet(null)}
        rules={campaign.rules}
        prizes={campaign.prizes}
        rehearsal={rehearsal}
        labels={labels}
      />
      <MyPrizesSheet
        open={sheet === 'vouchers'}
        onClose={() => setSheet(null)}
        vouchers={vouchers}
        loading={vouchersLoading}
        labels={labels}
      />
    </div>
  );
}
