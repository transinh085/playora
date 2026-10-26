import { decide, type PrizeRulesInput, type SimulationResult, simulate } from '@playora/core/prize';
import { campaignPhase } from '../lib/phase';
import { readDb, updateDb } from './db';
import { buildScreens, defaultPrizes, defaultRules, getSkin } from './templates';
import type {
  Campaign,
  CampaignStats,
  PlayRecord,
  PlayResult,
  SkinKey,
  TemplateKey,
  Voucher,
} from './types';

/**
 * Mock of the future API (docs/product/roadmap.md P0). Every function is async and shaped like an endpoint so
 * the UI already handles loading and errors. The prize decision runs the real engine from
 * `@playora/core/prize`; only storage is fake. The server-decides rule still holds: UI code never
 * picks an outcome, it asks `startPlay`.
 */

const LATENCY_MS = 120;
const wait = <T>(value: T) =>
  new Promise<T>((resolve) => setTimeout(() => resolve(value), LATENCY_MS));

export class LabApiError extends Error {
  constructor(
    readonly code:
      | 'NOT_FOUND'
      | 'NOT_PUBLISHED'
      | 'INVALID_RULES'
      | 'VOUCHER_NOT_FOUND'
      | 'VOUCHER_REDEEMED'
      | 'CAMPAIGN_RUNNING',
    message?: string,
  ) {
    super(message ?? code);
  }
}

function findCampaign(id: string): Campaign {
  const campaign = readDb().campaigns.find((c) => c.id === id);
  if (!campaign) throw new LabApiError('NOT_FOUND');
  return campaign;
}

const dayKey = (iso: string, timeZone = 'Asia/Ho_Chi_Minh') =>
  new Intl.DateTimeFormat('en-CA', { timeZone }).format(new Date(iso));

function voucherCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += alphabet[Math.floor(Math.random() * alphabet.length)];
  return code;
}

// ── Campaigns ────────────────────────────────────────────────────────────────────

export async function listCampaigns(orgId?: string): Promise<Campaign[]> {
  return wait(
    readDb()
      .campaigns.filter((c) => !orgId || !c.orgId || c.orgId === orgId)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
  );
}

export async function getCampaign(id: string): Promise<Campaign> {
  return wait(findCampaign(id));
}

export async function createCampaign(input: {
  orgId?: string;
  name: string;
  templateKey: TemplateKey;
  skinKey: SkinKey;
  /** Colours from the organization's brand kit; defaults to the skin's palette. */
  brand?: Partial<Campaign['brand']>;
}): Promise<Campaign> {
  const now = new Date().toISOString();
  const campaign: Campaign = {
    id: crypto.randomUUID(),
    orgId: input.orgId,
    name: input.name,
    templateKey: input.templateKey,
    skinKey: input.skinKey,
    brand: { ...getSkin(input.skinKey).brand, ...input.brand },
    screens: buildScreens(input.templateKey, input.skinKey),
    prizes: defaultPrizes(),
    rules: defaultRules(),
    status: 'draft',
    version: 0,
    publishedAt: null,
    updatedAt: now,
    createdAt: now,
  };
  updateDb((db) => db.campaigns.push(campaign));
  return wait(campaign);
}

/** Saves a draft. Editing a published campaign keeps it live on its published version (12 §4.3). */
export async function updateCampaign(
  id: string,
  patch: Partial<Omit<Campaign, 'id' | 'createdAt' | 'status' | 'version' | 'publishedAt'>>,
): Promise<Campaign> {
  const updated = updateDb((db) => {
    const index = db.campaigns.findIndex((c) => c.id === id);
    const current = db.campaigns[index];
    if (!current) throw new LabApiError('NOT_FOUND');
    const next = { ...current, ...patch, updatedAt: new Date().toISOString() };
    db.campaigns[index] = next;
    return next;
  });
  return wait(updated);
}

/** A running campaign must be paused or ended first (docs/product/specs/builder.md §6). */
export async function deleteCampaign(id: string): Promise<void> {
  const phase = campaignPhase(findCampaign(id));
  if (phase === 'live' || phase === 'scheduled') throw new LabApiError('CAMPAIGN_RUNNING');
  updateDb((db) => {
    db.campaigns = db.campaigns.filter((c) => c.id !== id);
    db.plays = db.plays.filter((p) => p.campaignId !== id);
    db.vouchers = db.vouchers.filter((v) => v.campaignId !== id);
  });
  return wait(undefined);
}

export async function publishCampaign(id: string): Promise<Campaign> {
  try {
    toEngineRules(findCampaign(id), false);
  } catch (error) {
    throw new LabApiError('INVALID_RULES', (error as Error).message);
  }
  const published = updateDb((db) => {
    const index = db.campaigns.findIndex((c) => c.id === id);
    const current = db.campaigns[index] as Campaign;
    const now = new Date().toISOString();
    const next: Campaign = {
      ...current,
      status: 'published',
      version: current.version + 1,
      publishedAt: now,
      updatedAt: now,
    };
    db.campaigns[index] = next;
    return next;
  });
  return wait(published);
}

function patchCampaign(id: string, patch: (c: Campaign) => Partial<Campaign>): Campaign {
  return updateDb((db) => {
    const index = db.campaigns.findIndex((c) => c.id === id);
    const current = db.campaigns[index];
    if (!current) throw new LabApiError('NOT_FOUND');
    const next = { ...current, ...patch(current), updatedAt: new Date().toISOString() };
    db.campaigns[index] = next;
    return next;
  });
}

export async function pauseCampaign(id: string): Promise<Campaign> {
  return wait(patchCampaign(id, () => ({ paused: true })));
}

export async function resumeCampaign(id: string): Promise<Campaign> {
  return wait(patchCampaign(id, () => ({ paused: false })));
}

/** Ends now by moving the end time; extending later sets a new end time and keeps all data. */
export async function endCampaign(id: string): Promise<Campaign> {
  return wait(
    patchCampaign(id, (c) => ({
      paused: false,
      rules: { ...c.rules, endsAt: new Date().toISOString() },
    })),
  );
}

export async function listCampaignPlays(campaignId: string): Promise<PlayRecord[]> {
  return wait(
    readDb()
      .plays.filter((p) => p.campaignId === campaignId && !p.rehearsal && p.outcome !== 'no_turns')
      .sort((a, b) => b.at.localeCompare(a.at)),
  );
}

export async function listCampaignVouchers(campaignId: string): Promise<Voucher[]> {
  return wait(
    readDb()
      .vouchers.filter((v) => v.campaignId === campaignId && !v.rehearsal)
      .sort((a, b) => b.issuedAt.localeCompare(a.issuedAt)),
  );
}

// ── Prize engine bridge ──────────────────────────────────────────────────────────

/**
 * Maps lab rules to the engine's `PrizeRules`. Rehearsal (draft test link, docs/product/specs/builder.md §4.1) ignores
 * the schedule and pacing so testers always get a real roll.
 */
export function toEngineRules(campaign: Campaign, rehearsal: boolean): PrizeRulesInput {
  const { rules, prizes } = campaign;
  const now = Date.now();
  return {
    mode: rules.mode,
    prizes: prizes.map((p, i) => ({
      id: p.id,
      quantity: p.quantity,
      valueVnd: p.valueVnd,
      probability: rules.mode === 'per_prize_probability' ? (p.probability ?? 0) : undefined,
      sortOrder: i,
    })),
    overallWinRate: rules.mode === 'overall_win_rate' ? rules.overallWinRate : undefined,
    limits: { perPlayerTotal: Math.max(1, rules.maxWinsPerPlayer) },
    budgetVnd: rules.budgetVnd ?? undefined,
    pacing: { strategy: rules.pacing && !rehearsal ? 'time_uniform' : 'none' },
    openingHours:
      rules.openingHours && !rehearsal
        ? [{ start: rules.openingHours.start, end: rules.openingHours.end }]
        : undefined,
    window: rehearsal
      ? { startsAt: now - 86_400_000, endsAt: now + 86_400_000 }
      : { startsAt: rules.startsAt, endsAt: rules.endsAt },
  };
}

// ── Plays ────────────────────────────────────────────────────────────────────────

/**
 * Starts one play: checks turns, asks the prize engine, records the play and issues a voucher
 * on a win. `rehearsal` plays use their own stock and never touch live numbers.
 */
export async function startPlay(input: {
  campaignId: string;
  playerId: string;
  rehearsal: boolean;
}): Promise<PlayResult> {
  const result = updateDb((db): PlayResult => {
    const campaign = db.campaigns.find((c) => c.id === input.campaignId);
    if (!campaign) throw new LabApiError('NOT_FOUND');
    if (!input.rehearsal && campaign.status !== 'published') throw new LabApiError('NOT_PUBLISHED');
    if (!input.rehearsal && campaign.paused) {
      return {
        outcome: 'closed',
        reason: 'paused',
        prize: null,
        voucherCode: null,
        turnsLeftToday: 0,
      };
    }

    const now = new Date();
    const today = dayKey(now.toISOString());
    const sameRun = (r: { campaignId: string; rehearsal: boolean }) =>
      r.campaignId === campaign.id && r.rehearsal === input.rehearsal;
    const myPlaysToday = db.plays.filter(
      (p) =>
        sameRun(p) &&
        p.playerId === input.playerId &&
        dayKey(p.at) === today &&
        p.outcome !== 'no_turns',
    ).length;
    const turnsLeft = campaign.rules.playsPerDay - myPlaysToday;

    const record = (
      outcome: PlayRecord['outcome'],
      reason: string,
      prizeId: string | null,
      code: string | null,
    ) =>
      db.plays.push({
        id: crypto.randomUUID(),
        campaignId: campaign.id,
        playerId: input.playerId,
        rehearsal: input.rehearsal,
        at: now.toISOString(),
        outcome,
        reason,
        prizeId,
        voucherCode: code,
      });

    if (turnsLeft <= 0) {
      return {
        outcome: 'no_turns',
        reason: 'no_turns',
        prize: null,
        voucherCode: null,
        turnsLeftToday: 0,
      };
    }

    const issued = db.vouchers.filter(sameRun);
    const mine = issued.filter((v) => v.playerId === input.playerId);
    const remainingByPrize: Record<string, number> = {};
    let budgetUsedVnd = 0;
    for (const prize of campaign.prizes) {
      const count = issued.filter((v) => v.prizeId === prize.id).length;
      remainingByPrize[prize.id] = Math.max(0, prize.quantity - count);
      budgetUsedVnd += count * prize.valueVnd;
    }
    const byPrize: Record<string, number> = {};
    for (const v of mine) byPrize[v.prizeId] = (byPrize[v.prizeId] ?? 0) + 1;

    const decision = decide({
      rules: toEngineRules(campaign, input.rehearsal),
      snapshot: {
        remainingByPrize,
        budgetUsedVnd,
        playerAwards: {
          total: mine.length,
          today: mine.filter((v) => dayKey(v.issuedAt) === today).length,
          byPrize,
        },
      },
      now,
      rng: Math.random,
    });

    if (decision.reason === 'closed') {
      record('closed', 'closed', null, null);
      return {
        outcome: 'closed',
        reason: 'closed',
        prize: null,
        voucherCode: null,
        turnsLeftToday: turnsLeft,
      };
    }

    const prize = campaign.prizes.find((p) => p.id === decision.prizeId) ?? null;
    let code: string | null = null;
    if (prize) {
      code = voucherCode();
      db.vouchers.push({
        code,
        campaignId: campaign.id,
        prizeId: prize.id,
        playerId: input.playerId,
        rehearsal: input.rehearsal,
        issuedAt: now.toISOString(),
        redeemedAt: null,
      });
    }
    record(prize ? 'win' : 'lose', decision.reason, prize?.id ?? null, code);
    return {
      outcome: prize ? 'win' : 'lose',
      reason: decision.reason,
      prize,
      voucherCode: code,
      turnsLeftToday: turnsLeft - 1,
    };
  });
  return wait(result);
}

export async function listMyVouchers(input: { campaignId: string; playerId: string }) {
  const db = readDb();
  const campaign = db.campaigns.find((c) => c.id === input.campaignId);
  const vouchers = db.vouchers
    .filter((v) => v.campaignId === input.campaignId && v.playerId === input.playerId)
    .sort((a, b) => b.issuedAt.localeCompare(a.issuedAt))
    .map((v) => ({ ...v, prize: campaign?.prizes.find((p) => p.id === v.prizeId) ?? null }));
  return wait(vouchers);
}

// ── Redemption (staff) ───────────────────────────────────────────────────────────

export async function lookupVoucher(code: string) {
  const db = readDb();
  const voucher = db.vouchers.find((v) => v.code === code.trim().toUpperCase());
  if (!voucher) throw new LabApiError('VOUCHER_NOT_FOUND');
  const campaign = db.campaigns.find((c) => c.id === voucher.campaignId);
  return wait({
    voucher,
    campaignName: campaign?.name ?? '',
    prize: campaign?.prizes.find((p) => p.id === voucher.prizeId) ?? null,
  });
}

/** Redeeming is final, like 凡科's 核销 (docs/research/guandayun-teardown.md §3.4). */
export async function redeemVoucher(code: string): Promise<Voucher> {
  const voucher = updateDb((db) => {
    const v = db.vouchers.find((x) => x.code === code.trim().toUpperCase());
    if (!v) throw new LabApiError('VOUCHER_NOT_FOUND');
    if (v.redeemedAt) throw new LabApiError('VOUCHER_REDEEMED');
    v.redeemedAt = new Date().toISOString();
    return { ...v };
  });
  return wait(voucher);
}

// ── Reporting & simulation ───────────────────────────────────────────────────────

export async function getCampaignStats(campaignId: string): Promise<CampaignStats> {
  const db = readDb();
  const campaign = db.campaigns.find((c) => c.id === campaignId);
  const plays = db.plays.filter(
    (p) => p.campaignId === campaignId && !p.rehearsal && p.outcome !== 'no_turns',
  );
  const vouchers = db.vouchers.filter((v) => v.campaignId === campaignId && !v.rehearsal);
  const remainingByPrize: Record<string, number> = {};
  let budgetUsedVnd = 0;
  for (const prize of campaign?.prizes ?? []) {
    const count = vouchers.filter((v) => v.prizeId === prize.id).length;
    remainingByPrize[prize.id] = prize.quantity - count;
    budgetUsedVnd += count * prize.valueVnd;
  }
  return wait({
    plays: plays.length,
    players: new Set(plays.map((p) => p.playerId)).size,
    wins: vouchers.length,
    redeemed: vouchers.filter((v) => v.redeemedAt).length,
    budgetUsedVnd,
    remainingByPrize,
  });
}

/** A café's day: quiet morning, lunch and late-afternoon peaks (share of daily visits per hour). */
export const CAFE_TRAFFIC_SHAPE = [
  0, 0, 0, 0, 0, 0, 0.02, 0.06, 0.08, 0.07, 0.06, 0.08, 0.1, 0.08, 0.06, 0.07, 0.08, 0.07, 0.05,
  0.04, 0.03, 0.02, 0.01, 0,
];

/** "If N customers play each day, what happens to my prizes?" (docs/product/specs/prizes-redemption.md §5). */
export function simulateCampaign(
  campaign: Campaign,
  input: { playersPerDay: number; days?: number },
): SimulationResult {
  const rules = toEngineRules(campaign, false);
  const days =
    input.days ??
    Math.max(
      1,
      Math.round(
        (Date.parse(campaign.rules.endsAt) - Date.parse(campaign.rules.startsAt)) / 86_400_000,
      ),
    );
  const playsPerDay = input.playersPerDay * campaign.rules.playsPerDay;
  return simulate({
    rules: {
      ...rules,
      window: { startsAt: campaign.rules.startsAt, endsAt: campaign.rules.endsAt },
    },
    traffic: CAFE_TRAFFIC_SHAPE.map((share) => share * playsPerDay),
    players: Math.max(1, input.playersPerDay * Math.min(days, 7)),
    days,
    seed: campaign.id,
  });
}
