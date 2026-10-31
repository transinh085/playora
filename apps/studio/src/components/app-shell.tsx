'use client';

import type { MyOrg } from '@playora/contracts';
import {
  NotificationCenter,
  type NotificationCenterItem,
  Popover,
  PopoverTrigger,
} from '@playora/ui/components';
import { applyThemeWithTransition } from '@playora/ui/components/application/theme/theme-toggle';
import { Avatar } from '@playora/ui/components/base/avatar/avatar';
import { Breadcrumb, BreadcrumbItem } from '@playora/ui/components/base/breadcrumb/breadcrumb';
import { Button } from '@playora/ui/components/base/buttons/button';
import { IconButton } from '@playora/ui/components/base/buttons/icon-button';
import { Drawer } from '@playora/ui/components/base/drawer/drawer';
import {
  Dropdown,
  DropdownDivider,
  DropdownGroup,
  DropdownItem,
  DropdownPopover,
  DropdownTrigger,
} from '@playora/ui/components/base/dropdown/dropdown';
import { Kbd } from '@playora/ui/components/base/kbd/kbd';
import { Modal } from '@playora/ui/components/base/modal/modal';
import { cx } from '@playora/ui/utils/cx';
import {
  RiAddLine,
  RiArrowDownSLine,
  RiArrowUpDownLine,
  RiBankCardLine,
  RiCalendarEventLine,
  RiCheckLine,
  RiCloseLine,
  RiHome5Line,
  RiImageLine,
  RiLayoutMasonryLine,
  RiLogoutBoxRLine,
  RiMenuLine,
  RiMoonLine,
  RiMoreLine,
  RiNotification3Line,
  RiPaletteLine,
  RiSearchLine,
  RiSettings4Line,
  RiSideBarFill,
  RiSparklingLine,
  RiSunLine,
  RiTicketLine,
} from '@remixicon/react';
import type { Route } from 'next';
import Link from 'next/link';
import { useParams, usePathname, useRouter } from 'next/navigation';
import { useNow, useTranslations } from 'next-intl';
import { useTheme } from 'next-themes';
import { type ComponentType, useEffect, useState } from 'react';
import { useCampaigns } from '@/features/builder-lab/api';
import { campaignPhase } from '@/features/builder-lab/lib/phase';
import { campaignRoutes } from '@/features/builder-lab/lib/routes';
import { authClient } from '@/lib/auth-client';
import { can, isRedeemerOnly, type PermissionRequest } from '@/lib/permissions';
import { Caption } from './caption';

type NavKey =
  | 'home'
  | 'campaigns'
  | 'templates'
  | 'redeem'
  | 'brandKits'
  | 'assets'
  | 'settings'
  | 'billing';

type IconComponent = ComponentType<{
  className?: string;
  'aria-hidden'?: boolean | 'true' | 'false';
}>;

interface NavItemDef {
  key: NavKey;
  icon: IconComponent;
  path: string;
  permission?: PermissionRequest;
}

type NavGroupKey = 'start' | 'campaigns' | 'brand' | 'organization';

const NAV_GROUPS: { key: NavGroupKey; items: NavItemDef[] }[] = [
  {
    key: 'start',
    items: [
      { key: 'home', icon: RiHome5Line, path: '', permission: { campaign: ['read'] } },
      { key: 'redeem', icon: RiTicketLine, path: 'redeem', permission: { voucher: ['read'] } },
    ],
  },
  {
    key: 'campaigns',
    items: [
      {
        key: 'campaigns',
        icon: RiCalendarEventLine,
        path: 'campaigns',
        permission: { campaign: ['read'] },
      },
      {
        key: 'templates',
        icon: RiLayoutMasonryLine,
        path: 'templates',
        permission: { campaign: ['read'] },
      },
    ],
  },
  {
    key: 'brand',
    items: [
      {
        key: 'brandKits',
        icon: RiPaletteLine,
        path: 'brand-kits',
        permission: { brandKit: ['read'] },
      },
      { key: 'assets', icon: RiImageLine, path: 'assets', permission: { asset: ['read'] } },
    ],
  },
  {
    key: 'organization',
    items: [
      { key: 'settings', icon: RiSettings4Line, path: 'settings' },
      {
        key: 'billing',
        icon: RiBankCardLine,
        path: 'settings/billing',
        permission: { billing: ['read'] },
      },
    ],
  },
];

const NAV: NavItemDef[] = NAV_GROUPS.flatMap((group) => group.items).sort(
  (a, b) => b.path.length - a.path.length,
);

const WORKSPACE_GRADIENTS = [
  'from-emerald-400 to-cyan-500',
  'from-rose-400 to-red-500',
  'from-amber-400 to-orange-500',
  'from-blue-400 to-indigo-500',
  'from-fuchsia-400 to-purple-500',
  'from-cyan-400 to-blue-500',
] as const;

function Collapsible({
  collapsed,
  children,
  className,
}: {
  collapsed: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cx(
        'flex min-w-0 items-center overflow-hidden transition-[max-width,opacity,filter] duration-300 ease-in-out',
        collapsed ? 'max-w-0 opacity-0 blur-[3px]' : 'max-w-full opacity-100 blur-0',
        className,
      )}
    >
      {children}
    </span>
  );
}

function SidebarNavItem({
  icon: Icon,
  label,
  href,
  isSelected,
  collapsed,
  onClick,
}: {
  icon: IconComponent;
  label: string;
  href: Route;
  isSelected?: boolean;
  collapsed?: boolean;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      aria-current={isSelected ? 'page' : undefined}
      aria-label={label}
      title={collapsed ? label : undefined}
      className={cx(
        'flex items-center justify-between overflow-hidden rounded-2lg p-2',
        'transition-[width,background-color] duration-300 ease-in-out',
        collapsed ? 'w-9' : 'w-full',
        isSelected
          ? 'bg-linear-to-b from-accent-500 to-accent-600 text-white shadow-nav-selected'
          : 'text-text-secondary hover:bg-background-secondary-hover hover:text-text-primary',
      )}
    >
      <span className="flex min-w-0 items-center gap-2">
        <Icon
          className={cx(
            'size-5 shrink-0 transition-colors',
            isSelected ? 'text-white' : 'text-foreground-icon-secondary',
          )}
          aria-hidden
        />
        <Collapsible collapsed={Boolean(collapsed)}>
          <span
            className={cx(
              'truncate text-body-medium whitespace-nowrap',
              isSelected ? 'font-medium text-white' : 'text-text-secondary',
            )}
          >
            {label}
          </span>
        </Collapsible>
      </span>
    </Link>
  );
}

export function AppShell({ orgs, children }: { orgs: MyOrg[]; children: React.ReactNode }) {
  const t = useTranslations();
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [closedGroups, setClosedGroups] = useState<Record<string, boolean>>({});
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const [quickSearch, setQuickSearch] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  const { orgId } = useParams<{ orgId?: string }>();
  const { data: session } = authClient.useSession();
  const { resolvedTheme, setTheme } = useTheme();
  const now = useNow({ updateInterval: 60_000 }).getTime();
  const current = orgs.find((o) => o.id === orgId) ?? orgs[0];
  const currentIndex = current
    ? Math.max(
        0,
        orgs.findIndex((o) => o.id === current.id),
      )
    : 0;
  const currentGradient = WORKSPACE_GRADIENTS[currentIndex % WORKSPACE_GRADIENTS.length];
  const canReadCampaigns = Boolean(current && can(current.role, { campaign: ['read'] }));
  const campaignsQuery = useCampaigns(canReadCampaigns && current ? current.id : '');
  const campaigns = canReadCampaigns ? (campaignsQuery.data ?? []) : [];

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const inInput =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable);
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setQuickOpen((prev) => !prev);
      } else if (!inInput && !e.metaKey && !e.ctrlKey && !e.altKey && e.key.toLowerCase() === 'j') {
        e.preventDefault();
        setQuickOpen(true);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  function handleToggleTheme(
    event?: React.MouseEvent<HTMLElement>,
    forcedTheme?: 'light' | 'dark',
  ) {
    const nextTheme = forcedTheme ?? (resolvedTheme === 'dark' ? 'light' : 'dark');
    if (nextTheme === (resolvedTheme === 'dark' ? 'dark' : 'light')) return;

    const pointerOrigin =
      event && event.clientX !== 0 && event.clientY !== 0
        ? { x: event.clientX, y: event.clientY }
        : null;

    void applyThemeWithTransition(nextTheme, {
      origin: pointerOrigin,
      element: event?.currentTarget ?? null,
      onApply: () => setTheme(nextTheme),
    });
  }

  function toggleGroup(groupKey: string) {
    setClosedGroups((prev) => ({ ...prev, [groupKey]: !prev[groupKey] }));
  }

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
  const activeGroup = current
    ? NAV_GROUPS.find((group) =>
        group.items.some(({ path }) =>
          path ? pathname.startsWith(`${orgHome}/${path}`) : pathname === orgHome,
        ),
      )
    : undefined;
  const ActiveIcon = activeNav?.icon ?? RiHome5Line;
  const headerTitle = activeNav ? t(`nav.${activeNav.key}`) : t('shell.home');

  const showLabels = !collapsed || isMobile;
  const userName = session?.user.name ?? '';
  const routes = current ? campaignRoutes(current.id) : null;

  const visibleNavItems = current
    ? NAV.filter((item) => !item.permission || can(current.role, item.permission))
    : [];

  const needle = quickSearch.trim().toLowerCase();
  const filteredNavItems = visibleNavItems.filter(
    (item) => !needle || t(`nav.${item.key}`).toLowerCase().includes(needle),
  );
  const filteredCampaigns = campaigns
    .filter((c) => !needle || c.name.toLowerCase().includes(needle))
    .slice(0, 5);

  const notifications: NotificationCenterItem[] = [
    {
      id: 'welcome',
      category: 'system',
      group: 'Hệ thống',
      title: 'Chào mừng bạn đến với Playora Studio',
      description: 'Hệ thống trò chơi đổi quà tương tác đã sẵn sàng hoạt động.',
      timestamp: 'Hôm nay',
      status: 'information',
      unread: false,
    },
    ...campaigns.slice(0, 3).map((c) => {
      const phase = campaignPhase(c, now);
      return {
        id: `camp-${c.id}`,
        category: 'activity' as const,
        group: 'Chiến dịch',
        title: c.name,
        description: `Trạng thái: ${t(`campaigns.phase.${phase}`)}`,
        timestamp: 'Gần đây',
        status: phase === 'live' ? ('success' as const) : ('neutral' as const),
        unread: phase === 'live' || phase === 'draft',
      };
    }),
  ];
  const unreadCount = notifications.filter((n) => n.unread).length;

  const isCollapsedDesktop = collapsed && !isMobile;

  const sidebarContent = (
    <div className="flex h-full flex-col justify-between select-none">
      {/* Scrollable upper area */}
      <div className="-m-2 flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-2 [scrollbar-width:none]">
        {/* Workspace Switcher / Collapse Toggle */}
        <div
          className={cx(
            'flex w-full transition-[gap] duration-300 ease-in-out',
            isCollapsedDesktop
              ? 'flex-col-reverse items-start justify-center gap-2.5'
              : 'flex-row items-center justify-between',
          )}
        >
          {current ? (
            <Dropdown>
              <DropdownTrigger
                aria-label={t('shell.switchOrg')}
                className={cx(
                  'flex cursor-pointer items-center outline-none transition-[width,padding] duration-300 ease-in-out hover:bg-background-tertiary-hover',
                  isCollapsedDesktop
                    ? 'h-9 w-9 justify-center rounded-full p-0'
                    : 'min-w-0 flex-1 gap-2 rounded-xl p-1.5 text-left',
                )}
              >
                <div
                  aria-hidden="true"
                  className={cx(
                    'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-linear-to-tr text-caption-1-semibold font-semibold text-white shadow-xs',
                    currentGradient,
                  )}
                >
                  {current.name.slice(0, 1).toUpperCase()}
                </div>
                <Collapsible collapsed={isCollapsedDesktop} className="flex-1">
                  <span className="flex min-w-0 flex-col items-start justify-center">
                    <span className="truncate text-body-medium font-medium text-text-primary">
                      {current.name}
                    </span>
                    <span className="truncate text-caption-1-regular text-text-tertiary">
                      {current.role}
                    </span>
                  </span>
                </Collapsible>
                <Collapsible collapsed={isCollapsedDesktop}>
                  <RiArrowUpDownLine className="size-3.5 shrink-0 text-foreground-icon-tertiary" />
                </Collapsible>
              </DropdownTrigger>
              <DropdownPopover
                aria-label={t('shell.switchOrg')}
                placement={isCollapsedDesktop ? 'right top' : 'bottom start'}
                className="w-[230px]"
              >
                <DropdownGroup>
                  {orgs.map((org, idx) => {
                    const isSelected = org.id === current.id;
                    const grad = WORKSPACE_GRADIENTS[idx % WORKSPACE_GRADIENTS.length];
                    return (
                      <DropdownItem
                        key={org.id}
                        selected={isSelected}
                        onSelect={() =>
                          router.push(
                            isRedeemerOnly(org.role) ? `/orgs/${org.id}/redeem` : `/orgs/${org.id}`,
                          )
                        }
                      >
                        <div
                          className={cx(
                            'flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-linear-to-tr text-caption-2-medium text-white',
                            grad,
                          )}
                        >
                          {org.name.slice(0, 1).toUpperCase()}
                        </div>
                        <span className="flex-1 truncate text-left text-body-medium">
                          {org.name}
                        </span>
                        {isSelected && (
                          <RiCheckLine className="size-4 shrink-0 text-text-primary" />
                        )}
                      </DropdownItem>
                    );
                  })}
                </DropdownGroup>
              </DropdownPopover>
            </Dropdown>
          ) : (
            <Link
              href="/"
              aria-label={t('common.appName')}
              className={cx(
                'flex items-center gap-2 rounded-xl p-1.5 text-text-primary',
                isCollapsedDesktop ? 'h-9 w-9 justify-center' : 'flex-1',
              )}
            >
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-linear-to-tr from-emerald-400 to-cyan-500 text-caption-1-semibold font-bold text-white shadow-xs">
                P
              </div>
              <Collapsible collapsed={isCollapsedDesktop}>
                <span className="truncate text-body-medium font-medium">Playora</span>
              </Collapsible>
            </Link>
          )}

          {isMobile ? (
            <button
              type="button"
              aria-label="Close sidebar"
              onClick={() => setDrawerOpen(false)}
              className="cursor-pointer text-foreground-icon-secondary transition-colors hover:text-foreground-icon-primary"
            >
              <RiCloseLine className="size-5" aria-hidden />
            </button>
          ) : (
            <button
              type="button"
              aria-label={collapsed ? t('shell.expand') : t('shell.collapse')}
              aria-expanded={!collapsed}
              onClick={() => setCollapsed(!collapsed)}
              className={cx(
                'cursor-pointer text-foreground-icon-secondary transition-colors hover:text-foreground-icon-primary',
                collapsed && 'flex h-9 w-9 items-center justify-center',
              )}
            >
              <RiSideBarFill
                className={cx(
                  'size-5 transition-transform duration-300 ease-in-out',
                  collapsed ? 'rtl:-scale-x-100' : '-scale-x-100 rtl:scale-x-100',
                )}
                aria-hidden
              />
            </button>
          )}
        </div>

        {/* Quick Search Button */}
        <button
          type="button"
          aria-label={t('shell.quickActions')}
          title={isCollapsedDesktop ? `${t('shell.quickActions')} (⌘K / J)` : undefined}
          onClick={() => setQuickOpen(true)}
          className={cx(
            'flex cursor-pointer items-center gap-2 p-2 outline-none hover:bg-background-tertiary-hover/55',
            'transition-[width,border-radius,background-color] duration-300 ease-in-out',
            isCollapsedDesktop
              ? 'h-9 w-9 justify-center rounded-full bg-background-tertiary-default'
              : 'w-full rounded-full bg-background-tertiary-default',
          )}
        >
          <span className={cx('flex min-w-0 items-center gap-2', showLabels && 'flex-1')}>
            <RiSearchLine className="size-5 shrink-0 text-foreground-icon-secondary" aria-hidden />
            <Collapsible collapsed={isCollapsedDesktop}>
              <span className="truncate text-body-medium whitespace-nowrap text-text-secondary">
                {t('shell.quickActions')}
              </span>
            </Collapsible>
          </span>
          <Collapsible collapsed={isCollapsedDesktop}>
            <Kbd>⌘K</Kbd>
          </Collapsible>
        </button>

        {/* Navigation Groups */}
        {current && (
          <nav className={cx('flex w-full flex-col gap-3', showLabels && 'px-0.5')}>
            {NAV_GROUPS.map((group) => {
              const visibleItems = group.items.filter(
                (item) => !item.permission || can(current.role, item.permission),
              );
              if (visibleItems.length === 0) return null;

              if (group.key === 'start') {
                return (
                  <div key={group.key} className="flex w-full flex-col gap-1">
                    {visibleItems.map(({ key, icon: Icon, path }) => {
                      const href = (path ? `${orgHome}/${path}` : orgHome) as Route;
                      const isSelected = activeNav?.key === key;
                      return (
                        <SidebarNavItem
                          key={key}
                          icon={Icon}
                          label={t(`nav.${key}`)}
                          href={href}
                          isSelected={isSelected}
                          collapsed={isCollapsedDesktop}
                          onClick={() => setDrawerOpen(false)}
                        />
                      );
                    })}
                  </div>
                );
              }

              const isClosed = Boolean(closedGroups[group.key]);

              return (
                <div key={group.key} className="flex w-full flex-col gap-1">
                  {showLabels && (
                    <button
                      type="button"
                      onClick={() => toggleGroup(group.key)}
                      className="group flex w-full cursor-pointer items-center justify-between px-2 pt-2 pb-1 text-left"
                    >
                      <span className="text-caption-1-semibold text-text-tertiary transition-colors group-hover:text-text-secondary">
                        {t(`navGroups.${group.key}`)}
                      </span>
                      <RiArrowDownSLine
                        className={cx(
                          'size-3.5 text-text-tertiary transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]',
                          isClosed && '-rotate-90',
                        )}
                      />
                    </button>
                  )}

                  <div
                    className={cx(
                      'grid transition-[grid-template-rows,opacity] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]',
                      isClosed && showLabels
                        ? 'pointer-events-none grid-rows-[0fr] opacity-0'
                        : 'grid-rows-[1fr] opacity-100',
                    )}
                  >
                    <div className="overflow-hidden">
                      <div className="flex w-full flex-col gap-1">
                        {visibleItems.map(({ key, icon: Icon, path }) => {
                          const href = (path ? `${orgHome}/${path}` : orgHome) as Route;
                          const isSelected = activeNav?.key === key;
                          return (
                            <SidebarNavItem
                              key={key}
                              icon={Icon}
                              label={t(`nav.${key}`)}
                              href={href}
                              isSelected={isSelected}
                              collapsed={isCollapsedDesktop}
                              onClick={() => setDrawerOpen(false)}
                            />
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </nav>
        )}
      </div>

      {/* Bottom Footer Section: User Profile Card */}
      <div className="flex w-full shrink-0 flex-col gap-2 pt-2">
        <Dropdown>
          <DropdownTrigger
            aria-label={userName || session?.user.email || 'User menu'}
            className={cx(
              'flex cursor-pointer items-center overflow-hidden rounded-xl bg-background-tertiary-default outline-none transition-[width,padding,background-color] duration-300 ease-in-out hover:bg-background-tertiary-hover',
              isCollapsedDesktop
                ? 'h-9 w-9 justify-center rounded-full bg-transparent p-0'
                : 'w-full justify-between py-2 pe-3 ps-2.5',
            )}
          >
            <span className="flex min-w-0 items-center gap-2">
              <Avatar
                size="sm"
                initials={(userName || session?.user.email || 'U').slice(0, 1).toUpperCase()}
                color="blue"
              />
              <Collapsible collapsed={isCollapsedDesktop}>
                <span className="flex min-w-0 flex-col items-start justify-center">
                  <span className="truncate text-body-medium font-medium text-text-primary">
                    {userName || 'User'}
                  </span>
                  <span className="truncate text-caption-1-regular text-text-tertiary">
                    {session?.user.email}
                  </span>
                </span>
              </Collapsible>
            </span>
            <Collapsible collapsed={isCollapsedDesktop}>
              <RiMoreLine className="size-4 shrink-0 text-foreground-icon-secondary" />
            </Collapsible>
          </DropdownTrigger>
          <DropdownPopover
            aria-label="User menu"
            placement={isCollapsedDesktop ? 'right bottom' : 'top start'}
            className="w-56"
          >
            <div className="px-2 py-1.5">
              <p className="truncate text-body-medium font-medium text-text-primary">{userName}</p>
              <Caption className="block truncate text-caption-1-medium text-text-tertiary">
                {session?.user.email}
              </Caption>
            </div>
            <DropdownDivider />
            <DropdownGroup>
              <DropdownItem
                className="text-text-error-primary hover:bg-notification-error-background"
                onSelect={signOut}
              >
                <RiLogoutBoxRLine className="size-4 shrink-0" />
                <span>{t('auth.signOut')}</span>
              </DropdownItem>
            </DropdownGroup>
          </DropdownPopover>
        </Dropdown>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-dvh w-full bg-background-full text-text-primary antialiased">
      {/* Quick Actions Command Modal */}
      <Modal
        isOpen={quickOpen}
        onOpenChange={setQuickOpen}
        size="sm"
        aria-label={t('shell.quickActions')}
        className="gap-0 p-0"
      >
        <div className="flex items-center border-b border-separator-border px-3">
          <RiSearchLine className="size-4 shrink-0 text-foreground-icon-tertiary" />
          <input
            type="search"
            value={quickSearch}
            onChange={(e) => setQuickSearch(e.target.value)}
            placeholder={t('shell.quickActionsPlaceholder')}
            aria-label={t('shell.quickActions')}
            className="h-10 w-full border-0 bg-transparent px-2 text-body-regular text-text-primary placeholder:text-text-tertiary outline-none"
          />
        </div>
        <div className="max-h-72 overflow-y-auto p-1.5">
          {filteredNavItems.length === 0 && filteredCampaigns.length === 0 ? (
            <p className="py-6 text-center text-body-2-regular text-text-tertiary">
              {t('shell.quickActionsEmpty')}
            </p>
          ) : (
            <div className="space-y-1.5">
              {filteredNavItems.length > 0 && (
                <div className="space-y-0.5">
                  {filteredNavItems.map(({ key, icon: Icon, path }) => {
                    const href = (path ? `${orgHome}/${path}` : orgHome) as Route;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => {
                          setQuickOpen(false);
                          setQuickSearch('');
                          router.push(href);
                        }}
                        className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-left text-body-medium text-text-primary transition-colors hover:bg-background-secondary-hover"
                      >
                        <Icon className="size-4 text-foreground-icon-secondary" />
                        <span>{t(`nav.${key}`)}</span>
                      </button>
                    );
                  })}
                </div>
              )}
              {routes && filteredCampaigns.length > 0 && (
                <div className="space-y-0.5 border-t border-separator-border pt-1.5">
                  <p className="px-2 py-1 text-caption-1-medium text-text-tertiary">
                    {t('shell.favorites')}
                  </p>
                  {filteredCampaigns.map((c) => {
                    const phase = campaignPhase(c, now);
                    const href = phase === 'draft' ? routes.edit(c.id) : routes.detail(c.id);
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setQuickOpen(false);
                          setQuickSearch('');
                          router.push(href);
                        }}
                        className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left text-body-medium text-text-primary transition-colors hover:bg-background-secondary-hover"
                      >
                        <span className="flex min-w-0 items-center gap-2">
                          <RiSparklingLine className="size-3.5 shrink-0 text-accent-500" />
                          <span className="truncate">{c.name}</span>
                        </span>
                        <span className="shrink-0 text-caption-1-medium text-text-tertiary">
                          {t(`campaigns.phase.${phase}`)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </Modal>

      {/* Mobile Drawer */}
      <Drawer
        isOpen={drawerOpen}
        onOpenChange={setDrawerOpen}
        placement="start"
        size="sm"
        aria-label="Navigation Menu"
        className="bg-background-full p-2.5"
      >
        <div className="h-full w-full rounded-2xl bg-background-secondary-default p-3 shadow-sidebar">
          {sidebarContent}
        </div>
      </Drawer>

      {/* Floating Collapsible Desktop Sidebar */}
      <aside
        className={cx(
          'sticky top-3 z-40 my-3 ml-3 hidden h-[calc(100dvh-24px)] shrink-0 flex-col justify-between overflow-hidden md:flex',
          'rounded-3xl border border-border-button-white bg-background-secondary-default shadow-sidebar',
          'transition-[width] duration-300 ease-in-out',
          collapsed ? 'w-[60px] px-[11px] py-3' : 'w-[260px] p-3',
        )}
      >
        {sidebarContent}
      </aside>

      {/* Main Content Viewport */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top Header - Workspace header */}
        <header className="sticky top-0 z-30 flex h-12 shrink-0 items-center justify-between gap-3 bg-background-primary-default/80 px-3 backdrop-blur-md transition-colors sm:gap-4 sm:px-6 lg:px-8">
          {/* Left: Mobile nav toggle + Breadcrumbs */}
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            {isMobile && (
              <IconButton
                icon={RiMenuLine}
                size="small"
                aria-label={t('shell.openNav')}
                onClick={() => setDrawerOpen(true)}
                className="md:hidden"
              />
            )}
            {/* Breadcrumb navigation trail */}
            {current ? (
              <Breadcrumb aria-label="Page navigation" className="min-w-0">
                <BreadcrumbItem href={orgHome as Route} className="hidden sm:inline-flex">
                  {current.name}
                </BreadcrumbItem>
                {activeGroup && activeGroup.key !== 'start' && (
                  <BreadcrumbItem className="hidden md:inline-flex">
                    {t(`navGroups.${activeGroup.key}`)}
                  </BreadcrumbItem>
                )}
                <BreadcrumbItem current icon={ActiveIcon}>
                  {headerTitle}
                </BreadcrumbItem>
              </Breadcrumb>
            ) : (
              <div className="flex items-center gap-2">
                <ActiveIcon className="size-4 text-foreground-icon-secondary" />
                <span className="text-body-medium font-semibold text-text-primary">
                  {headerTitle}
                </span>
              </div>
            )}
          </div>

          {/* Right: Notification + Theme mode + Primary CTA */}
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            {/* Notification Center Popover */}
            <PopoverTrigger>
              <button
                type="button"
                aria-label={t('shell.notifications')}
                className="relative inline-flex size-8 shrink-0 cursor-pointer select-none items-center justify-center overflow-visible rounded-2lg border border-border-button-default bg-background-primary-default p-2 text-foreground-icon-primary shadow-xs outline-none transition-[background-color,border-color,box-shadow,color] duration-150 ease hover:border-border-button-hover hover:bg-background-primary-hover active:border-border-button-active active:bg-background-primary-active active:shadow-none focus-visible:ring-2 focus-visible:ring-border-focus-ring"
              >
                <RiNotification3Line
                  className="size-4 shrink-0 text-foreground-icon-secondary"
                  aria-hidden
                />
                {unreadCount > 0 && (
                  <span className="pointer-events-none absolute -top-0.5 -right-0.5 flex size-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-notification-error-foreground opacity-75" />
                    <span className="relative inline-flex size-2 rounded-full bg-notification-error-foreground" />
                  </span>
                )}
              </button>
              <Popover
                placement="bottom end"
                className="w-[360px] max-w-[calc(100vw-24px)] p-0 overflow-hidden border-0 bg-transparent shadow-none"
              >
                <NotificationCenter
                  title={t('shell.notifications')}
                  emptyMessage={t('shell.notificationsEmpty')}
                  notifications={notifications}
                  className="w-full border border-border-button-default bg-background-primary-default shadow-dropdown"
                />
              </Popover>
            </PopoverTrigger>

            {/* Theme Mode Toggle Button */}
            <IconButton
              icon={resolvedTheme === 'dark' ? RiSunLine : RiMoonLine}
              size="small"
              aria-label={resolvedTheme === 'dark' ? 'Light mode' : 'Dark mode'}
              onClick={(e) => handleToggleTheme(e)}
            />

            {routes && canReadCampaigns && (
              <>
                <div
                  className="mx-0.5 hidden h-4 w-px bg-separator-border sm:block"
                  aria-hidden="true"
                />
                <Link href={routes.create}>
                  <Button
                    variant="primary"
                    size="small"
                    leadingIcon={RiAddLine}
                    className="hidden sm:inline-flex"
                  >
                    <span>{t('campaigns.create')}</span>
                  </Button>
                  <IconButton
                    icon={RiAddLine}
                    size="small"
                    aria-label={t('campaigns.create')}
                    className="border-accent-600 bg-accent-600 text-white hover:bg-accent-700 sm:hidden"
                  />
                </Link>
              </>
            )}
          </div>
        </header>

        {/* Scrollable Page Body with BoardUI standard grid gap and max container */}
        <main className="flex-1 w-full max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
          {children}
        </main>
      </div>
    </div>
  );
}
