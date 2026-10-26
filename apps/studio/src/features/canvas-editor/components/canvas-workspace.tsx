'use client';

import { Button, Flex, Menu, type MenuProps, Segmented, Tooltip, Typography, theme } from 'antd';
import {
  AlignCenter,
  AlignHorizontalJustifyCenter,
  AlignLeft,
  AlignRight,
  AlignVerticalJustifyCenter,
  ArrowDownToLine,
  ArrowUpToLine,
  Award,
  ChevronDown,
  ChevronUp,
  Clock,
  Copy,
  Eye,
  EyeOff,
  Gift,
  ImageIcon,
  Layers,
  Lock,
  Maximize,
  Maximize2,
  Megaphone,
  MessageCircle,
  Minus,
  MousePointerClick,
  Pencil,
  Play,
  Plus,
  Redo2,
  RotateCcw,
  Shapes,
  Trash2,
  Type,
  Undo2,
  Unlock,
  Volume2,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
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
import {
  createEditorState,
  currentScreen,
  editorReducer,
  selectedElement,
} from '../lib/editor-state';
import {
  type AddableType,
  ARTBOARD_WIDTH,
  type BrandPalette,
  type CanvasDoc,
  type GameStageElement,
  SINGLETON_TYPES,
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
  hideHeader = false,
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
  hideHeader?: boolean;
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

  type MenuTarget = 'element' | 'canvas' | 'workspace';
  const [menuState, setMenuState] = useState<{
    x: number;
    y: number;
    id: string | null;
    target: MenuTarget;
  } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleContextMenu = useCallback(
    (e: React.MouseEvent, id: string | null, target: MenuTarget) => {
      e.preventDefault();
      e.stopPropagation();
      if (id) {
        dispatch({ type: 'select', id });
      }
      setMenuState({
        x: e.clientX,
        y: e.clientY,
        id,
        target,
      });
    },
    [],
  );

  useEffect(() => {
    if (!menuState) return;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Element;
      // Submenus (add element, layer order, align) are portaled to <body>, outside menuRef.
      if (menuRef.current?.contains(target) || target.closest?.('.ant-menu-submenu-popup')) return;
      setMenuState(null);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuState(null);
    };
    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [menuState]);

  const addAtPosition = (type: AddableType) => {
    let cx = ARTBOARD_WIDTH / 2;
    let cy = screen.height / 2;

    if (menuState && stageRef.current) {
      const artboardEl = stageRef.current.querySelector<HTMLElement>(
        '[data-testid="canvas-artboard"]',
      );
      if (artboardEl) {
        const rect = artboardEl.getBoundingClientRect();
        const ax = (menuState.x - rect.left) / zoom;
        const ay = (menuState.y - rect.top) / zoom;
        cx = Math.round(Math.max(40, Math.min(ARTBOARD_WIDTH - 40, ax)));
        cy = Math.round(Math.max(40, Math.min(screen.height - 40, ay)));
      }
    }

    dispatch({
      type: 'add',
      elementType: type,
      cx,
      cy,
      name: newElementName(type),
    });
  };

  const getMenuItems = (stateTarget: {
    id: string | null;
    target: MenuTarget;
  }): MenuProps['items'] => {
    const targetId = stateTarget.id;
    if (targetId) {
      const el = screen.elements.find((e) => e.id === targetId);
      if (!el) return [];
      const singleton = SINGLETON_TYPES.includes(el.type);
      const index = screen.elements.findIndex((e) => e.id === targetId);
      const isFirst = index === 0;
      const isLast = index === screen.elements.length - 1;

      return [
        {
          key: 'duplicate',
          icon: <Copy className="size-4" />,
          label: (
            <div className="flex items-center justify-between gap-6">
              <span>{t('context.duplicate')}</span>
              <span className="text-xs text-secondary font-mono opacity-60">⌘D</span>
            </div>
          ),
          disabled: singleton,
          onClick: () => dispatch({ type: 'duplicate', id: targetId }),
        },
        {
          key: 'lock',
          icon: el.locked ? <Unlock className="size-4" /> : <Lock className="size-4" />,
          label: el.locked ? t('context.unlock') : t('context.lock'),
          onClick: () => dispatch({ type: 'update', id: targetId, patch: { locked: !el.locked } }),
        },
        {
          key: 'hide',
          icon: el.hidden ? <Eye className="size-4" /> : <EyeOff className="size-4" />,
          label: el.hidden ? t('context.show') : t('context.hide'),
          onClick: () => dispatch({ type: 'update', id: targetId, patch: { hidden: !el.hidden } }),
        },
        { type: 'divider' },
        {
          key: 'order',
          icon: <Layers className="size-4" />,
          label: t('context.layerOrder'),
          children: [
            {
              key: 'bringFront',
              icon: <ArrowUpToLine className="size-4" />,
              label: t('context.bringFront'),
              disabled: isLast,
              onClick: () =>
                dispatch({
                  type: 'reorder',
                  id: targetId,
                  toIndex: screen.elements.length - 1,
                }),
            },
            {
              key: 'bringForward',
              icon: <ChevronUp className="size-4" />,
              label: t('context.bringForward'),
              disabled: isLast,
              onClick: () => dispatch({ type: 'reorder', id: targetId, toIndex: index + 1 }),
            },
            {
              key: 'sendBackward',
              icon: <ChevronDown className="size-4" />,
              label: t('context.sendBackward'),
              disabled: isFirst,
              onClick: () => dispatch({ type: 'reorder', id: targetId, toIndex: index - 1 }),
            },
            {
              key: 'sendBack',
              icon: <ArrowDownToLine className="size-4" />,
              label: t('context.sendBack'),
              disabled: isFirst,
              onClick: () => dispatch({ type: 'reorder', id: targetId, toIndex: 0 }),
            },
          ],
        },
        {
          key: 'align',
          icon: <AlignCenter className="size-4" />,
          label: t('context.align'),
          children: [
            {
              key: 'centerH',
              icon: <AlignHorizontalJustifyCenter className="size-4" />,
              label: t('context.centerH'),
              onClick: () =>
                dispatch({
                  type: 'update',
                  id: targetId,
                  patch: { x: Math.round((ARTBOARD_WIDTH - el.w) / 2) },
                }),
            },
            {
              key: 'centerV',
              icon: <AlignVerticalJustifyCenter className="size-4" />,
              label: t('context.centerV'),
              onClick: () =>
                dispatch({
                  type: 'update',
                  id: targetId,
                  patch: { y: Math.round((screen.height - el.h) / 2) },
                }),
            },
            {
              key: 'alignLeft',
              icon: <AlignLeft className="size-4" />,
              label: t('context.alignLeft'),
              onClick: () => dispatch({ type: 'update', id: targetId, patch: { x: 16 } }),
            },
            {
              key: 'alignRight',
              icon: <AlignRight className="size-4" />,
              label: t('context.alignRight'),
              onClick: () =>
                dispatch({
                  type: 'update',
                  id: targetId,
                  patch: { x: ARTBOARD_WIDTH - el.w - 16 },
                }),
            },
            {
              key: 'fullWidth',
              icon: <Maximize2 className="size-4" />,
              label: t('context.fullWidth'),
              onClick: () =>
                dispatch({
                  type: 'update',
                  id: targetId,
                  patch: { x: 0, w: ARTBOARD_WIDTH },
                }),
            },
          ],
        },
        ...(el.rotation !== 0
          ? [
              {
                key: 'resetRotation',
                icon: <RotateCcw className="size-4" />,
                label: t('context.resetRotation'),
                onClick: () => dispatch({ type: 'update', id: targetId, patch: { rotation: 0 } }),
              },
            ]
          : []),
        { type: 'divider' },
        {
          key: 'delete',
          icon: <Trash2 className="size-4" />,
          label: (
            <div className="flex items-center justify-between gap-6">
              <span>{t('context.delete')}</span>
              <span className="text-xs text-secondary font-mono opacity-60">Delete</span>
            </div>
          ),
          danger: true,
          disabled: singleton,
          onClick: () => dispatch({ type: 'remove', id: targetId }),
        },
      ];
    }

    return [
      {
        key: 'add',
        icon: <Plus className="size-4" />,
        label: t('context.addElement'),
        children: [
          {
            key: 'content-group',
            type: 'group',
            label: t('toolboxCategories.content'),
            children: [
              {
                key: 'add-text',
                icon: <Type className="size-4" />,
                label: t('types.text'),
                onClick: () => addAtPosition('text'),
              },
              {
                key: 'add-image',
                icon: <ImageIcon className="size-4" />,
                label: t('types.image'),
                onClick: () => addAtPosition('image'),
              },
              {
                key: 'add-badge',
                icon: <Award className="size-4" />,
                label: t('types.badge'),
                onClick: () => addAtPosition('badge'),
              },
              {
                key: 'add-marquee',
                icon: <Megaphone className="size-4" />,
                label: t('types.marquee'),
                onClick: () => addAtPosition('marquee'),
              },
            ],
          },
          {
            key: 'interactive-group',
            type: 'group',
            label: t('toolboxCategories.interactive'),
            children: [
              {
                key: 'add-button',
                icon: <MousePointerClick className="size-4" />,
                label: t('types.button'),
                onClick: () => addAtPosition('button'),
              },
              {
                key: 'add-countdown',
                icon: <Clock className="size-4" />,
                label: t('types.countdown'),
                onClick: () => addAtPosition('countdown'),
              },
              {
                key: 'add-prizeList',
                icon: <Gift className="size-4" />,
                label: t('types.prizeList'),
                onClick: () => addAtPosition('prizeList'),
              },
              {
                key: 'add-social',
                icon: <MessageCircle className="size-4" />,
                label: t('types.social'),
                onClick: () => addAtPosition('social'),
              },
              {
                key: 'add-audio',
                icon: <Volume2 className="size-4" />,
                label: t('types.audio'),
                onClick: () => addAtPosition('audio'),
              },
            ],
          },
          {
            key: 'decor-group',
            type: 'group',
            label: t('toolboxCategories.decor'),
            children: [
              {
                key: 'add-shape',
                icon: <Shapes className="size-4" />,
                label: t('types.shape'),
                onClick: () => addAtPosition('shape'),
              },
              {
                key: 'add-divider',
                icon: <Minus className="size-4" />,
                label: t('types.divider'),
                onClick: () => addAtPosition('divider'),
              },
            ],
          },
        ],
      },
      { type: 'divider' },
      {
        key: 'undo',
        icon: <Undo2 className="size-4" />,
        label: (
          <div className="flex items-center justify-between gap-6">
            <span>{t('undo')}</span>
            <span className="text-xs text-secondary font-mono opacity-60">⌘Z</span>
          </div>
        ),
        disabled: !state.past.length,
        onClick: () => dispatch({ type: 'undo' }),
      },
      {
        key: 'redo',
        icon: <Redo2 className="size-4" />,
        label: (
          <div className="flex items-center justify-between gap-6">
            <span>{t('redo')}</span>
            <span className="text-xs text-secondary font-mono opacity-60">⇧⌘Z</span>
          </div>
        ),
        disabled: !state.future.length,
        onClick: () => dispatch({ type: 'redo' }),
      },
      { type: 'divider' },
      {
        key: 'fit',
        icon: <Maximize className="size-4" />,
        label: t('fit'),
        onClick: () => setAutoFit(true),
      },
      {
        key: 'zoomIn',
        icon: <ZoomIn className="size-4" />,
        label: t('zoomIn'),
        onClick: () => setZoomManually(zoom + 0.1),
      },
      {
        key: 'zoomOut',
        icon: <ZoomOut className="size-4" />,
        label: t('zoomOut'),
        onClick: () => setZoomManually(zoom - 0.1),
      },
      ...(selectedElement(state)
        ? [
            { type: 'divider' as const },
            {
              key: 'deselect',
              icon: <X className="size-4" />,
              label: t('context.deselect'),
              onClick: () => dispatch({ type: 'select', id: null }),
            },
          ]
        : []),
    ];
  };

  const border = `1px solid ${token.colorBorderSecondary}`;
  const panel = { background: token.colorBgContainer };

  return (
    <div
      className="grid h-full min-h-0"
      style={{
        gridTemplateRows: hideHeader ? 'minmax(0, 1fr)' : `${toolbarHeight}px minmax(0, 1fr)`,
      }}
    >
      {!hideHeader && (
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
            <Typography.Text className="w-12 text-center">
              {Math.round(zoom * 100)}%
            </Typography.Text>
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
      )}

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

        <div className="relative min-h-0 min-w-0 overflow-hidden">
          <main
            ref={stageRef}
            className="flex h-full min-h-0 justify-center overflow-auto py-10"
            style={{
              background: token.colorBgLayout,
              backgroundImage: `radial-gradient(${token.colorBorder} 1px, transparent 1px)`,
              backgroundSize: '16px 16px',
            }}
            data-testid="canvas-stage"
            onContextMenu={(e) => handleContextMenu(e, null, 'workspace')}
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
                onContextMenu={(e, id) => handleContextMenu(e, id, id ? 'element' : 'canvas')}
              />
            </div>
          </main>

          {hideHeader && (
            <div
              className="absolute bottom-5 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1.5 px-3 py-1.5 rounded-full shadow-lg border backdrop-blur-md pointer-events-auto shrink-0"
              style={{
                background: token.colorBgElevated,
                borderColor: token.colorBorderSecondary,
                boxShadow: token.boxShadowSecondary,
              }}
            >
              <Tooltip title={`${t('undo')} (⌘Z)`}>
                <Button
                  type="text"
                  size="small"
                  aria-label={t('undo')}
                  icon={<Undo2 className="size-3.5" />}
                  disabled={!state.past.length}
                  onClick={() => dispatch({ type: 'undo' })}
                />
              </Tooltip>
              <Tooltip title={`${t('redo')} (⇧⌘Z)`}>
                <Button
                  type="text"
                  size="small"
                  aria-label={t('redo')}
                  icon={<Redo2 className="size-3.5" />}
                  disabled={!state.future.length}
                  onClick={() => dispatch({ type: 'redo' })}
                />
              </Tooltip>
              <span className="h-3 w-px bg-border mx-0.5" />
              <Button
                type="text"
                size="small"
                aria-label={t('zoomOut')}
                icon={<Minus className="size-3" />}
                onClick={() => setZoomManually(zoom - 0.1)}
              />
              <Typography.Text
                style={{ fontSize: 12, minWidth: 36 }}
                className="text-center font-mono"
              >
                {Math.round(zoom * 100)}%
              </Typography.Text>
              <Button
                type="text"
                size="small"
                aria-label={t('zoomIn')}
                icon={<Plus className="size-3" />}
                onClick={() => setZoomManually(zoom + 0.1)}
              />
              <Tooltip title={t('fit')}>
                <Button
                  type="text"
                  size="small"
                  aria-label={t('fit')}
                  icon={<Maximize className="size-3" />}
                  onClick={() => setAutoFit(true)}
                />
              </Tooltip>
              <span className="h-3 w-px bg-border mx-0.5" />
              <Segmented
                size="small"
                value={preview ? 'preview' : 'edit'}
                onChange={(mode) => {
                  setPreview(mode === 'preview');
                  setReplay((n) => n + 1);
                  if (mode === 'preview') dispatch({ type: 'select', id: null });
                }}
                options={[
                  { value: 'edit', label: t('edit'), icon: <Pencil className="size-3" /> },
                  { value: 'preview', label: t('preview'), icon: <Play className="size-3" /> },
                ]}
              />
            </div>
          )}
        </div>

        <aside className="min-h-0 overflow-y-auto p-4" style={{ ...panel, borderLeft: border }}>
          <PropertiesPanel state={state} dispatch={dispatch} brand={brand} />
        </aside>
      </div>

      {menuState && (
        // biome-ignore lint/a11y/noStaticElementInteractions: context menu container suppresses native menu
        <div
          ref={menuRef}
          role="presentation"
          data-testid="canvas-context-menu"
          className="fixed z-50 shadow-2xl rounded-lg overflow-hidden border backdrop-blur-md"
          style={{
            left: Math.max(
              10,
              Math.min(
                (typeof window !== 'undefined' ? window.innerWidth : 1000) - 240,
                menuState.x,
              ),
            ),
            top: Math.max(
              10,
              Math.min(
                (typeof window !== 'undefined' ? window.innerHeight : 800) - 360,
                menuState.y,
              ),
            ),
            background: token.colorBgElevated,
            borderColor: token.colorBorderSecondary,
            boxShadow: token.boxShadowSecondary,
            minWidth: 200,
          }}
          onContextMenu={(e) => e.preventDefault()}
        >
          <Menu
            mode="vertical"
            items={getMenuItems(menuState)}
            onClick={({ domEvent }) => {
              domEvent.stopPropagation();
              setMenuState(null);
            }}
            style={{ border: 0 }}
          />
        </div>
      )}
    </div>
  );
}
