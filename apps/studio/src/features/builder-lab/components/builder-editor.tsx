'use client';

import {
  Button,
  Divider,
  Flex,
  Grid,
  Input,
  Result,
  Segmented,
  Spin,
  Tooltip,
  Typography,
  theme,
} from 'antd';
import {
  ArrowLeft,
  CloudAlert,
  CloudCheck,
  Gift,
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
  const { draft, update, flush, saveState } = useCampaignDraft(orgId, query.data);
  const home = campaignRoutes(orgId).list;

  if (query.isError) {
    return (
      <Flex className="h-dvh" align="center" justify="center">
        <Result
          status="404"
          title={t('notFound')}
          subTitle={t('notFoundHint')}
          extra={
            <Button type="primary" onClick={() => router.push(home)}>
              {t('backHome')}
            </Button>
          }
        />
      </Flex>
    );
  }
  if (!draft || !query.data) {
    return (
      <Flex className="h-dvh" align="center" justify="center">
        <Spin size="large" />
      </Flex>
    );
  }
  return (
    <EditorShell
      orgId={orgId}
      initialMode={initialMode}
      server={query.data}
      draft={draft}
      update={update}
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
  const { token } = theme.useToken();
  const wide = Grid.useBreakpoint().lg ?? true;
  const [mode, setMode] = useState<EditorMode>(initialMode);
  const [screen, setScreen] = useState<ScreenKey>('cover');
  const [publishing, setPublishing] = useState(false);
  const links = labLinks(orgId, draft.id);
  const border = `1px solid ${token.colorBorderSecondary}`;

  const modeSwitch = (
    <Segmented
      value={mode}
      onChange={(value) => setMode(value as EditorMode)}
      options={[
        { value: 'quick', label: t('modes.quick'), icon: <Zap className="size-3.5" /> },
        {
          value: 'customize',
          label: t('modes.customize'),
          icon: <PencilRuler className="size-3.5" />,
        },
        { value: 'rules', label: t('modes.rules'), icon: <Gift className="size-3.5" /> },
      ]}
    />
  );

  return (
    <div
      className="grid h-dvh"
      style={{
        gridTemplateRows: wide ? '56px minmax(0, 1fr)' : '56px auto minmax(0, 1fr)',
        background: token.colorBgLayout,
      }}
    >
      <header
        className="flex items-center justify-between gap-3 px-3"
        style={{ background: token.colorBgContainer, borderBottom: border }}
      >
        <Flex align="center" gap={8} className="min-w-0 flex-1">
          <Tooltip title={t('back')}>
            <Link href={campaignRoutes(orgId).detail(draft.id)} aria-label={t('back')}>
              <Button
                type="text"
                tabIndex={-1}
                aria-hidden
                icon={<ArrowLeft className="size-4" />}
              />
            </Link>
          </Tooltip>
          <Input
            variant="borderless"
            aria-label={t('name')}
            value={draft.name}
            maxLength={80}
            onChange={(e) => update({ name: e.target.value })}
            onBlur={() => {
              if (!draft.name.trim()) update({ name: server.name.trim() || t('untitled') });
            }}
            style={{ fontWeight: 600, maxWidth: 280 }}
          />
          <SaveIndicator state={saveState} />
        </Flex>

        {wide && modeSwitch}

        <Flex align="center" justify="end" gap={8} className="min-w-0 flex-1">
          {wide && <CampaignStatusTag campaign={server} />}
          {wide && <Divider orientation="vertical" />}
          <Button
            icon={<Play className="size-4" />}
            href={links.rehearsal}
            target="_blank"
            onClick={() => void flush()}
            aria-label={t('rehearse')}
          >
            {wide ? t('rehearse') : null}
          </Button>
          <Button
            type="primary"
            icon={<Rocket className="size-4" />}
            onClick={() => setPublishing(true)}
          >
            {t('publish')}
          </Button>
        </Flex>
      </header>

      {!wide && (
        <Flex
          align="center"
          justify="space-between"
          gap={8}
          wrap
          className="px-3 py-2"
          style={{ background: token.colorBgContainer, borderBottom: border }}
        >
          {modeSwitch}
          <CampaignStatusTag campaign={server} />
        </Flex>
      )}

      <div className="min-h-0">
        {mode === 'quick' && (
          <div className="h-full overflow-y-auto lg:grid lg:grid-cols-[minmax(360px,420px)_minmax(0,1fr)] lg:overflow-hidden">
            <aside
              className="p-4 lg:min-h-0 lg:overflow-y-auto"
              style={{ background: token.colorBgContainer, borderRight: wide ? border : undefined }}
            >
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
              <RulesPrizesPanel campaign={draft} onChange={(patch) => update(patch)} />
            </div>
            <aside
              className="hidden lg:flex flex-col items-center justify-start p-6 overflow-y-auto"
              style={{ background: token.colorBgContainer, borderLeft: wide ? border : undefined }}
            >
              <div className="mb-4 text-center">
                <Typography.Text strong className="block text-sm" style={{ fontWeight: 600 }}>
                  {t('liveGamePreview')}
                </Typography.Text>
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
  const { token } = theme.useToken();
  const busy = state === 'pending' || state === 'saving';
  const Icon = busy ? LoaderCircle : state === 'error' ? CloudAlert : CloudCheck;
  return (
    <Flex
      align="center"
      gap={4}
      className="shrink-0"
      role="status"
      style={{ color: state === 'error' ? token.colorError : token.colorTextTertiary }}
    >
      <Icon className={`size-3.5 ${busy ? 'animate-spin' : ''}`} />
      <Caption type={state === 'error' ? 'danger' : 'secondary'} className="hidden sm:inline">
        {busy ? t('saving') : state === 'error' ? t('error') : t('saved')}
      </Caption>
    </Flex>
  );
}
