import { describe, expect, test } from 'bun:test';
import { buildCampaignDigestMessage, isLowStockPrize, resolveDigestDate } from './daily-digest';

describe('daily-digest processor (ANL-10)', () => {
  test('isLowStockPrize flags zero remaining or <= 10% remaining stock', () => {
    expect(isLowStockPrize({ remaining: 0, quantity: 50 })).toBe(true);
    expect(isLowStockPrize({ remaining: 5, quantity: 50 })).toBe(true);
    expect(isLowStockPrize({ remaining: 6, quantity: 50 })).toBe(false);
    expect(isLowStockPrize({ remaining: 0, quantity: 0 })).toBe(false);
  });

  test('resolveDigestDate computes Asia/Ho_Chi_Minh day window', () => {
    const { date, dayStart, dayEnd } = resolveDigestDate('2026-02-15');
    expect(date).toBe('2026-02-15');
    expect(dayStart.toISOString()).toBe('2026-02-14T17:00:00.000Z');
    expect(dayEnd.toISOString()).toBe('2026-02-15T17:00:00.000Z');
  });

  test('buildCampaignDigestMessage formats daily metrics and low-stock warnings', () => {
    const msg = buildCampaignDigestMessage({
      campaignName: 'Vòng Quay Tết Trà Sữa Mộc',
      organizationName: 'Trà Sữa Mộc',
      date: '2026-02-15',
      plays: 120,
      wins: 45,
      visits: 32,
      prizeCostVnd: 480_000,
      lowStockPrizes: [
        { prizeKey: 'p1', name: 'Free Topping Trân Châu', remaining: 4, quantity: 50 },
        { prizeKey: 'p2', name: 'Voucher Giảm 50%', remaining: 0, quantity: 20 },
      ],
    });

    expect(msg.subject).toContain('2026-02-15');
    expect(msg.subject).toContain('Vòng Quay Tết Trà Sữa Mộc');
    expect(msg.subject).toContain('2 quà sắp hết');
    expect(msg.bodyText).toContain('32 lượt');
    expect(msg.bodyText).toContain('120 (45 lượt trúng)');
    expect(msg.bodyText).toContain('Free Topping Trân Châu');
    expect(msg.bodyText).toContain('còn 4/50 (dưới 10%)');
    expect(msg.bodyText).toContain('còn 0/20 (đã hết quà)');
  });
});
