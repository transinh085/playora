'use client';

import type { MyOrg } from '@playora/contracts';
import {
  Card,
  Drawer,
  Dropdown,
  Input,
  Label,
  Modal,
  Separator,
  Tooltip,
} from '@playora/ui/components';
import {
  CalendarDays,
  Check,
  ChevronDown,
  ChevronsUpDown,
  Gem,
  HelpCircle,
  House,
  ImageIcon,
  LayoutTemplate,
  LogOut,
  Menu as MenuIcon,
  Moon,
  MoreHorizontal,
  Palette,
  PanelLeft,
  Plus,
  Search,
  Settings,
  Shapes,
  SlidersHorizontal,
  Sparkles,
  Sun,
  TicketCheck,
} from '@playora/ui/icons';
import type { Route } from 'next';
import Link from 'next/link';
import { useParams, usePathname, useRouter } from 'next/navigation';
import { useNow, useTranslations } from 'next-intl';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { useCampaigns } from '@/features/builder-lab/api';
import { campaignPhase } from '@/features/builder-lab/lib/phase';
import { campaignRoutes } from '@/features/builder-lab/lib/routes';
import { authClient } from '@/lib/auth-client';
import { LABS_ENABLED } from '@/lib/env';
import { can, isRedeemerOnly, type PermissionRequest } from '@/lib/permissions';
import { Caption } from './caption';
import { SidebarOnboarding } from './sidebar-onboarding';

type NavKey =
  | 'home'
  | 'campaigns'
  | 'templates'
  | 'redeem'
  | 'brandKits'
  | 'assets'
  | 'settings'
  | 'billing'
  | 'canvasLab';

interface NavItem {
  key: NavKey;
  icon: typeof CalendarDays;
  path: string;
  permission?: PermissionRequest;
}

type NavGroupKey = 'start' | 'campaigns' | 'brand' | 'organization' | 'labs';

const NAV_GROUPS: { key: NavGroupKey; items: NavItem[] }[] = [
  {
    key: 'start',
    items: [
      { key: 'home', icon: House, path: '', permission: { campaign: ['read'] } },
      { key: 'redeem', icon: TicketCheck, path: 'redeem', permission: { voucher: ['read'] } },
    ],
  },
  {
    key: 'campaigns',
    items: [
      {
        key: 'campaigns',
        icon: CalendarDays,
        path: 'campaigns',
        permission: { campaign: ['read'] },
      },
      {
        key: 'templates',
        icon: LayoutTemplate,
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
        icon: Palette,
        path: 'brand-kits',
        permission: { brandKit: ['read'] },
      },
      { key: 'assets', icon: ImageIcon, path: 'assets', permission: { asset: ['read'] } },
    ],
  },
  {
    key: 'organization',
    items: [
      { key: 'settings', icon: Settings, path: 'settings', permission: { campaign: ['read'] } },
      {
        key: 'billing',
        icon: Gem,
        path: 'settings/billing',
        permission: { billing: ['read'] },
      },
    ],
  },
  ...(LABS_ENABLED
    ? [
        {
          key: 'labs' as const,
          items: [
            {
              key: 'canvasLab',
              icon: Shapes,
              path: 'labs/canvas',
              permission: { campaign: ['read'] },
            } satisfies NavItem,
          ],
        },
      ]
    : []),
];

const NAV: NavItem[] = NAV_GROUPS.flatMap((group) => group.items).sort(
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

export function AppShell({ orgs, children }: { orgs: MyOrg[]; children: React.ReactNode }) {
  const t = useTranslations();
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(224);
  const [isResizing, setIsResizing] = useState(false);
  const [closedGroups, setClosedGroups] = useState<Record<string, boolean>>({});
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const [quickSearch, setQuickSearch] = useState('');
  const [isMobile, setIsMobile] = useState(false);
  const { orgId } = useParams<{ orgId?: string }>();
  const { data: session } = authClient.useSession();
  const { resolvedTheme, setTheme } = useTheme();
  const now = useNow({ updateInterval: 60_000 }).getTime();
  const current = orgId ? orgs.find((o) => o.id === orgId) : orgs[0];
  const orgNotFound = Boolean(orgId && !current);
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

  function startSidebarResize(e: React.MouseEvent<HTMLDivElement>) {
    if (collapsed) return;
    e.preventDefault();
    const startX = e.clientX;
    const startW = sidebarWidth;
    setIsResizing(true);
    document.body.style.cursor = 'col-resize';
    const onMove = (moveEvt: MouseEvent) => {
      const next = Math.max(180, Math.min(450, startW + (moveEvt.clientX - startX)));
      setSidebarWidth(next);
    };
    const onUp = () => {
      setIsResizing(false);
      document.body.style.cursor = '';
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }

  function handleToggleTheme() {
    const nextTheme = resolvedTheme === 'dark' ? 'light' : 'dark';
    const root = document.documentElement;
    const doc = document as Document & {
      startViewTransition?: (cb: () => void) => { finished: Promise<void> };
    };
    if (typeof doc.startViewTransition === 'function') {
      root.classList.add('theme-freeze');
      const vt = doc.startViewTransition(() => setTheme(nextTheme));
      vt.finished.finally(() => root.classList.remove('theme-freeze'));
      return;
    }
    root.classList.add('theme-fade');
    setTheme(nextTheme);
    window.setTimeout(() => root.classList.remove('theme-fade'), 500);
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
  const ActiveIcon = activeNav?.icon ?? House;
  const headerTitle = activeNav ? t(`nav.${activeNav.key}`) : t('shell.home');

  const showLabels = !collapsed || isMobile;
  const isCollapsedDesktop = collapsed && !isMobile;
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

  const sidebarContent = (
    <div className="flex h-full flex-col select-none">
      {/* Workspace Top Bar (h-[48px] py-2 px-3 gap-1) */}
      <div
        className={`relative z-20 flex h-[48px] w-full shrink-0 flex-row items-center gap-1 px-3 py-2 ${
          showLabels ? 'justify-between' : 'justify-center'
        }`}
      >
        {current && showLabels && (
          <Dropdown>
            <Dropdown.Trigger
              aria-label={t('shell.switchOrg')}
              className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 text-left text-neutral-600 outline-none transition-colors hover:bg-neutral-200 hover:text-neutral-900 dark:text-[#A3A3A3] dark:hover:bg-white/5 dark:hover:text-[#FAFAFA]"
            >
              <div
                aria-hidden="true"
                className={`h-4 w-4 shrink-0 rounded-md bg-gradient-to-tr ${currentGradient} shadow-sm`}
              />
              <span className="truncate text-sm font-medium">{current.name}</span>
              <ChevronsUpDown className="ml-auto h-3.5 w-3.5 shrink-0 opacity-70" />
            </Dropdown.Trigger>
            <Dropdown.Popover placement="bottom start" className="w-[208px]">
              <Dropdown.Menu
                aria-label={t('shell.switchOrg')}
                onAction={(key) => {
                  const k = String(key);
                  if (k === '__billing__') {
                    router.push(`/orgs/${current.id}/settings/billing` as Route);
                    return;
                  }
                  if (k === '__settings__') {
                    router.push(`/orgs/${current.id}/settings` as Route);
                    return;
                  }
                  if (k === '__create_org__') {
                    router.push('/onboarding');
                    return;
                  }
                  const org = orgs.find((o) => o.id === k);
                  if (org) {
                    router.push(
                      isRedeemerOnly(org.role) ? `/orgs/${org.id}/redeem` : `/orgs/${org.id}`,
                    );
                  }
                }}
              >
                <Dropdown.Section>
                  {orgs.map((org, idx) => {
                    const isSelected = org.id === current.id;
                    const grad = WORKSPACE_GRADIENTS[idx % WORKSPACE_GRADIENTS.length];
                    return (
                      <Dropdown.Item key={org.id} id={org.id} textValue={org.name}>
                        <div
                          className={`h-4 w-4 shrink-0 rounded-[4px] bg-gradient-to-tr ${grad}`}
                        />
                        <Label className="flex-1 truncate text-left text-sm font-normal">
                          {org.name}
                        </Label>
                        {isSelected && (
                          <Check className="h-3.5 w-3.5 shrink-0 text-neutral-900 dark:text-[#FAFAFA]" />
                        )}
                      </Dropdown.Item>
                    );
                  })}
                </Dropdown.Section>

                {!isRedeemerOnly(current.role) && (
                  <>
                    <Separator />

                    <Dropdown.Section>
                      {can(current.role, { billing: ['read'] }) && (
                        <Dropdown.Item id="__billing__" textValue={t('nav.billing')}>
                          <Sparkles className="h-4 w-4 shrink-0 text-neutral-500" />
                          <Label className="flex-1 truncate text-left text-sm font-normal">
                            {t('nav.billing')}
                          </Label>
                        </Dropdown.Item>
                      )}
                      <Dropdown.Item id="__settings__" textValue={t('nav.settings')}>
                        <SlidersHorizontal className="h-4 w-4 shrink-0 text-neutral-500" />
                        <Label className="flex-1 truncate text-left text-sm font-normal">
                          {t('nav.settings')}
                        </Label>
                      </Dropdown.Item>
                      <Dropdown.Item id="__create_org__" textValue={t('shell.createOrg')}>
                        <Plus className="h-4 w-4 shrink-0 text-neutral-500" />
                        <Label className="flex-1 truncate text-left text-sm font-normal">
                          {t('shell.createOrg')}
                        </Label>
                      </Dropdown.Item>
                    </Dropdown.Section>
                  </>
                )}
              </Dropdown.Menu>
            </Dropdown.Popover>
          </Dropdown>
        )}

        {!current && showLabels && (
          <Link
            href="/"
            aria-label={t('common.appName')}
            className="flex items-center gap-2 rounded-md px-1.5 py-1 text-sm font-medium text-neutral-900 dark:text-[#FAFAFA]"
          >
            <div className="h-4 w-4 shrink-0 rounded-md bg-gradient-to-tr from-emerald-400 to-cyan-500 shadow-sm" />
            <span className="truncate text-sm font-medium">Playora</span>
          </Link>
        )}

        {!isMobile && (
          <Tooltip delay={0}>
            <Tooltip.Trigger>
              <button
                type="button"
                aria-label={collapsed ? t('shell.expand') : t('shell.collapse')}
                onClick={() => setCollapsed(!collapsed)}
                className="mx-auto flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-md p-2 transition-colors hover:bg-neutral-200 dark:hover:bg-white/5"
              >
                <PanelLeft className="h-4 w-4 text-neutral-500 dark:text-[#737373]" />
              </button>
            </Tooltip.Trigger>
            <Tooltip.Content placement="right">
              {collapsed ? t('shell.expand') : t('shell.collapse')}
            </Tooltip.Content>
          </Tooltip>
        )}
      </div>

      {/* Navigation Items Container (p-3 pt-2 pb-2 gap-5 flex-1) */}
      {current && (
        <nav className="flex flex-1 flex-col gap-5 overflow-x-hidden overflow-y-auto p-3 pt-2 pb-2">
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
                    const isActive = activeNav?.key === key;
                    const navLink = (
                      <Link
                        href={href}
                        onClick={() => setDrawerOpen(false)}
                        className={`flex cursor-pointer items-center gap-2 rounded-md transition-all duration-150 active:scale-[0.98] ${
                          showLabels ? 'px-2 py-1.5' : 'mx-auto h-8 w-8 justify-center p-2'
                        } ${
                          isActive
                            ? 'bg-neutral-200/80 font-medium text-neutral-900 dark:bg-[#171717] dark:text-[#FAFAFA]'
                            : 'font-medium text-neutral-600 hover:bg-neutral-200 hover:text-neutral-900 dark:text-[#A3A3A3] dark:hover:bg-white/5 dark:hover:text-[#FAFAFA]'
                        }`}
                      >
                        <Icon
                          className={`h-4 w-4 shrink-0 transition-transform duration-150 ${
                            isActive ? 'text-neutral-900 dark:text-[#FAFAFA]' : ''
                          }`}
                        />
                        {showLabels && <span className="truncate text-sm">{t(`nav.${key}`)}</span>}
                      </Link>
                    );

                    if (!showLabels) {
                      return (
                        <Tooltip key={key} delay={0}>
                          <Tooltip.Trigger>{navLink}</Tooltip.Trigger>
                          <Tooltip.Content placement="right">{t(`nav.${key}`)}</Tooltip.Content>
                        </Tooltip>
                      );
                    }
                    return <div key={key}>{navLink}</div>;
                  })}

                  {/* Search / Quick Actions item matching Louis CRM Primary Nav */}
                  {(() => {
                    const searchBtn = (
                      <button
                        type="button"
                        aria-label={t('shell.quickActions')}
                        onClick={() => setQuickOpen(true)}
                        className={`flex cursor-pointer items-center gap-2 rounded-md font-medium text-neutral-600 transition-all duration-150 hover:bg-neutral-200 hover:text-neutral-900 active:scale-[0.98] dark:text-[#A3A3A3] dark:hover:bg-white/5 dark:hover:text-[#FAFAFA] ${
                          showLabels
                            ? 'w-full px-2 py-1.5 text-left'
                            : 'mx-auto h-8 w-8 justify-center p-2'
                        }`}
                      >
                        <Search className="h-4 w-4 shrink-0" />
                        {showLabels && (
                          <span className="truncate text-sm">{t('shell.quickActions')}</span>
                        )}
                      </button>
                    );

                    if (!showLabels) {
                      return (
                        <Tooltip delay={0}>
                          <Tooltip.Trigger>{searchBtn}</Tooltip.Trigger>
                          <Tooltip.Content placement="right">
                            {t('shell.quickActions')} (J)
                          </Tooltip.Content>
                        </Tooltip>
                      );
                    }
                    return searchBtn;
                  })()}
                </div>
              );
            }

            const isClosed = Boolean(closedGroups[group.key]);

            return (
              <div key={group.key} className="flex w-full flex-col gap-2">
                {showLabels && (
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.key)}
                    className="group flex cursor-pointer items-center gap-2.5 px-2 text-left"
                  >
                    <span className="text-[13px] font-medium text-neutral-500 transition-colors group-hover:text-neutral-700 dark:text-[#737373] dark:group-hover:text-[#A3A3A3]">
                      {t(`navGroups.${group.key}`)}
                    </span>
                    <ChevronDown
                      className={`h-3.5 w-3.5 text-neutral-500 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] dark:text-[#737373] ${
                        isClosed ? '-rotate-90' : ''
                      }`}
                    />
                  </button>
                )}

                <div
                  className={`grid transition-[grid-template-rows,opacity,margin] duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                    isClosed && showLabels
                      ? 'pointer-events-none -mt-2 grid-rows-[0fr] opacity-0'
                      : 'mt-0 grid-rows-[1fr] opacity-100'
                  }`}
                >
                  <div className="overflow-hidden">
                    <div className="flex w-full flex-col gap-1">
                      {visibleItems.map(({ key, icon: Icon, path }) => {
                        const href = (path ? `${orgHome}/${path}` : orgHome) as Route;
                        const isActive = activeNav?.key === key;
                        const navLink = (
                          <Link
                            href={href}
                            onClick={() => setDrawerOpen(false)}
                            className={`flex cursor-pointer items-center gap-2 rounded-md transition-all duration-150 active:scale-[0.98] ${
                              showLabels ? 'px-2 py-1.5' : 'mx-auto h-8 w-8 justify-center p-2'
                            } ${
                              isActive
                                ? 'bg-neutral-200/80 font-medium text-neutral-900 dark:bg-[#171717] dark:text-[#FAFAFA]'
                                : 'font-medium text-neutral-600 hover:bg-neutral-200 hover:text-neutral-900 dark:text-[#A3A3A3] dark:hover:bg-white/5 dark:hover:text-[#FAFAFA]'
                            }`}
                          >
                            <Icon
                              className={`h-4 w-4 shrink-0 transition-transform duration-150 ${
                                isActive ? 'text-neutral-900 dark:text-[#FAFAFA]' : ''
                              }`}
                            />
                            {showLabels && (
                              <span className="truncate text-sm">{t(`nav.${key}`)}</span>
                            )}
                          </Link>
                        );

                        if (!showLabels) {
                          return (
                            <Tooltip key={key} delay={0}>
                              <Tooltip.Trigger>{navLink}</Tooltip.Trigger>
                              <Tooltip.Content placement="right">{t(`nav.${key}`)}</Tooltip.Content>
                            </Tooltip>
                          );
                        }
                        return <div key={key}>{navLink}</div>;
                      })}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </nav>
      )}

      {/* Onboarding Checklist Trigger */}
      {current && !isRedeemerOnly(current.role) && (
        <div className="px-3 pb-2">
          <SidebarOnboarding
            orgId={current.id}
            isCollapsedDesktop={isCollapsedDesktop}
            isMobile={isMobile}
            onNavigate={() => setDrawerOpen(false)}
          />
        </div>
      )}

      {/* Bottom User Profile Row (h-[44px] bg-neutral-100 dark:bg-[#171717] border-t) */}
      <div
        className={`flex h-[44px] shrink-0 items-center gap-1 border-t border-neutral-200 bg-neutral-100 p-2 transition-colors duration-200 dark:border-white/10 dark:bg-[#171717] ${
          showLabels ? 'justify-between' : 'justify-center'
        }`}
      >
        <Dropdown>
          {!showLabels ? (
            <Tooltip delay={0}>
              <Tooltip.Trigger>
                <Dropdown.Trigger
                  aria-label="User menu"
                  className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md p-2 text-neutral-600 outline-none transition-colors hover:bg-neutral-200 hover:text-neutral-900 dark:text-[#A3A3A3] dark:hover:bg-white/5 dark:hover:text-[#FAFAFA]"
                >
                  <div
                    aria-hidden="true"
                    className="h-4 w-4 shrink-0 rounded-full bg-gradient-to-tr from-purple-500 to-pink-500 shadow-sm"
                  />
                </Dropdown.Trigger>
              </Tooltip.Trigger>
              <Tooltip.Content placement="right">
                {userName || session?.user.email || 'User'}
              </Tooltip.Content>
            </Tooltip>
          ) : (
            <Dropdown.Trigger
              aria-label="User menu"
              className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-md px-1 py-1 text-left text-neutral-600 outline-none transition-colors hover:bg-neutral-200 hover:text-neutral-900 dark:text-[#A3A3A3] dark:hover:bg-white/5 dark:hover:text-[#FAFAFA]"
            >
              <div
                aria-hidden="true"
                className="h-4 w-4 shrink-0 rounded-full bg-gradient-to-tr from-purple-500 to-pink-500 shadow-sm"
              />
              <span className="flex-1 truncate text-sm font-medium">
                {userName || session?.user.email || 'User'}
              </span>
              <MoreHorizontal className="h-4 w-4 shrink-0 text-neutral-500 dark:text-[#A3A3A3]" />
            </Dropdown.Trigger>
          )}
          <Dropdown.Popover placement="top end" className="w-56">
            <div className="px-2.5 py-2">
              <p className="m-0 truncate text-sm font-medium text-neutral-900 dark:text-[#FAFAFA]">
                {userName}
              </p>
              <Caption className="block truncate text-xs">{session?.user.email}</Caption>
            </div>
            <Separator />
            <Dropdown.Menu
              aria-label="User menu"
              onAction={(key) => {
                if (key === 'signOut') {
                  void signOut();
                }
              }}
            >
              <Dropdown.Item id="signOut" textValue={t('auth.signOut')} variant="danger">
                <LogOut className="h-4 w-4" />
                <Label>{t('auth.signOut')}</Label>
              </Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown.Popover>
        </Dropdown>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-dvh w-full flex-row bg-white text-neutral-900 antialiased transition-colors duration-200 dark:bg-[#0A0A0A] dark:text-[#FAFAFA]">
      {/* Quick Actions Command Dialog */}
      <Modal isOpen={quickOpen} onOpenChange={setQuickOpen}>
        <Modal.Backdrop isDismissable>
          <Modal.Container size="md">
            <Modal.Dialog aria-label={t('shell.quickActions')} className="overflow-hidden p-0">
              <div className="flex items-center border-b border-neutral-200 px-3 dark:border-white/10">
                <Search className="h-4 w-4 shrink-0 text-neutral-400" />
                <Input
                  autoFocus
                  value={quickSearch}
                  onChange={(e) => setQuickSearch(e.target.value)}
                  placeholder={t('shell.quickActionsPlaceholder')}
                  aria-label={t('shell.quickActionsPlaceholder')}
                  className="h-10 flex-1 border-0 bg-transparent text-sm shadow-none focus-visible:ring-0"
                />
              </div>
              <div className="max-h-72 overflow-y-auto p-1.5">
                {filteredNavItems.length === 0 && filteredCampaigns.length === 0 ? (
                  <p className="py-6 text-center text-xs text-neutral-500">
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
                              className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm font-normal text-neutral-700 transition-colors hover:bg-neutral-100 dark:text-[#FAFAFA] dark:hover:bg-white/5"
                            >
                              <Icon className="h-4 w-4 text-neutral-500 dark:text-[#A3A3A3]" />
                              <span>{t(`nav.${key}`)}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                    {routes && filteredCampaigns.length > 0 && (
                      <div className="space-y-0.5 border-t border-neutral-200 pt-1.5 dark:border-white/10">
                        <p className="px-2 py-1 text-xs font-medium text-neutral-500 dark:text-[#737373]">
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
                              className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-sm text-neutral-700 transition-colors hover:bg-neutral-100 dark:text-[#FAFAFA] dark:hover:bg-white/5"
                            >
                              <span className="flex min-w-0 items-center gap-2">
                                <Sparkles className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                                <span className="truncate font-normal">{c.name}</span>
                              </span>
                              <span className="shrink-0 text-xs text-neutral-400">
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
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>

      {/* Mobile Drawer */}
      <Drawer isOpen={drawerOpen} onOpenChange={setDrawerOpen}>
        <Drawer.Backdrop isDismissable>
          <Drawer.Content placement="left">
            <Drawer.Dialog
              aria-label="Navigation Menu"
              className="h-full w-[240px] max-w-[240px] rounded-none border-r border-neutral-200 bg-neutral-50 p-0 text-neutral-900 dark:border-white/10 dark:bg-[#0A0A0A] dark:text-[#FAFAFA]"
            >
              {sidebarContent}
            </Drawer.Dialog>
          </Drawer.Content>
        </Drawer.Backdrop>
      </Drawer>

      {/* Resizable & Collapsible Desktop Sidebar (1-to-1 Louis CRM) */}
      <aside
        style={{ width: collapsed ? 68 : sidebarWidth }}
        className={`sticky top-0 z-40 hidden h-dvh shrink-0 flex-col border-r border-neutral-200 bg-neutral-50 md:flex dark:border-white/10 dark:bg-[#0A0A0A] ${
          isResizing
            ? 'transition-none'
            : 'transition-[width,background-color,border-color] duration-[280ms] ease-[cubic-bezier(0.16,1,0.3,1)]'
        }`}
      >
        {!collapsed && (
          <div
            aria-hidden="true"
            title="Drag to resize sidebar"
            onMouseDown={startSidebarResize}
            className="absolute top-0 right-0 z-50 h-full w-[8px] cursor-col-resize transition-colors duration-200 hover:bg-blue-500/50"
          />
        )}
        {sidebarContent}
      </aside>

      {/* Main Content Viewport */}
      <div className="flex min-w-0 flex-1 flex-col bg-white dark:bg-[#0A0A0A]">
        {/* Top Header (h-[48px] p-2 border-b) */}
        <header className="sticky top-0 z-10 flex h-[48px] shrink-0 items-center justify-between overflow-x-auto border-b border-neutral-200 bg-white p-2 transition-colors duration-200 dark:border-white/10 dark:bg-[#0A0A0A]">
          <div className="flex items-center gap-2">
            {isMobile && (
              <button
                type="button"
                aria-label={t('shell.openNav')}
                onClick={() => setDrawerOpen(true)}
                className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-md p-2 transition-colors hover:bg-neutral-100 md:hidden dark:hover:bg-white/5"
              >
                <MenuIcon className="h-4 w-4 text-neutral-900 dark:text-[#FAFAFA]" />
              </button>
            )}
            <div className="flex shrink-0 items-center gap-2 rounded-md px-2 py-2">
              <ActiveIcon className="h-4 w-4 text-neutral-500 dark:text-[#A3A3A3]" />
              <span className="text-[15px] font-semibold text-neutral-900 dark:text-[#FAFAFA]">
                {headerTitle}
              </span>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {routes && canReadCampaigns && (
              <>
                <Link
                  href={routes.create}
                  className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900 dark:text-[#A3A3A3] dark:hover:bg-white/5 dark:hover:text-[#FAFAFA]"
                >
                  <Plus className="h-4 w-4" />
                  <span className="hidden text-sm font-normal sm:block">
                    {t('campaigns.create')}
                  </span>
                </Link>
                <div className="mx-1 h-[18px] w-[0.5px] bg-neutral-200 dark:bg-white/10" />
              </>
            )}
            <button
              type="button"
              title="Switch theme"
              aria-label="Theme"
              onClick={handleToggleTheme}
              className="relative flex h-8 w-8 cursor-pointer items-center justify-center rounded-md p-2 text-neutral-500 transition-colors hover:bg-neutral-100 active:scale-95 dark:text-[#737373] dark:hover:bg-white/5"
            >
              {resolvedTheme === 'dark' ? (
                <Sun className="h-4 w-4 text-[#A3A3A3]" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </button>
            <button
              type="button"
              aria-label="Help"
              onClick={() => setQuickOpen(true)}
              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md p-2 transition-colors hover:bg-neutral-100 dark:hover:bg-white/5"
            >
              <HelpCircle className="h-4 w-4 text-neutral-500 dark:text-[#737373]" />
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6">
          {orgNotFound ? (
            <div className="mx-auto my-12 max-w-md">
              <Card
                className="flex flex-col items-center gap-4 border border-border-button-default bg-background-primary-default p-6 text-center shadow-card"
                data-testid="org-not-found-card"
              >
                <div className="space-y-1.5">
                  <h2 className="m-0 text-title-3-semibold text-text-primary">
                    {t('shell.orgNotFoundTitle')}
                  </h2>
                  <p className="m-0 text-body-2-regular text-text-secondary">
                    {t('shell.orgNotFoundDescription')}
                  </p>
                </div>
                <Link
                  href={(orgs[0] ? `/orgs/${orgs[0].id}` : '/onboarding') as Route}
                  className="inline-flex h-9 items-center justify-center rounded-xl bg-neutral-900 px-4 text-caption-1-semibold text-white transition-opacity hover:opacity-90 dark:bg-white dark:text-neutral-900"
                >
                  {t('shell.backToYourOrg')}
                </Link>
              </Card>
            </div>
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  );
}
