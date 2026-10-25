/// <reference types="bun" />
import { describe, expect, test } from 'bun:test';
import { getMessages } from '@playora/i18n';
import { App } from 'antd';
import { NextIntlClientProvider } from 'next-intl';
import { renderToString } from 'react-dom/server';
import { buildScreens, defaultPrizes, defaultRules, getSkin } from '../../mock/templates';
import type { Campaign, LabRules } from '../../mock/types';
import { RulesPrizesPanel } from '../rules-prizes-panel';

function campaign(rules: Partial<LabRules> = {}): Campaign {
  const now = '2027-01-20T00:00:00.000Z';
  return {
    id: 'c1',
    name: 'Test',
    templateKey: 'spin-wheel',
    skinKey: 'tet',
    brand: getSkin('tet').brand,
    screens: buildScreens('spin-wheel', 'tet'),
    prizes: defaultPrizes(),
    rules: { ...defaultRules(new Date(now)), ...rules },
    status: 'draft',
    version: 0,
    publishedAt: null,
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

  test('per-prize mode over 100% shows the error and blocks the simulation', () => {
    const c = campaign({ mode: 'per_prize_probability' });
    c.prizes = c.prizes.map((p) => ({ ...p, probability: 0.5 }));
    const html = render(c, 'en');
    expect(html).toContain('more than 100%');
    expect(html).toContain('Fix the problems above');
    expect(html).not.toContain('Prizes given');
  });
});
