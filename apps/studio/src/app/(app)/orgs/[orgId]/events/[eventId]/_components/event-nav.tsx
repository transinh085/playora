'use client';

import { cn } from '@playora/ui/lib/utils';
import { Monitor, Settings, Users } from 'lucide-react';
import type { Route } from 'next';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';

export function EventNav({ orgId, eventId }: { orgId: string; eventId: string }) {
  const t = useTranslations();
  const pathname = usePathname();
  const base = `/orgs/${orgId}/events/${eventId}`;

  const items = [
    {
      href: `${base}/guests`,
      label: t('guests.tabGuests'),
      icon: Users,
      active: pathname === base || pathname.startsWith(`${base}/guests`),
    },
    {
      href: `${base}/screens`,
      label: t('screens.tabScreens'),
      icon: Monitor,
      active: pathname.startsWith(`${base}/screens`),
    },
    {
      href: `${base}/settings`,
      label: t('nav.settings'),
      icon: Settings,
      active: pathname.startsWith(`${base}/settings`),
    },
  ];

  return (
    <nav className="flex flex-wrap items-center gap-1 border-b pb-2">
      {items.map(({ href, label, icon: Icon, active }) => (
        <Link
          key={href}
          href={href as Route}
          aria-current={active ? 'page' : undefined}
          className={cn(
            'text-muted-foreground hover:text-foreground hover:bg-muted inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
            active && 'bg-muted text-foreground',
          )}
        >
          <Icon className="size-4" />
          {label}
        </Link>
      ))}
    </nav>
  );
}
