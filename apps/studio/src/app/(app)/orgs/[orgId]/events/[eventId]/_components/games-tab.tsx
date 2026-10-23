'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { routePrefix, useRouteMutation, useRouteQuery } from '@playora/api-client/react';
import {
  CreateGameBody,
  type ErrorCode,
  type GameSummary,
  gamesApi,
  type TemplateSummary,
  templatesApi,
} from '@playora/contracts';
import { Badge } from '@playora/ui/components/badge';
import { Button } from '@playora/ui/components/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@playora/ui/components/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@playora/ui/components/dialog';
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
import { ArrowDown, ArrowUp, GripVertical, Pencil, Plus, Trash2 } from 'lucide-react';
import type { Route } from 'next';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import type { z } from 'zod';
import { api } from '@/lib/api';
import { applyApiError } from '@/lib/form-errors';

type CreateGameValues = z.input<typeof CreateGameBody>;

function localizeText(text: { vi: string; en?: string }, locale: string): string {
  if (locale === 'en' && text.en) return text.en;
  return text.vi;
}

export function GamesTab({ orgId, eventId }: { orgId: string; eventId: string }) {
  const t = useTranslations();
  const locale = useLocale();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const gamesQuery = useRouteQuery(api, gamesApi.list, { params: { orgId, eventId } });
  const templatesQuery = useRouteQuery(api, templatesApi.list, {});

  const templates = templatesQuery.data?.items ?? [];

  const form = useForm<CreateGameValues>({
    resolver: zodResolver(CreateGameBody),
    defaultValues: {
      templateId: 'tap-race',
      name: '',
      skinKey: 'yep',
    },
  });

  const selectedTemplateId = form.watch('templateId');
  const selectedTemplate: TemplateSummary | undefined =
    templates.find((tpl) => tpl.id === selectedTemplateId) ?? templates[0];

  useEffect(() => {
    if (dialogOpen && selectedTemplate && !form.getValues('name')) {
      form.setValue('templateId', selectedTemplate.id);
      form.setValue('name', localizeText(selectedTemplate.name, locale));
      if (selectedTemplate.skins[0]) {
        form.setValue('skinKey', selectedTemplate.skins[0].key);
      }
    }
  }, [dialogOpen, selectedTemplate, locale, form]);

  const messageFor = (code: ErrorCode) => t(`errors.${code}`);

  const createMutation = useRouteMutation(api, gamesApi.create, {
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: routePrefix(gamesApi.list) });
      toast.success(t('games.created', { name: created.name }));
      setDialogOpen(false);
      form.reset({
        templateId: selectedTemplate?.id ?? 'tap-race',
        name: '',
        skinKey: selectedTemplate?.skins[0]?.key ?? 'yep',
      });
    },
    onError: (err) => {
      if (!applyApiError(err, form.setError, messageFor)) {
        toast.error(messageFor(err.code));
      }
    },
  });

  const reorderMutation = useRouteMutation(api, gamesApi.reorder, {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: routePrefix(gamesApi.list) });
      toast.success(t('games.reordered'));
    },
    onError: (err) => toast.error(messageFor(err.code)),
  });

  const removeMutation = useRouteMutation(api, gamesApi.remove, {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: routePrefix(gamesApi.list) });
      toast.success(t('games.deleted'));
    },
    onError: (err) => toast.error(messageFor(err.code)),
  });

  const games = gamesQuery.data?.items ?? [];

  function handleSelectTemplate(tpl: TemplateSummary) {
    form.setValue('templateId', tpl.id, { shouldValidate: true });
    if (
      !form.getValues('name') ||
      templates.some((item) => localizeText(item.name, locale) === form.getValues('name'))
    ) {
      form.setValue('name', localizeText(tpl.name, locale), { shouldValidate: true });
    }
    if (tpl.skins[0]) {
      form.setValue('skinKey', tpl.skins[0].key, { shouldValidate: true });
    }
  }

  function moveGame(index: number, direction: -1 | 1) {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= games.length) return;
    const nextIds = games.map((g) => g.id);
    const [moved] = nextIds.splice(index, 1);
    if (!moved) return;
    nextIds.splice(targetIndex, 0, moved);
    reorderMutation.mutate({
      params: { orgId, eventId },
      body: { gameIds: nextIds },
    });
  }

  function handleDrop(targetGameId: string) {
    if (!draggedId || draggedId === targetGameId) {
      setDraggedId(null);
      return;
    }
    const fromIndex = games.findIndex((g) => g.id === draggedId);
    const toIndex = games.findIndex((g) => g.id === targetGameId);
    setDraggedId(null);
    if (fromIndex < 0 || toIndex < 0) return;

    const nextIds = games.map((g) => g.id);
    const [moved] = nextIds.splice(fromIndex, 1);
    if (!moved) return;
    nextIds.splice(toIndex, 0, moved);
    reorderMutation.mutate({
      params: { orgId, eventId },
      body: { gameIds: nextIds },
    });
  }

  return (
    <Card data-testid="event-games-tab">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4">
        <div className="grid gap-1">
          <CardTitle>{t('games.title')}</CardTitle>
          <CardDescription>{t('games.description')}</CardDescription>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="add-game-button">
              <Plus className="size-4" />
              {t('games.addGame')}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-2xl" data-testid="template-gallery-dialog">
            <DialogHeader>
              <DialogTitle>{t('games.galleryTitle')}</DialogTitle>
              <DialogDescription>{t('games.galleryDescription')}</DialogDescription>
            </DialogHeader>

            <form
              className="grid gap-4"
              onSubmit={form.handleSubmit((body) =>
                createMutation.mutate({ params: { orgId, eventId }, body }),
              )}
            >
              <div className="grid gap-3 sm:grid-cols-2" data-testid="template-gallery-list">
                {templates.map((tpl) => {
                  const isSelected = tpl.id === selectedTemplate?.id;
                  return (
                    <button
                      key={tpl.id}
                      type="button"
                      data-testid={`template-card-${tpl.id}`}
                      onClick={() => handleSelectTemplate(tpl)}
                      className={`cursor-pointer rounded-xl border p-4 text-left transition ${
                        isSelected
                          ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-semibold">{localizeText(tpl.name, locale)}</h4>
                        <Badge variant="outline">{tpl.kind}</Badge>
                      </div>
                      <p className="text-muted-foreground mt-1 text-xs">
                        {localizeText(tpl.description, locale)}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-1">
                        {tpl.tags.map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-[10px]">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="game-name">{t('games.gameNameLabel')}</Label>
                  <Input
                    id="game-name"
                    data-testid="new-game-name-input"
                    placeholder={t('games.gameNamePlaceholder')}
                    aria-invalid={!!form.formState.errors.name}
                    {...form.register('name')}
                  />
                  {form.formState.errors.name && (
                    <p className="text-destructive text-xs">{form.formState.errors.name.message}</p>
                  )}
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="game-skin">{t('games.skinLabel')}</Label>
                  <Select
                    value={form.watch('skinKey') ?? selectedTemplate?.skins[0]?.key ?? ''}
                    onValueChange={(v) => form.setValue('skinKey', v, { shouldValidate: true })}
                  >
                    <SelectTrigger
                      id="game-skin"
                      className="w-full"
                      data-testid="new-game-skin-select"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(selectedTemplate?.skins ?? []).map((skin) => (
                        <SelectItem key={skin.key} value={skin.key}>
                          {localizeText(skin.name, locale)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  {t('common.cancel')}
                </Button>
                <Button
                  type="submit"
                  data-testid="confirm-add-game"
                  disabled={createMutation.isPending}
                >
                  {t('games.createGame')}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>

      <CardContent>
        {gamesQuery.isPending ? (
          <div className="grid gap-2">
            {[0, 1].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : gamesQuery.isError ? (
          <p className="text-destructive text-sm">{t('common.unknownError')}</p>
        ) : games.length === 0 ? (
          <p
            className="text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm"
            data-testid="games-empty-state"
          >
            {t('games.empty')}
          </p>
        ) : (
          <div className="grid gap-2" data-testid="games-list">
            {games.map((game: GameSummary, idx: number) => {
              const tpl = templates.find((item) => item.id === game.templateId);
              const skinObj = tpl?.skins.find((s) => s.key === game.skinKey);
              return (
                // biome-ignore lint/a11y/noStaticElementInteractions: HTML5 drag-and-drop row; keyboard reorder uses the explicit Up/Down buttons
                <div
                  key={game.id}
                  draggable
                  onDragStart={() => setDraggedId(game.id)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => handleDrop(game.id)}
                  data-testid={`game-row-${game.id}`}
                  className="bg-card flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3 transition hover:border-primary/40"
                >
                  <div className="flex items-center gap-3">
                    <GripVertical className="text-muted-foreground size-4 cursor-grab" />
                    <Badge variant="outline" className="font-mono text-xs">
                      #{idx + 1}
                    </Badge>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/orgs/${orgId}/events/${eventId}/games/${game.id}` as Route}
                          className="font-medium hover:underline"
                          data-testid={`game-link-${game.id}`}
                        >
                          {game.name}
                        </Link>
                        {game.currentVersion ? (
                          <Badge variant="default" data-testid={`game-status-${game.id}`}>
                            {t('games.publishedBadge', { version: game.currentVersion })}
                          </Badge>
                        ) : (
                          <Badge variant="secondary" data-testid={`game-status-${game.id}`}>
                            {t('games.statusDraft')}
                          </Badge>
                        )}
                      </div>
                      <p className="text-muted-foreground text-xs">
                        {tpl ? localizeText(tpl.name, locale) : game.templateId}
                        {skinObj ? ` · ${localizeText(skinObj.name, locale)}` : ''}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={t('games.moveUp')}
                      data-testid={`game-move-up-${game.id}`}
                      disabled={idx === 0 || reorderMutation.isPending}
                      onClick={() => moveGame(idx, -1)}
                    >
                      <ArrowUp className="size-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={t('games.moveDown')}
                      data-testid={`game-move-down-${game.id}`}
                      disabled={idx === games.length - 1 || reorderMutation.isPending}
                      onClick={() => moveGame(idx, 1)}
                    >
                      <ArrowDown className="size-4" />
                    </Button>
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      data-testid={`game-edit-${game.id}`}
                    >
                      <Link href={`/orgs/${orgId}/events/${eventId}/games/${game.id}` as Route}>
                        <Pencil className="size-3.5" />
                        {t('games.editGame')}
                      </Link>
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={t('games.deleteGame')}
                      data-testid={`game-delete-${game.id}`}
                      disabled={removeMutation.isPending}
                      onClick={() => removeMutation.mutate({ params: { orgId, gameId: game.id } })}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
