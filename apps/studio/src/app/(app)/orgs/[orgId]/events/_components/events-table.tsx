'use client';

import { useRouteQuery } from '@playora/api-client/react';
import { eventsApi } from '@playora/contracts';
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
import { useFormatter, useTranslations } from 'next-intl';
import { EventStatusBadge } from '@/components/event-status-badge';
import { api } from '@/lib/api';

export function EventsTable({ orgId }: { orgId: string }) {
  const t = useTranslations();
  const format = useFormatter();
  const query = useRouteQuery(api, eventsApi.list, { params: { orgId }, query: { limit: 50 } });

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
        </TableRow>
      </TableHeader>
      <TableBody>
        {query.data.items.map((event) => (
          <TableRow key={event.id}>
            <TableCell className="font-medium">{event.name}</TableCell>
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
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
