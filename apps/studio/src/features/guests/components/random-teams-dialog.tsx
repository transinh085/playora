'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { AssignRandomTeamsBody, type ErrorCode } from '@playora/contracts';
import { Button } from '@playora/ui/components/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@playora/ui/components/dialog';
import { Label } from '@playora/ui/components/label';
import { Textarea } from '@playora/ui/components/textarea';
import { Shuffle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import type { z } from 'zod';
import { applyApiError } from '@/lib/form-errors';
import { useAssignRandomTeams } from '../api';

type Values = z.input<typeof AssignRandomTeamsBody>;

export function RandomTeamsDialog({ orgId, eventId }: { orgId: string; eventId: string }) {
  const t = useTranslations();
  const [open, setOpen] = useState(false);
  const [rawText, setRawText] = useState('');

  const form = useForm<Values>({
    resolver: zodResolver(AssignRandomTeamsBody),
    defaultValues: { teams: [] },
  });

  const assign = useAssignRandomTeams({
    onSuccess: (res) => {
      toast.success(t('guests.assignedSuccess', { count: res.assigned }));
      setOpen(false);
      setRawText('');
      form.reset({ teams: [] });
    },
    onError: (error) => {
      const messageFor = (code: ErrorCode) => t(`errors.${code}`);
      if (!applyApiError(error, form.setError, messageFor)) toast.error(messageFor(error.code));
    },
  });

  function handleTextChange(value: string) {
    setRawText(value);
    const parsed = value
      .split(/[\n,]+/)
      .map((item) => item.trim())
      .filter(Boolean);
    form.setValue('teams', parsed, { shouldValidate: form.formState.isSubmitted });
  }

  const { errors } = form.formState;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Shuffle />
          {t('guests.randomTeamsButton')}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('guests.randomTeamsTitle')}</DialogTitle>
          <DialogDescription>{t('guests.randomTeamsDescription')}</DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-4"
          onSubmit={form.handleSubmit((body) =>
            assign.mutate({ params: { orgId, eventId }, body }),
          )}
        >
          <div className="grid gap-2">
            <Label htmlFor="team-names">{t('guests.teamNamesLabel')}</Label>
            <Textarea
              id="team-names"
              rows={4}
              value={rawText}
              aria-invalid={!!errors.teams}
              placeholder={t('guests.teamNamesPlaceholder')}
              onChange={(e) => handleTextChange(e.target.value)}
            />
            {errors.teams && (
              <p className="text-destructive text-sm">
                {errors.teams.message ?? errors.teams.root?.message}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={assign.isPending}>
              {t('guests.assignSubmit')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
