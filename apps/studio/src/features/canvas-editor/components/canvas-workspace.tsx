'use client';

import type { CanvasPrize } from '@playora/ui/campaign';
import { Button } from '@playora/ui/components/base/buttons/button';
import {
  ContextMenu,
  ContextMenuItem,
  ContextMenuSection,
  ContextMenuSeparator,
  ContextMenuSubmenu,
  ContextMenuTrigger,
} from '@playora/ui/components/base/context-menu/context-menu';
import { Tooltip, TooltipTrigger } from '@playora/ui/components/base/tooltip/tooltip';
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
} from '@playora/ui/icons';
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
import { EditorCanvas } from './editor-canvas';
import { PropertiesPanel } from './properties-panel';
import { LayersPanel, ScreensPanel, Toolbox } from './side-panels';
import { useCanvasLabels } from './use-canvas-labels';

type MenuTarget = 'element' | 'canvas' | 'workspace';

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
  onUploadImage,
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
  onUploadImage?: (file: File) => Promise<string>;
  /** Rendered before undo/redo (e.g. back link and title). */
  toolbarStart?: ReactNode;
  /** Rendered before the edit/preview switch (e.g. page-specific actions). */
  toolbarEnd?: ReactNode;
  toolbarHeight?: number;
  hideHeader?: boolean;
}) {
  const t = useTranslations('canvasLab');
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

  const [menuState, setMenuState] = useState<{
    x: number;
    y: number;
    id: string | null;
    target: MenuTarget;
  } | null>(null);

  const handleContextMenu = useCallback(
    (e: React.MouseEvent, id: string | null, target: MenuTarget) => {
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
    setMenuState(null);
  };

  const targetId = menuState?.id;
  const targetElement = targetId ? screen.elements.find((e) => e.id === targetId) : null;
  const isSingleton = targetElement ? SINGLETON_TYPES.includes(targetElement.type) : false;
  const targetIndex = targetId ? screen.elements.findIndex((e) => e.id === targetId) : -1;
  const isFirst = targetIndex === 0;
  const isLast = targetIndex === screen.elements.length - 1;

  return (
    <div
      className="grid h-full min-h-0 bg-background text-foreground"
      style={{
        gridTemplateRows: hideHeader ? 'minmax(0, 1fr)' : `${toolbarHeight}px minmax(0, 1fr)`,
      }}
    >
      {!hideHeader && (
        <header className="flex items-center justify-between gap-3 border-b bg-card px-3">
          <div className="flex min-w-0 items-center gap-2">
            {toolbarStart}
            <TooltipTrigger>
              <Button
                type="button"
                variant="ghost"
                size="small"
                aria-label={t('undo')}
                disabled={!state.past.length}
                onClick={() => dispatch({ type: 'undo' })}
                className="size-8 rounded-full p-0"
              >
                <Undo2 className="size-4" />
              </Button>
              <Tooltip>{`${t('undo')} (⌘Z)`}</Tooltip>
            </TooltipTrigger>
            <TooltipTrigger>
              <Button
                type="button"
                variant="ghost"
                size="small"
                aria-label={t('redo')}
                disabled={!state.future.length}
                onClick={() => dispatch({ type: 'redo' })}
                className="size-8 rounded-full p-0"
              >
                <Redo2 className="size-4" />
              </Button>
              <Tooltip>{`${t('redo')} (⇧⌘Z)`}</Tooltip>
            </TooltipTrigger>
          </div>

          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="small"
              aria-label={t('zoomOut')}
              onClick={() => setZoomManually(zoom - 0.1)}
              className="size-8 rounded-full p-0"
            >
              <Minus className="size-4" />
            </Button>
            <span className="w-12 text-center text-xs font-mono">{Math.round(zoom * 100)}%</span>
            <Button
              type="button"
              variant="ghost"
              size="small"
              aria-label={t('zoomIn')}
              onClick={() => setZoomManually(zoom + 0.1)}
              className="size-8 rounded-full p-0"
            >
              <Plus className="size-4" />
            </Button>
            <TooltipTrigger>
              <Button
                type="button"
                variant="ghost"
                size="small"
                aria-label={t('fit')}
                onClick={() => setAutoFit(true)}
                className="size-8 rounded-full p-0"
              >
                <Maximize className="size-4" />
              </Button>
              <Tooltip>{t('fit')}</Tooltip>
            </TooltipTrigger>
          </div>

          <div className="flex items-center gap-2">
            {toolbarEnd}
            <div className="inline-flex rounded-full border bg-muted/50 p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setPreview(false)}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1 font-medium transition-colors ${
                  !preview
                    ? 'bg-background text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Pencil className="size-3.5" />
                <span>{t('edit')}</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setPreview(true);
                  setReplay((n) => n + 1);
                  dispatch({ type: 'select', id: null });
                }}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1 font-medium transition-colors ${
                  preview
                    ? 'bg-background text-foreground shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Play className="size-3.5" />
                <span>{t('preview')}</span>
              </button>
            </div>
          </div>
        </header>
      )}

      <div className="grid min-h-0" style={{ gridTemplateColumns: '280px minmax(0, 1fr) 320px' }}>
        <aside className="min-h-0 overflow-y-auto border-r bg-card p-4">
          <div className="flex flex-col gap-4">
            <span className="font-semibold text-sm">{t('screens')}</span>
            <ScreensPanel state={state} dispatch={dispatch} />
            <span className="font-semibold text-sm">{t('add')}</span>
            <Toolbox onAdd={addAtCentre} />
            <span className="font-semibold text-sm">{t('layers')}</span>
            <LayersPanel state={state} dispatch={dispatch} />
          </div>
        </aside>

        <div className="relative min-h-0 min-w-0 overflow-hidden">
          <ContextMenuTrigger onOpenChange={(open) => !open && setMenuState(null)}>
            <main
              ref={stageRef}
              className="flex h-full min-h-0 justify-center overflow-auto py-10 bg-muted/20"
              style={{
                backgroundImage: 'radial-gradient(hsl(var(--border)) 1px, transparent 1px)',
                backgroundSize: '16px 16px',
              }}
              data-testid="canvas-stage"
              onContextMenu={(e) => {
                if (!(e.target as Element).closest('[data-testid="canvas-artboard"]')) {
                  handleContextMenu(e, null, 'workspace');
                }
              }}
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

            <ContextMenu data-testid="canvas-context-menu" className="w-56">
              {targetElement && targetId ? (
                <>
                  <ContextMenuItem
                    icon={Copy}
                    shortcut="⌘D"
                    isDisabled={isSingleton}
                    onAction={() => dispatch({ type: 'duplicate', id: targetId })}
                  >
                    {t('context.duplicate')}
                  </ContextMenuItem>
                  <ContextMenuItem
                    icon={targetElement.locked ? Unlock : Lock}
                    onAction={() =>
                      dispatch({
                        type: 'update',
                        id: targetId,
                        patch: { locked: !targetElement.locked },
                      })
                    }
                  >
                    {targetElement.locked ? t('context.unlock') : t('context.lock')}
                  </ContextMenuItem>
                  <ContextMenuItem
                    icon={targetElement.hidden ? Eye : EyeOff}
                    onAction={() =>
                      dispatch({
                        type: 'update',
                        id: targetId,
                        patch: { hidden: !targetElement.hidden },
                      })
                    }
                  >
                    {targetElement.hidden ? t('context.show') : t('context.hide')}
                  </ContextMenuItem>

                  <ContextMenuSeparator />

                  <ContextMenuSubmenu
                    label={t('context.layerOrder')}
                    textValue={t('context.layerOrder')}
                    icon={Layers}
                    className="w-48"
                  >
                    <ContextMenuItem
                      icon={ArrowUpToLine}
                      isDisabled={isLast}
                      onAction={() =>
                        dispatch({
                          type: 'reorder',
                          id: targetId,
                          toIndex: screen.elements.length - 1,
                        })
                      }
                    >
                      {t('context.bringFront')}
                    </ContextMenuItem>
                    <ContextMenuItem
                      icon={ChevronUp}
                      isDisabled={isLast}
                      onAction={() =>
                        dispatch({ type: 'reorder', id: targetId, toIndex: targetIndex + 1 })
                      }
                    >
                      {t('context.bringForward')}
                    </ContextMenuItem>
                    <ContextMenuItem
                      icon={ChevronDown}
                      isDisabled={isFirst}
                      onAction={() =>
                        dispatch({ type: 'reorder', id: targetId, toIndex: targetIndex - 1 })
                      }
                    >
                      {t('context.sendBackward')}
                    </ContextMenuItem>
                    <ContextMenuItem
                      icon={ArrowDownToLine}
                      isDisabled={isFirst}
                      onAction={() => dispatch({ type: 'reorder', id: targetId, toIndex: 0 })}
                    >
                      {t('context.sendBack')}
                    </ContextMenuItem>
                  </ContextMenuSubmenu>

                  <ContextMenuSubmenu
                    label={t('context.align')}
                    textValue={t('context.align')}
                    icon={AlignCenter}
                    className="w-48"
                  >
                    <ContextMenuItem
                      icon={AlignHorizontalJustifyCenter}
                      onAction={() =>
                        dispatch({
                          type: 'update',
                          id: targetId,
                          patch: { x: Math.round((ARTBOARD_WIDTH - targetElement.w) / 2) },
                        })
                      }
                    >
                      {t('context.centerH')}
                    </ContextMenuItem>
                    <ContextMenuItem
                      icon={AlignVerticalJustifyCenter}
                      onAction={() =>
                        dispatch({
                          type: 'update',
                          id: targetId,
                          patch: { y: Math.round((screen.height - targetElement.h) / 2) },
                        })
                      }
                    >
                      {t('context.centerV')}
                    </ContextMenuItem>
                    <ContextMenuItem
                      icon={AlignLeft}
                      onAction={() => dispatch({ type: 'update', id: targetId, patch: { x: 16 } })}
                    >
                      {t('context.alignLeft')}
                    </ContextMenuItem>
                    <ContextMenuItem
                      icon={AlignRight}
                      onAction={() =>
                        dispatch({
                          type: 'update',
                          id: targetId,
                          patch: { x: ARTBOARD_WIDTH - targetElement.w - 16 },
                        })
                      }
                    >
                      {t('context.alignRight')}
                    </ContextMenuItem>
                    <ContextMenuItem
                      icon={Maximize2}
                      onAction={() =>
                        dispatch({
                          type: 'update',
                          id: targetId,
                          patch: { x: 0, w: ARTBOARD_WIDTH },
                        })
                      }
                    >
                      {t('context.fullWidth')}
                    </ContextMenuItem>
                  </ContextMenuSubmenu>

                  {targetElement.rotation !== 0 && (
                    <ContextMenuItem
                      icon={RotateCcw}
                      onAction={() =>
                        dispatch({ type: 'update', id: targetId, patch: { rotation: 0 } })
                      }
                    >
                      {t('context.resetRotation')}
                    </ContextMenuItem>
                  )}

                  <ContextMenuSeparator />

                  <ContextMenuItem
                    variant="danger"
                    icon={Trash2}
                    shortcut="Del"
                    isDisabled={isSingleton}
                    onAction={() => dispatch({ type: 'remove', id: targetId })}
                  >
                    {t('context.delete')}
                  </ContextMenuItem>
                </>
              ) : (
                <>
                  <ContextMenuSubmenu
                    label={t('context.addElement')}
                    textValue={t('context.addElement')}
                    icon={Plus}
                    className="w-52"
                  >
                    <ContextMenuSection title={t('toolboxCategories.content')}>
                      <ContextMenuItem icon={Type} onAction={() => addAtPosition('text')}>
                        {t('types.text')}
                      </ContextMenuItem>
                      <ContextMenuItem icon={ImageIcon} onAction={() => addAtPosition('image')}>
                        {t('types.image')}
                      </ContextMenuItem>
                      <ContextMenuItem icon={Award} onAction={() => addAtPosition('badge')}>
                        {t('types.badge')}
                      </ContextMenuItem>
                      <ContextMenuItem icon={Megaphone} onAction={() => addAtPosition('marquee')}>
                        {t('types.marquee')}
                      </ContextMenuItem>
                    </ContextMenuSection>

                    <ContextMenuSeparator />
                    <ContextMenuSection title={t('toolboxCategories.interactive')}>
                      <ContextMenuItem
                        icon={MousePointerClick}
                        onAction={() => addAtPosition('button')}
                      >
                        {t('types.button')}
                      </ContextMenuItem>
                      <ContextMenuItem icon={Clock} onAction={() => addAtPosition('countdown')}>
                        {t('types.countdown')}
                      </ContextMenuItem>
                      <ContextMenuItem icon={Gift} onAction={() => addAtPosition('prizeList')}>
                        {t('types.prizeList')}
                      </ContextMenuItem>
                      <ContextMenuItem
                        icon={MessageCircle}
                        onAction={() => addAtPosition('social')}
                      >
                        {t('types.social')}
                      </ContextMenuItem>
                      <ContextMenuItem icon={Volume2} onAction={() => addAtPosition('audio')}>
                        {t('types.audio')}
                      </ContextMenuItem>
                    </ContextMenuSection>

                    <ContextMenuSeparator />
                    <ContextMenuSection title={t('toolboxCategories.decor')}>
                      <ContextMenuItem icon={Shapes} onAction={() => addAtPosition('shape')}>
                        {t('types.shape')}
                      </ContextMenuItem>
                      <ContextMenuItem icon={Minus} onAction={() => addAtPosition('divider')}>
                        {t('types.divider')}
                      </ContextMenuItem>
                    </ContextMenuSection>
                  </ContextMenuSubmenu>

                  <ContextMenuSeparator />

                  <ContextMenuItem
                    icon={Undo2}
                    shortcut="⌘Z"
                    isDisabled={!state.past.length}
                    onAction={() => dispatch({ type: 'undo' })}
                  >
                    {t('undo')}
                  </ContextMenuItem>
                  <ContextMenuItem
                    icon={Redo2}
                    shortcut="⇧⌘Z"
                    isDisabled={!state.future.length}
                    onAction={() => dispatch({ type: 'redo' })}
                  >
                    {t('redo')}
                  </ContextMenuItem>

                  <ContextMenuSeparator />

                  <ContextMenuItem icon={Maximize} onAction={() => setAutoFit(true)}>
                    {t('fit')}
                  </ContextMenuItem>
                  <ContextMenuItem icon={ZoomIn} onAction={() => setZoomManually(zoom + 0.1)}>
                    {t('zoomIn')}
                  </ContextMenuItem>
                  <ContextMenuItem icon={ZoomOut} onAction={() => setZoomManually(zoom - 0.1)}>
                    {t('zoomOut')}
                  </ContextMenuItem>

                  {selectedElement(state) && (
                    <>
                      <ContextMenuSeparator />
                      <ContextMenuItem
                        icon={X}
                        onAction={() => dispatch({ type: 'select', id: null })}
                      >
                        {t('context.deselect')}
                      </ContextMenuItem>
                    </>
                  )}
                </>
              )}
            </ContextMenu>
          </ContextMenuTrigger>

          {hideHeader && (
            <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1.5 px-3 py-1.5 rounded-full shadow-lg border bg-background/80 backdrop-blur-md pointer-events-auto shrink-0">
              <TooltipTrigger>
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  aria-label={t('undo')}
                  disabled={!state.past.length}
                  onClick={() => dispatch({ type: 'undo' })}
                  className="size-7 rounded-full p-0"
                >
                  <Undo2 className="size-3.5" />
                </Button>
                <Tooltip>{`${t('undo')} (⌘Z)`}</Tooltip>
              </TooltipTrigger>
              <TooltipTrigger>
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  aria-label={t('redo')}
                  disabled={!state.future.length}
                  onClick={() => dispatch({ type: 'redo' })}
                  className="size-7 rounded-full p-0"
                >
                  <Redo2 className="size-3.5" />
                </Button>
                <Tooltip>{`${t('redo')} (⇧⌘Z)`}</Tooltip>
              </TooltipTrigger>
              <span className="h-3 w-px bg-border mx-0.5" />
              <Button
                type="button"
                variant="ghost"
                size="xs"
                aria-label={t('zoomOut')}
                onClick={() => setZoomManually(zoom - 0.1)}
                className="size-7 rounded-full p-0"
              >
                <Minus className="size-3.5" />
              </Button>
              <span className="min-w-9 text-center font-mono text-xs">
                {Math.round(zoom * 100)}%
              </span>
              <Button
                type="button"
                variant="ghost"
                size="xs"
                aria-label={t('zoomIn')}
                onClick={() => setZoomManually(zoom + 0.1)}
                className="size-7 rounded-full p-0"
              >
                <Plus className="size-3.5" />
              </Button>
              <TooltipTrigger>
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  aria-label={t('fit')}
                  onClick={() => setAutoFit(true)}
                  className="size-7 rounded-full p-0"
                >
                  <Maximize className="size-3.5" />
                </Button>
                <Tooltip>{t('fit')}</Tooltip>
              </TooltipTrigger>
              <span className="h-3 w-px bg-border mx-0.5" />
              <div className="inline-flex rounded-full border bg-muted/50 p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => setPreview(false)}
                  className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium transition-colors ${
                    !preview ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground'
                  }`}
                >
                  <Pencil className="size-3" />
                  <span>{t('edit')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPreview(true);
                    setReplay((n) => n + 1);
                    dispatch({ type: 'select', id: null });
                  }}
                  className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium transition-colors ${
                    preview ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground'
                  }`}
                >
                  <Play className="size-3" />
                  <span>{t('preview')}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        <aside className="min-h-0 overflow-y-auto border-l bg-card p-4">
          <PropertiesPanel
            state={state}
            dispatch={dispatch}
            brand={brand}
            onUploadImage={onUploadImage}
          />
        </aside>
      </div>
    </div>
  );
}
