'use client';

import { Button } from '@playora/ui/components/button';
import { Skeleton } from '@playora/ui/components/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@playora/ui/components/table';
import { Settings } from 'lucide-react';
import type { Route } from 'next';
import Link from 'next/link';
import { useFormatter, useTranslations } from 'next-intl';
import { useEvents } from '../api';
import { EventStatusBadge } from './event-status-badge';

export function EventsTable({ orgId }: { orgId: string }) {
  const t = useTranslations();
  const format = useFormatter();
  const query = useEvents(orgId, 50);

  if (query.isPending) {
    return (
      <div className="grid gap-2">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }
  if (query.isError) {
    return (
      <div className="flex items-center gap-3 text-sm">
        <span className="text-destructive">{t('common.unknownError')}</span>
        <Button variant="outline" size="sm" onClick={() => query.refetch()}>
          {t('common.retry')}
        </Button>
      </div>
    );
  }
  if (query.data.items.length === 0) {
    return (
      <p className="text-muted-foreground rounded-lg border border-dashed p-10 text-center">
        {t('events.empty')}
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t('events.name')}</TableHead>
          <TableHead>{t('events.slug')}</TableHead>
          <TableHead>{t('events.startsAt')}</TableHead>
          <TableHead>{t('events.status')}</TableHead>
          <TableHead className="w-12" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {query.data.items.map((event) => (
          <TableRow key={event.id}>
            <TableCell className="font-medium">
              <Link
                href={`/orgs/${orgId}/events/${event.id}/guests` as Route}
                className="hover:underline"
              >
                {event.name}
              </Link>
            </TableCell>
            <TableCell className="text-muted-foreground">/{event.slug}</TableCell>
            <TableCell>
              {event.startsAt
                ? format.dateTime(new Date(event.startsAt), {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })
                : '—'}
            </TableCell>
            <TableCell>
              <EventStatusBadge status={event.status} />
            </TableCell>
            <TableCell className="text-right">
              <Button variant="ghost" size="icon" asChild>
                <Link
                  href={`/orgs/${orgId}/events/${event.id}/settings` as Route}
                  aria-label={t('events.settings')}
                >
                  <Settings className="size-4" />
                </Link>
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
