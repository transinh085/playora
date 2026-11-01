/// <reference types="bun" />
import { describe, expect, test } from 'bun:test';
import { routeKey } from '@playora/api-client';
import { brandKitsApi, campaignsApi } from '@playora/contracts';
import { getMessages } from '@playora/i18n';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NextIntlClientProvider } from 'next-intl';
import type React from 'react';
import { renderToString } from 'react-dom/server';
import { AuthShowcase } from '@/features/auth/components/auth-showcase';
import { orgMembersQueryKey } from '@/features/members/api';
import { OnboardingLaunchpad } from './onboarding-launchpad';
import { SidebarOnboarding } from './sidebar-onboarding';

function createTestQueryClient() {
  const qc = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: Number.POSITIVE_INFINITY,
      },
    },
  });

  // Default empty state: new organization
  qc.setQueryData(routeKey(campaignsApi.list, { params: { orgId: 'org_1' } }), []);
  qc.setQueryData(
    routeKey(brandKitsApi.list, { params: { orgId: 'org_1' }, query: { limit: 50 } }),
    { items: [], nextCursor: null },
  );
  qc.setQueryData(orgMembersQueryKey('org_1'), {
    id: 'org_1',
    name: 'Org 1',
    slug: 'org-1',
    members: [{ id: 'm1' }],
    invitations: [],
  });

  return qc;
}

function render(node: React.ReactNode, locale: 'vi' | 'en' = 'vi', qc = createTestQueryClient()) {
  return renderToString(
    <QueryClientProvider client={qc}>
      <NextIntlClientProvider
        locale={locale}
        messages={getMessages(locale)}
        timeZone="Asia/Ho_Chi_Minh"
      >
        {node}
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
}

describe('SidebarOnboarding', () => {
  test('renders compact onboarding checklist in sidebar with testids', () => {
    const html = render(<SidebarOnboarding orgId="org_1" />);
    expect(html).toContain('data-testid="home-checklist"');
    expect(html).toContain('data-testid="home-checklist-brand"');
    expect(html).toContain('data-testid="home-checklist-campaign"');
    expect(html).toContain('data-testid="home-checklist-publish"');
    expect(html).toContain('data-testid="home-checklist-share"');
    expect(html).toContain('data-testid="home-checklist-team"');
    expect(html).toContain('data-done="false"');
    expect(html).toContain('0/5');
  });

  test('renders collapsed icon button with badge for collapsed desktop sidebar', () => {
    const html = render(<SidebarOnboarding orgId="org_1" isCollapsedDesktop />);
    expect(html).toContain('data-testid="home-checklist"');
    expect(html).toContain('Bắt đầu với Playora');
  });

  test('renders English localized text correctly', () => {
    const html = render(<SidebarOnboarding orgId="org_1" />, 'en');
    expect(html).toContain('data-testid="home-checklist"');
    expect(html).toContain('Add your store&#x27;s logo and colours');
  });

  test('renders OnboardingLaunchpad with 5 interactive steps and time estimates', () => {
    const html = render(<OnboardingLaunchpad orgId="org_1" />);
    expect(html).toContain('data-testid="home-onboarding-launchpad"');
    expect(html).toContain('data-testid="launchpad-step-brand"');
    expect(html).toContain('data-testid="launchpad-step-campaign"');
    expect(html).toContain('data-testid="launchpad-step-publish"');
    expect(html).toContain('data-testid="launchpad-step-share"');
    expect(html).toContain('data-testid="launchpad-step-team"');
    expect(html).toContain('Đưa chương trình đầu tiên của quán vào hoạt động');
    expect(html).toContain('Tạo brand kit');
  });

  test('renders AuthShowcase with interactive phone mockup and outcome cards', () => {
    const html = render(<AuthShowcase />);
    expect(html).toContain('Vòng Quay Hái Lộc');
    expect(html).toContain('MỘC-88A');
    expect(html).toContain('Quay thử ngay');
  });
});
