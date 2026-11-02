'use client';

import { useRouteQuery } from '@playora/api-client/react';
import { meApi } from '@playora/contracts';
import { Button, Input, Separator, Tabs, Tooltip } from '@playora/ui/components';
import {
  ArrowLeft,
  CloudAlert,
  CloudCheck,
  Gift,
  Loader2,
  LoaderCircle,
  PencilRuler,
  Play,
  Redo2,
  Rocket,
  Undo2,
  Zap,
} from '@playora/ui/icons';
import { cx } from '@playora/ui/utils/cx';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { Caption } from '@/components/caption';
import type { ScreenKey } from '@/features/canvas-editor/lib/model';
import { api } from '@/lib/api';
import { type Campaign, useCampaign } from '../api';
import type { PreflightIssue } from '../lib/preflight';
import { campaignRoutes } from '../lib/routes';
import { CampaignStatusTag } from './editor/campaign-status-tag';
import { CustomizeMode } from './editor/customize-mode';
import { PhonePreview } from './editor/phone-preview';
import { type EditorMode, labLinks, PublishDialog } from './editor/publish-dialog';
import { type DraftPatch, type SaveState, useCampaignDraft } from './editor/use-campaign-draft';
import { QuickEditPanel } from './quick-edit/quick-edit-panel';
import { RulesPrizesPanel } from './rules-prizes-panel';

/** The three-mode builder (docs/product/specs/builder.md §4.2) over one campaign draft, autosaved. */
export function BuilderEditor({
  orgId,
  campaignId,
  initialMode = 'quick',
}: {
  orgId: string;
  campaignId: string;
  initialMode?: EditorMode;
}) {
  const t = useTranslations('builderLab.editor');
  const router = useRouter();
  const query = useCampaign(orgId, campaignId);
  const { draft, patchDraft, flush, saveState, undo, redo, canUndo, canRedo } = useCampaignDraft(
    orgId,
    query.data,
  );
  const home = campaignRoutes(orgId).list;

  if (query.isError) {
    return (
      <div className="flex h-dvh flex-col items-center justify-center p-8 text-center">
        <h3 className="text-lg font-bold">{t('notFound')}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{t('notFoundHint')}</p>
        <Button className="mt-4" onClick={() => router.push(home)}>
          {t('backHome')}
        </Button>
      </div>
    );
  }
  if (!draft || !query.data) {
    return (
      <div className="flex h-dvh items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }
  return (
    <EditorShell
      orgId={orgId}
      initialMode={initialMode}
      server={query.data}
      draft={draft}
      update={patchDraft}
      flush={flush}
      saveState={saveState}
      undo={undo}
      redo={redo}
      canUndo={canUndo}
      canRedo={canRedo}
    />
  );
}

function EditorShell({
  orgId,
  initialMode,
  server,
  draft,
  update,
  flush,
  saveState,
  undo,
  redo,
  canUndo,
  canRedo,
}: {
  orgId: string;
  initialMode: EditorMode;
  server: Campaign;
  draft: Campaign;
  update: (patch: DraftPatch) => void;
  flush: () => Promise<boolean>;
  saveState: SaveState;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}) {
  const t = useTranslations('builderLab.editor');
  const [mode, setMode] = useState<EditorMode>(initialMode);
  const [screen, setScreen] = useState<ScreenKey>('cover');
  const [publishing, setPublishing] = useState(false);
  const [focusTarget, setFocusTarget] = useState<{
    screen: ScreenKey;
    elementId?: string;
    nonce: number;
  } | null>(null);
  const [focusRulesStep, setFocusRulesStep] = useState<{
    step: 1 | 2 | 3 | 4;
    nonce: number;
  } | null>(null);
  const links = labLinks(orgId, draft.id, draft.slug);
  const myOrgs = useRouteQuery(api, meApi.orgs, {});
  const organizerName = myOrgs.data?.items.find((o) => o.id === orgId)?.name;

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey)) return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      ) {
        return;
      }
      const key = e.key.toLowerCase();
      if (key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if ((key === 'z' && e.shiftKey) || key === 'y') {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [undo, redo]);

  const handleGoTo = (issue: PreflightIssue) => {
    setPublishing(false);
    if (issue.where.area === 'screens') {
      const targetScreen = issue.where.screen ?? 'cover';
      setScreen(targetScreen);
      setMode('customize');
      setFocusTarget({
        screen: targetScreen,
        elementId: issue.where.elementId,
        nonce: Date.now(),
      });
      return;
    }
    setMode('rules');
    const step: 1 | 2 | 3 | 4 =
      issue.code === 'unselectedPromotionType' ? 4 : issue.where.area === 'prizes' ? 2 : 3;
    setFocusRulesStep({ step, nonce: Date.now() });
  };

  const modeSwitch = (
    <Tabs selectedKey={mode} onSelectionChange={(key) => setMode(key as EditorMode)}>
      <Tabs.ListContainer>
        <Tabs.List aria-label={t('name')}>
          {[
            { value: 'quick' as const, label: t('modes.quick'), icon: Zap },
            { value: 'customize' as const, label: t('modes.customize'), icon: PencilRuler },
            { value: 'rules' as const, label: t('modes.rules'), icon: Gift },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <Tabs.Tab
                key={item.value}
                id={item.value}
                className="ant-segmented-item flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium"
              >
                <Icon className="size-3.5" />
                <span>{item.label}</span>
                <Tabs.Indicator />
              </Tabs.Tab>
            );
          })}
        </Tabs.List>
      </Tabs.ListContainer>
    </Tabs>
  );

  return (
    <div className="grid h-dvh grid-rows-[56px_auto_minmax(0,1fr)] lg:grid-rows-[56px_minmax(0,1fr)] bg-background">
      <header className="flex items-center justify-between gap-3 border-b bg-surface px-3">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Tooltip delay={150}>
            <Tooltip.Trigger>
              <Link
                href={campaignRoutes(orgId).detail(draft.id)}
                aria-label={t('back')}
                className="inline-flex size-8 items-center justify-center rounded-lg text-button-ghost-foreground hover:bg-button-ghost-hover"
              >
                <ArrowLeft className="size-4" />
              </Link>
            </Tooltip.Trigger>
            <Tooltip.Content>{t('back')}</Tooltip.Content>
          </Tooltip>

          <Input
            aria-label={t('name')}
            value={draft.name}
            maxLength={80}
            onChange={(e) => update({ name: e.target.value })}
            onBlur={() => {
              if (!draft.name.trim()) update({ name: server.name.trim() || t('untitled') });
            }}
            className="max-w-[280px] font-semibold"
          />
          <SaveIndicator state={saveState} />
        </div>

        <div className="hidden lg:block">{modeSwitch}</div>

        <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
          <div className="flex items-center gap-1">
            <Tooltip delay={150}>
              <Tooltip.Trigger>
                <Button
                  type="button"
                  isIconOnly
                  variant="ghost"
                  size="sm"
                  isDisabled={!canUndo}
                  aria-label={t('undo')}
                  data-testid="builder-undo"
                  onPress={undo}
                  className="size-8"
                >
                  <Undo2 className="size-4" />
                </Button>
              </Tooltip.Trigger>
              <Tooltip.Content>{t('undo')}</Tooltip.Content>
            </Tooltip>
            <Tooltip delay={150}>
              <Tooltip.Trigger>
                <Button
                  type="button"
                  isIconOnly
                  variant="ghost"
                  size="sm"
                  isDisabled={!canRedo}
                  aria-label={t('redo')}
                  data-testid="builder-redo"
                  onPress={redo}
                  className="size-8"
                >
                  <Redo2 className="size-4" />
                </Button>
              </Tooltip.Trigger>
              <Tooltip.Content>{t('redo')}</Tooltip.Content>
            </Tooltip>
            <Separator orientation="vertical" className="mx-1 h-4" />
          </div>

          <div className="hidden lg:flex items-center gap-2">
            <CampaignStatusTag campaign={server} />
            <Separator orientation="vertical" className="h-4" />
          </div>

          <Button
            type="button"
            variant="secondary"
            size="sm"
            aria-label={t('rehearse')}
            data-testid="builder-rehearse"
            onPress={() => {
              const win = window.open('about:blank', '_blank');
              void flush().then(() => {
                if (win) {
                  win.location.href = links.rehearsal;
                } else {
                  window.location.href = links.rehearsal;
                }
              });
            }}
            className="h-8 gap-1.5 rounded-md text-xs"
          >
            <Play className="size-3.5" />
            <span className="hidden lg:inline">{t('rehearse')}</span>
          </Button>

          <Button
            size="sm"
            className="h-8 gap-1.5 rounded-md text-xs font-medium shadow-xs"
            onClick={() => setPublishing(true)}
          >
            <Rocket className="size-3.5" />
            <span>{t('publish')}</span>
          </Button>
        </div>
      </header>

      <div className="flex items-center justify-between border-b bg-surface px-3 py-2 lg:hidden">
        {modeSwitch}
        <CampaignStatusTag campaign={server} />
      </div>

      <div className="min-h-0">
        {mode === 'quick' && (
          <div className="h-full overflow-y-auto lg:grid lg:grid-cols-[minmax(360px,420px)_minmax(0,1fr)] lg:overflow-hidden">
            <aside className="border-r p-4 bg-surface lg:min-h-0 lg:overflow-y-auto">
              <QuickEditPanel campaign={draft} onChange={update} onShowScreen={setScreen} />
            </aside>
            <main className="flex justify-center p-6 lg:min-h-0 lg:overflow-y-auto">
              <PhonePreview
                campaign={draft}
                screen={screen}
                onScreenChange={setScreen}
                flush={flush}
              />
            </main>
          </div>
        )}
        {mode === 'customize' && (
          <CustomizeMode campaign={draft} onChange={update} focusTarget={focusTarget} />
        )}
        {mode === 'rules' && (
          <div className="h-full overflow-y-auto lg:grid lg:grid-cols-[minmax(0,1fr)_390px] lg:overflow-hidden">
            <div className="p-4 lg:p-6 lg:min-h-0 lg:overflow-y-auto">
              <RulesPrizesPanel
                campaign={draft}
                organizerName={organizerName}
                onChange={(patch) => update(patch)}
                focusStep={focusRulesStep}
              />
            </div>
            <aside className="hidden flex-col items-center justify-start border-l bg-surface p-6 overflow-y-auto lg:flex">
              <div className="mb-4 text-center">
                <span className="block text-sm font-semibold">{t('liveGamePreview')}</span>
                <Caption>{t('liveGamePreviewHint')}</Caption>
              </div>
              <PhonePreview
                campaign={draft}
                screen={screen}
                onScreenChange={setScreen}
                flush={flush}
              />
            </aside>
          </div>
        )}
      </div>

      <PublishDialog
        open={publishing}
        onClose={() => setPublishing(false)}
        orgId={orgId}
        campaign={draft}
        onFix={update}
        onGoTo={handleGoTo}
        flush={flush}
      />
    </div>
  );
}

function SaveIndicator({ state }: { state: SaveState }) {
  const t = useTranslations('builderLab.editor.save');
  const busy = state === 'pending' || state === 'saving';
  const Icon = busy ? LoaderCircle : state === 'error' ? CloudAlert : CloudCheck;
  return (
    <div
      className={cx(
        'flex items-center gap-1 shrink-0 text-xs',
        state === 'error' ? 'text-destructive' : 'text-muted-foreground',
      )}
      role="status"
    >
      <Icon className={`size-3.5 ${busy ? 'animate-spin' : ''}`} />
      <Caption type={state === 'error' ? 'danger' : 'secondary'} className="hidden sm:inline">
        {busy ? t('saving') : state === 'error' ? t('error') : t('saved')}
      </Caption>
    </div>
  );
}
