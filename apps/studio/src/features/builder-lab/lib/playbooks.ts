import type {
  CampaignRules,
  CampaignSkinKey,
  CampaignTemplateKey,
  PlaybookKey,
} from '@playora/contracts';

/**
 * Goal-led starting points (docs/product/specs/playbooks.md §1–§2). A playbook is only the initial
 * configuration: template + skin, default rules and a prize mix by weight. The server has no
 * playbook logic; everything stays editable in the builder afterwards. Pure data and functions.
 */

export type { PlaybookKey };

/** Campaigns run on Vietnam time; it has no DST, so a fixed offset is exact. */
export const CAMPAIGN_UTC_OFFSET = '+07:00';
const DAY_MS = 86_400_000;

export interface PlaybookPrize {
  /** Suggested name (seed content, like the starter screens; the owner edits it). */
  name: string;
  /** Suggested cost to the shop (giá vốn) in VND. */
  costVnd: number;
  /** Share of the budget spent on this prize (w_i); normalised over the list. */
  weight: number;
  /** Built-in sticker key (`presetSrc`). */
  image: string;
}

export interface PlaybookDef {
  key: PlaybookKey;
  templateKey: CampaignTemplateKey;
  skinKey: CampaignSkinKey;
  /** Default campaign length in days (inclusive of start and end date). */
  days: number;
  budgetVnd: number;
  guestsPerDay: number;
  openingHours: { start: string; end: string };
  /** Open weekdays (0 = Sunday … 6 = Saturday); null = every day. */
  openDays: number[] | null;
  prizes: PlaybookPrize[];
  /** Rules the playbook fixes; dates, hours, budget and win rate come from the setup form. */
  rules: Pick<
    CampaignRules,
    | 'mode'
    | 'playsPerDay'
    | 'maxWinsPerPlayer'
    | 'pacing'
    | 'collectForm'
    | 'requireRedeemBeforeReplay'
    | 'antiFraud'
  >;
}

export const PLAYBOOKS: Record<PlaybookKey, PlaybookDef> = {
  // "Tết kéo khách": many small prizes so most visits over Tết end with a reason to come back.
  tet_traffic: {
    key: 'tet_traffic',
    templateKey: 'spin-wheel',
    skinKey: 'tet',
    days: 20,
    budgetVnd: 2_000_000,
    guestsPerDay: 80,
    openingHours: { start: '07:00', end: '22:00' },
    openDays: null,
    prizes: [
      { name: 'Size up miễn phí', costVnd: 3_000, weight: 0.4, image: 'coffee' },
      { name: 'Topping miễn phí', costVnd: 5_000, weight: 0.3, image: 'star' },
      { name: 'Ly cà phê muối', costVnd: 20_000, weight: 0.2, image: 'coffee' },
      { name: 'Lì xì 50K', costVnd: 50_000, weight: 0.1, image: 'envelope' },
    ],
    rules: {
      mode: 'overall_win_rate',
      playsPerDay: 1,
      maxWinsPerPlayer: 3,
      pacing: true,
      collectForm: true,
      requireRedeemBeforeReplay: false,
      antiFraud: 'standard',
    },
  },
  // "Khách quay lại lần 2": the next turn opens only after the first prize was redeemed at the counter.
  second_visit: {
    key: 'second_visit',
    templateKey: 'scratch-card',
    skinKey: 'everyday',
    days: 30,
    budgetVnd: 1_500_000,
    guestsPerDay: 50,
    openingHours: { start: '07:00', end: '22:00' },
    openDays: null,
    prizes: [
      { name: 'Size up miễn phí', costVnd: 3_000, weight: 0.6, image: 'coffee' },
      { name: 'Topping miễn phí', costVnd: 5_000, weight: 0.3, image: 'star' },
      { name: 'Giảm 20% hoá đơn', costVnd: 10_000, weight: 0.1, image: 'gift' },
    ],
    rules: {
      mode: 'overall_win_rate',
      playsPerDay: 1,
      maxWinsPerPlayer: 2,
      pacing: true,
      // Name + phone with marketing consent, so the shop can remind the guest to come back.
      collectForm: true,
      requireRedeemBeforeReplay: true,
      antiFraud: 'standard',
    },
  },
  // "Lấp ngày vắng": open only on quiet weekdays, with a richer prize mix to pull guests in.
  slow_days: {
    key: 'slow_days',
    templateKey: 'gift-box',
    skinKey: 'everyday',
    days: 28,
    budgetVnd: 2_000_000,
    guestsPerDay: 40,
    openingHours: { start: '07:00', end: '22:00' },
    openDays: [2, 3, 4],
    prizes: [
      { name: 'Ly nước miễn phí', costVnd: 20_000, weight: 0.5, image: 'coffee' },
      { name: 'Giảm 30% hoá đơn', costVnd: 12_000, weight: 0.3, image: 'gift' },
      { name: 'Combo bánh + nước', costVnd: 40_000, weight: 0.2, image: 'star' },
    ],
    rules: {
      mode: 'overall_win_rate',
      playsPerDay: 1,
      maxWinsPerPlayer: 2,
      pacing: true,
      collectForm: true,
      requireRedeemBeforeReplay: false,
      antiFraud: 'standard',
    },
  },
};

export const PLAYBOOK_KEYS = Object.keys(PLAYBOOKS) as PlaybookKey[];

export function getPlaybook(key: PlaybookKey): PlaybookDef {
  return PLAYBOOKS[key];
}

// ── Dates (local `YYYY-MM-DD` in the campaign time zone) ─────────────────────────

/** Today's date in Vietnam as `YYYY-MM-DD`. */
export function localDate(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(now);
}

/** `YYYY-MM-DD` + n days. */
export function addDays(date: string, days: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);
}

/** Local midnight at the start of `date` as an ISO instant. */
export function startOfLocalDay(date: string): string {
  return new Date(`${date}T00:00:00${CAMPAIGN_UTC_OFFSET}`).toISOString();
}

/** Inclusive number of calendar days from `start` to `end` (0 when end is before start). */
export function daysBetween(start: string, end: string): number {
  const diff = Math.round(
    (Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / DAY_MS,
  );
  return Number.isFinite(diff) ? Math.max(0, diff + 1) : 0;
}

/** Days from `start` to `end` (inclusive) that fall on an open weekday. */
export function openDayCount(
  start: string,
  end: string,
  openDays: readonly number[] | null,
): number {
  const total = daysBetween(start, end);
  if (!openDays) return total;
  const first = new Date(`${start}T00:00:00Z`).getUTCDay();
  let count = 0;
  for (let i = 0; i < total; i++) if (openDays.includes((first + i) % 7)) count++;
  return count;
}

// ── Setup form → campaign ───────────────────────────────────────────────────────

export interface PlaybookSetup {
  name: string;
  budgetVnd: number;
  prizes: { name: string; costVnd: number; weight: number; image?: string }[];
  /** Local dates, inclusive. */
  startDate: string;
  endDate: string;
  openingHours: { start: string; end: string } | null;
  openDays: number[] | null;
  guestsPerDay: number;
}

/** The setup form's starting values for a playbook. */
export function defaultSetup(key: PlaybookKey, name: string, now = new Date()): PlaybookSetup {
  const pb = PLAYBOOKS[key];
  const startDate = localDate(now);
  return {
    name,
    budgetVnd: pb.budgetVnd,
    prizes: pb.prizes.map((p) => ({ ...p })),
    startDate,
    endDate: addDays(startDate, pb.days - 1),
    openingHours: { ...pb.openingHours },
    openDays: pb.openDays ? [...pb.openDays] : null,
    guestsPerDay: pb.guestsPerDay,
  };
}

/**
 * The campaign rules for a playbook and setup. `overallWinRate` is a placeholder until the
 * suggestion engine (`suggest.ts`) picks it.
 */
export function playbookRules(
  key: PlaybookKey,
  setup: Pick<PlaybookSetup, 'budgetVnd' | 'startDate' | 'endDate' | 'openingHours' | 'openDays'>,
  overallWinRate = 0.25,
): CampaignRules {
  const pb = PLAYBOOKS[key];
  const openDays = setup.openDays?.length ? [...setup.openDays].sort((a, b) => a - b) : null;
  return {
    ...pb.rules,
    overallWinRate,
    startsAt: startOfLocalDay(setup.startDate),
    endsAt: startOfLocalDay(addDays(setup.endDate, 1)),
    openingHours: setup.openingHours ? { ...setup.openingHours } : null,
    budgetVnd: setup.budgetVnd,
    openDays: openDays && openDays.length < 7 ? openDays : null,
  };
}
