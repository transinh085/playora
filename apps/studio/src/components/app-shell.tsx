'use client';

import type { MyOrg } from '@playora/contracts';
import { Avatar, Button, Dropdown, Layout, Menu, type MenuProps } from 'antd';
import {
  BarChart3,
  CalendarDays,
  Gamepad2,
  ImageIcon,
  LogOut,
  Moon,
  Palette,
  Settings,
  Sun,
} from 'lucide-react';
import type { Route } from 'next';
import Link from 'next/link';
import { useParams, usePathname, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useTheme } from 'next-themes';
import { authClient } from '@/lib/auth-client';
import { Logo } from './logo';

const { Sider, Header, Content } = Layout;

const nav = [
  { key: 'events', icon: CalendarDays, path: 'events' },
  { key: 'brandKits', icon: Palette, path: 'brand-kits' },
  { key: 'assets', icon: ImageIcon, path: 'assets' },
  { key: 'templates', icon: Gamepad2, path: 'templates' },
  { key: 'reports', icon: BarChart3, path: 'reports' },
  { key: 'settings', icon: Settings, path: 'settings' },
] as const;

export function AppShell({ orgs, children }: { orgs: MyOrg[]; children: React.ReactNode }) {
  const t = useTranslations();
  const pathname = usePathname();
  const router = useRouter();
  const { orgId } = useParams<{ orgId?: string }>();
  const { data: session } = authClient.useSession();
  const { resolvedTheme, setTheme } = useTheme();
  const current = orgs.find((o) => o.id === orgId) ?? orgs[0];

  async function signOut() {
    await authClient.signOut();
    router.replace('/login');
    router.refresh();
  }

  const activeNav = current
    ? nav.find(({ path }) => pathname.startsWith(`/orgs/${current.id}/${path}`))
    : undefined;
  const selectedNavKey = activeNav?.key;

  const orgMenuItems: MenuProps['items'] = orgs.map((org) => ({
    key: org.id,
    label: org.name,
    onClick: () => router.push(`/orgs/${org.id}/events`),
  }));

  const navMenuItems: MenuProps['items'] = current
    ? nav.map(({ key, icon: Icon, path }) => {
        const href = `/orgs/${current.id}/${path}`;
        return {
          key,
          icon: <Icon className="size-4" />,
          label: <Link href={href as Route}>{t(`nav.${key}`)}</Link>,
        };
      })
    : [];

  return (
    <Layout className="min-h-dvh">
      <Sider
        width={240}
        breakpoint="md"
        collapsedWidth={0}
        trigger={null}
        className="border-r border-[var(--ant-color-border-secondary)]"
      >
        <div className="flex h-full flex-col gap-4 p-4">
          <Link href="/" className="px-2 py-1" aria-label={t('common.appName')}>
            <Logo />
          </Link>
          {current && (
            <Dropdown
              menu={{
                items: orgMenuItems,
                selectedKeys: [current.id],
              }}
              trigger={['click']}
            >
              <Button className="w-full justify-between truncate text-left">
                <span className="truncate">{current.name}</span>
              </Button>
            </Dropdown>
          )}
          {current && (
            <nav className="grid gap-1">
              <Menu
                mode="inline"
                selectedKeys={selectedNavKey ? [selectedNavKey] : []}
                items={navMenuItems}
                className="border-none bg-transparent"
              />
            </nav>
          )}
        </div>
      </Sider>
      <Layout className="flex min-w-0 flex-col">
        <Header
          style={{ height: 56, lineHeight: 'normal', padding: '0 16px' }}
          className="flex items-center justify-end gap-2 border-b border-[var(--ant-color-border-secondary)]"
        >
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
                  key: 'user-info',
                  type: 'group',
                  label: (
                    <div className="py-1">
                      <div className="font-medium text-[var(--ant-color-text)]">
                        {session?.user.name}
                      </div>
                      <div className="text-xs text-[var(--ant-color-text-secondary)]">
                        {session?.user.email}
                      </div>
                    </div>
                  ),
                },
                {
                  type: 'divider',
                },
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
          >
            <button
              type="button"
              className="cursor-pointer rounded-full border-0 bg-transparent p-0 outline-none"
              aria-label="User menu"
            >
              <Avatar size={32} className="cursor-pointer">
                {session?.user.name?.slice(0, 1).toUpperCase() ?? '?'}
              </Avatar>
            </button>
          </Dropdown>
        </Header>
        <Content className="flex-1 p-6">{children}</Content>
      </Layout>
    </Layout>
  );
}
