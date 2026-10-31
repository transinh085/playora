'use client';

import type { MyOrg } from '@playora/contracts';
import { Avatar, AvatarFallback } from '@playora/ui/components/avatar';
import { Button } from '@playora/ui/components/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@playora/ui/components/dropdown-menu';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@playora/ui/components/sheet';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@playora/ui/components/tooltip';
import {
  CalendarDays,
  ChevronRight,
  ChevronsUpDown,
  Gem,
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
  TicketCheck,
} from 'lucide-react';
import type { Route } from 'next';
import Link from 'next/link';
import { useParams, usePathname, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { authClient } from '@/lib/auth-client';
import { LABS_ENABLED } from '@/lib/env';
import { can, isRedeemerOnly, type PermissionRequest } from '@/lib/permissions';
import { Caption } from './caption';
import { LogoMark } from './logo';

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
    items: [{ key: 'home', icon: House, path: '', permission: { campaign: ['read'] } }],
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
      { key: 'redeem', icon: TicketCheck, path: 'redeem', permission: { voucher: ['read'] } },
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

export function AppShell({ orgs, children }: { orgs: MyOrg[]; children: React.ReactNode }) {
  const t = useTranslations();
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const { orgId } = useParams<{ orgId?: string }>();
  const { data: session } = authClient.useSession();
  const { resolvedTheme, setTheme } = useTheme();
  const current = orgs.find((o) => o.id === orgId) ?? orgs[0];

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  async function signOut() {
    await authClient.signOut();
    router.replace('/login');
    router.refresh();
  }

  const orgHome = current ? `/orgs/${current.id}` : '/';
  const orgLanding = current && isRedeemerOnly(current.role) ? `${orgHome}/redeem` : orgHome;
  const activeNav = current
    ? NAV.find(({ path }) =>
        path ? pathname.startsWith(`${orgHome}/${path}`) : pathname === orgHome,
      )
    : undefined;
  const inEvent = /\/campaigns\/(?!new\b)[^/]+/.test(pathname);

  const breadcrumbs = [
    { title: t('shell.home'), href: orgLanding },
    ...(activeNav && activeNav.key !== 'home' ? [{ title: t(`nav.${activeNav.key}`) }] : []),
    ...(inEvent ? [{ title: t('shell.eventDetail') }] : []),
  ];

  const showLabels = !collapsed || isMobile;
  const userName = session?.user.name ?? '';

  const sidebarContent = (
    <div className="flex h-full flex-col">
      <Link
        href="/"
        aria-label={t('common.appName')}
        className={`flex h-16 shrink-0 items-center gap-3 border-b border-border/80 transition-all ${
          showLabels ? 'px-6' : 'justify-center px-2'
        }`}
      >
        <LogoMark className="size-9 shrink-0" aria-hidden />
        {showLabels && (
          <div className="min-w-0">
            <div className="font-display text-base font-bold leading-tight tracking-tight text-foreground">
              playora
            </div>
            <p className="text-[11px] text-muted-foreground">{t('shell.studio')}</p>
          </div>
        )}
      </Link>

      {current && showLabels && (
        <div className="p-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-between rounded-xl border-border/80 bg-background/50 px-3 text-xs shadow-xs"
                aria-label={t('shell.switchOrg')}
              >
                <span className="truncate font-medium">{current.name}</span>
                <ChevronsUpDown className="size-3.5 shrink-0 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56 rounded-xl">
              <DropdownMenuLabel className="text-xs text-muted-foreground">
                {t('shell.switchOrg')}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {orgs.map((org) => (
                <DropdownMenuItem
                  key={org.id}
                  className={`text-xs ${org.id === current.id ? 'font-semibold bg-accent' : ''}`}
                  onClick={() =>
                    router.push(
                      isRedeemerOnly(org.role) ? `/orgs/${org.id}/redeem` : `/orgs/${org.id}`,
                    )
                  }
                >
                  {org.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {current && (
        <nav className="flex-1 overflow-y-auto overflow-x-hidden p-3 space-y-4">
          {NAV_GROUPS.map((group) => {
            const visibleItems = group.items.filter(
              (item) => !item.permission || can(current.role, item.permission),
            );
            if (visibleItems.length === 0) return null;

            return (
              <div key={group.key} className="space-y-1">
                {group.key !== 'start' && showLabels && (
                  <p className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
                    {t(`navGroups.${group.key}`)}
                  </p>
                )}
                {visibleItems.map(({ key, icon: Icon, path }) => {
                  const href = (path ? `${orgHome}/${path}` : orgHome) as Route;
                  const isActive = activeNav?.key === key;

                  return (
                    <TooltipProvider key={key}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Link
                            href={href}
                            onClick={() => setDrawerOpen(false)}
                            className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all ${
                              isActive
                                ? 'bg-primary text-primary-foreground shadow-xs'
                                : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                            } ${!showLabels ? 'justify-center px-0' : ''}`}
                          >
                            <Icon className="size-4 shrink-0" />
                            {showLabels && <span className="truncate">{t(`nav.${key}`)}</span>}
                          </Link>
                        </TooltipTrigger>
                        {!showLabels && (
                          <TooltipContent side="right">{t(`nav.${key}`)}</TooltipContent>
                        )}
                      </Tooltip>
                    </TooltipProvider>
                  );
                })}
              </div>
            );
          })}
        </nav>
      )}
    </div>
  );

  return (
    <div className="flex min-h-dvh bg-background text-foreground">
      {/* Mobile Drawer */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="left" className="w-[280px] p-0 bg-card">
          <SheetHeader className="sr-only">
            <SheetTitle>Navigation Menu</SheetTitle>
          </SheetHeader>
          {sidebarContent}
        </SheetContent>
      </Sheet>

      {/* Desktop Sider */}
      <aside
        className={`sticky top-0 hidden h-dvh shrink-0 border-r border-border/80 bg-card transition-all duration-200 md:block ${
          collapsed ? 'w-16' : 'w-60'
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col min-w-0">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-border/80 bg-background/80 px-4 backdrop-blur-md sm:px-6">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="size-9 rounded-xl"
              aria-label={
                isMobile ? t('shell.openNav') : collapsed ? t('shell.expand') : t('shell.collapse')
              }
              onClick={() => (isMobile ? setDrawerOpen(true) : setCollapsed(!collapsed))}
            >
              {isMobile ? (
                <MenuIcon className="size-4" />
              ) : collapsed ? (
                <PanelLeftOpen className="size-4" />
              ) : (
                <PanelLeftClose className="size-4" />
              )}
            </Button>

            {!isMobile && (
              <nav className="flex items-center gap-1.5 text-xs text-muted-foreground">
                {breadcrumbs.map((crumb, idx) => (
                  <span key={crumb.title} className="flex items-center gap-1.5">
                    {idx > 0 && <ChevronRight className="size-3 text-muted-foreground/40" />}
                    {crumb.href ? (
                      <Link href={crumb.href as Route} className="hover:text-foreground">
                        {crumb.title}
                      </Link>
                    ) : (
                      <span className="font-semibold text-foreground">{crumb.title}</span>
                    )}
                  </span>
                ))}
              </nav>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="size-9 rounded-full"
              aria-label="Theme"
              onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
            >
              {resolvedTheme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label="User menu"
                  className="flex cursor-pointer items-center gap-2.5 rounded-full border-0 bg-transparent p-0 outline-none"
                >
                  <Avatar className="size-8 rounded-full border border-border/80 bg-primary font-bold text-primary-foreground text-xs">
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {userName.slice(0, 1).toUpperCase() || '?'}
                    </AvatarFallback>
                  </Avatar>
                  {!isMobile && (
                    <div className="text-left leading-tight hidden lg:block">
                      <p className="text-xs font-semibold text-foreground">{userName}</p>
                      <Caption className="text-[10px] block">{session?.user.email}</Caption>
                    </div>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 rounded-2xl p-1.5">
                <div className="px-2 py-1.5">
                  <p className="text-xs font-semibold text-foreground">{userName}</p>
                  <p className="text-[11px] text-muted-foreground">{session?.user.email}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer rounded-xl text-xs gap-2"
                  onClick={signOut}
                >
                  <LogOut className="size-3.5" />
                  {t('auth.signOut')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
