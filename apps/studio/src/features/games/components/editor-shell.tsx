'use client';

import { localize } from '@playora/contracts';
import type { AssetPickerRenderProps } from '@playora/ui/auto-form';
import { Alert, Button, Card, Empty, Input, Select, Skeleton, Tabs, Tag } from 'antd';
import { ArrowLeft, Rocket, Save } from 'lucide-react';
import type { Route } from 'next';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { QueryError } from '@/components/query-error';
import { useGameEditor } from '../lib/use-game-editor';
import { AssetPickerDialog } from './asset-picker-dialog';
import { ContentPanel } from './content-panel';
import { PreviewFrame } from './preview-frame';
import { PublishDialog } from './publish-dialog';
import { SkinPanel } from './skin-panel';
import { type TemplateEditorSurfaces, TemplatePanel } from './template-panel';
import { VersionList } from './version-list';

export function EditorShell({
  orgId,
  eventId,
  gameId,
  surfaces,
}: {
  orgId: string;
  eventId?: string;
  gameId: string;
  surfaces?: TemplateEditorSurfaces;
}) {
  const t = useTranslations();
  const router = useRouter();
  const editor = useGameEditor({ orgId, eventId, gameId });

  if (editor.isPending) {
    return (
      <div className="flex flex-col gap-4">
        <Card>
          <Skeleton active paragraph={{ rows: 1 }} />
        </Card>
        <Card>
          <Skeleton active paragraph={{ rows: 8 }} />
        </Card>
      </div>
    );
  }

  if (editor.isError || !editor.game || !editor.template || !editor.descriptor) {
    return <QueryError />;
  }

  const { game, template, descriptor } = editor;
  const currentVersionNumber = game.currentVersion;
  const nextVersionNumber = (currentVersionNumber ?? 0) + 1;
  const backHref = editor.resolvedEventId
    ? (`/orgs/${orgId}/events/${editor.resolvedEventId}/games` as Route)
    : (`/orgs/${orgId}/events` as Route);

  const handleOpenAssetPicker = ({ field, value: currentVal, onChange }: AssetPickerRenderProps) =>
    editor.setAssetPickerState({
      open: true,
      slotKey: field.slotKey,
      currentValue: currentVal,
      onChange,
    });

  return (
    <div className="flex flex-col gap-4" data-testid="game-editor">
      {/* Top Toolbar */}
      <Card size="small">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="text"
              icon={<ArrowLeft className="size-4" />}
              aria-label={t('games.backToEvent')}
              onClick={() => router.push(backHref)}
            />
            <Input
              value={editor.name}
              onChange={(e) => editor.setName(e.target.value)}
              data-testid="editor-game-name"
              className="!w-56"
              aria-label={t('games.gameNameLabel')}
            />
            <Select
              value={editor.skinKey || template.skins[0]?.key || ''}
              onChange={editor.setSkinKey}
              options={template.skins.map((s) => ({
                value: s.key,
                label: localize(s.name, editor.locale),
              }))}
              className="w-44"
              data-testid="editor-skin-select"
              aria-label={t('games.skinLabel')}
            />
            {currentVersionNumber ? (
              <Tag color="success" variant="filled" data-testid="published-version-badge">
                {t('games.publishedBadge', { version: currentVersionNumber })}
              </Tag>
            ) : (
              <Tag variant="filled" data-testid="draft-status-badge">
                {t('games.statusDraft')}
              </Tag>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              icon={<Save className="size-4" />}
              data-testid="save-draft-button"
              loading={editor.isSaving}
              onClick={editor.handleSaveDraft}
            >
              {t('games.saveDraft')}
            </Button>
            <Button
              type="primary"
              icon={<Rocket className="size-4" />}
              data-testid="publish-button"
              loading={editor.isPublishing}
              onClick={() => editor.setPublishDialogOpen(true)}
            >
              {t('games.publish')}
            </Button>
          </div>
        </div>
      </Card>

      {/* Warning banner when editing non-hotEditable fields after publish */}
      {editor.showLockedWarning && (
        <Alert
          type="warning"
          showIcon
          data-testid="locked-field-warning"
          title={t('games.lockedFieldWarning')}
        />
      )}

      {/* 2-Column Layout: Left Panels, Right Live Preview */}
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_400px]">
        <Card data-testid="editor-properties-column">
          <Tabs
            defaultActiveKey="template"
            destroyOnHidden
            items={[
              {
                key: 'template',
                label: <span data-testid="editor-tab-template">{t('games.panelTemplate')}</span>,
                children: (
                  <TemplatePanel
                    descriptor={descriptor}
                    value={editor.draftConfig}
                    onChange={editor.setDraftConfig}
                    locale={editor.locale}
                    errors={editor.fieldErrors}
                    brandPalette={editor.brandPalette}
                    assetSlots={template.assetSlots}
                    surfaces={surfaces}
                    onPickAsset={handleOpenAssetPicker}
                  />
                ),
              },
              {
                key: 'skin',
                label: <span data-testid="editor-tab-skin">{t('games.panelSkin')}</span>,
                children: (
                  <SkinPanel
                    skins={template.skins}
                    skinKey={editor.skinKey}
                    onChangeSkinKey={editor.setSkinKey}
                    activeBrandKit={editor.activeBrandKit}
                    brandPalette={editor.brandPalette}
                  />
                ),
              },
              {
                key: 'content',
                label: <span data-testid="editor-tab-content">{t('games.panelContent')}</span>,
                children: (
                  <ContentPanel
                    name={editor.name}
                    onChangeName={editor.setName}
                    descriptor={descriptor}
                    value={editor.draftConfig}
                    onChangeConfig={editor.setDraftConfig}
                    locale={editor.locale}
                    errors={editor.fieldErrors}
                    brandPalette={editor.brandPalette}
                    assetSlots={template.assetSlots}
                    onPickAsset={handleOpenAssetPicker}
                  />
                ),
              },
              {
                key: 'prizes',
                label: <span data-testid="editor-tab-prizes">{t('games.panelPrizes')}</span>,
                children: (
                  <div className="py-8" data-testid="editor-prizes-panel">
                    <Empty
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                      description={t('games.prizesPlaceholder')}
                    />
                  </div>
                ),
              },
              {
                key: 'versions',
                label: <span data-testid="editor-tab-versions">{t('games.panelVersions')}</span>,
                children: (
                  <VersionList
                    versions={editor.versions}
                    currentVersion={currentVersionNumber}
                    skins={template.skins}
                  />
                ),
              },
            ]}
          />
        </Card>

        <PreviewFrame
          templateId={game.templateId}
          config={editor.draftConfig}
          skinKey={editor.skinKey || undefined}
          brand={editor.brandPayload}
          locale={editor.locale}
          outcome={editor.previewOutcome}
          onChangeOutcome={editor.setPreviewOutcome}
          assets={editor.resolvedAssets}
        />
      </div>

      <PublishDialog
        open={editor.publishDialogOpen}
        nextVersionNumber={nextVersionNumber}
        isSubmitting={editor.isPublishing || editor.isSaving}
        onClose={() => editor.setPublishDialogOpen(false)}
        onConfirm={editor.handleConfirmPublish}
      />

      <AssetPickerDialog
        state={editor.assetPickerState}
        readyAssets={editor.readyAssets}
        assetSlots={template.assetSlots}
        onClose={() => editor.setAssetPickerState(null)}
      />
    </div>
  );
}
