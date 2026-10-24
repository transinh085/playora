'use client';

import type { ErrorCode, ImportGuestsResult } from '@playora/contracts';
import { Alert, App, Card, Spin } from 'antd';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useEvent } from '@/features/events/api';
import {
  useClearGuests,
  useGuests,
  useGuestTeams,
  useReleaseGuestDevice,
  useRemoveGuest,
} from '../api';
import { GuestsTable } from './guests-table';
import { ALL_TEAMS_VALUE, GuestsToolbar } from './guests-toolbar';
import { ImportGuestsDialog } from './import-guests-dialog';
import { JoinQrCard } from './join-qr-card';

export function GuestsView({ orgId, eventId }: { orgId: string; eventId: string }) {
  const t = useTranslations();
  const { message } = App.useApp();

  const [search, setSearch] = useState('');
  const [teamFilter, setTeamFilter] = useState<string>(ALL_TEAMS_VALUE);
  const [importOpen, setImportOpen] = useState(false);
  const [lastImportResult, setLastImportResult] = useState<ImportGuestsResult | null>(null);

  const eventQuery = useEvent(orgId, eventId);
  const teamsQuery = useGuestTeams(orgId, eventId);
  const guestsQuery = useGuests(orgId, eventId, {
    limit: 50,
    search: search.trim() || undefined,
    team: teamFilter === ALL_TEAMS_VALUE ? undefined : teamFilter,
  });

  const messageFor = (code: ErrorCode) => t(`errors.${code}`);

  const removeMutation = useRemoveGuest({
    onSuccess: () => {
      message.success(t('guests.deletedOne'));
    },
    onError: (error) => message.error(messageFor(error.code)),
  });

  const releaseDeviceMutation = useReleaseGuestDevice({
    onSuccess: () => {
      message.success(t('guests.deviceReleased'));
    },
    onError: (error) => message.error(messageFor(error.code)),
  });

  const clearMutation = useClearGuests({
    onSuccess: (res) => {
      message.success(t('guests.clearedAll', { count: res.deleted }));
    },
    onError: (error) => message.error(messageFor(error.code)),
  });

  if (eventQuery.isPending) {
    return (
      <div className="flex justify-center py-16">
        <Spin size="large" />
      </div>
    );
  }

  if (eventQuery.isError) {
    return <p className="text-sm text-[var(--ant-color-error)]">{t('common.unknownError')}</p>;
  }

  const event = eventQuery.data;

  return (
    <div className="flex flex-col gap-6">
      <JoinQrCard slug={event.slug} />

      {lastImportResult && (
        <Alert
          type={lastImportResult.errors.length > 0 ? 'warning' : 'success'}
          closable
          onClose={() => setLastImportResult(null)}
          title={t('guests.importSummary', {
            inserted: lastImportResult.inserted,
            updated: lastImportResult.updated,
            skipped: lastImportResult.skipped,
          })}
        />
      )}

      <Card>
        <div className="flex flex-col gap-4">
          <GuestsToolbar
            orgId={orgId}
            eventId={eventId}
            search={search}
            onSearchChange={setSearch}
            teamFilter={teamFilter}
            onTeamFilterChange={setTeamFilter}
            teamsData={teamsQuery.data}
            onOpenImport={() => setImportOpen(true)}
            onClearAll={() => clearMutation.mutate({ params: { orgId, eventId } })}
            isClearing={clearMutation.isPending}
          />

          <GuestsTable
            guests={guestsQuery.data?.items ?? []}
            loading={guestsQuery.isPending}
            onReleaseDevice={(guestId) =>
              releaseDeviceMutation.mutate({ params: { orgId, eventId, guestId } })
            }
            onRemoveGuest={(guestId) =>
              removeMutation.mutate({ params: { orgId, eventId, guestId } })
            }
            isReleasing={releaseDeviceMutation.isPending}
            isRemoving={removeMutation.isPending}
          />
        </div>
      </Card>

      <ImportGuestsDialog
        orgId={orgId}
        eventId={eventId}
        open={importOpen}
        onOpenChange={setImportOpen}
        onImportSuccess={(res) => setLastImportResult(res)}
      />
    </div>
  );
}
