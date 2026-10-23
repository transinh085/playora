'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { routePrefix, useRouteMutation } from '@playora/api-client/react';
import { CreateEventBody, type ErrorCode, eventsApi } from '@playora/contracts';
import { Button } from '@playora/ui/components/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@playora/ui/components/dialog';
import { Input } from '@playora/ui/components/input';
import { Label } from '@playora/ui/components/label';
import { useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import type { z } from 'zod';
import { api } from '@/lib/api';
import { applyApiError } from '@/lib/form-errors';

type Values = z.input<typeof CreateEventBody>;

export function CreateEventDialog({ orgId }: { orgId: string }) {
  const t = useTranslations();
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  // The same zod schema the API validates with — no duplicated rules.
  const form = useForm<Values>({
    resolver: zodResolver(CreateEventBody),
    defaultValues: { name: '', slug: '' },
  });

  const create = useRouteMutation(api, eventsApi.create, {
    onSuccess: (event) => {
      queryClient.invalidateQueries({ queryKey: routePrefix(eventsApi.list) });
      toast.success(t('events.created', { name: event.name }));
      setOpen(false);
      form.reset();
    },
    onError: (error) => {
      // Every ErrorCode has a message (enforced by the @playora/i18n test).
      const messageFor = (code: ErrorCode) => t(`errors.${code}`);
      if (!applyApiError(error, form.setError, messageFor)) toast.error(messageFor(error.code));
    },
  });

  const { errors } = form.formState;
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus />
          {t('events.new')}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('events.new')}</DialogTitle>
        </DialogHeader>
        <form
          className="grid gap-4"
          onSubmit={form.handleSubmit((body) => create.mutate({ params: { orgId }, body }))}
        >
          <div className="grid gap-2">
            <Label htmlFor="event-name">{t('events.name')}</Label>
            <Input id="event-name" aria-invalid={!!errors.name} {...form.register('name')} />
            {errors.name && <p className="text-destructive text-sm">{errors.name.message}</p>}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="event-slug">{t('events.slug')}</Label>
            <Input
              id="event-slug"
              aria-invalid={!!errors.slug}
              placeholder="yep-2026"
              {...form.register('slug')}
            />
            <p className="text-muted-foreground text-xs">
              {t('events.slugHint', { slug: form.watch('slug') || 'yep-2026' })}
            </p>
            {errors.slug && <p className="text-destructive text-sm">{errors.slug.message}</p>}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={create.isPending}>
              {t('common.create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
