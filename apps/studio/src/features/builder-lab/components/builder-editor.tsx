'use client';

import { useRouteQuery } from '@playora/api-client/react';
import { meApi } from '@playora/contracts';
import { Button } from '@playora/ui/components/button';
import { Input } from '@playora/ui/components/input';
import { Separator } from '@playora/ui/components/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@playora/ui/components/tooltip';
import { cn } from '@playora/ui/lib/utils';
import {
  ArrowLeft,
  CloudAlert,
  CloudCheck,
  Gift,
  Loader2,
  LoaderCircle,
  PencilRuler,
  Play,
  Rocket,
  Zap,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Caption } from '@/components/caption';
import type { ScreenKey } from '@/features/canvas-editor/lib/model';
import { api } from '@/lib/api';
import { type Campaign, useCampaign } from '../api';
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
  const { draft, patchDraft, flush, saveState } = useCampaignDraft(orgId, query.data);
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
}: {
  orgId: string;
  initialMode: EditorMode;
  server: Campaign;
  draft: Campaign;
  update: (patch: DraftPatch) => void;
  flush: () => Promise<boolean>;
  saveState: SaveState;
}) {
  const t = useTranslations('builderLab.editor');
  const [mode, setMode] = useState<EditorMode>(initialMode);
  const [screen, setScreen] = useState<ScreenKey>('cover');
  const [publishing, setPublishing] = useState(false);
  const links = labLinks(orgId, draft.id);
  const myOrgs = useRouteQuery(api, meApi.orgs, {});
  const organizerName = myOrgs.data?.items.find((o) => o.id === orgId)?.name;

  const modeSwitch = (
    <div className="inline-flex rounded-full border bg-muted/50 p-0.5 text-xs">
      {[
        { value: 'quick' as const, label: t('modes.quick'), icon: Zap },
        { value: 'customize' as const, label: t('modes.customize'), icon: PencilRuler },
        { value: 'rules' as const, label: t('modes.rules'), icon: Gift },
      ].map((item) => {
        const Icon = item.icon;
        const isActive = mode === item.value;
        return (
          <button
            key={item.value}
            type="button"
            className={cn(
              'flex items-center gap-1.5 rounded-full px-3 py-1 font-medium transition-all',
              isActive
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
            onClick={() => setMode(item.value)}
          >
            <Icon className="size-3.5" />
            <span>{item.label}</span>
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="grid h-dvh grid-rows-[56px_auto_minmax(0,1fr)] lg:grid-rows-[56px_minmax(0,1fr)] bg-background">
      <header className="flex items-center justify-between gap-3 border-b bg-card px-3">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Link href={campaignRoutes(orgId).detail(draft.id)} aria-label={t('back')}>
                <Button variant="ghost" size="icon" className="size-8" tabIndex={-1}>
                  <ArrowLeft className="size-4" />
                </Button>
              </Link>
            </TooltipTrigger>
            <TooltipContent>{t('back')}</TooltipContent>
          </Tooltip>

          <Input
            aria-label={t('name')}
            value={draft.name}
            maxLength={80}
            onChange={(e) => update({ name: e.target.value })}
            onBlur={() => {
              if (!draft.name.trim()) update({ name: server.name.trim() || t('untitled') });
            }}
            className="h-8 max-w-[280px] border-none bg-transparent font-semibold shadow-none focus-visible:ring-1"
          />
          <SaveIndicator state={saveState} />
        </div>

        <div className="hidden lg:block">{modeSwitch}</div>

        <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
          <div className="hidden lg:flex items-center gap-2">
            <CampaignStatusTag campaign={server} />
            <Separator orientation="vertical" className="h-4" />
          </div>

          <a
            href={links.rehearsal}
            target="_blank"
            rel="noreferrer"
            onClick={() => void flush()}
            aria-label={t('rehearse')}
          >
            <Button variant="outline" size="sm" className="gap-1.5">
              <Play className="size-3.5" />
              <span className="hidden lg:inline">{t('rehearse')}</span>
            </Button>
          </a>

          <Button size="sm" className="gap-1.5 rounded-full" onClick={() => setPublishing(true)}>
            <Rocket className="size-3.5" />
            <span>{t('publish')}</span>
          </Button>
        </div>
      </header>

      <div className="flex items-center justify-between border-b bg-card px-3 py-2 lg:hidden">
        {modeSwitch}
        <CampaignStatusTag campaign={server} />
      </div>

      <div className="min-h-0">
        {mode === 'quick' && (
          <div className="h-full overflow-y-auto lg:grid lg:grid-cols-[minmax(360px,420px)_minmax(0,1fr)] lg:overflow-hidden">
            <aside className="border-r p-4 bg-card lg:min-h-0 lg:overflow-y-auto">
              <QuickEditPanel campaign={draft} onChange={update} onShowScreen={setScreen} />
            </aside>
            <main className="flex justify-center p-6 lg:min-h-0 lg:overflow-y-auto">
              <PhonePreview campaign={draft} screen={screen} onScreenChange={setScreen} />
            </main>
          </div>
        )}
        {mode === 'customize' && <CustomizeMode campaign={draft} onChange={update} />}
        {mode === 'rules' && (
          <div className="h-full overflow-y-auto lg:grid lg:grid-cols-[minmax(0,1fr)_390px] lg:overflow-hidden">
            <div className="p-4 lg:p-6 lg:min-h-0 lg:overflow-y-auto">
              <RulesPrizesPanel
                campaign={draft}
                organizerName={organizerName}
                onChange={(patch) => update(patch)}
              />
            </div>
            <aside className="hidden flex-col items-center justify-start border-l bg-card p-6 overflow-y-auto lg:flex">
              <div className="mb-4 text-center">
                <span className="block text-sm font-semibold">{t('liveGamePreview')}</span>
                <Caption>{t('liveGamePreviewHint')}</Caption>
              </div>
              <PhonePreview
                campaign={draft}
                screen="game"
                onScreenChange={setScreen}
                hideScreenSwitcher
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
        onGoTo={(next) => {
          setPublishing(false);
          setMode(next);
        }}
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
      className={cn(
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
