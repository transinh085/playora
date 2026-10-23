'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { routePrefix, useRouteMutation, useRouteQuery } from '@playora/api-client/react';
import {
  assetsApi,
  BRAND_FONTS,
  type BrandFont,
  type BrandKitSummary,
  brandKitsApi,
  CreateBrandKitBody,
  type ErrorCode,
} from '@playora/contracts';
import { Badge } from '@playora/ui/components/badge';
import { Button } from '@playora/ui/components/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@playora/ui/components/card';
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
import { GameButton } from '@playora/ui/game/game-button';
import { GameRoot } from '@playora/ui/game/game-root';
import { useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import type { z } from 'zod';
import { api } from '@/lib/api';
import { applyApiError } from '@/lib/form-errors';

type Values = z.input<typeof CreateBrandKitBody>;

const NONE_VALUE = '__none__';

const DEFAULT_VALUES: Values = {
  name: '',
  tokens: {
    colors: {
      primary: '#7c3aed',
      secondary: '#f59e0b',
      background: '#0f0a1e',
      text: '#ffffff',
    },
    fontHeading: 'Unbounded',
    fontBody: 'Be Vietnam Pro',
    logoAssetId: null,
    backgroundAssetId: null,
    musicAssetId: null,
  },
};

export function BrandKitsManager({ orgId }: { orgId: string }) {
  const t = useTranslations();
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);

  const kitsQuery = useRouteQuery(api, brandKitsApi.list, {
    params: { orgId },
    query: { limit: 50 },
  });
  const assetsQuery = useRouteQuery(api, assetsApi.list, {
    params: { orgId },
    query: { limit: 100 },
  });

  const form = useForm<Values>({
    resolver: zodResolver(CreateBrandKitBody),
    defaultValues: DEFAULT_VALUES,
  });

  const messageFor = (code: ErrorCode) => t(`errors.${code}`);

  const create = useRouteMutation(api, brandKitsApi.create, {
    onSuccess: (kit) => {
      queryClient.invalidateQueries({ queryKey: routePrefix(brandKitsApi.list) });
      toast.success(t('brandKits.created', { name: kit.name }));
      form.reset(DEFAULT_VALUES);
    },
    onError: (err) => {
      if (!applyApiError(err, form.setError, messageFor)) toast.error(messageFor(err.code));
    },
  });

  const update = useRouteMutation(api, brandKitsApi.update, {
    onSuccess: (kit) => {
      queryClient.invalidateQueries({ queryKey: routePrefix(brandKitsApi.list) });
      toast.success(t('brandKits.updated', { name: kit.name }));
      setEditingId(null);
      form.reset(DEFAULT_VALUES);
    },
    onError: (err) => {
      if (!applyApiError(err, form.setError, messageFor)) toast.error(messageFor(err.code));
    },
  });

  const remove = useRouteMutation(api, brandKitsApi.remove, {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: routePrefix(brandKitsApi.list) });
      toast.success(t('brandKits.deleted'));
      if (editingId) {
        setEditingId(null);
        form.reset(DEFAULT_VALUES);
      }
    },
    onError: (err) => toast.error(messageFor(err.code)),
  });

  function startEdit(kit: BrandKitSummary) {
    setEditingId(kit.id);
    form.reset({
      name: kit.name,
      tokens: {
        colors: {
          primary: kit.tokens.colors.primary,
          secondary: kit.tokens.colors.secondary ?? '#f59e0b',
          background: kit.tokens.colors.background,
          text: kit.tokens.colors.text,
        },
        fontHeading: kit.tokens.fontHeading ?? 'Unbounded',
        fontBody: kit.tokens.fontBody ?? 'Be Vietnam Pro',
        logoAssetId: kit.tokens.logoAssetId ?? null,
        backgroundAssetId: kit.tokens.backgroundAssetId ?? null,
        musicAssetId: kit.tokens.musicAssetId ?? null,
      },
    });
  }

  function resetToNew() {
    setEditingId(null);
    form.reset(DEFAULT_VALUES);
  }

  const watched = form.watch();
  const assets = assetsQuery.data?.items ?? [];
  const imageAssets = assets.filter((a) => a.kind === 'image');
  const audioAssets = assets.filter((a) => a.kind === 'audio');
  const logoAsset = imageAssets.find((a) => a.id === watched.tokens?.logoAssetId);
  const bgAsset = imageAssets.find((a) => a.id === watched.tokens?.backgroundAssetId);

  const { errors } = form.formState;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>{editingId ? t('brandKits.edit') : t('brandKits.new')}</CardTitle>
            {editingId && (
              <Button variant="ghost" size="sm" onClick={resetToNew}>
                <Plus />
                {t('brandKits.new')}
              </Button>
            )}
          </CardHeader>
          <CardContent>
            <form
              className="grid gap-4"
              onSubmit={form.handleSubmit((body) => {
                if (editingId) {
                  update.mutate({ params: { orgId, brandKitId: editingId }, body });
                } else {
                  create.mutate({ params: { orgId }, body });
                }
              })}
            >
              <div className="grid gap-2">
                <Label htmlFor="kit-name">{t('brandKits.name')}</Label>
                <Input id="kit-name" aria-invalid={!!errors.name} {...form.register('name')} />
                {errors.name && <p className="text-destructive text-sm">{errors.name.message}</p>}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {(
                  [
                    ['primary', 'brandKits.primaryColor'],
                    ['secondary', 'brandKits.secondaryColor'],
                    ['background', 'brandKits.backgroundColor'],
                    ['text', 'brandKits.textColor'],
                  ] as const
                ).map(([field, labelKey]) => {
                  const value = watched.tokens?.colors?.[field] ?? '#000000';
                  return (
                    <div key={field} className="grid gap-2">
                      <Label htmlFor={`color-${field}`}>{t(labelKey)}</Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          aria-label={t(labelKey)}
                          value={/^#[0-9a-fA-F]{6}$/.test(value) ? value : '#000000'}
                          onChange={(e) =>
                            form.setValue(`tokens.colors.${field}`, e.target.value, {
                              shouldValidate: true,
                            })
                          }
                          className="border-input h-9 w-12 cursor-pointer rounded-md border bg-transparent p-1"
                        />
                        <Input id={`color-${field}`} {...form.register(`tokens.colors.${field}`)} />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label>{t('brandKits.fontHeading')}</Label>
                  <Select
                    value={watched.tokens?.fontHeading ?? 'Unbounded'}
                    onValueChange={(v) => form.setValue('tokens.fontHeading', v as BrandFont)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {BRAND_FONTS.map((f) => (
                        <SelectItem key={f} value={f}>
                          {f}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label>{t('brandKits.fontBody')}</Label>
                  <Select
                    value={watched.tokens?.fontBody ?? 'Be Vietnam Pro'}
                    onValueChange={(v) => form.setValue('tokens.fontBody', v as BrandFont)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {BRAND_FONTS.map((f) => (
                        <SelectItem key={f} value={f}>
                          {f}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="grid gap-2">
                  <Label>{t('brandKits.logoAsset')}</Label>
                  <Select
                    value={watched.tokens?.logoAssetId ?? NONE_VALUE}
                    onValueChange={(v) =>
                      form.setValue('tokens.logoAssetId', v === NONE_VALUE ? null : v)
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE_VALUE}>{t('brandKits.noAsset')}</SelectItem>
                      {imageAssets.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.mime} ({a.id.slice(-6)})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label>{t('brandKits.backgroundAsset')}</Label>
                  <Select
                    value={watched.tokens?.backgroundAssetId ?? NONE_VALUE}
                    onValueChange={(v) =>
                      form.setValue('tokens.backgroundAssetId', v === NONE_VALUE ? null : v)
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE_VALUE}>{t('brandKits.noAsset')}</SelectItem>
                      {imageAssets.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.mime} ({a.id.slice(-6)})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label>{t('brandKits.musicAsset')}</Label>
                  <Select
                    value={watched.tokens?.musicAssetId ?? NONE_VALUE}
                    onValueChange={(v) =>
                      form.setValue('tokens.musicAssetId', v === NONE_VALUE ? null : v)
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE_VALUE}>{t('brandKits.noAsset')}</SelectItem>
                      {audioAssets.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.mime} ({a.id.slice(-6)})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                {editingId && (
                  <Button type="button" variant="outline" onClick={resetToNew}>
                    {t('common.cancel')}
                  </Button>
                )}
                <Button type="submit" disabled={create.isPending || update.isPending}>
                  {editingId ? t('common.save') : t('common.create')}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {kitsQuery.isPending ? (
          <div className="grid gap-3">
            {[0, 1].map((i) => (
              <Skeleton key={i} className="h-20 w-full rounded-xl" />
            ))}
          </div>
        ) : kitsQuery.isError ? (
          <div className="flex items-center gap-3 text-sm">
            <span className="text-destructive">{t('common.unknownError')}</span>
            <Button variant="outline" size="sm" onClick={() => kitsQuery.refetch()}>
              {t('common.retry')}
            </Button>
          </div>
        ) : kitsQuery.data.items.length === 0 ? (
          <p className="text-muted-foreground rounded-lg border border-dashed p-10 text-center">
            {t('brandKits.empty')}
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {kitsQuery.data.items.map((kit) => (
              <Card key={kit.id}>
                <CardHeader className="flex-row items-center justify-between pb-2">
                  <CardTitle className="text-base">{kit.name}</CardTitle>
                  <div className="flex items-center gap-1.5">
                    {(['primary', 'secondary', 'background', 'text'] as const).map((slot) => {
                      const color = kit.tokens.colors[slot];
                      if (!color) return null;
                      return (
                        <span
                          key={slot}
                          className="border-border size-5 rounded-full border"
                          style={{ backgroundColor: color }}
                        />
                      );
                    })}
                  </div>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-1.5">
                  {kit.tokens.fontHeading && (
                    <Badge variant="secondary">{kit.tokens.fontHeading}</Badge>
                  )}
                  {kit.tokens.fontBody && <Badge variant="outline">{kit.tokens.fontBody}</Badge>}
                </CardContent>
                <CardFooter className="justify-end gap-2 border-t pt-3">
                  <Button variant="outline" size="sm" onClick={() => startEdit(kit)}>
                    <Pencil className="size-3.5" />
                    {t('brandKits.edit')}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={t('common.delete')}
                    disabled={remove.isPending}
                    onClick={() => remove.mutate({ params: { orgId, brandKitId: kit.id } })}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Card className="h-fit">
        <CardHeader>
          <CardTitle className="text-base">{t('brandKits.previewTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          <GameRoot
            brand={{
              primary: watched.tokens?.colors?.primary,
              accent: watched.tokens?.colors?.secondary,
              background: watched.tokens?.colors?.background,
              text: watched.tokens?.colors?.text,
              fontDisplay: watched.tokens?.fontHeading,
            }}
            style={
              bgAsset
                ? {
                    backgroundImage: `url(${bgAsset.variants.w1280?.url ?? bgAsset.url})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }
                : undefined
            }
            className="flex min-h-80 flex-col items-center justify-between rounded-xl p-6 text-center"
          >
            <div className="flex flex-col items-center gap-3">
              {logoAsset && (
                // biome-ignore lint/performance/noImgElement: presigned S3 URL
                <img
                  src={logoAsset.variants.w320?.url ?? logoAsset.url}
                  alt="Logo"
                  className="h-12 w-auto object-contain"
                />
              )}
              <Badge variant="outline" className="border-game-border text-game-fg">
                {watched.name || 'Playora'}
              </Badge>
            </div>

            <div className="grid gap-2">
              <h3
                className="text-game-fg text-xl font-bold"
                style={{ fontFamily: watched.tokens?.fontHeading }}
              >
                {t('brandKits.previewHeading')}
              </h3>
              <p
                className="text-game-muted text-sm"
                style={{ fontFamily: watched.tokens?.fontBody }}
              >
                {t('brandKits.previewSubtitle')}
              </p>
            </div>

            <GameButton variant="primary" size="md" type="button" className="w-full">
              {t('brandKits.previewCta')}
            </GameButton>
          </GameRoot>
        </CardContent>
      </Card>
    </div>
  );
}
