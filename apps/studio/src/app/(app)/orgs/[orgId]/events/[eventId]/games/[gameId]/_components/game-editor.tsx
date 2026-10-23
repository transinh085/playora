'use client';

import { ApiError } from '@playora/api-client';
import { routePrefix, useRouteMutation, useRouteQuery } from '@playora/api-client/react';
import {
  assetsApi,
  brandKitsApi,
  ErrorCode,
  eventsApi,
  gamesApi,
  templatesApi,
  UpdateGameBody,
} from '@playora/contracts';
import { AutoForm, type FieldDescriptor, type FormDescriptor } from '@playora/ui/auto-form';
import { Alert, AlertDescription } from '@playora/ui/components/alert';
import { Badge } from '@playora/ui/components/badge';
import { Button } from '@playora/ui/components/button';
import { Card, CardContent, CardHeader, CardTitle } from '@playora/ui/components/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@playora/ui/components/dialog';
import { Input } from '@playora/ui/components/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@playora/ui/components/select';
import { Skeleton } from '@playora/ui/components/skeleton';
import { useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, ArrowLeft, Monitor, Rocket, Save, Smartphone } from 'lucide-react';
import type { Route } from 'next';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import type { z } from 'zod';
import { api } from '@/lib/api';
import { PLAY_URL } from '@/lib/env';
import { applyApiError } from '@/lib/form-errors';

type UpdateGameValues = z.input<typeof UpdateGameBody>;

function localizeText(text: { vi: string; en?: string }, locale: string): string {
  if (locale === 'en' && text.en) return text.en;
  return text.vi;
}

function getByDotPath(obj: Record<string, unknown>, dotPath: string): unknown {
  let cur: unknown = obj;
  for (const seg of dotPath.split('.').filter(Boolean)) {
    if (cur === null || typeof cur !== 'object') return undefined;
    cur = (cur as Record<string, unknown>)[seg];
  }
  return cur;
}

export function hasNonHotEditableChanges(
  fields: readonly FieldDescriptor[],
  draftConfig: Record<string, unknown>,
  publishedConfig: Record<string, unknown>,
): boolean {
  for (const field of fields) {
    if (field.hotEditable) {
      continue;
    }
    if (field.widget === 'object' && field.fields && field.fields.length > 0) {
      if (hasNonHotEditableChanges(field.fields, draftConfig, publishedConfig)) {
        return true;
      }
      continue;
    }
    const draftVal = getByDotPath(draftConfig, field.path);
    const pubVal = getByDotPath(publishedConfig, field.path);
    if (JSON.stringify(draftVal) !== JSON.stringify(pubVal)) {
      return true;
    }
  }
  return false;
}

export function resolvePlayOrigin(playUrl: string = PLAY_URL): string {
  return new URL(playUrl).origin;
}

export function GameEditor({
  orgId,
  eventId,
  gameId,
}: {
  orgId: string;
  eventId?: string;
  gameId: string;
}) {
  const t = useTranslations();
  const rawLocale = useLocale();
  const locale: 'vi' | 'en' = rawLocale === 'en' ? 'en' : 'vi';
  const queryClient = useQueryClient();

  const gameQuery = useRouteQuery(api, gamesApi.get, { params: { orgId, gameId } });
  const versionsQuery = useRouteQuery(api, gamesApi.listVersions, { params: { orgId, gameId } });
  const templatesQuery = useRouteQuery(api, templatesApi.list, {});

  const resolvedEventId = eventId ?? gameQuery.data?.eventId ?? '';

  const eventQuery = useRouteQuery(
    api,
    eventsApi.get,
    { params: { orgId, eventId: resolvedEventId } },
    { enabled: Boolean(resolvedEventId) },
  );
  const brandKitsQuery = useRouteQuery(api, brandKitsApi.list, {
    params: { orgId },
    query: { limit: 50 },
  });
  const assetsQuery = useRouteQuery(api, assetsApi.list, {
    params: { orgId },
    query: { limit: 100 },
  });

  const [name, setName] = useState('');
  const [skinKey, setSkinKey] = useState<string>('');
  const [draftConfig, setDraftConfig] = useState<Record<string, unknown>>({});
  const [initializedGameId, setInitializedGameId] = useState<string | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [surface, setSurface] = useState<'player' | 'screen'>('player');
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isDirty, setIsDirty] = useState(false);
  const [assetPickerState, setAssetPickerState] = useState<{
    open: boolean;
    slotKey?: string;
    currentValue: string;
    onChange: (assetId: string) => void;
  } | null>(null);

  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const form = useForm<UpdateGameValues>();

  useEffect(() => {
    const game = gameQuery.data;
    if (game && initializedGameId !== game.id) {
      setName(game.name);
      setSkinKey(game.skinKey ?? 'yep');
      setDraftConfig(game.draftConfig ?? {});
      setInitializedGameId(game.id);
      setIsDirty(false);
      setFieldErrors({});
    }
  }, [gameQuery.data, initializedGameId]);

  const template = useMemo(() => {
    const tplId = gameQuery.data?.templateId;
    if (!tplId) return undefined;
    return (templatesQuery.data?.items ?? []).find((item) => item.id === tplId);
  }, [gameQuery.data?.templateId, templatesQuery.data?.items]);

  const activeBrandKit = useMemo(() => {
    const kits = brandKitsQuery.data?.items ?? [];
    const targetId = eventQuery.data?.brandKitId;
    if (targetId) {
      const found = kits.find((k) => k.id === targetId);
      if (found) return found;
    }
    return kits[0];
  }, [brandKitsQuery.data?.items, eventQuery.data?.brandKitId]);

  const brandPalette = useMemo(() => {
    if (!activeBrandKit) return ['#F59E0B', '#EF4444', '#7C3AED', '#0F172A', '#FFFFFF'];
    const c = activeBrandKit.tokens.colors;
    return [c.primary, c.secondary, c.background, c.text].filter(
      (val): val is string => typeof val === 'string' && val.length > 0,
    );
  }, [activeBrandKit]);

  const resolvedAssets = useMemo(() => {
    const map: Record<string, string> = { ...(gameQuery.data?.assets ?? {}) };
    for (const a of assetsQuery.data?.items ?? []) {
      map[a.id] = a.variants.w640?.url ?? a.url;
    }
    return map;
  }, [gameQuery.data?.assets, assetsQuery.data?.items]);

  const brandPayload = useMemo(() => {
    if (!activeBrandKit) {
      return {
        colors: {
          primary: '#F59E0B',
          secondary: '#EF4444',
          accent: '#F59E0B',
          background: '#0F172A',
          text: '#F8FAFC',
        },
      };
    }
    const logoId = activeBrandKit.tokens.logoAssetId;
    return {
      logoUrl: logoId ? resolvedAssets[logoId] : undefined,
      colors: {
        primary: activeBrandKit.tokens.colors.primary,
        secondary: activeBrandKit.tokens.colors.secondary,
        accent: activeBrandKit.tokens.colors.secondary ?? activeBrandKit.tokens.colors.primary,
        background: activeBrandKit.tokens.colors.background,
        text: activeBrandKit.tokens.colors.text,
      },
      fontHeading: activeBrandKit.tokens.fontHeading,
      fontBody: activeBrandKit.tokens.fontBody,
    };
  }, [activeBrandKit, resolvedAssets]);

  const playOrigin = useMemo(() => resolvePlayOrigin(PLAY_URL), []);

  const postPreviewMessage = useCallback(() => {
    const win = iframeRef.current?.contentWindow;
    if (!win) return;
    win.postMessage(
      {
        type: 'playora:preview-update',
        config: draftConfig,
        skinKey: skinKey || undefined,
        brand: brandPayload,
        locale,
        surface,
        assets: resolvedAssets,
      },
      playOrigin,
    );
  }, [draftConfig, skinKey, brandPayload, locale, surface, resolvedAssets, playOrigin]);

  useEffect(() => {
    postPreviewMessage();
  }, [postPreviewMessage]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== playOrigin) return;
      if (
        event.data &&
        typeof event.data === 'object' &&
        (event.data as { type?: string }).type === 'playora:preview-ready'
      ) {
        postPreviewMessage();
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [postPreviewMessage, playOrigin]);

  const messageFor = (code: ErrorCode) => t(`errors.${code}`);

  const extractFieldErrors = (err: unknown): Record<string, string> => {
    const extracted: Record<string, string> = {};
    if (err instanceof ApiError && err.code === ErrorCode.VALIDATION_FAILED) {
      const details = err.details as
        | { body?: { fieldErrors?: Record<string, string[]> } }
        | undefined;
      const rawFieldErrors = details?.body?.fieldErrors ?? {};
      for (const [key, messages] of Object.entries(rawFieldErrors)) {
        const normalizedKey = key.startsWith('draftConfig.')
          ? key.slice('draftConfig.'.length)
          : key;
        if (messages[0]) {
          extracted[normalizedKey] = messages[0];
        }
      }
    }
    return extracted;
  };

  const updateMutation = useRouteMutation(api, gamesApi.update, {
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: routePrefix(gamesApi.get) });
      queryClient.invalidateQueries({ queryKey: routePrefix(gamesApi.list) });
      setDraftConfig(updated.draftConfig);
      setIsDirty(false);
      setFieldErrors({});
      toast.success(t('games.savedDraft'));
    },
    onError: (err) => {
      const mapped = extractFieldErrors(err);
      if (Object.keys(mapped).length > 0) {
        setFieldErrors(mapped);
      }
      if (!applyApiError(err, form.setError, messageFor) && Object.keys(mapped).length === 0) {
        toast.error(messageFor(err.code));
      }
    },
  });

  const publishMutation = useRouteMutation(api, gamesApi.publish, {
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: routePrefix(gamesApi.get) });
      queryClient.invalidateQueries({ queryKey: routePrefix(gamesApi.list) });
      queryClient.invalidateQueries({ queryKey: routePrefix(gamesApi.listVersions) });
      setPublishDialogOpen(false);
      toast.success(t('games.publishedToast', { version: res.version }));
    },
    onError: (err) => {
      toast.error(messageFor(err.code));
    },
  });

  async function handleSaveDraft() {
    setFieldErrors({});
    await updateMutation.mutateAsync({
      params: { orgId, gameId },
      body: {
        name: name.trim() || undefined,
        skinKey: skinKey || null,
        draftConfig,
      },
    });
  }

  async function handleConfirmPublish() {
    try {
      if (isDirty) {
        await updateMutation.mutateAsync({
          params: { orgId, gameId },
          body: {
            name: name.trim() || undefined,
            skinKey: skinKey || null,
            draftConfig,
          },
        });
      }
      await publishMutation.mutateAsync({
        params: { orgId, gameId },
      });
    } catch {
      // Errors are handled by the mutation callbacks
    }
  }

  const descriptor: FormDescriptor | undefined = useMemo(() => {
    if (!template) return undefined;
    return template.formDescriptor as unknown as FormDescriptor;
  }, [template]);

  const latestVersion = useMemo(() => {
    const list = versionsQuery.data?.items ?? [];
    return list[0];
  }, [versionsQuery.data?.items]);

  const showLockedWarning = useMemo(() => {
    if (!gameQuery.data?.currentVersion || !latestVersion || !descriptor) return false;
    return hasNonHotEditableChanges(descriptor.fields, draftConfig, latestVersion.config);
  }, [gameQuery.data?.currentVersion, latestVersion, descriptor, draftConfig]);

  const groupLabel = (grp: string): string => {
    switch (grp) {
      case 'gameplay':
        return t('games.groupGameplay');
      case 'appearance':
        return t('games.groupAppearance');
      case 'content':
        return t('games.groupContent');
      default:
        return grp;
    }
  };

  if (gameQuery.isPending || templatesQuery.isPending) {
    return (
      <div className="grid gap-4">
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-[600px] w-full" />
      </div>
    );
  }

  if (gameQuery.isError || !gameQuery.data || !template || !descriptor) {
    return <p className="text-destructive text-sm">{t('common.unknownError')}</p>;
  }

  const game = gameQuery.data;
  const currentVersionNumber = game.currentVersion;
  const nextVersionNumber = (currentVersionNumber ?? 0) + 1;
  const backHref = resolvedEventId
    ? (`/orgs/${orgId}/events/${resolvedEventId}/games` as Route)
    : (`/orgs/${orgId}/events` as Route);

  const previewSrc = `${PLAY_URL}/preview?template=${encodeURIComponent(game.templateId)}&surface=${surface}`;

  const readyAssets = (assetsQuery.data?.items ?? []).filter((a) => a.status === 'ready');

  return (
    <div className="flex flex-col gap-4" data-testid="game-editor">
      {/* Top Toolbar */}
      <div className="bg-card flex flex-wrap items-center justify-between gap-3 rounded-xl border p-3">
        <div className="flex flex-wrap items-center gap-3">
          <Button asChild variant="ghost" size="icon" aria-label={t('games.backToEvent')}>
            <Link href={backHref}>
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <Input
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setIsDirty(true);
            }}
            data-testid="editor-game-name"
            className="h-9 w-56 font-semibold"
            aria-label={t('games.gameNameLabel')}
          />
          <Select
            value={skinKey || template.skins[0]?.key || ''}
            onValueChange={(val) => {
              setSkinKey(val);
              setIsDirty(true);
            }}
          >
            <SelectTrigger
              className="h-9 w-44"
              data-testid="editor-skin-select"
              aria-label={t('games.skinLabel')}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {template.skins.map((s) => (
                <SelectItem key={s.key} value={s.key}>
                  {localizeText(s.name, locale)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {currentVersionNumber ? (
            <Badge variant="default" data-testid="published-version-badge">
              {t('games.publishedBadge', { version: currentVersionNumber })}
            </Badge>
          ) : (
            <Badge variant="secondary" data-testid="draft-status-badge">
              {t('games.statusDraft')}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            data-testid="save-draft-button"
            disabled={updateMutation.isPending}
            onClick={handleSaveDraft}
          >
            <Save className="size-4" />
            {t('games.saveDraft')}
          </Button>
          <Button
            type="button"
            data-testid="publish-button"
            disabled={publishMutation.isPending}
            onClick={() => setPublishDialogOpen(true)}
          >
            <Rocket className="size-4" />
            {t('games.publish')}
          </Button>
        </div>
      </div>

      {/* Warning banner when editing non-hotEditable fields after publish (docs/12 §4.3) */}
      {showLockedWarning && (
        <Alert variant="warning" data-testid="locked-field-warning">
          <AlertTriangle className="size-4" />
          <AlertDescription>{t('games.lockedFieldWarning')}</AlertDescription>
        </Alert>
      )}

      {/* 3-Column Editor Layout (docs/12 §4.1) */}
      <div className="grid gap-4 lg:grid-cols-[220px_1fr_380px]">
        {/* Left Column: Config Groups */}
        <Card className="h-fit" data-testid="editor-groups-column">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">{t('games.groupsTitle')}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-1">
            <Button
              type="button"
              variant={selectedGroup === 'all' ? 'secondary' : 'ghost'}
              size="sm"
              className="justify-start"
              data-testid="editor-group-all"
              onClick={() => setSelectedGroup('all')}
            >
              {t('games.groupAll')}
            </Button>
            {descriptor.groups.map((grp: string) => (
              <Button
                key={grp}
                type="button"
                variant={selectedGroup === grp ? 'secondary' : 'ghost'}
                size="sm"
                className="justify-start"
                data-testid={`editor-group-${grp}`}
                onClick={() => setSelectedGroup(grp)}
              >
                {groupLabel(grp)}
              </Button>
            ))}
          </CardContent>
        </Card>

        {/* Middle Column: Live Preview with Mobile / Screen 16:9 Toggle */}
        <Card className="flex flex-col" data-testid="editor-preview-column">
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
            <CardTitle className="text-sm font-semibold">{t('games.previewTitle')}</CardTitle>
            <div className="flex items-center gap-1 rounded-lg border p-1">
              <Button
                type="button"
                size="sm"
                variant={surface === 'player' ? 'default' : 'ghost'}
                data-testid="preview-toggle-mobile"
                onClick={() => setSurface('player')}
              >
                <Smartphone className="size-3.5" />
                {t('games.surfaceMobile')}
              </Button>
              <Button
                type="button"
                size="sm"
                variant={surface === 'screen' ? 'default' : 'ghost'}
                data-testid="preview-toggle-screen"
                onClick={() => setSurface('screen')}
              >
                <Monitor className="size-3.5" />
                {t('games.surfaceScreen')}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="flex flex-1 items-center justify-center rounded-b-xl bg-slate-950/40 p-4">
            <div
              data-testid="preview-frame-wrapper"
              data-surface={surface}
              className={
                surface === 'screen'
                  ? 'aspect-video w-full overflow-hidden rounded-xl border shadow-lg'
                  : 'aspect-[9/16] w-full max-w-[340px] overflow-hidden rounded-2xl border shadow-lg'
              }
            >
              <iframe
                ref={iframeRef}
                title={t('games.previewTitle')}
                src={previewSrc}
                data-testid="preview-iframe"
                onLoad={postPreviewMessage}
                className="h-full w-full border-0"
              />
            </div>
          </CardContent>
        </Card>

        {/* Right Column: Auto-Form */}
        <Card className="h-fit" data-testid="editor-properties-column">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">{t('games.propertiesTitle')}</CardTitle>
          </CardHeader>
          <CardContent>
            <AutoForm
              descriptor={descriptor}
              value={draftConfig}
              onChange={(next) => {
                setDraftConfig(next);
                setIsDirty(true);
              }}
              locale={locale}
              errors={fieldErrors}
              activeGroup={selectedGroup === 'all' ? undefined : selectedGroup}
              brandPalette={brandPalette}
              assetSlots={template.assetSlots}
              onPickAsset={({ field, value: currentVal, onChange }) =>
                setAssetPickerState({
                  open: true,
                  slotKey: field.slotKey,
                  currentValue: currentVal,
                  onChange,
                })
              }
            />
          </CardContent>
        </Card>
      </div>

      {/* Publish Confirmation Dialog */}
      <Dialog open={publishDialogOpen} onOpenChange={setPublishDialogOpen}>
        <DialogContent data-testid="publish-confirm-dialog">
          <DialogHeader>
            <DialogTitle>
              {t('games.publishConfirmTitle', { version: nextVersionNumber })}
            </DialogTitle>
            <DialogDescription>
              {t('games.publishConfirmDescription', { version: nextVersionNumber })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setPublishDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              type="button"
              data-testid="confirm-publish-button"
              disabled={publishMutation.isPending || updateMutation.isPending}
              onClick={handleConfirmPublish}
            >
              {t('games.publishConfirmAction', { version: nextVersionNumber })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Asset Picker Dialog */}
      <Dialog
        open={Boolean(assetPickerState?.open)}
        onOpenChange={(open) => {
          if (!open) setAssetPickerState(null);
        }}
      >
        <DialogContent data-testid="asset-picker-dialog">
          <DialogHeader>
            <DialogTitle>{t('games.pickAssetTitle')}</DialogTitle>
          </DialogHeader>
          {readyAssets.length === 0 ? (
            <p className="text-muted-foreground py-6 text-center text-sm">
              {t('games.pickAssetEmpty')}
            </p>
          ) : (
            <div className="grid max-h-80 grid-cols-2 gap-3 overflow-y-auto p-1 sm:grid-cols-3">
              {readyAssets.map((asset) => {
                const slot = template.assetSlots.find((s) => s.key === assetPickerState?.slotKey);
                if (slot && !slot.accept.includes(asset.kind)) {
                  return null;
                }
                const thumbUrl = asset.variants.w320?.url ?? asset.url;
                return (
                  <button
                    key={asset.id}
                    type="button"
                    data-testid={`asset-picker-item-${asset.id}`}
                    onClick={() => {
                      assetPickerState?.onChange(asset.id);
                      setAssetPickerState(null);
                    }}
                    className="hover:border-primary flex flex-col items-center gap-2 rounded-lg border p-2 text-xs transition"
                  >
                    {asset.kind === 'image' ? (
                      // biome-ignore lint/performance/noImgElement: presigned S3 asset URL
                      <img
                        src={thumbUrl}
                        alt={asset.id}
                        className="h-20 w-full rounded object-contain"
                      />
                    ) : (
                      <div className="bg-muted flex h-20 w-full items-center justify-center rounded font-mono">
                        {asset.kind}
                      </div>
                    )}
                    <span className="truncate font-mono text-[10px]">{asset.id.slice(-8)}</span>
                  </button>
                );
              })}
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setAssetPickerState(null)}>
              {t('common.cancel')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
