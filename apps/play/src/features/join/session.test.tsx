/// <reference types="bun" />
import { describe, expect, spyOn, test } from 'bun:test';
import type { PublicEvent } from '@playora/contracts';
import { getMessages } from '@playora/i18n';
import { NextIntlClientProvider } from 'next-intl';
import { renderToStaticMarkup } from 'react-dom/server';
import { EventJoinShell } from './event-join-shell';
import { isPlayerTokenValid } from './session';

function encodePayload(payload: unknown): string {
  const json = JSON.stringify(payload);
  return Buffer.from(json, 'utf8').toString('base64url');
}

const SAMPLE_EVENT: PublicEvent = {
  id: '01900000-0000-7000-8000-000000000001',
  slug: 'yep-2026',
  name: 'YEP Join 2026',
  status: 'live',
  identity: 'guest_list',
  startsAt: null,
  registrationForm: {
    fields: [
      {
        key: 'phone',
        type: 'phone',
        label: { vi: 'Số điện thoại', en: 'Phone number' },
        required: true,
      },
      {
        key: 'dept',
        type: 'select',
        label: { vi: 'Phòng ban', en: 'Department' },
        required: false,
        options: ['Kinh doanh', 'Kỹ thuật'],
      },
      {
        key: 'vip',
        type: 'checkbox',
        label: { vi: 'Khách VIP', en: 'VIP guest' },
        required: false,
      },
    ],
    consents: [
      {
        purpose: 'participation',
        text: {
          vi: 'Tôi đồng ý tham gia chương trình.',
          en: 'I agree to participate in the event.',
        },
        required: true,
        textVersion: 'v1',
        textHash: 'abc',
      },
    ],
  },
  consents: [
    {
      purpose: 'participation',
      text: {
        vi: 'Tôi đồng ý tham gia chương trình.',
        en: 'I agree to participate in the event.',
      },
      required: true,
      textVersion: 'v1',
      textHash: 'abc',
    },
  ],
  brandKit: null,
  playerLimitReached: true,
};

describe('isPlayerTokenValid', () => {
  test('accepts a valid unexpired player token', () => {
    const token = `${encodePayload({ kind: 'player', sub: 'player-1', exp: 2_000 })}.sig`;
    expect(isPlayerTokenValid(token, 1_500)).toBe(true);
  });

  test('rejects expired or malformed tokens', () => {
    const expired = `${encodePayload({ kind: 'player', sub: 'player-1', exp: 1_000 })}.sig`;
    expect(isPlayerTokenValid(expired, 1_500)).toBe(false);
    expect(isPlayerTokenValid('invalid-token', 1_500)).toBe(false);
    expect(isPlayerTokenValid('', 1_500)).toBe(false);
  });
});

describe('EventJoinShell', () => {
  test('renders localized Ant Design join form without console warnings or errors', () => {
    const warnSpy = spyOn(console, 'warn').mockImplementation(() => {});
    const errorSpy = spyOn(console, 'error').mockImplementation(() => {});

    try {
      const htmlVi = renderToStaticMarkup(
        <NextIntlClientProvider
          locale="vi"
          messages={getMessages('vi')}
          timeZone="Asia/Ho_Chi_Minh"
        >
          <EventJoinShell event={SAMPLE_EVENT} />
        </NextIntlClientProvider>,
      );
      expect(htmlVi).toContain('YEP Join 2026');
      expect(htmlVi).toContain('Mã tham gia');
      expect(htmlVi).toContain('Số điện thoại');
      expect(htmlVi).toContain('Phòng ban');
      expect(htmlVi).toContain('Khách VIP');
      expect(htmlVi).toContain('Tôi đồng ý tham gia chương trình.');
      expect(htmlVi).toContain('Tham gia');

      const htmlEn = renderToStaticMarkup(
        <NextIntlClientProvider
          locale="en"
          messages={getMessages('en')}
          timeZone="Asia/Ho_Chi_Minh"
        >
          <EventJoinShell
            event={{
              ...SAMPLE_EVENT,
              identity: 'anonymous',
            }}
          />
        </NextIntlClientProvider>,
      );
      expect(htmlEn).toContain('Display name');
      expect(htmlEn).toContain('The event is full');
      expect(htmlEn).toContain('Phone number');
      expect(htmlEn).toContain('Department');
      expect(htmlEn).toContain('VIP guest');
      expect(htmlEn).toContain('I agree to participate in the event.');
      expect(htmlEn).toContain('Join');

      expect(warnSpy).not.toHaveBeenCalled();
      expect(errorSpy).not.toHaveBeenCalled();
    } finally {
      warnSpy.mockRestore();
      errorSpy.mockRestore();
    }
  });
});
