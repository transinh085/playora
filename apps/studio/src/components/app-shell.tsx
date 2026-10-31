'use client';

import type { MyOrg } from '@playora/contracts';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@playora/ui/components/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@playora/ui/components/dropdown-menu';
import { Input } from '@playora/ui/components/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@playora/ui/components/sheet';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@playora/ui/components/tooltip';
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
  Share,
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
        path: 'campaigns/new',
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
      { key: 'settings', icon: Settings, path: 'settings' },
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
    <TooltipProvider delayDuration={0}>
      <div className="flex h-full flex-col select-none">
        {/* Workspace Top Bar (h-[48px] py-2 px-3 gap-1) */}
        <div
          className={`relative z-20 flex h-[48px] w-full shrink-0 flex-row items-center gap-1 px-3 py-2 ${
            showLabels ? 'justify-between' : 'justify-center'
          }`}
        >
          {current && showLabels && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label={t('shell.switchOrg')}
                  className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 text-left text-neutral-600 outline-none transition-colors hover:bg-neutral-200 hover:text-neutral-900 dark:text-[#A3A3A3] dark:hover:bg-white/5 dark:hover:text-[#FAFAFA]"
                >
                  <div
                    aria-hidden="true"
                    className={`h-4 w-4 shrink-0 rounded-md bg-gradient-to-tr ${currentGradient} shadow-sm`}
                  />
                  <span className="truncate text-sm font-medium">{current.name}</span>
                  <ChevronsUpDown className="ml-auto h-3.5 w-3.5 shrink-0 opacity-70" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                className="w-[192px] rounded-lg border border-neutral-200 bg-white p-0 shadow-[0_20px_25px_-5px_rgba(0,0,0,0.1),0_8px_10px_-6px_rgba(0,0,0,0.1)] dark:border-white/10 dark:bg-[#171717]"
              >
                <div className="flex w-full flex-col gap-1 p-1">
                  {orgs.map((org, idx) => {
                    const isSelected = org.id === current.id;
                    const grad = WORKSPACE_GRADIENTS[idx % WORKSPACE_GRADIENTS.length];
                    return (
                      <DropdownMenuItem
                        key={org.id}
                        onClick={() =>
                          router.push(
                            isRedeemerOnly(org.role) ? `/orgs/${org.id}/redeem` : `/orgs/${org.id}`,
                          )
                        }
                        className={`flex w-full cursor-pointer items-center gap-2 rounded-[6px] px-1.5 py-1.5 text-sm font-normal transition-colors ${
                          isSelected
                            ? 'bg-neutral-100 text-neutral-900 dark:bg-white/10 dark:text-[#FAFAFA]'
                            : 'text-neutral-500 hover:bg-neutral-100 dark:text-[#737373] dark:hover:bg-white/5'
                        }`}
                      >
                        <div
                          className={`h-4 w-4 shrink-0 rounded-[4px] bg-gradient-to-tr ${grad}`}
                        />
                        <span className="flex-1 truncate text-left text-sm font-normal">
                          {org.name}
                        </span>
                        {isSelected && (
                          <Check className="h-3 w-3 shrink-0 text-neutral-900 dark:text-[#FAFAFA]" />
                        )}
                      </DropdownMenuItem>
                    );
                  })}
                </div>

                <div className="h-[0.5px] w-full bg-neutral-200 dark:bg-white/10" />

                <div className="flex w-full flex-col gap-1 p-1">
                  {can(current.role, { billing: ['read'] }) && (
                    <DropdownMenuItem
                      onClick={() => router.push(`/orgs/${current.id}/settings/billing` as Route)}
                      className="flex w-full cursor-pointer items-center gap-2 rounded-md px-1.5 py-1.5 text-neutral-500 transition-colors hover:bg-neutral-100 dark:text-[#737373] dark:hover:bg-white/5"
                    >
                      <Sparkles className="h-4 w-4 shrink-0" />
                      <span className="flex-1 truncate text-left text-sm font-normal">
                        {t('nav.billing')}
                      </span>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    onClick={() => router.push(`/orgs/${current.id}/settings` as Route)}
                    className="flex w-full cursor-pointer items-center gap-2 rounded-md px-1.5 py-1.5 text-neutral-500 transition-colors hover:bg-neutral-100 dark:text-[#737373] dark:hover:bg-white/5"
                  >
                    <SlidersHorizontal className="h-4 w-4 shrink-0" />
                    <span className="flex-1 truncate text-left text-sm font-normal">
                      {t('nav.settings')}
                    </span>
                  </DropdownMenuItem>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
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
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-label={collapsed ? t('shell.expand') : t('shell.collapse')}
                  onClick={() => setCollapsed(!collapsed)}
                  className="mx-auto flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-md p-2 transition-colors hover:bg-neutral-200 dark:hover:bg-white/5"
                >
                  <PanelLeft className="h-4 w-4 text-neutral-500 dark:text-[#737373]" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">
                {collapsed ? t('shell.expand') : t('shell.collapse')}
              </TooltipContent>
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
                      return (
                        <Tooltip key={key}>
                          <TooltipTrigger asChild>
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
                                <span className="animate-crm-fade-in truncate text-sm">
                                  {t(`nav.${key}`)}
                                </span>
                              )}
                            </Link>
                          </TooltipTrigger>
                          {!showLabels && (
                            <TooltipContent side="right">{t(`nav.${key}`)}</TooltipContent>
                          )}
                        </Tooltip>
                      );
                    })}

                    {/* Search / Quick Actions item matching Louis CRM Primary Nav */}
                    <Tooltip>
                      <TooltipTrigger asChild>
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
                            <span className="animate-crm-fade-in truncate text-sm">
                              {t('shell.quickActions')}
                            </span>
                          )}
                        </button>
                      </TooltipTrigger>
                      {!showLabels && (
                        <TooltipContent side="right">{t('shell.quickActions')} (J)</TooltipContent>
                      )}
                    </Tooltip>
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
                      className="group animate-crm-fade-in flex cursor-pointer items-center gap-2.5 px-2 text-left"
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

                          return (
                            <Tooltip key={key}>
                              <TooltipTrigger asChild>
                                <Link
                                  href={href}
                                  onClick={() => setDrawerOpen(false)}
                                  className={`flex cursor-pointer items-center gap-2 rounded-md transition-all duration-150 active:scale-[0.98] ${
                                    showLabels
                                      ? 'px-2 py-1.5'
                                      : 'mx-auto h-8 w-8 justify-center p-2'
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
                                    <span className="animate-crm-fade-in truncate text-sm">
                                      {t(`nav.${key}`)}
                                    </span>
                                  )}
                                </Link>
                              </TooltipTrigger>
                              {!showLabels && (
                                <TooltipContent side="right">{t(`nav.${key}`)}</TooltipContent>
                              )}
                            </Tooltip>
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

        {/* Bottom User Profile Row (h-[44px] bg-neutral-100 dark:bg-[#171717] border-t) */}
        <div
          className={`flex h-[44px] shrink-0 items-center gap-1 border-t border-neutral-200 bg-neutral-100 p-2 transition-colors duration-200 dark:border-white/10 dark:bg-[#171717] ${
            showLabels ? 'justify-between' : 'justify-center'
          }`}
        >
          <DropdownMenu>
            {!showLabels ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      aria-label="User menu"
                      className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md p-2 text-neutral-600 transition-colors hover:bg-neutral-200 hover:text-neutral-900 dark:text-[#A3A3A3] dark:hover:bg-white/5 dark:hover:text-[#FAFAFA]"
                    >
                      <div
                        aria-hidden="true"
                        className="h-4 w-4 shrink-0 rounded-full bg-gradient-to-tr from-purple-500 to-pink-500 shadow-sm"
                      />
                    </button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent side="right">
                  {userName || session?.user.email || 'User'}
                </TooltipContent>
              </Tooltip>
            ) : (
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label="User menu"
                  className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-md px-1 py-1 text-left text-neutral-600 transition-colors hover:bg-neutral-200 hover:text-neutral-900 dark:text-[#A3A3A3] dark:hover:bg-white/5 dark:hover:text-[#FAFAFA]"
                >
                  <div
                    aria-hidden="true"
                    className="h-4 w-4 shrink-0 rounded-full bg-gradient-to-tr from-purple-500 to-pink-500 shadow-sm"
                  />
                  <span className="flex-1 truncate text-sm font-medium">
                    {userName || session?.user.email || 'User'}
                  </span>
                  <MoreHorizontal className="h-4 w-4 shrink-0 text-neutral-500 dark:text-[#A3A3A3]" />
                </button>
              </DropdownMenuTrigger>
            )}
            <DropdownMenuContent
              align="end"
              side="top"
              className="w-52 rounded-lg border border-neutral-200 bg-white p-1 shadow-[0_20px_25px_-5px_rgba(0,0,0,0.1),0_8px_10px_-6px_rgba(0,0,0,0.1)] dark:border-white/10 dark:bg-[#171717]"
            >
              <div className="px-2 py-1.5">
                <p className="truncate text-sm font-medium text-neutral-900 dark:text-[#FAFAFA]">
                  {userName}
                </p>
                <Caption className="block truncate text-xs">{session?.user.email}</Caption>
              </div>
              <DropdownMenuSeparator className="bg-neutral-200 dark:bg-white/10" />
              <DropdownMenuItem
                className="cursor-pointer gap-2 rounded-md text-sm text-destructive focus:bg-destructive/10 focus:text-destructive"
                onClick={signOut}
              >
                <LogOut className="h-4 w-4" />
                {t('auth.signOut')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </TooltipProvider>
  );

  return (
    <div className="flex min-h-dvh w-full flex-row bg-white text-neutral-900 antialiased transition-colors duration-200 dark:bg-[#0A0A0A] dark:text-[#FAFAFA]">
      {/* Quick Actions Command Dialog */}
      <Dialog open={quickOpen} onOpenChange={setQuickOpen}>
        <DialogContent className="max-w-md gap-0 overflow-hidden rounded-lg border border-neutral-200 bg-white p-0 shadow-[0_20px_25px_-5px_rgba(0,0,0,0.1),0_8px_10px_-6px_rgba(0,0,0,0.1)] dark:border-white/10 dark:bg-[#171717]">
          <DialogHeader className="sr-only">
            <DialogTitle>{t('shell.quickActions')}</DialogTitle>
            <DialogDescription>{t('shell.quickActionsPlaceholder')}</DialogDescription>
          </DialogHeader>
          <div className="flex items-center border-b border-neutral-200 px-3 dark:border-white/10">
            <Search className="h-4 w-4 shrink-0 text-neutral-400" />
            <Input
              autoFocus
              value={quickSearch}
              onChange={(e) => setQuickSearch(e.target.value)}
              placeholder={t('shell.quickActionsPlaceholder')}
              className="h-10 border-0 bg-transparent text-sm shadow-none focus-visible:ring-0"
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
        </DialogContent>
      </Dialog>

      {/* Mobile Drawer */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent
          side="left"
          className="w-[240px] border-r border-neutral-200 bg-neutral-50 p-0 text-neutral-900 dark:border-white/10 dark:bg-[#0A0A0A] dark:text-[#FAFAFA]"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Navigation Menu</SheetTitle>
          </SheetHeader>
          {sidebarContent}
        </SheetContent>
      </Sheet>

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
              <Link
                href={routes.create}
                className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900 dark:text-[#A3A3A3] dark:hover:bg-white/5 dark:hover:text-[#FAFAFA]"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden text-sm font-normal sm:block">{t('campaigns.create')}</span>
              </Link>
            )}
            {current && (
              <Link
                href={`/orgs/${current.id}/settings` as Route}
                className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900 dark:text-[#A3A3A3] dark:hover:bg-white/5 dark:hover:text-[#FAFAFA]"
              >
                <Share className="h-4 w-4" />
                <span className="hidden text-sm font-normal sm:block">Share</span>
              </Link>
            )}
            <div className="mx-1 h-[18px] w-[0.5px] bg-neutral-200 dark:bg-white/10" />
            <div aria-hidden="true" className="mr-2 flex items-center">
              <div className="z-30 -mr-1.5 h-4 w-4 rounded-full border border-white bg-gradient-to-r from-blue-400 to-blue-600 transition-colors dark:border-[#0A0A0A]" />
              <div className="z-20 -mr-1.5 h-4 w-4 rounded-full border border-white bg-gradient-to-r from-yellow-400 to-orange-500 transition-colors dark:border-[#0A0A0A]" />
              <div className="z-10 h-4 w-4 rounded-full border border-white bg-gradient-to-r from-green-400 to-teal-500 transition-colors dark:border-[#0A0A0A]" />
            </div>
            <div className="mx-1 h-[18px] w-[0.5px] bg-neutral-200 dark:bg-white/10" />
            <button
              type="button"
              title="Switch theme"
              aria-label="Theme"
              onClick={handleToggleTheme}
              className="relative flex h-8 w-8 cursor-pointer items-center justify-center rounded-md p-2 text-neutral-500 transition-colors hover:bg-neutral-100 active:scale-95 dark:text-[#737373] dark:hover:bg-white/5"
            >
              <Sun className="theme-icon icon-sun h-4 w-4 text-[#A3A3A3]" />
              <Moon className="theme-icon icon-moon h-4 w-4" />
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

        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
