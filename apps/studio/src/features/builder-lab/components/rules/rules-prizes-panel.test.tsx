/// <reference types="bun" />
import { describe, expect, test } from 'bun:test';
import { getMessages } from '@playora/i18n';
import { App } from 'antd';
import { NextIntlClientProvider } from 'next-intl';
import { renderToString } from 'react-dom/server';
import type { Campaign, CampaignRules } from '../../api';
import { buildScreens, defaultPrizes, defaultRules, getSkin } from '../../lib/starter';
import { RulesPrizesPanel } from '../rules-prizes-panel';

function campaign(rules: Partial<CampaignRules> = {}): Campaign {
  const now = '2027-01-20T00:00:00.000Z';
  return {
    id: 'c1',
    organizationId: 'org1',
    slug: 'test',
    name: 'Test',
    templateKey: 'spin-wheel',
    skinKey: 'tet',
    brand: getSkin('tet').brand,
    screens: buildScreens('spin-wheel', 'tet'),
    prizes: defaultPrizes(),
    rules: { ...defaultRules(new Date(now)), ...rules },
    status: 'draft',
    phase: 'draft',
    paused: false,
    version: 0,
    publishedAt: null,
    hasUnpublishedChanges: false,
    playbook: null,
    compliance: { promotionType: null, termsText: null, checklistAcknowledgedAt: null },
    updatedAt: now,
    createdAt: now,
  };
}

function render(c: Campaign, locale: 'vi' | 'en' = 'vi') {
  return renderToString(
    <NextIntlClientProvider
      locale={locale}
      messages={getMessages(locale)}
      timeZone="Asia/Ho_Chi_Minh"
    >
      <App>
        <RulesPrizesPanel campaign={c} onChange={() => {}} />
      </App>
    </NextIntlClientProvider>,
  );
}

describe('RulesPrizesPanel', () => {
  test('renders the three steps, sentences, summary and a simulation', () => {
    const html = render(campaign());
    expect(html).toContain('Tỉ lệ trúng chung');
    expect(html).toContain('Ai chơi cũng có quà');
    expect(html).toContain('Ly cà phê muối');
    expect(html).toContain('Mỗi khách được chơi');
    expect(html).toContain('Tóm tắt luật');
    expect(html).toContain('Quà đã phát');
    expect(html).not.toContain('builderLab.rules');
  });

  test('shows open weekdays, redeem-before-replay, anti-fraud level and prize cost (PLB-02)', () => {
    const html = render(
      campaign({ openDays: [2, 3, 4], requireRedeemBeforeReplay: true, budgetVnd: 2_000_000 }),
    );
    expect(html).toContain('Chỉ mở vào');
    expect(html).toContain('Chỉ mở vào T3, T4, T5 mỗi tuần.');
    expect(html).toContain('Phải đổi quà ở quầy trước khi chơi tiếp');
    expect(html).toContain('Khách phải đổi quà ở quầy trước khi được chơi tiếp.');
    expect(html).toContain('Mức chống gian lận');
    expect(html).toContain('Thấp');
    expect(html).toContain('Giá vốn');
    expect(html).toContain('Chi phí quà dự kiến');
    expect(html).not.toContain('builderLab.');
  });

  test('per-prize mode over 100% shows the error and blocks the simulation', () => {
    const c = campaign({ mode: 'per_prize_probability' });
    c.prizes = c.prizes.map((p) => ({ ...p, probability: 0.5 }));
    const html = render(c, 'en');
    expect(html).toContain('more than 100%');
    expect(html).toContain('Fix the problems above');
    expect(html).not.toContain('Prizes given');
  });

  test('renders step 4 with compliance question and generated terms preview (CMP-03, CMP-04)', () => {
    const html = render(campaign());
    expect(html).toContain('Thể lệ &amp; pháp lý');
    expect(html).toContain('Khách có phải mua hàng mới được chơi không?');
    expect(html).toContain('Có — gắn với mua hàng');
    expect(html).toContain('Không — chơi tự do');
    expect(html).toContain('Sở Công Thương');
    expect(html).toContain('THỂ LỆ CHƯƠNG TRÌNH &quot;TEST&quot;');
    expect(html).toContain('Sửa thể lệ');
    expect(html).not.toContain('Dùng lại thể lệ tự sinh');
  });

  test('renders editable textarea and reset button when custom terms are set', () => {
    const c = campaign();
    c.compliance = {
      promotionType: 'purchase_linked',
      termsText: 'Điều khoản tuỳ chỉnh riêng của quán.',
      checklistAcknowledgedAt: null,
    };
    const html = render(c);
    expect(html).toContain('Điều khoản tuỳ chỉnh riêng của quán.');
    expect(html).toContain('Dùng lại thể lệ tự sinh');
    expect(html).toContain('Đang dùng thể lệ tuỳ chỉnh');
  });
});
