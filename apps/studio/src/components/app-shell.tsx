'use client';

import type { MyOrg } from '@playora/contracts';
import {
  Avatar,
  Breadcrumb,
  Button,
  Drawer,
  Dropdown,
  Flex,
  Grid,
  Layout,
  Menu,
  type MenuProps,
  Tooltip,
  Typography,
  theme,
} from 'antd';
import {
  CalendarDays,
  ChevronsUpDown,
  House,
  ImageIcon,
  LayoutTemplate,
  LogOut,
  Menu as MenuIcon,
  Moon,
  Palette,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  Shapes,
  Sun,
  Wand2,
} from 'lucide-react';
import type { Route } from 'next';
import Link from 'next/link';
import { useParams, usePathname, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useTheme } from 'next-themes';
import { useState } from 'react';
import { authClient } from '@/lib/auth-client';
import { LABS_ENABLED } from '@/lib/env';
import { Caption } from './caption';
import { LogoMark } from './logo';

const { Sider, Header, Content } = Layout;

type NavKey =
  | 'home'
  | 'events'
  | 'templates'
  | 'brandKits'
  | 'assets'
  | 'settings'
  | 'canvasLab'
  | 'builderLab';
interface NavItem {
  key: NavKey;
  icon: typeof CalendarDays;
  path: string;
}
type NavGroupKey = 'start' | 'campaigns' | 'brand' | 'organization' | 'labs';

/**
 * Sidebar navigation, grouped like the games-vt admin (docs/13 §3.4). Only routes that exist
 * are listed; Labs prototypes stay out of customer builds (LABS_ENABLED).
 */
const NAV_GROUPS: { key: NavGroupKey; items: NavItem[] }[] = [
  { key: 'start', items: [{ key: 'home', icon: House, path: '' }] },
  {
    key: 'campaigns',
    items: [
      { key: 'events', icon: CalendarDays, path: 'events' },
      { key: 'templates', icon: LayoutTemplate, path: 'templates' },
    ],
  },
  {
    key: 'brand',
    items: [
      { key: 'brandKits', icon: Palette, path: 'brand-kits' },
      { key: 'assets', icon: ImageIcon, path: 'assets' },
    ],
  },
  { key: 'organization', items: [{ key: 'settings', icon: Settings, path: 'settings' }] },
  ...(LABS_ENABLED
    ? [
        {
          key: 'labs' as const,
          items: [
            { key: 'builderLab' as const, icon: Wand2, path: 'labs/builder' },
            { key: 'canvasLab' as const, icon: Shapes, path: 'labs/canvas' },
          ],
        },
      ]
    : []),
];

const NAV: NavItem[] = NAV_GROUPS.flatMap((group) => group.items);

export function AppShell({ orgs, children }: { orgs: MyOrg[]; children: React.ReactNode }) {
  const t = useTranslations();
  const pathname = usePathname();
  const router = useRouter();
  const { token } = theme.useToken();
  const screens = Grid.useBreakpoint();
  const isMobile = screens.md === false;
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { orgId } = useParams<{ orgId?: string }>();
  const { data: session } = authClient.useSession();
  const { resolvedTheme, setTheme } = useTheme();
  const current = orgs.find((o) => o.id === orgId) ?? orgs[0];

  async function signOut() {
    await authClient.signOut();
    router.replace('/login');
    router.refresh();
  }

  const orgHome = current ? `/orgs/${current.id}` : '/';
  const activeNav = current
    ? NAV.find(({ path }) =>
        path ? pathname.startsWith(`${orgHome}/${path}`) : pathname === orgHome,
      )
    : undefined;
  const inEvent = /\/events\/[^/]+/.test(pathname);

  const navMenuItems: MenuProps['items'] = current
    ? NAV_GROUPS.flatMap((group): NonNullable<MenuProps['items']> => {
        const children = group.items.map(({ key, icon: Icon, path }) => ({
          key,
          icon: <Icon className="size-4" />,
          label: (
            <Link
              href={(path ? `${orgHome}/${path}` : orgHome) as Route}
              onClick={() => setDrawerOpen(false)}
            >
              {t(`nav.${key}`)}
            </Link>
          ),
        }));
        // Home stands alone above the labelled groups.
        return group.key === 'start'
          ? children
          : [
              {
                key: group.key,
                type: 'group' as const,
                label: t(`navGroups.${group.key}`).toUpperCase(),
                children,
              },
            ];
      })
    : [];

  const breadcrumbs = [
    { title: <Link href={orgHome as Route}>{t('shell.home')}</Link> },
    // Plain text, not links: the sidebar already links each section (and e2e finds those by name).
    ...(activeNav && activeNav.key !== 'home' ? [{ title: t(`nav.${activeNav.key}`) }] : []),
    ...(inEvent ? [{ title: t('shell.eventDetail') }] : []),
  ];

  const showLabels = !collapsed || isMobile;
  const userName = session?.user.name ?? '';

  const sidebar = (
    <Flex vertical className="h-full">
      <Link
        href="/"
        aria-label={t('common.appName')}
        className="flex h-16 shrink-0 items-center gap-3"
        style={{
          padding: showLabels ? '0 24px' : '0 20px',
          borderBottom: `1px solid ${token.colorBorderSecondary}`,
          color: 'inherit',
        }}
      >
        <LogoMark className="size-9" aria-hidden />
        {showLabels && (
          <div className="min-w-0">
            <div
              className="font-display"
              style={{ fontWeight: 700, fontSize: 16, lineHeight: 1.2 }}
            >
              playora
            </div>
            <Typography.Text type="secondary" style={{ fontSize: 11 }}>
              {t('shell.studio')}
            </Typography.Text>
          </div>
        )}
      </Link>
      {current && showLabels && (
        <div className="px-4 pt-4">
          <Dropdown
            menu={{
              items: orgs.map((org) => ({
                key: org.id,
                label: org.name,
                onClick: () => router.push(`/orgs/${org.id}`),
              })),
              selectedKeys: [current.id],
            }}
            trigger={['click']}
          >
            <Button block aria-label={t('shell.switchOrg')} className="!justify-between">
              <Typography.Text ellipsis>{current.name}</Typography.Text>
              <ChevronsUpDown className="size-4 shrink-0" />
            </Button>
          </Dropdown>
        </div>
      )}
      {current && (
        <nav className="flex-1 overflow-y-auto overflow-x-hidden pb-4">
          <Menu
            mode="inline"
            inlineCollapsed={!showLabels}
            selectedKeys={activeNav ? [activeNav.key] : []}
            items={navMenuItems}
            className="mt-2"
          />
        </nav>
      )}
    </Flex>
  );

  return (
    <Layout className="min-h-dvh">
      {isMobile ? (
        <Drawer
          placement="left"
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          closable={false}
          size={280}
          styles={{ body: { padding: 0 } }}
        >
          {sidebar}
        </Drawer>
      ) : (
        <Sider
          width={250}
          collapsed={collapsed}
          trigger={null}
          className="sticky top-0 h-dvh"
          style={{ borderRight: `1px solid ${token.colorBorderSecondary}` }}
        >
          {sidebar}
        </Sider>
      )}
      <Layout className="min-w-0">
        <Header
          className="sticky top-0 z-10 flex items-center justify-between"
          style={{
            borderBottom: `1px solid ${token.colorBorderSecondary}`,
            padding: isMobile ? '0 12px' : undefined,
          }}
        >
          <Flex align="center" gap={16}>
            <Tooltip
              title={
                isMobile ? t('shell.openNav') : collapsed ? t('shell.expand') : t('shell.collapse')
              }
            >
              <Button
                type="text"
                aria-label={
                  isMobile
                    ? t('shell.openNav')
                    : collapsed
                      ? t('shell.expand')
                      : t('shell.collapse')
                }
                icon={
                  isMobile ? (
                    <MenuIcon className="size-4" />
                  ) : collapsed ? (
                    <PanelLeftOpen className="size-4" />
                  ) : (
                    <PanelLeftClose className="size-4" />
                  )
                }
                onClick={() => (isMobile ? setDrawerOpen(true) : setCollapsed(!collapsed))}
              />
            </Tooltip>
            {!isMobile && <Breadcrumb items={breadcrumbs} />}
          </Flex>
          <Flex align="center" gap={16}>
            <Button
              type="text"
              shape="circle"
              aria-label="Theme"
              icon={
                resolvedTheme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />
              }
              onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
            />
            <Dropdown
              menu={{
                items: [
                  {
                    key: 'sign-out',
                    icon: <LogOut className="size-4" />,
                    label: t('auth.signOut'),
                    danger: true,
                    onClick: signOut,
                  },
                ],
              }}
              placement="bottomRight"
              trigger={['click']}
              arrow
            >
              <button
                type="button"
                aria-label="User menu"
                className="flex cursor-pointer items-center gap-2 border-0 bg-transparent p-0"
              >
                <Avatar style={{ backgroundColor: token.colorPrimary, fontWeight: 600 }}>
                  {userName.slice(0, 1).toUpperCase() || '?'}
                </Avatar>
                {!isMobile && (
                  <Flex vertical align="start" style={{ lineHeight: 1.2 }}>
                    <Typography.Text strong style={{ fontSize: 13 }}>
                      {userName}
                    </Typography.Text>
                    <Caption style={{ fontSize: 11 }}>{session?.user.email}</Caption>
                  </Flex>
                )}
              </button>
            </Dropdown>
          </Flex>
        </Header>
        <Content style={{ margin: isMobile ? 12 : 24 }}>{children}</Content>
      </Layout>
    </Layout>
  );
}
