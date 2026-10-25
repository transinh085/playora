'use client';

import {
  App,
  Button,
  Divider,
  Flex,
  Popconfirm,
  Segmented,
  Tag,
  Tooltip,
  Typography,
  theme,
} from 'antd';
import {
  ArrowLeft,
  Braces,
  Maximize,
  Minus,
  Pencil,
  Play,
  Plus,
  Redo2,
  RotateCcw,
  Undo2,
} from 'lucide-react';
import type { Route } from 'next';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useLayoutEffect, useReducer, useRef, useState } from 'react';
import { LogoMark } from '@/components/logo';
import { createEditorState, currentScreen, editorReducer } from '../lib/editor-state';
import {
  type AddableType,
  ARTBOARD_WIDTH,
  type CanvasDoc,
  createDemoDoc,
  DEMO_BRAND,
} from '../lib/model';
import type { CanvasLabels } from './canvas-screen';
import { EditorCanvas } from './editor-canvas';
import { PropertiesPanel } from './properties-panel';
import { LayersPanel, ScreensPanel, Toolbox } from './side-panels';

const STORAGE_KEY = 'playora.canvasLab.v1';

function loadDoc(): CanvasDoc {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as CanvasDoc;
  } catch {
    // Private mode or corrupt data: fall back to the template.
  }
  return createDemoDoc();
}

/** ADR-014 prototype: free canvas editor for game screens, local data only. */
export function CanvasEditor({ orgId }: { orgId: string }) {
  const t = useTranslations('canvasLab');
  const { message } = App.useApp();
  const { token } = theme.useToken();
  const [state, dispatch] = useReducer(editorReducer, undefined, () =>
    createEditorState(createDemoDoc()),
  );
  const [preview, setPreview] = useState(false);
  const [replay, setReplay] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [autoFit, setAutoFit] = useState(true);
  const stageRef = useRef<HTMLDivElement>(null);
  const screen = currentScreen(state);

  // Load the saved draft after hydration (localStorage is browser-only).
  useEffect(() => {
    dispatch({ type: 'reset', doc: loadDoc() });
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state.doc));
      } catch {
        // Saving is a convenience only.
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [state.doc]);

  const fit = useCallback(() => {
    const el = stageRef.current;
    if (!el) return;
    const next = Math.min(
      (el.clientWidth - 64) / ARTBOARD_WIDTH,
      (el.clientHeight - 96) / screen.height,
    );
    setZoom(Math.max(0.4, Math.min(1.5, Math.round(next * 100) / 100)));
  }, [screen.height]);

  useLayoutEffect(() => {
    if (!autoFit) return;
    fit();
    const observer = new ResizeObserver(fit);
    if (stageRef.current) observer.observe(stageRef.current);
    return () => observer.disconnect();
  }, [autoFit, fit]);

  const labels: CanvasLabels = {
    days: t('render.days'),
    hours: t('render.hours'),
    minutes: t('render.minutes'),
    seconds: t('render.seconds'),
    remaining: (count) => t('render.remaining', { count }),
    fullName: t('render.fullName'),
    phone: t('render.phone'),
    consent: t('render.consent'),
    sampleName: t('render.sampleName'),
    samplePrize: t('render.samplePrize'),
    sampleEvent: t('render.sampleEvent'),
  };

  const newElementName = (type: AddableType) =>
    type === 'text' ? t('newText') : type === 'button' ? t('newButton') : t(`types.${type}`);

  const addAtCentre = (type: AddableType) =>
    dispatch({
      type: 'add',
      elementType: type,
      cx: ARTBOARD_WIDTH / 2,
      cy: screen.height / 2,
      name: newElementName(type),
    });

  const setZoomManually = (value: number) => {
    setAutoFit(false);
    setZoom(Math.max(0.4, Math.min(2, Math.round(value * 10) / 10)));
  };

  const border = `1px solid ${token.colorBorderSecondary}`;
  const panel = { background: token.colorBgContainer };

  return (
    <div className="grid h-dvh" style={{ gridTemplateRows: '56px minmax(0, 1fr)' }}>
      <header
        className="flex items-center justify-between gap-3 px-3"
        style={{ ...panel, borderBottom: border }}
      >
        <Flex align="center" gap={8} className="min-w-0">
          <Tooltip title={t('back')}>
            <Link href={`/orgs/${orgId}/events` as Route} aria-label={t('back')}>
              <Button
                type="text"
                tabIndex={-1}
                aria-hidden
                icon={<ArrowLeft className="size-4" />}
              />
            </Link>
          </Tooltip>
          <LogoMark className="size-7" aria-hidden />
          <Typography.Text strong className="whitespace-nowrap">
            {t('title')}
          </Typography.Text>
          <Tag color="warning" className="!m-0">
            {t('badge')}
          </Tag>
          <Divider orientation="vertical" />
          <Tooltip title={`${t('undo')} (⌘Z)`}>
            <Button
              type="text"
              aria-label={t('undo')}
              icon={<Undo2 className="size-4" />}
              disabled={!state.past.length}
              onClick={() => dispatch({ type: 'undo' })}
            />
          </Tooltip>
          <Tooltip title={`${t('redo')} (⇧⌘Z)`}>
            <Button
              type="text"
              aria-label={t('redo')}
              icon={<Redo2 className="size-4" />}
              disabled={!state.future.length}
              onClick={() => dispatch({ type: 'redo' })}
            />
          </Tooltip>
        </Flex>

        <Flex align="center" gap={4}>
          <Button
            type="text"
            aria-label={t('zoomOut')}
            icon={<Minus className="size-4" />}
            onClick={() => setZoomManually(zoom - 0.1)}
          />
          <Typography.Text className="w-12 text-center">{Math.round(zoom * 100)}%</Typography.Text>
          <Button
            type="text"
            aria-label={t('zoomIn')}
            icon={<Plus className="size-4" />}
            onClick={() => setZoomManually(zoom + 0.1)}
          />
          <Tooltip title={t('fit')}>
            <Button
              type="text"
              aria-label={t('fit')}
              icon={<Maximize className="size-4" />}
              onClick={() => setAutoFit(true)}
            />
          </Tooltip>
        </Flex>

        <Flex align="center" gap={8}>
          <Popconfirm
            title={t('resetConfirm')}
            onConfirm={() => dispatch({ type: 'reset', doc: createDemoDoc() })}
          >
            <Tooltip title={t('reset')}>
              <Button type="text" aria-label={t('reset')} icon={<RotateCcw className="size-4" />} />
            </Tooltip>
          </Popconfirm>
          <Tooltip title={t('copyJson')}>
            <Button
              type="text"
              aria-label={t('copyJson')}
              icon={<Braces className="size-4" />}
              onClick={async () => {
                await navigator.clipboard.writeText(JSON.stringify(state.doc, null, 2));
                message.success(t('copied'));
              }}
            />
          </Tooltip>
          <Segmented
            value={preview ? 'preview' : 'edit'}
            onChange={(mode) => {
              setPreview(mode === 'preview');
              setReplay((n) => n + 1);
              if (mode === 'preview') dispatch({ type: 'select', id: null });
            }}
            options={[
              { value: 'edit', label: t('edit'), icon: <Pencil className="size-3.5" /> },
              { value: 'preview', label: t('preview'), icon: <Play className="size-3.5" /> },
            ]}
          />
        </Flex>
      </header>

      <div className="grid min-h-0" style={{ gridTemplateColumns: '280px minmax(0, 1fr) 320px' }}>
        <aside className="min-h-0 overflow-y-auto p-4" style={{ ...panel, borderRight: border }}>
          <Flex vertical gap={16}>
            <Typography.Text strong>{t('screens')}</Typography.Text>
            <ScreensPanel state={state} dispatch={dispatch} />
            <Typography.Text strong>{t('add')}</Typography.Text>
            <Toolbox onAdd={addAtCentre} />
            <Typography.Text strong>{t('layers')}</Typography.Text>
            <LayersPanel state={state} dispatch={dispatch} />
          </Flex>
        </aside>

        <main
          ref={stageRef}
          className="flex min-h-0 justify-center overflow-auto py-10"
          style={{
            background: token.colorBgLayout,
            backgroundImage: `radial-gradient(${token.colorBorder} 1px, transparent 1px)`,
            backgroundSize: '16px 16px',
          }}
          data-testid="canvas-stage"
        >
          <div className="h-fit pb-12">
            <EditorCanvas
              state={state}
              dispatch={dispatch}
              zoom={zoom}
              preview={preview}
              replay={replay}
              brand={DEMO_BRAND}
              labels={labels}
              newElementName={newElementName}
              heightLabel={t('artboardHeight')}
            />
          </div>
        </main>

        <aside className="min-h-0 overflow-y-auto p-4" style={{ ...panel, borderLeft: border }}>
          <PropertiesPanel state={state} dispatch={dispatch} brand={DEMO_BRAND} />
        </aside>
      </div>
    </div>
  );
}
