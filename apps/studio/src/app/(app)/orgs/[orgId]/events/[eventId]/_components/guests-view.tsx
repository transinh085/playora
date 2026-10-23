'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { routePrefix, useRouteMutation, useRouteQuery } from '@playora/api-client/react';
import {
  type ErrorCode,
  eventsApi,
  guestsApi,
  ImportGuestsBody,
  type ImportGuestsResult,
  type PreviewGuestsResponse,
  UNASSIGNED_TEAM_FILTER,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@playora/ui/components/tabs';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Trash2, Upload, Users } from 'lucide-react';
import type { Route } from 'next';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import type { z } from 'zod';
import { EventStatusBadge } from '@/components/event-status-badge';
import { api } from '@/lib/api';
import { applyApiError } from '@/lib/form-errors';
import { JoinQrCard } from './join-qr-card';
import { RandomTeamsDialog } from './random-teams-dialog';

type ImportValues = z.input<typeof ImportGuestsBody>;
const NO_TEAM_VALUE = '__none__';
const ALL_TEAMS_VALUE = '__all__';

export function GuestsView({ orgId, eventId }: { orgId: string; eventId: string }) {
  const t = useTranslations();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [teamFilter, setTeamFilter] = useState<string>(ALL_TEAMS_VALUE);
  const [preview, setPreview] = useState<PreviewGuestsResponse | null>(null);
  const [importResult, setImportResult] = useState<ImportGuestsResult | null>(null);

  const eventQuery = useRouteQuery(api, eventsApi.get, { params: { orgId, eventId } });
  const teamsQuery = useRouteQuery(api, guestsApi.listTeams, { params: { orgId, eventId } });
  const guestsQuery = useRouteQuery(api, guestsApi.list, {
    params: { orgId, eventId },
    query: {
      limit: 50,
      search: search.trim() || undefined,
      team: teamFilter === ALL_TEAMS_VALUE ? undefined : teamFilter,
    },
  });

  const form = useForm<ImportValues>({
    resolver: zodResolver(ImportGuestsBody),
    defaultValues: {
      fileName: '',
      content: '',
      encoding: 'text',
      mapping: { externalCode: 'externalCode', displayName: 'displayName', team: 'team' },
    },
  });

  const messageFor = (code: ErrorCode) => t(`errors.${code}`);

  const previewMutation = useRouteMutation(api, guestsApi.preview, {
    onSuccess: (res) => {
      setPreview(res);
      form.setValue('mapping', res.suggestedMapping, { shouldValidate: true });
    },
    onError: (error) => {
      toast.error(messageFor(error.code));
    },
  });

  const importMutation = useRouteMutation(api, guestsApi.import, {
    onSuccess: (res) => {
      setImportResult(res);
      queryClient.invalidateQueries({ queryKey: routePrefix(guestsApi.list) });
      queryClient.invalidateQueries({ queryKey: routePrefix(guestsApi.listTeams) });
      toast.success(
        t('guests.importSummary', {
          inserted: res.inserted,
          updated: res.updated,
          skipped: res.skipped,
        }),
      );
    },
    onError: (error) => {
      if (!applyApiError(error, form.setError, messageFor)) toast.error(messageFor(error.code));
    },
  });

  const removeMutation = useRouteMutation(api, guestsApi.remove, {
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: routePrefix(guestsApi.list) });
      queryClient.invalidateQueries({ queryKey: routePrefix(guestsApi.listTeams) });
      toast.success(t('guests.deletedOne'));
    },
    onError: (error) => toast.error(messageFor(error.code)),
  });

  const clearMutation = useRouteMutation(api, guestsApi.clear, {
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: routePrefix(guestsApi.list) });
      queryClient.invalidateQueries({ queryKey: routePrefix(guestsApi.listTeams) });
      toast.success(t('guests.clearedAll', { count: res.deleted }));
    },
    onError: (error) => toast.error(messageFor(error.code)),
  });

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportResult(null);
    const isXlsx = file.name.trim().toLowerCase().endsWith('.xlsx');
    const encoding = isXlsx ? 'base64' : 'text';
    const reader = new FileReader();
    reader.onload = () => {
      const raw = typeof reader.result === 'string' ? reader.result : '';
      const content = isXlsx ? raw.replace(/^data:[^,]*;base64,/, '') : raw;
      form.setValue('fileName', file.name, { shouldValidate: true });
      form.setValue('content', content, { shouldValidate: true });
      form.setValue('encoding', encoding, { shouldValidate: true });
      previewMutation.mutate({
        params: { orgId, eventId },
        body: { fileName: file.name, content, encoding },
      });
    };
    if (isXlsx) {
      reader.readAsDataURL(file);
    } else {
      reader.readAsText(file);
    }
  }

  if (eventQuery.isPending) {
    return (
      <div className="mx-auto grid max-w-5xl gap-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (eventQuery.isError) {
    return <p className="text-destructive text-sm">{t('common.unknownError')}</p>;
  }

  const event = eventQuery.data;
  const mapping = form.watch('mapping');
  const extraColumns = (preview?.headers ?? []).filter(
    (h) => h && h !== mapping?.externalCode && h !== mapping?.displayName && h !== mapping?.team,
  );

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon" aria-label={t('guests.backToEvents')}>
            <Link href={`/orgs/${orgId}/events` as Route}>
              <ArrowLeft />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold">{event.name}</h1>
              <EventStatusBadge status={event.status} />
            </div>
            <p className="text-muted-foreground text-sm">/{event.slug}</p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="guests">
        <TabsList>
          <TabsTrigger value="guests">
            <Users className="size-4" />
            {t('guests.tabGuests')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="guests" className="mt-4 grid gap-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="size-4" />
                  {t('guests.importTitle')}
                </CardTitle>
                <CardDescription>{t('guests.importDescription')}</CardDescription>
              </CardHeader>
              <CardContent>
                <form
                  className="grid gap-4"
                  onSubmit={form.handleSubmit((body) =>
                    importMutation.mutate({ params: { orgId, eventId }, body }),
                  )}
                >
                  <div className="grid gap-2">
                    <Label htmlFor="guest-file">{t('guests.selectFile')}</Label>
                    <Input
                      id="guest-file"
                      type="file"
                      accept=".csv,.xlsx"
                      onChange={handleFileChange}
                    />
                  </div>

                  {preview && (
                    <div className="grid gap-3 rounded-lg border p-3">
                      <div className="grid gap-3 sm:grid-cols-3">
                        <div className="grid gap-1.5">
                          <Label htmlFor="map-code">{t('guests.mapExternalCode')}</Label>
                          <Select
                            value={mapping?.externalCode ?? ''}
                            onValueChange={(v) =>
                              form.setValue('mapping.externalCode', v, { shouldValidate: true })
                            }
                          >
                            <SelectTrigger id="map-code" className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {preview.headers.map((h) => (
                                <SelectItem key={h} value={h}>
                                  {h}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="grid gap-1.5">
                          <Label htmlFor="map-name">{t('guests.mapDisplayName')}</Label>
                          <Select
                            value={mapping?.displayName ?? ''}
                            onValueChange={(v) =>
                              form.setValue('mapping.displayName', v, { shouldValidate: true })
                            }
                          >
                            <SelectTrigger id="map-name" className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {preview.headers.map((h) => (
                                <SelectItem key={h} value={h}>
                                  {h}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="grid gap-1.5">
                          <Label htmlFor="map-team">{t('guests.mapTeam')}</Label>
                          <Select
                            value={mapping?.team || NO_TEAM_VALUE}
                            onValueChange={(v) =>
                              form.setValue('mapping.team', v === NO_TEAM_VALUE ? undefined : v, {
                                shouldValidate: true,
                              })
                            }
                          >
                            <SelectTrigger id="map-team" className="w-full">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={NO_TEAM_VALUE}>
                                {t('guests.noTeamColumn')}
                              </SelectItem>
                              {preview.headers.map((h) => (
                                <SelectItem key={h} value={h}>
                                  {h}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {extraColumns.length > 0 && (
                        <p className="text-muted-foreground text-xs">
                          {t('guests.extraColumnsHint', { columns: extraColumns.join(', ') })}
                        </p>
                      )}

                      <div className="grid gap-1.5">
                        <p className="text-xs font-medium">
                          {t('guests.previewTitle', { count: preview.totalRows })}
                        </p>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              {preview.headers.map((h) => (
                                <TableHead key={h}>{h}</TableHead>
                              ))}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {preview.sampleRows.map((row, idx) => (
                              // biome-ignore lint/suspicious/noArrayIndexKey: Sample preview rows have no DB id yet
                              <TableRow key={idx}>
                                {preview.headers.map((h) => (
                                  <TableCell key={h} className="text-xs">
                                    {row[h] ?? ''}
                                  </TableCell>
                                ))}
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}

                  <Button
                    type="submit"
                    disabled={!form.watch('content') || importMutation.isPending}
                  >
                    <Upload />
                    {t('guests.importSubmit')}
                  </Button>
                </form>

                {importResult && (
                  <Alert
                    className="mt-4"
                    variant={importResult.errors.length > 0 ? 'warning' : 'success'}
                  >
                    <AlertTitle>
                      {t('guests.importSummary', {
                        inserted: importResult.inserted,
                        updated: importResult.updated,
                        skipped: importResult.skipped,
                      })}
                    </AlertTitle>
                    {importResult.errors.length > 0 && (
                      <AlertDescription>
                        <ul className="list-disc pl-4 text-xs">
                          {importResult.errors.slice(0, 10).map((err) => (
                            <li key={err.row}>
                              {t('guests.rowErrorItem', { row: err.row, message: err.message })}
                            </li>
                          ))}
                        </ul>
                      </AlertDescription>
                    )}
                  </Alert>
                )}
              </CardContent>
            </Card>

            <JoinQrCard slug={event.slug} />
          </div>

          <Card>
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4">
              <div className="grid gap-1">
                <CardTitle>{t('guests.teamsTitle')}</CardTitle>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <Badge variant="secondary">
                    {t('guests.totalGuests', { count: teamsQuery.data?.totalCount ?? 0 })}
                  </Badge>
                  <Badge variant="outline">
                    {t('guests.unassigned')}: {teamsQuery.data?.unassignedCount ?? 0}
                  </Badge>
                  {teamsQuery.data?.items.map((item) => (
                    <Badge key={item.team} variant="default">
                      {item.team}: {item.count}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <RandomTeamsDialog orgId={orgId} eventId={eventId} />
                {(teamsQuery.data?.totalCount ?? 0) > 0 && (
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={clearMutation.isPending}
                    onClick={() => clearMutation.mutate({ params: { orgId, eventId } })}
                  >
                    <Trash2 />
                    {t('guests.clearAll')}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <Input
                  className="max-w-xs"
                  placeholder={t('guests.searchPlaceholder')}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <Select value={teamFilter} onValueChange={setTeamFilter}>
                  <SelectTrigger className="w-48" aria-label={t('guests.team')}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_TEAMS_VALUE}>{t('guests.allTeams')}</SelectItem>
                    <SelectItem value={UNASSIGNED_TEAM_FILTER}>{t('guests.unassigned')}</SelectItem>
                    {teamsQuery.data?.items.map((item) => (
                      <SelectItem key={item.team} value={item.team}>
                        {item.team} ({item.count})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {guestsQuery.isPending ? (
                <div className="grid gap-2">
                  {[0, 1, 2].map((i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : guestsQuery.isError ? (
                <p className="text-destructive text-sm">{t('common.unknownError')}</p>
              ) : guestsQuery.data.items.length === 0 ? (
                <p className="text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
                  {t('guests.empty')}
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('guests.code')}</TableHead>
                      <TableHead>{t('guests.displayName')}</TableHead>
                      <TableHead>{t('guests.team')}</TableHead>
                      <TableHead>{t('guests.attributes')}</TableHead>
                      <TableHead className="w-16 text-right">{t('guests.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {guestsQuery.data.items.map((guest) => (
                      <TableRow key={guest.id}>
                        <TableCell className="font-mono text-xs">{guest.externalCode}</TableCell>
                        <TableCell className="font-medium">{guest.displayName}</TableCell>
                        <TableCell>
                          {guest.team ? (
                            <Badge variant="secondary">{guest.team}</Badge>
                          ) : (
                            <span className="text-muted-foreground text-xs">
                              {t('guests.unassigned')}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          {Object.entries(guest.attributes)
                            .map(([k, v]) => `${k}: ${v}`)
                            .join(' · ') || '—'}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={t('guests.deleteGuest')}
                            disabled={removeMutation.isPending}
                            onClick={() =>
                              removeMutation.mutate({
                                params: { orgId, eventId, guestId: guest.id },
                              })
                            }
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
