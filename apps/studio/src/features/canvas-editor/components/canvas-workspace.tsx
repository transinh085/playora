'use client';

import { Button, Flex, Segmented, Tooltip, Typography, theme } from 'antd';
import { Maximize, Minus, Pencil, Play, Plus, Redo2, Undo2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import {
  type ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useReducer,
  useRef,
  useState,
} from 'react';
import { createEditorState, currentScreen, editorReducer } from '../lib/editor-state';
import {
  type AddableType,
  ARTBOARD_WIDTH,
  type BrandPalette,
  type CanvasDoc,
  type GameStageElement,
} from '../lib/model';
import type { CanvasPrize } from './canvas-screen';
import { EditorCanvas } from './editor-canvas';
import { PropertiesPanel } from './properties-panel';
import { LayersPanel, ScreensPanel, Toolbox } from './side-panels';
import { useCanvasLabels } from './use-canvas-labels';

/**
 * The free canvas editor (ADR-014) as a controlled component: the parent owns the document
 * (`value` / `onChange`), the workspace owns selection, undo history, zoom and preview. Used by the
 * standalone canvas lab and by the builder's "Customize" mode.
 *
 * A `value` that differs from the last document the workspace emitted is treated as an outside
 * change (load, reset, pre-flight fix): it is adopted and the undo history starts over.
 */
export function CanvasWorkspace({
  value,
  onChange,
  brand,
  renderStage,
  prizes,
  toolbarStart,
  toolbarEnd,
  toolbarHeight = 56,
}: {
  value: CanvasDoc;
  onChange: (doc: CanvasDoc) => void;
  brand: BrandPalette;
  renderStage?: (element: GameStageElement) => ReactNode;
  /** Real prizes for prize-list elements. */
  prizes?: CanvasPrize[];
  /** Rendered before undo/redo (e.g. back link and title). */
  toolbarStart?: ReactNode;
  /** Rendered before the edit/preview switch (e.g. page-specific actions). */
  toolbarEnd?: ReactNode;
  toolbarHeight?: number;
}) {
  const t = useTranslations('canvasLab');
  const { token } = theme.useToken();
  const [state, dispatch] = useReducer(editorReducer, value, createEditorState);
  const [preview, setPreview] = useState(false);
  const [replay, setReplay] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [autoFit, setAutoFit] = useState(true);
  const stageRef = useRef<HTMLDivElement>(null);
  const screen = currentScreen(state);

  // Two-way sync without loops: remember the last document exchanged with the parent.
  const synced = useRef(value);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (state.doc === synced.current) return;
    synced.current = state.doc;
    onChangeRef.current(state.doc);
  }, [state.doc]);

  useEffect(() => {
    if (value === synced.current) return;
    synced.current = value;
    dispatch({ type: 'sync', doc: value });
  }, [value]);

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

  const labels = useCanvasLabels();

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

  const setZoomManually = (next: number) => {
    setAutoFit(false);
    setZoom(Math.max(0.4, Math.min(2, Math.round(next * 10) / 10)));
  };

  const border = `1px solid ${token.colorBorderSecondary}`;
  const panel = { background: token.colorBgContainer };

  return (
    <div
      className="grid h-full min-h-0"
      style={{ gridTemplateRows: `${toolbarHeight}px minmax(0, 1fr)` }}
    >
      <header
        className="flex items-center justify-between gap-3 px-3"
        style={{ ...panel, borderBottom: border }}
      >
        <Flex align="center" gap={8} className="min-w-0">
          {toolbarStart}
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
          {toolbarEnd}
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
              brand={brand}
              labels={labels}
              newElementName={newElementName}
              heightLabel={t('artboardHeight')}
              renderStage={renderStage}
              prizes={prizes}
            />
          </div>
        </main>

        <aside className="min-h-0 overflow-y-auto p-4" style={{ ...panel, borderLeft: border }}>
          <PropertiesPanel state={state} dispatch={dispatch} brand={brand} />
        </aside>
      </div>
    </div>
  );
}
