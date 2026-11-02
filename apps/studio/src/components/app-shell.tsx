'use client';

import type { MyOrg } from '@playora/contracts';
import {
  AppLayout,
  Breadcrumbs,
  Card,
  Command,
  Dropdown,
  Kbd,
  Label,
  Navbar,
  Separator,
  Sidebar,
  useSidebar,
} from '@playora/ui/components';
import {
  CalendarDays,
  Check,
  ChevronsUpDown,
  Gem,
  HelpCircle,
  House,
  ImageIcon,
  LayoutTemplate,
  LogOut,
  Moon,
  MoreHorizontal,
  Palette,
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

interface StudioSidebarInnerProps {
  activeKey?: NavKey;
  current?: MyOrg;
  currentGradient: string;
  idPrefix: 'desktop' | 'mobile';
  onOpenQuickActions: () => void;
  onSignOut: () => void;
  orgHome: string;
  orgs: MyOrg[];
  userEmail?: string;
  userName: string;
}

function StudioSidebarInner({
  activeKey,
  current,
  currentGradient,
  idPrefix,
  onOpenQuickActions,
  onSignOut,
  orgHome,
  orgs,
  userEmail,
  userName,
}: StudioSidebarInnerProps) {
  const t = useTranslations();
  const router = useRouter();
  const { isMobile, isOpen, setMobileOpen } = useSidebar();
  const showOnboardingHere = idPrefix === 'mobile' ? isMobile : !isMobile;

  return (
    <>
      <Sidebar.Header>
        {current ? (
          <Dropdown>
            <Dropdown.Trigger
              aria-label={t('shell.switchOrg')}
              className="hover:bg-default flex w-full cursor-pointer items-center gap-2.5 rounded-xl px-2 py-1.5 text-left outline-none transition-colors"
            >
              <div
                aria-hidden="true"
                className={`size-5 shrink-0 rounded-md bg-gradient-to-tr ${currentGradient} shadow-sm`}
              />
              <span
                className="text-foreground flex-1 truncate text-sm font-semibold"
                data-sidebar="label"
              >
                {current.name}
              </span>
              <ChevronsUpDown
                className="text-muted ml-auto size-3.5 shrink-0"
                data-sidebar="label"
              />
            </Dropdown.Trigger>
            <Dropdown.Popover placement="bottom start" className="w-[220px]">
              <Dropdown.Menu
                aria-label={t('shell.switchOrg')}
                onAction={(key) => {
                  const k = String(key);
                  setMobileOpen(false);
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
                          className={`size-4 shrink-0 rounded-[4px] bg-gradient-to-tr ${grad}`}
                        />
                        <Label className="flex-1 truncate text-left text-sm font-normal">
                          {org.name}
                        </Label>
                        {isSelected && <Check className="text-foreground size-3.5 shrink-0" />}
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
                          <Sparkles className="text-muted size-4 shrink-0" />
                          <Label className="flex-1 truncate text-left text-sm font-normal">
                            {t('nav.billing')}
                          </Label>
                        </Dropdown.Item>
                      )}
                      <Dropdown.Item id="__settings__" textValue={t('nav.settings')}>
                        <SlidersHorizontal className="text-muted size-4 shrink-0" />
                        <Label className="flex-1 truncate text-left text-sm font-normal">
                          {t('nav.settings')}
                        </Label>
                      </Dropdown.Item>
                      <Dropdown.Item id="__create_org__" textValue={t('shell.createOrg')}>
                        <Plus className="text-muted size-4 shrink-0" />
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
        ) : (
          <Link
            href="/"
            aria-label={t('common.appName')}
            className="flex items-center gap-2.5 rounded-xl px-2 py-1.5 text-sm font-semibold text-foreground"
          >
            <div className="size-5 shrink-0 rounded-md bg-gradient-to-tr from-emerald-400 to-cyan-500 shadow-sm" />
            <span className="truncate" data-sidebar="label">
              Playora
            </span>
          </Link>
        )}
      </Sidebar.Header>

      {current && (
        <Sidebar.Content>
          {NAV_GROUPS.map((group) => {
            const visibleItems = group.items.filter(
              (item) => !item.permission || can(current.role, item.permission),
            );
            if (visibleItems.length === 0) return null;

            return (
              <Sidebar.Group key={group.key}>
                {group.key !== 'start' && (
                  <Sidebar.GroupLabel>{t(`navGroups.${group.key}`)}</Sidebar.GroupLabel>
                )}
                <Sidebar.Menu
                  aria-label={
                    group.key === 'start' ? t('common.appName') : t(`navGroups.${group.key}`)
                  }
                >
                  {visibleItems.map(({ key, icon: Icon, path }) => {
                    const href = path ? `${orgHome}/${path}` : orgHome;
                    const isActive = activeKey === key;
                    const label = t(`nav.${key}`);
                    return (
                      <Sidebar.MenuItem
                        key={key}
                        href={href}
                        id={`${idPrefix}-nav-${key}`}
                        isCurrent={isActive}
                        textValue={label}
                      >
                        <Sidebar.MenuIcon>
                          <Icon className="size-4" />
                        </Sidebar.MenuIcon>
                        <Sidebar.MenuLabel>{label}</Sidebar.MenuLabel>
                      </Sidebar.MenuItem>
                    );
                  })}

                  {group.key === 'start' && (
                    <Sidebar.MenuItem
                      id={`${idPrefix}-quick-actions`}
                      textValue={t('shell.quickActions')}
                      onAction={() => {
                        setMobileOpen(false);
                        onOpenQuickActions();
                      }}
                    >
                      <Sidebar.MenuIcon>
                        <Search className="size-4" />
                      </Sidebar.MenuIcon>
                      <Sidebar.MenuLabel>{t('shell.quickActions')}</Sidebar.MenuLabel>
                      <Sidebar.MenuChip>
                        <Kbd className="text-xs">
                          <Kbd.Abbr keyValue="command" />
                          <Kbd.Content>K</Kbd.Content>
                        </Kbd>
                      </Sidebar.MenuChip>
                    </Sidebar.MenuItem>
                  )}
                </Sidebar.Menu>
              </Sidebar.Group>
            );
          })}
        </Sidebar.Content>
      )}

      {current && !isRedeemerOnly(current.role) && showOnboardingHere && (
        <div className="px-3 pb-2">
          <SidebarOnboarding
            orgId={current.id}
            isCollapsedDesktop={!isOpen && !isMobile}
            isMobile={isMobile}
            onNavigate={() => setMobileOpen(false)}
          />
        </div>
      )}

      <Sidebar.Separator />

      <Sidebar.Footer className="px-2 pt-0 pb-2">
        <Dropdown>
          <Dropdown.Trigger
            aria-label="User menu"
            className="hover:bg-default flex w-full cursor-pointer items-center gap-2.5 rounded-xl px-2 py-1.5 text-left outline-none transition-colors"
          >
            <div
              aria-hidden="true"
              className="size-5 shrink-0 rounded-full bg-gradient-to-tr from-purple-500 to-pink-500 shadow-sm"
            />
            <span
              className="text-foreground flex-1 truncate text-sm font-medium"
              data-sidebar="label"
            >
              {userName || userEmail || 'User'}
            </span>
            <MoreHorizontal className="text-muted ml-auto size-4 shrink-0" data-sidebar="label" />
          </Dropdown.Trigger>
          <Dropdown.Popover placement="top start" className="w-56">
            <div className="px-2.5 py-2">
              <p className="text-foreground m-0 truncate text-sm font-medium">{userName}</p>
              <Caption className="block truncate text-xs">{userEmail}</Caption>
            </div>
            <Separator />
            <Dropdown.Menu
              aria-label="User menu"
              onAction={(key) => {
                if (key === 'signOut') {
                  onSignOut();
                }
              }}
            >
              <Dropdown.Item id="signOut" textValue={t('auth.signOut')} variant="danger">
                <LogOut className="size-4" />
                <Label>{t('auth.signOut')}</Label>
              </Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown.Popover>
        </Dropdown>
      </Sidebar.Footer>
    </>
  );
}

export function AppShell({ orgs, children }: { orgs: MyOrg[]; children: React.ReactNode }) {
  const t = useTranslations();
  const pathname = usePathname();
  const router = useRouter();
  const [quickOpen, setQuickOpen] = useState(false);
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
  const currentGradient =
    WORKSPACE_GRADIENTS[currentIndex % WORKSPACE_GRADIENTS.length] ?? WORKSPACE_GRADIENTS[0];
  const canReadCampaigns = Boolean(current && can(current.role, { campaign: ['read'] }));
  const campaignsQuery = useCampaigns(canReadCampaigns && current ? current.id : '');
  const campaigns = canReadCampaigns ? (campaignsQuery.data ?? []) : [];

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

  const userName = session?.user.name ?? '';
  const userEmail = session?.user.email;
  const routes = current ? campaignRoutes(current.id) : null;

  const visibleNavItems = current
    ? NAV.filter((item) => !item.permission || can(current.role, item.permission))
    : [];

  const sharedSidebarProps = {
    activeKey: activeNav?.key,
    current,
    currentGradient,
    onOpenQuickActions: () => setQuickOpen(true),
    onSignOut: () => void signOut(),
    orgHome,
    orgs,
    userEmail,
    userName,
  };

  return (
    <>
      {/* Quick Actions Command Palette */}
      <Command>
        <Command.Backdrop isOpen={quickOpen} onOpenChange={setQuickOpen} isDismissable>
          <Command.Container size="md">
            <Command.Dialog aria-label={t('shell.quickActions')}>
              <Command.Header>
                <Command.InputGroup>
                  <Command.InputGroup.Prefix>
                    <Search className="size-4 text-muted" />
                  </Command.InputGroup.Prefix>
                  <Command.InputGroup.Input
                    autoFocus
                    placeholder={t('shell.quickActionsPlaceholder')}
                    aria-label={t('shell.quickActionsPlaceholder')}
                  />
                  <Command.InputGroup.ClearButton />
                </Command.InputGroup>
              </Command.Header>
              <Command.List
                aria-label={t('shell.quickActions')}
                renderEmptyState={() => (
                  <div className="py-6 text-center text-xs text-muted">
                    {t('shell.quickActionsEmpty')}
                  </div>
                )}
              >
                <Command.Group heading={t('shell.navigation')}>
                  {visibleNavItems.map(({ key, icon: Icon, path }) => {
                    const href = (path ? `${orgHome}/${path}` : orgHome) as Route;
                    const label = t(`nav.${key}`);
                    return (
                      <Command.Item
                        key={key}
                        id={`nav-${key}`}
                        textValue={label}
                        onAction={() => {
                          setQuickOpen(false);
                          router.push(href);
                        }}
                      >
                        <Icon className="size-4 shrink-0 text-muted" />
                        <span className="flex-1 font-medium">{label}</span>
                      </Command.Item>
                    );
                  })}
                </Command.Group>

                {routes && campaigns.length > 0 && (
                  <>
                    <Command.Separator />
                    <Command.Group heading={t('shell.favorites')}>
                      {campaigns.slice(0, 8).map((c) => {
                        const phase = campaignPhase(c, now);
                        const href = (
                          phase === 'draft' ? routes.edit(c.id) : routes.detail(c.id)
                        ) as Route;
                        return (
                          <Command.Item
                            key={c.id}
                            id={`campaign-${c.id}`}
                            textValue={c.name}
                            onAction={() => {
                              setQuickOpen(false);
                              router.push(href);
                            }}
                          >
                            <Sparkles className="size-3.5 shrink-0 text-accent" />
                            <span className="flex-1 truncate">{c.name}</span>
                            <span className="text-muted shrink-0 text-xs">
                              {t(`campaigns.phase.${phase}`)}
                            </span>
                          </Command.Item>
                        );
                      })}
                    </Command.Group>
                  </>
                )}
              </Command.List>

              <Command.Footer>
                <div className="flex items-center gap-3 text-xs text-muted">
                  <span className="flex items-center gap-1">
                    <Kbd className="text-xs">
                      <Kbd.Content>↑↓</Kbd.Content>
                    </Kbd>{' '}
                    {t('shell.commandNavigate')}
                  </span>
                  <span className="flex items-center gap-1">
                    <Kbd className="text-xs">
                      <Kbd.Content>↵</Kbd.Content>
                    </Kbd>{' '}
                    {t('shell.commandSelect')}
                  </span>
                  <span className="flex items-center gap-1">
                    <Kbd className="text-xs">
                      <Kbd.Content>esc</Kbd.Content>
                    </Kbd>{' '}
                    {t('shell.commandClose')}
                  </span>
                </div>
              </Command.Footer>
            </Command.Dialog>
          </Command.Container>
        </Command.Backdrop>
      </Command>

      <AppLayout
        navigate={(href) => router.push(href as Route)}
        sidebarCollapsible="icon"
        sidebar={
          <>
            <Sidebar>
              <StudioSidebarInner idPrefix="desktop" {...sharedSidebarProps} />
              <Sidebar.Rail />
            </Sidebar>
            <Sidebar.Mobile>
              <StudioSidebarInner idPrefix="mobile" {...sharedSidebarProps} />
            </Sidebar.Mobile>
          </>
        }
        navbar={
          <Navbar maxWidth="full">
            <Navbar.Header>
              <AppLayout.MenuToggle aria-label={t('shell.openNav')} />
              <Sidebar.Trigger aria-label={t('shell.collapse')} />
              <Breadcrumbs className="min-w-0">
                <Breadcrumbs.Item className="min-w-0 font-semibold">
                  <span className="flex min-w-0 items-center gap-2 overflow-hidden">
                    <ActiveIcon className="size-4 shrink-0 text-accent" />
                    <span className="truncate">{headerTitle}</span>
                  </span>
                </Breadcrumbs.Item>
              </Breadcrumbs>
              <Navbar.Spacer />
              <button
                type="button"
                onClick={() => setQuickOpen(true)}
                className="hover:bg-default hidden sm:flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs text-muted shadow-2xs transition-colors"
                aria-label={t('shell.quickActions')}
              >
                <Search className="size-3.5" />
                <span className="hidden md:inline">{t('shell.quickActions')}</span>
                <Kbd className="text-[10px]">
                  <Kbd.Abbr keyValue="command" />
                  <Kbd.Content>K</Kbd.Content>
                </Kbd>
              </button>
              <Navbar.Content>
                {routes && canReadCampaigns && (
                  <>
                    <Link
                      href={routes.create}
                      className="hover:bg-default flex cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-foreground shadow-2xs transition-colors"
                    >
                      <Plus className="size-3.5 text-accent" />
                      <span className="hidden text-xs font-medium sm:block">
                        {t('campaigns.create')}
                      </span>
                    </Link>
                    <Navbar.Separator />
                  </>
                )}
                <Navbar.Item aria-label="Theme" title="Switch theme" onPress={handleToggleTheme}>
                  {resolvedTheme === 'dark' ? (
                    <Sun className="size-4" />
                  ) : (
                    <Moon className="size-4" />
                  )}
                </Navbar.Item>
                <Navbar.Item aria-label="Help" onPress={() => setQuickOpen(true)}>
                  <HelpCircle className="size-4" />
                </Navbar.Item>
              </Navbar.Content>
            </Navbar.Header>
          </Navbar>
        }
      >
        <div
          className={
            pathname.endsWith('/edit') || pathname.includes('/labs/canvas')
              ? 'flex-1 p-3 sm:p-5'
              : 'mx-auto w-full max-w-[1360px] flex-1 p-4 sm:p-6 lg:px-8'
          }
        >
          {orgNotFound ? (
            <div className="mx-auto my-12 max-w-md">
              <Card
                className="flex flex-col items-center gap-4 p-6 text-center"
                data-testid="org-not-found-card"
              >
                <Card.Header className="space-y-1.5 p-0">
                  <Card.Title className="m-0 text-title-3-semibold text-text-primary">
                    {t('shell.orgNotFoundTitle')}
                  </Card.Title>
                  <Card.Description className="m-0 text-body-2-regular text-text-secondary">
                    {t('shell.orgNotFoundDescription')}
                  </Card.Description>
                </Card.Header>
                <Card.Footer className="p-0">
                  <Link
                    href={(orgs[0] ? `/orgs/${orgs[0].id}` : '/onboarding') as Route}
                    className="inline-flex h-9 items-center justify-center rounded-xl bg-primary px-4 text-caption-1-semibold text-primary-foreground transition-opacity hover:opacity-90"
                  >
                    {t('shell.backToYourOrg')}
                  </Link>
                </Card.Footer>
              </Card>
            </div>
          ) : (
            children
          )}
        </div>
      </AppLayout>
    </>
  );
}
