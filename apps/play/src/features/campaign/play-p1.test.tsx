/// <reference types="bun" />
import { describe, expect, mock, test } from 'bun:test';
import { ApiError } from '@playora/api-client';
import { ErrorCode, type PlayResult } from '@playora/contracts';
import { getMessages } from '@playora/i18n';
import { createCampaignPlayerLabels, NoticeContent, RedeemFirstBanner } from '@playora/ui/campaign';
import { renderToStaticMarkup } from 'react-dom/server';
import { formatOpenDays } from './open-days';
import { executePlayWithCaptcha } from './play-captcha';

describe('P1 Anti-fraud & Playbook rules', () => {
  describe('Captcha retry flow', () => {
    test('retries on 403 CAPTCHA_REQUIRED with the same requestId and fresh token', async () => {
      const calls: { requestId: string; captchaToken?: string }[] = [];
      const resetMock = mock(() => {});
      const tokensRecorded: (string | null)[] = [];

      let tokenGeneration = 0;
      const fakeAcquireToken = mock(async () => {
        tokenGeneration++;
        return `fresh-token-${tokenGeneration}`;
      });

      const winResult: PlayResult = {
        playId: '00000000-0000-4000-8000-000000000001',
        outcome: 'win',
        reason: 'won',
        prize: { id: 'p1', name: 'Ly cà phê muối' },
        voucher: { code: 'ABC123XYZ', expiresAt: null },
        turnsLeftToday: 1,
      };

      const result = await executePlayWithCaptcha({
        requestId: 'req-uuid-1234',
        captchaSiteKey: '0x4AAAAAA',
        currentCaptchaToken: 'initial-invalid-token',
        acquireCaptchaToken: fakeAcquireToken,
        resetTurnstile: resetMock,
        onTokenUpdated: (t) => tokensRecorded.push(t),
        callPlayApi: async (body) => {
          calls.push(body);
          if (calls.length === 1) {
            // First call fails with 403 CAPTCHA_REQUIRED
            throw new ApiError(403, ErrorCode.CAPTCHA_REQUIRED, 'Captcha verification failed');
          }
          return winResult;
        },
      });

      expect(result).toEqual(winResult);
      expect(calls).toHaveLength(2);
      // Crucial: both attempts MUST share the same idempotency requestId
      expect(calls[0]?.requestId).toBe('req-uuid-1234');
      expect(calls[1]?.requestId).toBe('req-uuid-1234');
      expect(calls[0]?.captchaToken).toBe('initial-invalid-token');
      expect(calls[1]?.captchaToken).toBe('fresh-token-1');

      // Turnstile widget was reset
      expect(resetMock).toHaveBeenCalledTimes(1);
      // Tokens were updated: cleared then set to fresh
      expect(tokensRecorded).toEqual([null, 'fresh-token-1']);
    });

    test('acquires captcha before first play if token is missing', async () => {
      const calls: { requestId: string; captchaToken?: string }[] = [];
      const fakeAcquireToken = mock(async () => 'first-token');

      const winResult: PlayResult = {
        playId: '00000000-0000-4000-8000-000000000002',
        outcome: 'win',
        reason: 'won',
        prize: null,
        voucher: null,
        turnsLeftToday: 1,
      };

      const result = await executePlayWithCaptcha({
        requestId: 'req-fresh-1',
        captchaSiteKey: 'site-key-abc',
        currentCaptchaToken: null,
        acquireCaptchaToken: fakeAcquireToken,
        resetTurnstile: () => {},
        onTokenUpdated: () => {},
        callPlayApi: async (body) => {
          calls.push(body);
          return winResult;
        },
      });

      expect(result).toEqual(winResult);
      expect(fakeAcquireToken).toHaveBeenCalledTimes(1);
      expect(calls[0]?.captchaToken).toBe('first-token');
    });
  });

  describe('redeem_first message', () => {
    test('shows clear message and button when blockedReason is redeem_first', () => {
      const messagesVi = getMessages('vi');
      const labels = createCampaignPlayerLabels(
        (key, values) => {
          const parts = key.split('.');
          let curr: unknown = messagesVi.campaignPlayer;
          for (const p of parts) {
            curr = (curr as Record<string, unknown>)?.[p];
          }
          let str = String(curr ?? key);
          if (values) {
            for (const [k, v] of Object.entries(values)) {
              str = str.replace(`{${k}}`, String(v));
            }
          }
          return str;
        },
        (d) => d.toISOString(),
      );

      const html = renderToStaticMarkup(
        <RedeemFirstBanner labels={labels} onOpenVouchers={() => {}} />,
      );

      expect(html).toContain('data-testid="redeem-first-notice"');
      expect(html).toContain('Đổi quà ở quầy trước để chơi lượt tiếp theo');
      expect(html).toContain('Quà của tôi');

      // Verify English translation as well
      const messagesEn = getMessages('en');
      const labelsEn = createCampaignPlayerLabels(
        (key, values) => {
          const parts = key.split('.');
          let curr: unknown = messagesEn.campaignPlayer;
          for (const p of parts) {
            curr = (curr as Record<string, unknown>)?.[p];
          }
          let str = String(curr ?? key);
          if (values) {
            for (const [k, v] of Object.entries(values)) {
              str = str.replace(`{${k}}`, String(v));
            }
          }
          return str;
        },
        (d) => d.toISOString(),
      );

      const htmlEn = renderToStaticMarkup(
        <RedeemFirstBanner labels={labelsEn} onOpenVouchers={() => {}} />,
      );
      expect(htmlEn).toContain('Redeem your prize at the counter before playing the next turn');
      expect(htmlEn).toContain('My prizes');
    });
  });

  describe('next-turn & open-days formatting', () => {
    test('formatOpenDays correctly formats open weekdays in Vietnamese and English', () => {
      const viWeekdays: Record<number, string> = {
        0: 'Chủ Nhật',
        1: 'Thứ Hai',
        2: 'Thứ Ba',
        3: 'Thứ Tư',
        4: 'Thứ Năm',
        5: 'Thứ Sáu',
        6: 'Thứ Bảy',
      };
      const enWeekdays: Record<number, string> = {
        0: 'Sunday',
        1: 'Monday',
        2: 'Tuesday',
        3: 'Wednesday',
        4: 'Thursday',
        5: 'Friday',
        6: 'Saturday',
      };

      // [1, 3, 5] -> Thứ Hai, Thứ Tư, Thứ Sáu
      expect(formatOpenDays([1, 3, 5], (d) => viWeekdays[d] as string)).toBe(
        'Thứ Hai, Thứ Tư, Thứ Sáu',
      );
      expect(formatOpenDays([1, 3, 5], (d) => enWeekdays[d] as string)).toBe(
        'Monday, Wednesday, Friday',
      );

      // Sunday (0) placed at the end of the week
      expect(formatOpenDays([0, 6], (d) => viWeekdays[d] as string)).toBe('Thứ Bảy, Chủ Nhật');
      expect(formatOpenDays([0, 6], (d) => enWeekdays[d] as string)).toBe('Saturday, Sunday');

      // null, empty, or all 7 days return null
      expect(formatOpenDays(null, (d) => viWeekdays[d] as string)).toBeNull();
      expect(formatOpenDays([], (d) => viWeekdays[d] as string)).toBeNull();
      expect(formatOpenDays([0, 1, 2, 3, 4, 5, 6], (d) => viWeekdays[d] as string)).toBeNull();
    });

    test('NoticeSheet shows nextTurnAtFormatted when out of turns', () => {
      const messagesVi = getMessages('vi');
      const labels = createCampaignPlayerLabels(
        (key, values) => {
          const parts = key.split('.');
          let curr: unknown = messagesVi.campaignPlayer;
          for (const p of parts) {
            curr = (curr as Record<string, unknown>)?.[p];
          }
          let str = String(curr ?? key);
          if (values) {
            for (const [k, v] of Object.entries(values)) {
              str = str.replace(`{${k}}`, String(v));
            }
          }
          return str;
        },
        (d) => d.toISOString(),
      );

      const html = renderToStaticMarkup(
        <NoticeContent
          kind="noTurns"
          onClose={() => {}}
          labels={labels}
          nextTurnAtFormatted="28 thg 10, 08:00"
        />,
      );

      expect(html).toContain('data-testid="next-turn-notice"');
      expect(html).toContain('28 thg 10, 08:00');
      expect(html).toContain('Lượt chơi tiếp theo sẽ mở lúc 28 thg 10, 08:00.');
    });

    test('NoticeSheet shows openDaysFormatted when campaign is closed', () => {
      const messagesVi = getMessages('vi');
      const labels = createCampaignPlayerLabels(
        (key, values) => {
          const parts = key.split('.');
          let curr: unknown = messagesVi.campaignPlayer;
          for (const p of parts) {
            curr = (curr as Record<string, unknown>)?.[p];
          }
          let str = String(curr ?? key);
          if (values) {
            for (const [k, v] of Object.entries(values)) {
              str = str.replace(`{${k}}`, String(v));
            }
          }
          return str;
        },
        (d) => d.toISOString(),
      );

      const html = renderToStaticMarkup(
        <NoticeContent
          kind="closed"
          onClose={() => {}}
          labels={labels}
          openDaysFormatted="Thứ Hai, Thứ Tư, Thứ Sáu"
        />,
      );

      expect(html).toContain('data-testid="open-days-notice"');
      expect(html).toContain('Thứ Hai, Thứ Tư, Thứ Sáu');
      expect(html).toContain('Chương trình chỉ mở vào các ngày: Thứ Hai, Thứ Tư, Thứ Sáu.');
    });
  });
});
