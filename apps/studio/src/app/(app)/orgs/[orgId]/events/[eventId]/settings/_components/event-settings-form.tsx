'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { routePrefix, useRouteMutation, useRouteQuery } from '@playora/api-client/react';
import { brandKitsApi, type ErrorCode, eventsApi, UpdateEventBody } from '@playora/contracts';
import { Button } from '@playora/ui/components/button';
import { Card, CardContent, CardHeader, CardTitle } from '@playora/ui/components/card';
import { Input } from '@playora/ui/components/input';
import { Label } from '@playora/ui/components/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@playora/ui/components/select';
import { Skeleton } from '@playora/ui/components/skeleton';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import type { z } from 'zod';
import { api } from '@/lib/api';
import { applyApiError } from '@/lib/form-errors';

type Values = z.input<typeof UpdateEventBody>;

const NONE_KIT = '__none__';

export function EventSettingsForm({ orgId, eventId }: { orgId: string; eventId: string }) {
  const t = useTranslations();
  const queryClient = useQueryClient();

  const eventQuery = useRouteQuery(api, eventsApi.get, { params: { orgId, eventId } });
  const kitsQuery = useRouteQuery(api, brandKitsApi.list, {
    params: { orgId },
    query: { limit: 100 },
  });

  const form = useForm<Values>({
    resolver: zodResolver(UpdateEventBody),
    defaultValues: { name: '', brandKitId: null },
  });

  useEffect(() => {
    if (eventQuery.data) {
      form.reset({
        name: eventQuery.data.name,
        brandKitId: eventQuery.data.brandKitId,
      });
    }
  }, [eventQuery.data, form]);

  const update = useRouteMutation(api, eventsApi.update, {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: routePrefix(eventsApi.list) });
      queryClient.invalidateQueries({ queryKey: routePrefix(eventsApi.get) });
      toast.success(t('events.saved'));
    },
    onError: (err) => {
      const messageFor = (code: ErrorCode) => t(`errors.${code}`);
      if (!applyApiError(err, form.setError, messageFor)) toast.error(messageFor(err.code));
    },
  });

  if (eventQuery.isPending || kitsQuery.isPending) {
    return <Skeleton className="h-64 w-full rounded-xl" />;
  }
  if (eventQuery.isError) {
    return (
      <div className="flex items-center gap-3 text-sm">
        <span className="text-destructive">{t('common.unknownError')}</span>
        <Button variant="outline" size="sm" onClick={() => eventQuery.refetch()}>
          {t('common.retry')}
        </Button>
      </div>
    );
  }

  const brandKitId = form.watch('brandKitId');
  const { errors } = form.formState;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{eventQuery.data.name}</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          className="grid gap-4"
          onSubmit={form.handleSubmit((body) =>
            update.mutate({ params: { orgId, eventId }, body }),
          )}
        >
          <div className="grid gap-2">
            <Label htmlFor="settings-event-name">{t('events.name')}</Label>
            <Input
              id="settings-event-name"
              aria-invalid={!!errors.name}
              {...form.register('name')}
            />
            {errors.name && <p className="text-destructive text-sm">{errors.name.message}</p>}
          </div>

          <div className="grid gap-2">
            <Label>{t('events.brandKit')}</Label>
            <Select
              value={brandKitId ?? NONE_KIT}
              onValueChange={(v) => form.setValue('brandKitId', v === NONE_KIT ? null : v)}
            >
              <SelectTrigger className="w-full" aria-label={t('events.brandKit')}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_KIT}>{t('events.noBrandKit')}</SelectItem>
                {(kitsQuery.data?.items ?? []).map((kit) => (
                  <SelectItem key={kit.id} value={kit.id}>
                    {kit.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end pt-2">
            <Button type="submit" disabled={update.isPending}>
              {t('common.save')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
