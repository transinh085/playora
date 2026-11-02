/// <reference types="bun" />
import { describe, expect, mock, test } from 'bun:test';
import type { MyOrg } from '@playora/contracts';
import { getMessages } from '@playora/i18n';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { NextIntlClientProvider } from 'next-intl';
import type React from 'react';
import { renderToString } from 'react-dom/server';
import { AppShell } from './app-shell';

mock.module('next/navigation', () => ({
  useParams: () => ({ orgId: 'org_1' }),
  usePathname: () => '/orgs/org_1',
  useRouter: () => ({
    push: () => {},
    replace: () => {},
    refresh: () => {},
  }),
}));

mock.module('next-themes', () => ({
  useTheme: () => ({
    resolvedTheme: 'light',
    setTheme: () => {},
  }),
}));

mock.module('@/lib/auth-client', () => ({
  authClient: {
    useSession: () => ({
      data: {
        user: { name: 'Owner User', email: 'owner@example.com' },
      },
    }),
    signOut: async () => {},
  },
}));

mock.module('@/features/builder-lab/api', () => ({
  useCampaigns: () => ({
    data: [
      {
        id: 'camp_1',
        name: 'Summer Spin',
        status: 'published',
        rules: {
          startsAt: new Date(Date.now() - 3600000).toISOString(),
          endsAt: new Date(Date.now() + 3600000).toISOString(),
        },
      },
    ],
  }),
}));

const mockOrgs: MyOrg[] = [
  {
    id: 'org_1',
    name: 'Coffee Shop',
    slug: 'coffee-shop',
    logo: null,
    role: 'owner',
  },
];

function renderWithProviders(node: React.ReactNode) {
  const qc = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: Number.POSITIVE_INFINITY },
    },
  });

  return renderToString(
    <QueryClientProvider client={qc}>
      <NextIntlClientProvider locale="vi" messages={getMessages('vi')} timeZone="Asia/Ho_Chi_Minh">
        {node}
      </NextIntlClientProvider>
    </QueryClientProvider>,
  );
}

describe('AppShell with HeroUI Pro Sidebar and Command', () => {
  test('renders Sidebar with groups, header, and user profile', () => {
    const html = renderWithProviders(
      <AppShell orgs={mockOrgs}>
        <div data-testid="page-content">Dashboard Content</div>
      </AppShell>,
    );

    // Sidebar structure
    expect(html).toContain('data-slot="sidebar"');
    expect(html).toContain('Coffee Shop');
    expect(html).toContain('Dashboard Content');
    expect(html).toContain('desktop-quick-actions');
  });

  test('renders Command palette dialog structure via SSR', () => {
    const html = renderWithProviders(
      <AppShell orgs={mockOrgs}>
        <div>Main</div>
      </AppShell>,
    );

    // Navbar command trigger
    expect(html).toContain('Thao tác nhanh');
  });
});
