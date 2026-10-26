import type { PlayerFormError } from './form-validation';

/**
 * Every string the campaign renderer shows. `@playora/ui` does not depend on next-intl, so apps
 * build these from the `campaignPlayer` namespace of `@playora/i18n` with
 * `createCampaignPlayerLabels(t, formatDateTime)` and pass them in.
 */

/** Runtime labels for `CanvasScreen` (countdown units, form fields, sample values). */
export interface CanvasLabels {
  days: string;
  hours: string;
  minutes: string;
  seconds: string;
  remaining: (count: number) => string;
  fullName: string;
  phone: string;
  consent: string;
  sampleName: string;
  samplePrize: string;
  sampleEvent: string;
}

export interface MechanismLabels {
  luck: string;
  spin: string;
  wheelLabel: string;
  scratchHere: string;
  scratchLabel: string;
  winTitle: string;
  loseTitle: string;
  pickBox: string;
  boxLabel: (n: number) => string;
}

export interface NoticeLabels {
  title: string;
  body: string;
  ok: string;
  nextTurn?: (time: string) => string;
  openDays?: (days: string) => string;
}

export interface CampaignPlayerLabels {
  canvas: CanvasLabels;
  mechanism: MechanismLabels;
  /** Stands in for `{player.name}` before the player gives a name. */
  defaultName: string;
  myPrizes: string;
  form: {
    namePlaceholder: string;
    phonePlaceholder: string;
    errors: Record<PlayerFormError, string>;
  };
  voucher: { title: string; hint: string; collapse: string; show: string };
  notice: { noTurns: NoticeLabels; closed: NoticeLabels };
  vouchers: {
    title: string;
    empty: string;
    issuedAt: (iso: string) => string;
    redeemed: string;
    notRedeemed: string;
    expired: string;
    void: string;
    unknownPrize: string;
    expiresAt: (iso: string) => string;
    /** Running clock on voucher screens, so a screenshot is easy to tell apart (anti-screenshot). */
    liveClock: (now: Date) => string;
    openPage: string;
  };
  rules: {
    title: string;
    window: (startIso: string, endIso: string) => string;
    hours: (start: string, end: string) => string;
    allDay: string;
    openDays?: (days: string) => string;
    playsPerDay: (count: number) => string;
    maxWins: (count: number) => string;
    form: string;
    prizes: string;
    prizeLine: (name: string, count: number) => string;
    fairness: string;
    redeem: string;
    rehearsalNote: string;
    ok: string;
  };
  redeemFirstMessage?: string;
}

/** Keys used under the `campaignPlayer` message namespace. */
export type CampaignMessageKey =
  | 'render.days'
  | 'render.hours'
  | 'render.minutes'
  | 'render.seconds'
  | 'render.remaining'
  | 'render.fullName'
  | 'render.phone'
  | 'render.consent'
  | 'render.sampleName'
  | 'render.samplePrize'
  | 'render.sampleEvent'
  | 'mechanisms.luck'
  | 'mechanisms.spin'
  | 'mechanisms.wheelLabel'
  | 'mechanisms.scratchHere'
  | 'mechanisms.scratchLabel'
  | 'mechanisms.winTitle'
  | 'mechanisms.loseTitle'
  | 'mechanisms.pickBox'
  | 'mechanisms.boxLabel'
  | 'defaultName'
  | 'myPrizes'
  | 'form.namePlaceholder'
  | 'form.phonePlaceholder'
  | 'form.nameRequired'
  | 'form.phoneInvalid'
  | 'form.consentRequired'
  | 'voucher.title'
  | 'voucher.hint'
  | 'voucher.collapse'
  | 'voucher.show'
  | 'noTurns.title'
  | 'noTurns.body'
  | 'noTurns.nextTurn'
  | 'noTurns.ok'
  | 'closed.title'
  | 'closed.body'
  | 'closed.openDays'
  | 'closed.ok'
  | 'vouchers.title'
  | 'vouchers.empty'
  | 'vouchers.issuedAt'
  | 'vouchers.redeemed'
  | 'vouchers.notRedeemed'
  | 'vouchers.expired'
  | 'vouchers.void'
  | 'vouchers.unknownPrize'
  | 'vouchers.expiresAt'
  | 'vouchers.liveClock'
  | 'vouchers.openPage'
  | 'rules.title'
  | 'rules.window'
  | 'rules.hours'
  | 'rules.allDay'
  | 'rules.openDays'
  | 'rules.playsPerDay'
  | 'rules.maxWins'
  | 'rules.form'
  | 'rules.prizes'
  | 'rules.prizeLine'
  | 'rules.fairness'
  | 'rules.redeem'
  | 'rules.rehearsalNote'
  | 'rules.ok'
  | 'redeemFirstMessage';

/** A translator scoped to `campaignPlayer` (next-intl's `useTranslations('campaignPlayer')` fits). */
export type CampaignTranslate = (
  key: CampaignMessageKey,
  values?: Record<string, string | number>,
) => string;

export type FormatDateTime = (
  value: Date,
  options: { dateStyle?: 'short' | 'medium'; timeStyle?: 'short' | 'medium' },
) => string;

export function createCampaignPlayerLabels(
  t: CampaignTranslate,
  formatDateTime: FormatDateTime,
): CampaignPlayerLabels {
  const notice = (kind: 'noTurns' | 'closed'): NoticeLabels => ({
    title: t(`${kind}.title`),
    body: t(`${kind}.body`),
    ok: t(`${kind}.ok`),
    ...(kind === 'noTurns'
      ? { nextTurn: (time: string) => t('noTurns.nextTurn', { time }) }
      : { openDays: (days: string) => t('closed.openDays', { days }) }),
  });
  const date = (iso: string) => formatDateTime(new Date(iso), { dateStyle: 'medium' });
  return {
    canvas: {
      days: t('render.days'),
      hours: t('render.hours'),
      minutes: t('render.minutes'),
      seconds: t('render.seconds'),
      remaining: (count) => t('render.remaining', { count }),
      fullName: t('render.fullName'),
      phone: t('render.phone'),
      consent: t('render.consent'),
      sampleName: t('render.sampleName'),
      samplePrize: t('render.samplePrize'),
      sampleEvent: t('render.sampleEvent'),
    },
    mechanism: {
      luck: t('mechanisms.luck'),
      spin: t('mechanisms.spin'),
      wheelLabel: t('mechanisms.wheelLabel'),
      scratchHere: t('mechanisms.scratchHere'),
      scratchLabel: t('mechanisms.scratchLabel'),
      winTitle: t('mechanisms.winTitle'),
      loseTitle: t('mechanisms.loseTitle'),
      pickBox: t('mechanisms.pickBox'),
      boxLabel: (n) => t('mechanisms.boxLabel', { n }),
    },
    defaultName: t('defaultName'),
    myPrizes: t('myPrizes'),
    form: {
      namePlaceholder: t('form.namePlaceholder'),
      phonePlaceholder: t('form.phonePlaceholder'),
      errors: {
        nameRequired: t('form.nameRequired'),
        phoneInvalid: t('form.phoneInvalid'),
        consentRequired: t('form.consentRequired'),
      },
    },
    voucher: {
      title: t('voucher.title'),
      hint: t('voucher.hint'),
      collapse: t('voucher.collapse'),
      show: t('voucher.show'),
    },
    notice: { noTurns: notice('noTurns'), closed: notice('closed') },
    vouchers: {
      title: t('vouchers.title'),
      empty: t('vouchers.empty'),
      issuedAt: (iso) =>
        t('vouchers.issuedAt', {
          time: formatDateTime(new Date(iso), { dateStyle: 'short', timeStyle: 'short' }),
        }),
      redeemed: t('vouchers.redeemed'),
      notRedeemed: t('vouchers.notRedeemed'),
      expired: t('vouchers.expired'),
      void: t('vouchers.void'),
      unknownPrize: t('vouchers.unknownPrize'),
      expiresAt: (iso) =>
        t('vouchers.expiresAt', {
          time: formatDateTime(new Date(iso), { dateStyle: 'short', timeStyle: 'short' }),
        }),
      liveClock: (now) =>
        t('vouchers.liveClock', { time: formatDateTime(now, { timeStyle: 'medium' }) }),
      openPage: t('vouchers.openPage'),
    },
    rules: {
      title: t('rules.title'),
      window: (start, end) => t('rules.window', { start: date(start), end: date(end) }),
      hours: (start, end) => t('rules.hours', { start, end }),
      allDay: t('rules.allDay'),
      openDays: (days) => t('rules.openDays', { days }),
      playsPerDay: (count) => t('rules.playsPerDay', { count }),
      maxWins: (count) => t('rules.maxWins', { count }),
      form: t('rules.form'),
      prizes: t('rules.prizes'),
      prizeLine: (name, count) => t('rules.prizeLine', { name, count }),
      fairness: t('rules.fairness'),
      redeem: t('rules.redeem'),
      rehearsalNote: t('rules.rehearsalNote'),
      ok: t('rules.ok'),
    },
    redeemFirstMessage: t('redeemFirstMessage'),
  };
}
