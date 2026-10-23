'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { routePrefix, useRouteMutation, useRouteQuery } from '@playora/api-client/react';
import {
  CreateScreenBody,
  DEFAULT_SCREEN_LAYOUT,
  type ErrorCode,
  eventsApi,
  resolveScreenDimensions,
  type ScreenAspect,
  type ScreenIssued,
  type ScreenLayoutInput,
  type ScreenQrPosition,
  type ScreenQrSize,
  type ScreenSummary,
  screensApi,
  UpdateScreenBody,
} from '@playora/contracts';
import { Alert, AlertDescription, AlertTitle } from '@playora/ui/components/alert';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@playora/ui/components/table';
import { useQueryClient } from '@tanstack/react-query';
import {
  Ban,
  Copy,
  ExternalLink,
  KeyRound,
  Monitor,
  Pencil,
  Plus,
  QrCode,
  RefreshCw,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { type UseFormReturn, useForm } from 'react-hook-form';
import { toast } from 'sonner';
import type { z } from 'zod';
import { api } from '@/lib/api';
import { applyApiError } from '@/lib/form-errors';

type CreateValues = z.input<typeof CreateScreenBody>;
type UpdateValues = z.input<typeof UpdateScreenBody>;

const QR_CORNER_CLASSES: Record<Exclude<ScreenQrPosition, 'hidden'>, string> = {
  'top-left': 'top-1.5 left-1.5',
  'top-right': 'top-1.5 right-1.5',
  'bottom-left': 'bottom-1.5 left-1.5',
  'bottom-right': 'bottom-1.5 right-1.5',
};

const QR_SIZE_CLASSES: Record<ScreenQrSize, string> = {
  sm: 'size-3.5',
  md: 'size-5',
  lg: 'size-6',
};

function formatAspectLabel(layout: ScreenLayoutInput): string {
  const aspect = layout.aspect ?? '16:9';
  if (aspect === 'custom') {
    const w = layout.custom?.width ?? 1920;
    const h = layout.custom?.height ?? 1080;
    return `${w}×${h}`;
  }
  return aspect;
}

export function LayoutPreviewThumbnail({
  layout,
  eventName,
  compact = false,
}: {
  layout: ScreenLayoutInput;
  eventName: string;
  compact?: boolean;
}) {
  const t = useTranslations('screens');
  const aspect = layout.aspect ?? '16:9';
  const safeAreaPct = Math.min(20, Math.max(0, Number(layout.safeAreaPct ?? 5)));
  const qrPosition = layout.qrPosition ?? 'bottom-right';
  const qrSize = layout.qrSize ?? 'md';
  const showEventTitle = layout.showEventTitle ?? true;
  const dims = resolveScreenDimensions({ aspect, custom: layout.custom });
  const aspectLabel = formatAspectLabel(layout);

  return (
    <div className="grid gap-1.5">
      <div
        data-testid={compact ? undefined : 'screen-layout-preview'}
        data-aspect={aspectLabel}
        className={
          compact
            ? 'bg-muted/60 flex h-12 w-24 items-center justify-center overflow-hidden rounded-md border p-1'
            : 'bg-muted/60 flex h-44 w-full items-center justify-center overflow-hidden rounded-lg border p-3'
        }
      >
        <div
          style={{
            aspectRatio: `${dims.width} / ${dims.height}`,
            maxHeight: '100%',
            maxWidth: '100%',
          }}
          className="bg-card text-card-foreground relative h-full overflow-hidden rounded border shadow-xs"
        >
          <div
            style={{
              inset: `${safeAreaPct}%`,
            }}
            className="border-primary/40 absolute flex flex-col items-center justify-center rounded-xs border border-dashed p-1 text-center"
          >
            {showEventTitle && (
              <span
                className={
                  compact
                    ? 'truncate text-[8px] font-semibold'
                    : 'max-w-full truncate px-2 text-xs font-semibold'
                }
              >
                {eventName}
              </span>
            )}
            {qrPosition !== 'hidden' && (
              <div
                className={`bg-primary/15 text-primary absolute flex items-center justify-center rounded-xs border ${QR_CORNER_CLASSES[qrPosition]} ${
                  compact ? 'size-2.5' : QR_SIZE_CLASSES[qrSize]
                }`}
              >
                <QrCode className={compact ? 'size-2' : 'size-3'} />
              </div>
            )}
          </div>
        </div>
      </div>
      {!compact && (
        <p className="text-muted-foreground text-xs">
          {t('previewSafeAreaHint', { pct: safeAreaPct, aspect: aspectLabel })}
        </p>
      )}
    </div>
  );
}

function LayoutPresetFields({
  layout,
  onChange,
  eventName,
  idPrefix,
}: {
  layout: ScreenLayoutInput;
  onChange: (next: ScreenLayoutInput) => void;
  eventName: string;
  idPrefix: string;
}) {
  const t = useTranslations('screens');
  const aspect = layout.aspect ?? '16:9';
  const safeAreaPct = layout.safeAreaPct ?? 5;
  const qrPosition = layout.qrPosition ?? 'bottom-right';
  const qrSize = layout.qrSize ?? 'md';
  const showEventTitle = layout.showEventTitle ?? true;

  function updateLayout(patch: Partial<ScreenLayoutInput>) {
    const next: ScreenLayoutInput = { ...layout, ...patch };
    if (next.aspect === 'custom' && !next.custom) {
      next.custom = { width: 3840, height: 1080 };
    }
    onChange(next);
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <Label htmlFor={`${idPrefix}-aspect`}>{t('aspectLabel')}</Label>
          <Select value={aspect} onValueChange={(v) => updateLayout({ aspect: v as ScreenAspect })}>
            <SelectTrigger
              id={`${idPrefix}-aspect`}
              className="w-full"
              aria-label={t('aspectLabel')}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="16:9">{t('aspect16x9')}</SelectItem>
              <SelectItem value="32:9">{t('aspect32x9')}</SelectItem>
              <SelectItem value="9:16">{t('aspect9x16')}</SelectItem>
              <SelectItem value="custom">{t('aspectCustom')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor={`${idPrefix}-safe-area`}>{t('safeAreaLabel')}</Label>
          <Input
            id={`${idPrefix}-safe-area`}
            type="number"
            min={0}
            max={20}
            step={1}
            value={safeAreaPct}
            onChange={(e) => updateLayout({ safeAreaPct: Number(e.target.value) })}
          />
        </div>
      </div>

      {aspect === 'custom' && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label htmlFor={`${idPrefix}-custom-width`}>{t('customWidthLabel')}</Label>
            <Input
              id={`${idPrefix}-custom-width`}
              type="number"
              min={320}
              max={16384}
              value={layout.custom?.width ?? 3840}
              onChange={(e) =>
                updateLayout({
                  custom: {
                    width: Number(e.target.value),
                    height: layout.custom?.height ?? 1080,
                  },
                })
              }
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor={`${idPrefix}-custom-height`}>{t('customHeightLabel')}</Label>
            <Input
              id={`${idPrefix}-custom-height`}
              type="number"
              min={320}
              max={16384}
              value={layout.custom?.height ?? 1080}
              onChange={(e) =>
                updateLayout({
                  custom: {
                    width: layout.custom?.width ?? 3840,
                    height: Number(e.target.value),
                  },
                })
              }
            />
          </div>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="grid gap-1.5">
          <Label htmlFor={`${idPrefix}-qr-pos`}>{t('qrPositionLabel')}</Label>
          <Select
            value={qrPosition}
            onValueChange={(v) => updateLayout({ qrPosition: v as ScreenQrPosition })}
          >
            <SelectTrigger
              id={`${idPrefix}-qr-pos`}
              className="w-full"
              aria-label={t('qrPositionLabel')}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="bottom-right">{t('qrPosBottomRight')}</SelectItem>
              <SelectItem value="bottom-left">{t('qrPosBottomLeft')}</SelectItem>
              <SelectItem value="top-right">{t('qrPosTopRight')}</SelectItem>
              <SelectItem value="top-left">{t('qrPosTopLeft')}</SelectItem>
              <SelectItem value="hidden">{t('qrPosHidden')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor={`${idPrefix}-qr-size`}>{t('qrSizeLabel')}</Label>
          <Select
            value={qrSize}
            disabled={qrPosition === 'hidden'}
            onValueChange={(v) => updateLayout({ qrSize: v as ScreenQrSize })}
          >
            <SelectTrigger
              id={`${idPrefix}-qr-size`}
              className="w-full"
              aria-label={t('qrSizeLabel')}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sm">{t('qrSizeSm')}</SelectItem>
              <SelectItem value="md">{t('qrSizeMd')}</SelectItem>
              <SelectItem value="lg">{t('qrSizeLg')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor={`${idPrefix}-show-title`}>{t('showTitleLabel')}</Label>
          <Select
            value={showEventTitle ? 'yes' : 'no'}
            onValueChange={(v) => updateLayout({ showEventTitle: v === 'yes' })}
          >
            <SelectTrigger
              id={`${idPrefix}-show-title`}
              className="w-full"
              aria-label={t('showTitleLabel')}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="yes">{t('showTitleYes')}</SelectItem>
              <SelectItem value="no">{t('showTitleNo')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-1.5">
        <Label>{t('previewLabel')}</Label>
        <LayoutPreviewThumbnail layout={layout} eventName={eventName} />
      </div>
    </div>
  );
}

function EditScreenDialog({
  orgId,
  eventId,
  eventName,
  screen,
  onClose,
}: {
  orgId: string;
  eventId: string;
  eventName: string;
  screen: ScreenSummary | null;
  onClose: () => void;
}) {
  const t = useTranslations();
  const queryClient = useQueryClient();
  const form: UseFormReturn<UpdateValues> = useForm<UpdateValues>({
    resolver: zodResolver(UpdateScreenBody),
    defaultValues: {
      name: screen?.name ?? '',
      layout: screen?.layout ?? DEFAULT_SCREEN_LAYOUT,
    },
  });

  useEffect(() => {
    if (screen) {
      form.reset({
        name: screen.name,
        layout: screen.layout,
      });
    }
  }, [screen, form]);

  const messageFor = (code: ErrorCode) => t(`errors.${code}`);

  const updateMutation = useRouteMutation(api, screensApi.update, {
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: routePrefix(screensApi.list) });
      toast.success(t('screens.updatedToast', { name: updated.name }));
      onClose();
    },
    onError: (err) => {
      if (!applyApiError(err, form.setError, messageFor)) toast.error(messageFor(err.code));
    },
  });

  if (!screen) return null;
  const layout = form.watch('layout') ?? DEFAULT_SCREEN_LAYOUT;
  const { errors } = form.formState;

  return (
    <Dialog open={!!screen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{t('screens.editTitle')}</DialogTitle>
          <DialogDescription>{t('screens.editDescription')}</DialogDescription>
        </DialogHeader>
        <form
          className="grid gap-4"
          onSubmit={form.handleSubmit((body) =>
            updateMutation.mutate({
              params: { orgId, eventId, screenId: screen.id },
              body,
            }),
          )}
        >
          <div className="grid gap-1.5">
            <Label htmlFor="edit-screen-name">{t('screens.nameLabel')}</Label>
            <Input id="edit-screen-name" aria-invalid={!!errors.name} {...form.register('name')} />
            {errors.name && <p className="text-destructive text-sm">{errors.name.message}</p>}
          </div>

          <LayoutPresetFields
            idPrefix="edit-screen"
            layout={layout}
            eventName={eventName}
            onChange={(next) => form.setValue('layout', next, { shouldValidate: true })}
          />

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {t('common.save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ScreensTab({
  orgId,
  eventId,
  eventName,
}: {
  orgId: string;
  eventId: string;
  eventName?: string;
}) {
  const t = useTranslations();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [issuedScreen, setIssuedScreen] = useState<ScreenIssued | null>(null);
  const [editingScreen, setEditingScreen] = useState<ScreenSummary | null>(null);

  const eventQuery = useRouteQuery(api, eventsApi.get, { params: { orgId, eventId } });
  const screensQuery = useRouteQuery(api, screensApi.list, { params: { orgId, eventId } });
  const resolvedEventName = eventName ?? eventQuery.data?.name ?? '';

  const createForm = useForm<CreateValues>({
    resolver: zodResolver(CreateScreenBody),
    defaultValues: {
      name: '',
      layout: DEFAULT_SCREEN_LAYOUT,
    },
  });

  const messageFor = (code: ErrorCode) => t(`errors.${code}`);

  const createMutation = useRouteMutation(api, screensApi.create, {
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: routePrefix(screensApi.list) });
      setCreateOpen(false);
      setIssuedScreen(created);
      createForm.reset({ name: '', layout: DEFAULT_SCREEN_LAYOUT });
      toast.success(t('screens.createdToast', { name: created.name }));
    },
    onError: (err) => {
      if (!applyApiError(err, createForm.setError, messageFor)) toast.error(messageFor(err.code));
    },
  });

  const rotateMutation = useRouteMutation(api, screensApi.rotate, {
    onSuccess: (rotated) => {
      queryClient.invalidateQueries({ queryKey: routePrefix(screensApi.list) });
      setIssuedScreen(rotated);
      toast.success(t('screens.rotatedToast', { name: rotated.name }));
    },
    onError: (err) => toast.error(messageFor(err.code)),
  });

  const revokeMutation = useRouteMutation(api, screensApi.revoke, {
    onSuccess: (revoked) => {
      queryClient.invalidateQueries({ queryKey: routePrefix(screensApi.list) });
      toast.success(t('screens.revokedToast', { name: revoked.name }));
    },
    onError: (err) => toast.error(messageFor(err.code)),
  });

  async function copyText(value: string, toastMessage: string) {
    await navigator.clipboard.writeText(value);
    toast.success(toastMessage);
  }

  const createLayout = createForm.watch('layout') ?? DEFAULT_SCREEN_LAYOUT;
  const { errors: createErrors } = createForm.formState;

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4">
          <div className="grid gap-1">
            <CardTitle className="flex items-center gap-2">
              <Monitor className="size-4" />
              {t('screens.title')}
            </CardTitle>
            <CardDescription>{t('screens.description')}</CardDescription>
          </div>
          <Button type="button" onClick={() => setCreateOpen(true)}>
            <Plus />
            {t('screens.createButton')}
          </Button>
        </CardHeader>
        <CardContent>
          {screensQuery.isPending ? (
            <div className="grid gap-2">
              {[0, 1].map((i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : screensQuery.isError ? (
            <p className="text-destructive text-sm">{t('common.unknownError')}</p>
          ) : screensQuery.data.items.length === 0 ? (
            <p className="text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
              {t('screens.empty')}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('screens.colName')}</TableHead>
                  <TableHead>{t('screens.colLayout')}</TableHead>
                  <TableHead>{t('screens.colPreview')}</TableHead>
                  <TableHead>{t('screens.colStatus')}</TableHead>
                  <TableHead className="text-right">{t('screens.colActions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {screensQuery.data.items.map((screen) => {
                  const isRevoked = Boolean(screen.revokedAt);
                  const aspectText = formatAspectLabel(screen.layout);
                  return (
                    <TableRow key={screen.id}>
                      <TableCell className="font-medium">{screen.name}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Badge variant="outline">{aspectText}</Badge>
                          <span className="text-muted-foreground text-xs">
                            QR: {screen.layout.qrPosition} · {screen.layout.safeAreaPct}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <LayoutPreviewThumbnail
                          layout={screen.layout}
                          eventName={resolvedEventName}
                          compact
                        />
                      </TableCell>
                      <TableCell>
                        <Badge variant={isRevoked ? 'destructive' : 'secondary'}>
                          {isRevoked ? t('screens.statusRevoked') : t('screens.statusActive')}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingScreen(screen)}
                          >
                            <Pencil />
                            {t('screens.actionEdit')}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={rotateMutation.isPending}
                            onClick={() =>
                              rotateMutation.mutate({
                                params: { orgId, eventId, screenId: screen.id },
                              })
                            }
                          >
                            <RefreshCw />
                            {t('screens.actionRotate')}
                          </Button>
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            disabled={isRevoked || revokeMutation.isPending}
                            onClick={() =>
                              revokeMutation.mutate({
                                params: { orgId, eventId, screenId: screen.id },
                              })
                            }
                          >
                            <Ban />
                            {t('screens.actionRevoke')}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{t('screens.createTitle')}</DialogTitle>
            <DialogDescription>{t('screens.createDescription')}</DialogDescription>
          </DialogHeader>
          <form
            className="grid gap-4"
            onSubmit={createForm.handleSubmit((body) =>
              createMutation.mutate({ params: { orgId, eventId }, body }),
            )}
          >
            <div className="grid gap-1.5">
              <Label htmlFor="create-screen-name">{t('screens.nameLabel')}</Label>
              <Input
                id="create-screen-name"
                placeholder={t('screens.namePlaceholder')}
                aria-invalid={!!createErrors.name}
                {...createForm.register('name')}
              />
              {createErrors.name && (
                <p className="text-destructive text-sm">{createErrors.name.message}</p>
              )}
            </div>

            <LayoutPresetFields
              idPrefix="create-screen"
              layout={createLayout}
              eventName={resolvedEventName}
              onChange={(next) => createForm.setValue('layout', next, { shouldValidate: true })}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {t('common.create')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!issuedScreen} onOpenChange={(open) => !open && setIssuedScreen(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="size-4" />
              {t('screens.issuedTitle')}
            </DialogTitle>
            <DialogDescription>{issuedScreen?.name}</DialogDescription>
          </DialogHeader>

          {issuedScreen && (
            <div className="grid gap-4">
              <Alert variant="warning">
                <AlertTitle>{t('screens.issuedWarningTitle')}</AlertTitle>
                <AlertDescription>{t('screens.issuedWarningDescription')}</AlertDescription>
              </Alert>

              <div className="grid gap-1.5">
                <Label>{t('screens.launchUrlLabel')}</Label>
                <div className="flex items-center gap-2">
                  <Input
                    readOnly
                    value={issuedScreen.launchUrl}
                    data-testid="screen-launch-url"
                    className="font-mono text-xs"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => copyText(issuedScreen.launchUrl, t('screens.copiedLaunchUrl'))}
                  >
                    <Copy />
                    {t('screens.copyLaunchUrl')}
                  </Button>
                </div>
              </div>

              <div className="grid gap-1.5">
                <Label>{t('screens.rawKeyLabel')}</Label>
                <div className="flex items-center gap-2">
                  <Input
                    readOnly
                    value={issuedScreen.key}
                    data-testid="screen-raw-key"
                    className="font-mono text-xs"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => copyText(issuedScreen.key, t('screens.copiedKey'))}
                  >
                    <Copy />
                    {t('screens.copyKey')}
                  </Button>
                </div>
              </div>

              <DialogFooter className="flex flex-wrap justify-between gap-2 sm:justify-between">
                <Button asChild variant="secondary">
                  <a href={issuedScreen.launchUrl} target="_blank" rel="noreferrer">
                    <ExternalLink />
                    {t('screens.openScreen')}
                  </a>
                </Button>
                <Button type="button" onClick={() => setIssuedScreen(null)}>
                  {t('screens.doneButton')}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <EditScreenDialog
        orgId={orgId}
        eventId={eventId}
        eventName={resolvedEventName}
        screen={editingScreen}
        onClose={() => setEditingScreen(null)}
      />
    </div>
  );
}
