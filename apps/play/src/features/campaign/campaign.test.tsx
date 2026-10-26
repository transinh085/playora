/// <reference types="bun" />
import { describe, expect, test } from 'bun:test';
import { ApiError } from '@playora/api-client';
import { ErrorCode, type MyVoucher, type PublicRegistrationForm } from '@playora/contracts';
import { getMessages } from '@playora/i18n';
import { VoucherList, voucherStatusOf } from '@playora/ui/campaign';
import { NextIntlClientProvider } from 'next-intl';
import { renderToStaticMarkup } from 'react-dom/server';
import { buttonActionHref } from './button-action';
import { channelFromSearchParams, sanitizeChannel } from './channel';
import { toJoinBody } from './join-body';
import { PlayRequester } from './play-request';
import { useCampaignPlayerLabels } from './use-labels';
import { toPlayerVouchers } from './vouchers';
import { PlayoraWatermark, WATERMARK_HREF } from './watermark';

const networkError = () => new TypeError('Failed to fetch');
const noWait = () => Promise.resolve();

function idFactory() {
  let n = 0;
  return () => `00000000-0000-4000-8000-00000000000${++n}`;
}

describe('PlayRequester', () => {
  test('retries a network failure with the same requestId', async () => {
    const sent: string[] = [];
    const requester = new PlayRequester<string>({
      newId: idFactory(),
      wait: noWait,
      send: async (id) => {
        sent.push(id);
        if (sent.length < 3) throw networkError();
        return 'ok';
      },
    });
    expect(await requester.play()).toBe('ok');
    expect(sent).toEqual([sent[0], sent[0], sent[0]] as string[]);
    expect(requester.pendingRequestId).toBeNull();
  });

  test('keeps the requestId for the next tap when every retry failed, then starts fresh', async () => {
    const sent: string[] = [];
    let fail = true;
    const requester = new PlayRequester<string>({
      newId: idFactory(),
      wait: noWait,
      retries: 1,
      send: async (id) => {
        sent.push(id);
        if (fail) throw networkError();
        return 'ok';
      },
    });
    await expect(requester.play()).rejects.toThrow('Failed to fetch');
    const first = sent[0];
    expect(requester.pendingRequestId).toBe(first ?? null);

    fail = false;
    await requester.play();
    expect(sent).toEqual([first, first, first] as string[]);

    await requester.play();
    expect(sent.at(-1)).not.toBe(first);
  });

  test('a 5xx is retried with the same id; a 4xx answer is final and frees the id', async () => {
    const sent: string[] = [];
    const answers: unknown[] = [
      new ApiError(503, ErrorCode.INTERNAL, 'down'),
      new ApiError(429, ErrorCode.RATE_LIMITED, 'slow down'),
    ];
    const requester = new PlayRequester<string>({
      newId: idFactory(),
      wait: noWait,
      send: async (id) => {
        sent.push(id);
        const next = answers.shift();
        if (next) throw next;
        return 'ok';
      },
    });
    await expect(requester.play()).rejects.toBeInstanceOf(ApiError);
    expect(sent[0]).toBe(sent[1] as string);
    expect(requester.pendingRequestId).toBeNull();

    await requester.play();
    expect(sent[2]).not.toBe(sent[0] as string);
  });
});

describe('channel', () => {
  test('sanitises to the contract pattern', () => {
    expect(sanitizeChannel('table-qr')).toBe('table-qr');
    expect(sanitizeChannel('  Bàn Số 1 ')).toBe('ban-so-1');
    expect(sanitizeChannel('Zalo_OA!')).toBe('zalo_oa');
    expect(sanitizeChannel('đường')).toBe('duong');
    expect(sanitizeChannel('<script>')).toBe('script');
    expect(sanitizeChannel('!!!')).toBeUndefined();
    expect(sanitizeChannel('')).toBeUndefined();
    expect(sanitizeChannel(undefined)).toBeUndefined();
    expect(sanitizeChannel('a'.repeat(100))).toHaveLength(64);
    for (const raw of ['Fanpage 2026', 'qr bàn #3', 'ÄÖÜ-x']) {
      expect(sanitizeChannel(raw)).toMatch(/^[a-z0-9_-]{1,64}$/);
    }
  });

  test('reads ?ch= first, then ?c=', () => {
    expect(channelFromSearchParams({ ch: 'fanpage', c: 'table-qr' })).toBe('fanpage');
    expect(channelFromSearchParams({ c: 'table-qr' })).toBe('table-qr');
    expect(channelFromSearchParams({ ch: '***', c: 'table-qr' })).toBe('table-qr');
    expect(channelFromSearchParams({ ch: ['zalo-oa', 'x'] })).toBe('zalo-oa');
    expect(channelFromSearchParams({})).toBeUndefined();
  });
});

/** What the campaigns module puts in `registrationForm` when `collectForm` is on. */
const CAMPAIGN_FORM: PublicRegistrationForm = {
  fields: [
    { key: 'name', type: 'text', label: { vi: 'Họ và tên', en: 'Full name' }, required: true },
    {
      key: 'phone',
      type: 'phone',
      label: { vi: 'Số điện thoại', en: 'Số điện thoại' },
      required: true,
    },
  ],
  consents: [
    {
      purpose: 'participation',
      text: {
        vi: 'Tôi đồng ý để cửa hàng dùng họ tên và số điện thoại của tôi.',
        en: 'Tôi đồng ý để cửa hàng dùng họ tên và số điện thoại của tôi.',
      },
      required: true,
      textVersion: 'v1',
      textHash: 'h1',
    },
    {
      purpose: 'marketing',
      text: { vi: 'Tôi đồng ý nhận tin ưu đãi.', en: 'Tôi đồng ý nhận tin ưu đãi.' },
      required: false,
      textVersion: 'v1',
      textHash: 'h2',
    },
  ],
};

describe('toJoinBody', () => {
  test('maps the shared form onto the campaign fields and consents', () => {
    expect(
      toJoinBody({
        deviceId: 'dev-1',
        registrationForm: CAMPAIGN_FORM,
        form: { name: '  Minh Anh ', phone: '+84 901.234.567', consent: true },
      }),
    ).toEqual({
      deviceId: 'dev-1',
      displayName: 'Minh Anh',
      fields: { name: 'Minh Anh', phone: '0901234567' },
      consents: { participation: true, marketing: false },
    });
  });

  test('falls back to the first text and phone fields by type', () => {
    const body = toJoinBody({
      deviceId: 'dev-1',
      registrationForm: {
        fields: [
          { key: 'fullName', type: 'text', label: { vi: 'Tên', en: 'Tên' }, required: true },
          { key: 'mobile', type: 'phone', label: { vi: 'SĐT', en: 'SĐT' }, required: true },
          { key: 'vip', type: 'checkbox', label: { vi: 'VIP', en: 'VIP' }, required: false },
        ],
        consents: [],
      },
      form: { name: 'An', phone: '0912345678', consent: true },
    });
    expect(body.fields).toEqual({ fullName: 'An', mobile: '0912345678', vip: false });
    expect(body.consents).toBeUndefined();
  });

  test('anonymous campaigns join with the device id only', () => {
    expect(
      toJoinBody({
        deviceId: 'dev-2',
        registrationForm: { fields: [], consents: [] },
        form: null,
      }),
    ).toEqual({ deviceId: 'dev-2' });
  });
});

describe('buttonActionHref', () => {
  test('link, phone and zalo targets', () => {
    expect(buttonActionHref({ action: 'link', actionTarget: 'quan-moc.vn/menu' })).toBe(
      'https://quan-moc.vn/menu',
    );
    expect(buttonActionHref({ action: 'link', actionTarget: 'javascript:alert(1)' })).toBeNull();
    expect(buttonActionHref({ action: 'phone', actionTarget: '0901 234 567' })).toBe(
      'tel:0901234567',
    );
    expect(buttonActionHref({ action: 'zalo', actionTarget: '0901.234.567' })).toBe(
      'https://zalo.me/0901234567',
    );
    expect(buttonActionHref({ action: 'zalo', actionTarget: 'https://zalo.me/quanmoc' })).toBe(
      'https://zalo.me/quanmoc',
    );
    expect(buttonActionHref({ action: 'phone', actionTarget: '' })).toBeNull();
    expect(buttonActionHref({ action: 'start', actionTarget: 'x' })).toBeNull();
  });
});

const voucher = (code: string, status: MyVoucher['status']): MyVoucher => ({
  code,
  prize: { id: 'p1', name: `Quà ${code}` },
  status,
  issuedAt: '2026-10-26T03:00:00.000Z',
  expiresAt: '2026-11-30T16:59:59.000Z',
  redeemedAt: status === 'redeemed' ? '2026-10-26T04:00:00.000Z' : null,
});

function Vouchers({ items }: { items: MyVoucher[] }) {
  const labels = useCampaignPlayerLabels();
  return <VoucherList vouchers={toPlayerVouchers(items)} loading={false} labels={labels} />;
}

describe('voucher status display', () => {
  test('shows the server status of every voucher', () => {
    const html = renderToStaticMarkup(
      <NextIntlClientProvider locale="vi" messages={getMessages('vi')} timeZone="Asia/Ho_Chi_Minh">
        <Vouchers
          items={[
            voucher('AAAA11', 'issued'),
            voucher('BBBB22', 'redeemed'),
            voucher('CCCC33', 'expired'),
            voucher('DDDD44', 'void'),
          ]}
        />
      </NextIntlClientProvider>,
    );
    for (const status of ['issued', 'redeemed', 'expired', 'void']) {
      expect(html).toContain(`data-status="${status}"`);
    }
    expect(html).toContain('Chưa đổi');
    expect(html).toContain('Đã đổi');
    expect(html).toContain('Hết hạn');
    expect(html).toContain('Đã huỷ');
    expect(html).toContain('AAAA11');
    // Only a live voucher shows its redeem-by date.
    expect(html.match(/Đổi trước/g)).toHaveLength(1);
  });

  test('without a server status, redeemedAt decides', () => {
    expect(voucherStatusOf({ redeemedAt: '2026-10-26T04:00:00.000Z' })).toBe('redeemed');
    expect(voucherStatusOf({ redeemedAt: null })).toBe('issued');
    expect(voucherStatusOf({ status: 'expired', redeemedAt: null })).toBe('expired');
  });
});

describe('PlayoraWatermark', () => {
  test('links to playora.vn with the watermark ref, in the player locale', () => {
    for (const [locale, text] of [
      ['vi', 'Tạo bằng Playora'],
      ['en', 'Made with Playora'],
    ] as const) {
      const html = renderToStaticMarkup(
        <NextIntlClientProvider
          locale={locale}
          messages={getMessages(locale)}
          timeZone="Asia/Ho_Chi_Minh"
        >
          <PlayoraWatermark />
        </NextIntlClientProvider>,
      );
      expect(html).toContain(text);
      expect(html).toContain(`href="${WATERMARK_HREF}"`);
    }
    expect(WATERMARK_HREF).toBe('https://playora.vn/?ref=watermark');
  });
});
