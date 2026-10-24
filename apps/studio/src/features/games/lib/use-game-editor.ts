'use client';

import type { ErrorCode } from '@playora/contracts';
import { hasNonHotEditableChanges, type PreviewOutcomePreset } from '@playora/game-sdk';
import type { FormDescriptor } from '@playora/ui/auto-form';
import { App } from 'antd';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';
import { useAssets } from '@/features/assets/api';
import { useBrandKits } from '@/features/brand-kits/api';
import { useEvent } from '@/features/events/api';
import { useGame, useGameVersions, usePublishGame, useTemplates, useUpdateGame } from '../api';
import {
  buildUpdateGamePayload,
  createInitialDraftState,
  editDraftConfig,
  editDraftName,
  editDraftSkinKey,
  extractDraftFieldErrors,
  type GameEditorDraftState,
  markDraftSaved,
  mergeResolvedAssets,
  resolveActiveBrandKit,
  resolveBrandPalette,
  resolveBrandPayload,
  syncDraftStateFromGame,
} from './builder-helpers';

export interface AssetPickerModalState {
  open: boolean;
  slotKey?: string;
  currentValue: string;
  onChange: (assetId: string) => void;
}

export function useGameEditor({
  orgId,
  eventId,
  gameId,
}: {
  orgId: string;
  eventId?: string;
  gameId: string;
}) {
  const t = useTranslations();
  const { message } = App.useApp();
  const rawLocale = useLocale();
  const locale: 'vi' | 'en' = rawLocale === 'en' ? 'en' : 'vi';

  const gameQuery = useGame(orgId, gameId);
  const versionsQuery = useGameVersions(orgId, gameId);
  const templatesQuery = useTemplates();

  const resolvedEventId = eventId ?? gameQuery.data?.eventId ?? '';

  const eventQuery = useEvent(orgId, resolvedEventId, {
    enabled: Boolean(resolvedEventId),
  });
  const brandKitsQuery = useBrandKits(orgId, 50);
  const assetsQuery = useAssets(orgId, { limit: 100 });

  const [draftState, setDraftState] = useState<GameEditorDraftState>(createInitialDraftState);
  const [previewOutcome, setPreviewOutcome] = useState<PreviewOutcomePreset>('win');
  const [publishDialogOpen, setPublishDialogOpen] = useState(false);
  const [assetPickerState, setAssetPickerState] = useState<AssetPickerModalState | null>(null);

  useEffect(() => {
    setDraftState((prev) => syncDraftStateFromGame(prev, gameQuery.data));
  }, [gameQuery.data]);

  const template = useMemo(() => {
    const tplId = gameQuery.data?.templateId;
    if (!tplId) return undefined;
    return (templatesQuery.data?.items ?? []).find((item) => item.id === tplId);
  }, [gameQuery.data?.templateId, templatesQuery.data?.items]);

  const descriptor: FormDescriptor | undefined = useMemo(() => {
    if (!template) return undefined;
    return template.formDescriptor as unknown as FormDescriptor;
  }, [template]);

  const activeBrandKit = useMemo(
    () => resolveActiveBrandKit(brandKitsQuery.data?.items ?? [], eventQuery.data?.brandKitId),
    [brandKitsQuery.data?.items, eventQuery.data?.brandKitId],
  );

  const brandPalette = useMemo(() => resolveBrandPalette(activeBrandKit), [activeBrandKit]);

  const resolvedAssets = useMemo(
    () => mergeResolvedAssets(gameQuery.data?.assets, assetsQuery.data?.items ?? []),
    [gameQuery.data?.assets, assetsQuery.data?.items],
  );

  const brandPayload = useMemo(
    () => resolveBrandPayload(activeBrandKit, resolvedAssets),
    [activeBrandKit, resolvedAssets],
  );

  const versions = versionsQuery.data?.items ?? [];
  const latestVersion = versions[0];

  const showLockedWarning = useMemo(() => {
    if (!gameQuery.data?.currentVersion || !latestVersion || !descriptor) return false;
    return hasNonHotEditableChanges(
      descriptor.fields,
      draftState.draftConfig,
      latestVersion.config,
    );
  }, [gameQuery.data?.currentVersion, latestVersion, descriptor, draftState.draftConfig]);

  const readyAssets = useMemo(
    () => (assetsQuery.data?.items ?? []).filter((a) => a.status === 'ready'),
    [assetsQuery.data?.items],
  );

  const messageFor = (code: ErrorCode) => t(`errors.${code}`);

  const updateMutation = useUpdateGame({
    onSuccess: (updated) => {
      setDraftState((prev) => markDraftSaved(prev, updated));
      message.success(t('games.savedDraft'));
    },
    onError: (err) => {
      const mapped = extractDraftFieldErrors(err);
      if (Object.keys(mapped).length > 0) {
        setDraftState((prev) => ({ ...prev, fieldErrors: mapped }));
      } else {
        message.error(messageFor(err.code));
      }
    },
  });

  const publishMutation = usePublishGame({
    onSuccess: (res) => {
      setPublishDialogOpen(false);
      message.success(t('games.publishedToast', { version: res.version }));
    },
    onError: (err) => {
      message.error(messageFor(err.code));
    },
  });

  async function handleSaveDraft() {
    setDraftState((prev) => ({ ...prev, fieldErrors: {} }));
    await updateMutation.mutateAsync({
      params: { orgId, gameId },
      body: buildUpdateGamePayload(draftState),
    });
  }

  async function handleConfirmPublish() {
    try {
      if (draftState.isDirty) {
        await updateMutation.mutateAsync({
          params: { orgId, gameId },
          body: buildUpdateGamePayload(draftState),
        });
      }
      await publishMutation.mutateAsync({
        params: { orgId, gameId },
      });
    } catch {
      // Handled by mutation callbacks
    }
  }

  return {
    locale,
    resolvedEventId,
    isPending: gameQuery.isPending || templatesQuery.isPending,
    isError: gameQuery.isError || !gameQuery.data || !template || !descriptor,
    game: gameQuery.data,
    template,
    descriptor,
    versions,
    latestVersion,
    activeBrandKit,
    brandPalette,
    brandPayload,
    resolvedAssets,
    readyAssets,
    name: draftState.name,
    setName: (name: string) => setDraftState((prev) => editDraftName(prev, name)),
    skinKey: draftState.skinKey,
    setSkinKey: (skinKey: string) => setDraftState((prev) => editDraftSkinKey(prev, skinKey)),
    draftConfig: draftState.draftConfig,
    setDraftConfig: (draftConfig: Record<string, unknown>) =>
      setDraftState((prev) => editDraftConfig(prev, draftConfig)),
    isDirty: draftState.isDirty,
    fieldErrors: draftState.fieldErrors,
    showLockedWarning,
    previewOutcome,
    setPreviewOutcome,
    publishDialogOpen,
    setPublishDialogOpen,
    assetPickerState,
    setAssetPickerState,
    isSaving: updateMutation.isPending,
    isPublishing: publishMutation.isPending,
    handleSaveDraft,
    handleConfirmPublish,
  };
}
