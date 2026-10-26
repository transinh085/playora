import { describe, expect, test } from 'bun:test';
import { generateTerms, type TermsInput } from './terms';

const input: TermsInput = {
  campaignName: 'Vòng quay Tết',
  organizerName: 'Trà sữa Mây',
  rules: {
    mode: 'overall_win_rate',
    startsAt: '2027-01-20T01:00:00.000Z',
    endsAt: '2027-02-10T15:00:00.000Z',
    openingHours: { start: '07:00', end: '22:00' },
    openDays: [2, 3, 4],
    playsPerDay: 1,
    maxWinsPerPlayer: 1,
    collectForm: true,
    requireRedeemBeforeReplay: true,
  },
  prizes: [
    { name: 'Ly trà sữa', quantity: 100, valueVnd: 25_000 },
    { name: 'Voucher 50K', quantity: 20, valueVnd: 50_000 },
  ],
  redeemGraceDays: 7,
};

describe('generateTerms', () => {
  test('states organizer, time, prize structure with total value and how winners are decided', () => {
    const terms = generateTerms(input);
    expect(terms).toContain('THỂ LỆ CHƯƠNG TRÌNH "VÒNG QUAY TẾT"');
    expect(terms).toContain('Đơn vị tổ chức: Trà sữa Mây.');
    expect(terms).toContain('Thứ 3, Thứ 4, Thứ 5');
    expect(terms).toContain('từ 07:00 đến 22:00');
    expect(terms).toMatch(/Ly trà sữa: 100 phần, trị giá 25\.000đ\/phần/);
    expect(terms).toMatch(/Tổng giá trị giải thưởng: 3\.500\.000đ/);
    expect(terms).toContain('Không ai, kể cả đơn vị tổ chức, có thể chọn trước người trúng');
    expect(terms).toContain('trước khi chơi lượt tiếp theo');
  });

  test('redeem deadline is the end plus the grace period, in the campaign timezone', () => {
    // Ends 10/02 22:00 in Vietnam; +7 days → 17/02/2027.
    expect(generateTerms(input)).toContain('trước 17/02/2027');
  });

  test('anonymous campaigns do not mention the form or marketing', () => {
    const terms = generateTerms({ ...input, rules: { ...input.rules, collectForm: false } });
    expect(terms).not.toContain('số điện thoại');
    expect(terms).not.toContain('gửi ưu đãi');
  });
});
