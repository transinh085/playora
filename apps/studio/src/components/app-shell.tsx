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
import { Logo } from '@playora/ui/components/logo';
import { cn } from '@playora/ui/lib/utils';
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

  return (
    <div className="grid min-h-dvh md:grid-cols-[240px_1fr]">
      <aside className="bg-sidebar text-sidebar-foreground hidden flex-col gap-4 border-r p-4 md:flex">
        <Link href="/" className="px-2" aria-label={t('common.appName')}>
          <Logo />
        </Link>
        {current && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="justify-start truncate">
                {current.name}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              {orgs.map((org) => (
                <DropdownMenuItem
                  key={org.id}
                  onSelect={() => router.push(`/orgs/${org.id}/events`)}
                >
                  {org.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        {current && (
          <nav className="grid gap-1">
            {nav.map(({ key, icon: Icon, path }) => {
              const href = `/orgs/${current.id}/${path}`;
              const active = pathname.startsWith(href);
              return (
                <Link
                  key={key}
                  href={href as Route}
                  className={cn(
                    'hover:bg-sidebar-accent flex items-center gap-2 rounded-md px-2 py-2 text-sm',
                    active && 'bg-sidebar-accent font-medium',
                  )}
                >
                  <Icon className="size-4" />
                  {t(`nav.${key}`)}
                </Link>
              );
            })}
          </nav>
        )}
      </aside>
      <div className="flex min-w-0 flex-col">
        <header className="flex h-14 items-center justify-end gap-2 border-b px-4">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Theme"
            onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
          >
            {resolvedTheme === 'dark' ? <Sun /> : <Moon />}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <Avatar className="size-8">
                  <AvatarFallback>
                    {session?.user.name?.slice(0, 1).toUpperCase() ?? '?'}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel className="font-normal">
                <div className="font-medium">{session?.user.name}</div>
                <div className="text-muted-foreground text-xs">{session?.user.email}</div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={signOut}>
                <LogOut />
                {t('auth.signOut')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
