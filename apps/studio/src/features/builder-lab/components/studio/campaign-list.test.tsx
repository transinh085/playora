/// <reference types="bun" />
import { describe, expect, mock, test } from 'bun:test';
import { getMessages } from '@playora/i18n';
import { NextIntlClientProvider } from 'next-intl';
import type React from 'react';
import { renderToString } from 'react-dom/server';
import type { CampaignListItem, CampaignStats } from '../../api';
import { defaultPrizes, defaultRules, getSkin } from '../../lib/starter';

const nowIso = new Date('2026-10-27T03:00:00.000Z').toISOString();

const mockCampaigns: CampaignListItem[] = [
  {
    id: 'cmp_1',
    organizationId: 'org_1',
    slug: 'vong-quay-tet',
    name: 'Vòng quay Tết May Mắn',
    templateKey: 'spin-wheel',
    skinKey: 'tet',
    brand: getSkin('tet').brand,
    prizes: defaultPrizes(),
    rules: {
      ...defaultRules(new Date('2026-10-01T00:00:00.000Z')),
      startsAt: '2026-10-01T00:00:00.000Z',
      endsAt: '2026-12-31T00:00:00.000Z',
    },
    status: 'published',
    phase: 'live',
    paused: false,
    version: 1,
    publishedAt: nowIso,
    hasUnpublishedChanges: false,
    playbook: 'tet_traffic',
    compliance: { promotionType: null, termsText: null, checklistAcknowledgedAt: null },
    createdAt: nowIso,
    updatedAt: nowIso,
  },
  {
    id: 'cmp_2',
    organizationId: 'org_1',
    slug: 'the-cao-giam-gia',
    name: 'Thẻ cào Giảm Giá',
    templateKey: 'scratch-card',
    skinKey: 'everyday',
    brand: getSkin('everyday').brand,
    prizes: defaultPrizes(),
    rules: {
      ...defaultRules(new Date('2026-11-01T00:00:00.000Z')),
      startsAt: '2026-11-01T00:00:00.000Z',
      endsAt: '2026-11-30T00:00:00.000Z',
    },
    status: 'draft',
    phase: 'draft',
    paused: false,
    version: 0,
    publishedAt: null,
    hasUnpublishedChanges: false,
    playbook: null,
    compliance: { promotionType: null, termsText: null, checklistAcknowledgedAt: null },
    createdAt: nowIso,
    updatedAt: nowIso,
  },
];

const mockStats: Map<string, CampaignStats> = new Map([
  [
    'cmp_1',
    {
      plays: 1250,
      players: 980,
      wins: 85,
      redeemed: 72,
      budgetUsedVnd: 2500000,
      redeemedValueVnd: 2160000,
      remainingByPrize: { prz_1: 28 },
      issuedByPrize: { prz_1: 72 },
    },
  ],
]);

mock.module('../../api', () => ({
  useCampaigns: () => ({
    data: mockCampaigns,
    isPending: false,
    isError: false,
    refetch: () => {},
  }),
  useCampaignsStats: () => ({
    data: mockStats,
    isPending: false,
  }),
}));

// Import CampaignList after mocking
const { CampaignList } = await import('./campaign-list');

function render(node: React.ReactNode, locale: 'vi' | 'en' = 'vi') {
  return renderToString(
    <NextIntlClientProvider
      locale={locale}
      messages={getMessages(locale)}
      timeZone="Asia/Ho_Chi_Minh"
    >
      {node}
    </NextIntlClientProvider>,
  );
}

describe('CampaignList with BoardUI Tabs & Table', () => {
  test('renders BoardUI Tabs with status labels and counts', () => {
    const html = render(<CampaignList orgId="org_1" />);
    // Check BoardUI Tabs rendered
    expect(html).toContain('role="tablist"');
    expect(html).toContain('Tất cả');
    expect(html).toContain('Đang chạy');
    expect(html).toContain('Nháp');
  });

  test('renders Table structure with BoardUI styles and items', () => {
    const html = render(<CampaignList orgId="org_1" />);
    // Verify campaigns rendered
    expect(html).toContain('Vòng quay Tết May Mắn');
    expect(html).toContain('Thẻ cào Giảm Giá');
    // Verify table styling and search
    expect(html).toContain('bui-table');
    expect(html).toContain('data-testid="campaign-table"');
    // Verify no untranslated raw keys
    expect(html).not.toContain('campaigns.');
    expect(html).not.toContain('builderLab.');
  });
});
