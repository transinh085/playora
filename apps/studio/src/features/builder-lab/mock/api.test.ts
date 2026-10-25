/// <reference types="bun" />
import { beforeEach, describe, expect, test } from 'bun:test';

// Minimal browser globals for the localStorage-backed mock db.
const memory = new Map<string, string>();
Object.assign(globalThis, {
  window: {
    localStorage: {
      getItem: (k: string) => memory.get(k) ?? null,
      setItem: (k: string, v: string) => memory.set(k, v),
      removeItem: (k: string) => memory.delete(k),
    },
    addEventListener() {},
    removeEventListener() {},
  },
});

const api = await import('./api');
const { resetDb } = await import('./db');

async function publishedCampaign(patch: Parameters<typeof api.updateCampaign>[1] = {}) {
  const campaign = await api.createCampaign({
    name: 'Test',
    templateKey: 'spin-wheel',
    skinKey: 'tet',
  });
  await api.updateCampaign(campaign.id, {
    rules: { ...campaign.rules, openingHours: null, pacing: false, ...patch.rules },
    ...(patch.prizes ? { prizes: patch.prizes } : {}),
  });
  return api.publishCampaign(campaign.id);
}

describe('builder lab mock api', () => {
  beforeEach(() => resetDb());

  test('a new campaign starts as a draft with template screens, prizes and rules', async () => {
    const campaign = await api.createCampaign({
      name: 'Tết',
      templateKey: 'gift-box',
      skinKey: 'tet',
    });
    expect(campaign.status).toBe('draft');
    expect(campaign.screens.game.elements.some((e) => e.type === 'gameStage')).toBe(true);
    expect(campaign.screens.cover.elements.some((e) => e.slot === 'logo')).toBe(true);
    expect(campaign.prizes.length).toBeGreaterThan(0);
  });

  test('live plays need a published campaign; rehearsal plays do not', async () => {
    const draft = await api.createCampaign({
      name: 'Draft',
      templateKey: 'spin-wheel',
      skinKey: 'tet',
    });
    await expect(
      api.startPlay({ campaignId: draft.id, playerId: 'a', rehearsal: false }),
    ).rejects.toThrow('NOT_PUBLISHED');
    const result = await api.startPlay({ campaignId: draft.id, playerId: 'a', rehearsal: true });
    expect(['win', 'lose']).toContain(result.outcome);
  });

  test('a guaranteed win issues a voucher and spends one turn of the daily allowance', async () => {
    const campaign = await publishedCampaign({
      rules: { mode: 'guaranteed', playsPerDay: 1 } as never,
    });
    const first = await api.startPlay({ campaignId: campaign.id, playerId: 'a', rehearsal: false });
    expect(first.outcome).toBe('win');
    expect(first.voucherCode).toMatch(/^[A-Z2-9]{6}$/);
    expect(first.turnsLeftToday).toBe(0);
    const second = await api.startPlay({
      campaignId: campaign.id,
      playerId: 'a',
      rehearsal: false,
    });
    expect(second.outcome).toBe('no_turns');
  });

  test('stock is never exceeded', async () => {
    const campaign = await publishedCampaign({
      rules: { mode: 'guaranteed', playsPerDay: 1, maxWinsPerPlayer: 1 } as never,
      prizes: [{ id: 'only', name: 'Only', quantity: 2, valueVnd: 1000 }],
    });
    const outcomes = [];
    for (const player of ['a', 'b', 'c', 'd']) {
      outcomes.push(
        (await api.startPlay({ campaignId: campaign.id, playerId: player, rehearsal: false }))
          .outcome,
      );
    }
    expect(outcomes.filter((o) => o === 'win')).toHaveLength(2);
    expect((await api.getCampaignStats(campaign.id)).remainingByPrize.only).toBe(0);
  });

  test('rehearsal plays do not count in live stats', async () => {
    const campaign = await publishedCampaign({ rules: { mode: 'guaranteed' } as never });
    await api.startPlay({ campaignId: campaign.id, playerId: 'tester', rehearsal: true });
    expect((await api.getCampaignStats(campaign.id)).plays).toBe(0);
  });

  test('a voucher can be redeemed once', async () => {
    const campaign = await publishedCampaign({ rules: { mode: 'guaranteed' } as never });
    const { voucherCode } = await api.startPlay({
      campaignId: campaign.id,
      playerId: 'a',
      rehearsal: false,
    });
    if (!voucherCode) throw new Error('expected a voucher');
    const looked = await api.lookupVoucher(voucherCode.toLowerCase());
    expect(looked.voucher.redeemedAt).toBeNull();
    await api.redeemVoucher(voucherCode);
    await expect(api.redeemVoucher(voucherCode)).rejects.toThrow('VOUCHER_REDEEMED');
  });

  test('the simulator answers "what happens to my prizes" with the real engine', async () => {
    const campaign = await api.createCampaign({
      name: 'Sim',
      templateKey: 'spin-wheel',
      skinKey: 'tet',
    });
    const result = api.simulateCampaign(campaign, { playersPerDay: 200 });
    expect(result.totalPlays).toBeGreaterThan(0);
    expect(result.totalWins).toBeLessThanOrEqual(
      campaign.prizes.reduce((n, p) => n + p.quantity, 0),
    );
  });
});
