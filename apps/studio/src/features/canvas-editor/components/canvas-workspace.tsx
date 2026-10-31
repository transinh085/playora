'use client';

import type { CanvasPrize } from '@playora/ui/campaign';
import { Button } from '@playora/ui/components/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@playora/ui/components/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@playora/ui/components/tooltip';
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
    <TooltipProvider>
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
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={t('undo')}
                    disabled={!state.past.length}
                    onClick={() => dispatch({ type: 'undo' })}
                    className="size-8 rounded-full"
                  >
                    <Undo2 className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{`${t('undo')} (⌘Z)`}</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={t('redo')}
                    disabled={!state.future.length}
                    onClick={() => dispatch({ type: 'redo' })}
                    className="size-8 rounded-full"
                  >
                    <Redo2 className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{`${t('redo')} (⇧⌘Z)`}</TooltipContent>
              </Tooltip>
            </div>

            <div className="flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={t('zoomOut')}
                onClick={() => setZoomManually(zoom - 0.1)}
                className="size-8 rounded-full"
              >
                <Minus className="size-4" />
              </Button>
              <span className="w-12 text-center text-xs font-mono">{Math.round(zoom * 100)}%</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={t('zoomIn')}
                onClick={() => setZoomManually(zoom + 0.1)}
                className="size-8 rounded-full"
              >
                <Plus className="size-4" />
              </Button>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label={t('fit')}
                    onClick={() => setAutoFit(true)}
                    className="size-8 rounded-full"
                  >
                    <Maximize className="size-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{t('fit')}</TooltipContent>
              </Tooltip>
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
            <main
              ref={stageRef}
              className="flex h-full min-h-0 justify-center overflow-auto py-10 bg-muted/20"
              style={{
                backgroundImage: 'radial-gradient(hsl(var(--border)) 1px, transparent 1px)',
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
              <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1.5 px-3 py-1.5 rounded-full shadow-lg border bg-background/80 backdrop-blur-md pointer-events-auto shrink-0">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={t('undo')}
                      disabled={!state.past.length}
                      onClick={() => dispatch({ type: 'undo' })}
                      className="size-7 rounded-full"
                    >
                      <Undo2 className="size-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{`${t('undo')} (⌘Z)`}</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={t('redo')}
                      disabled={!state.future.length}
                      onClick={() => dispatch({ type: 'redo' })}
                      className="size-7 rounded-full"
                    >
                      <Redo2 className="size-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{`${t('redo')} (⇧⌘Z)`}</TooltipContent>
                </Tooltip>
                <span className="h-3 w-px bg-border mx-0.5" />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={t('zoomOut')}
                  onClick={() => setZoomManually(zoom - 0.1)}
                  className="size-7 rounded-full"
                >
                  <Minus className="size-3.5" />
                </Button>
                <span className="min-w-9 text-center font-mono text-xs">
                  {Math.round(zoom * 100)}%
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={t('zoomIn')}
                  onClick={() => setZoomManually(zoom + 0.1)}
                  className="size-7 rounded-full"
                >
                  <Plus className="size-3.5" />
                </Button>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={t('fit')}
                      onClick={() => setAutoFit(true)}
                      className="size-7 rounded-full"
                    >
                      <Maximize className="size-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{t('fit')}</TooltipContent>
                </Tooltip>
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

        {/* Radix Dropdown Context Menu */}
        <DropdownMenu
          open={Boolean(menuState)}
          onOpenChange={(open) => !open && setMenuState(null)}
        >
          <DropdownMenuTrigger asChild>
            <div
              style={{
                position: 'fixed',
                left: menuState?.x ?? 0,
                top: menuState?.y ?? 0,
                width: 1,
                height: 1,
                pointerEvents: 'none',
              }}
            />
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56 rounded-2xl" align="start">
            {targetElement && targetId ? (
              <>
                <DropdownMenuItem
                  disabled={isSingleton}
                  onClick={() => dispatch({ type: 'duplicate', id: targetId })}
                >
                  <Copy className="mr-2 size-4" />
                  <span>{t('context.duplicate')}</span>
                  <DropdownMenuShortcut>⌘D</DropdownMenuShortcut>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() =>
                    dispatch({
                      type: 'update',
                      id: targetId,
                      patch: { locked: !targetElement.locked },
                    })
                  }
                >
                  {targetElement.locked ? (
                    <Unlock className="mr-2 size-4" />
                  ) : (
                    <Lock className="mr-2 size-4" />
                  )}
                  <span>{targetElement.locked ? t('context.unlock') : t('context.lock')}</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() =>
                    dispatch({
                      type: 'update',
                      id: targetId,
                      patch: { hidden: !targetElement.hidden },
                    })
                  }
                >
                  {targetElement.hidden ? (
                    <Eye className="mr-2 size-4" />
                  ) : (
                    <EyeOff className="mr-2 size-4" />
                  )}
                  <span>{targetElement.hidden ? t('context.show') : t('context.hide')}</span>
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <Layers className="mr-2 size-4" />
                    <span>{t('context.layerOrder')}</span>
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="w-48 rounded-xl">
                    <DropdownMenuItem
                      disabled={isLast}
                      onClick={() =>
                        dispatch({
                          type: 'reorder',
                          id: targetId,
                          toIndex: screen.elements.length - 1,
                        })
                      }
                    >
                      <ArrowUpToLine className="mr-2 size-4" />
                      <span>{t('context.bringFront')}</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      disabled={isLast}
                      onClick={() =>
                        dispatch({ type: 'reorder', id: targetId, toIndex: targetIndex + 1 })
                      }
                    >
                      <ChevronUp className="mr-2 size-4" />
                      <span>{t('context.bringForward')}</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      disabled={isFirst}
                      onClick={() =>
                        dispatch({ type: 'reorder', id: targetId, toIndex: targetIndex - 1 })
                      }
                    >
                      <ChevronDown className="mr-2 size-4" />
                      <span>{t('context.sendBackward')}</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      disabled={isFirst}
                      onClick={() => dispatch({ type: 'reorder', id: targetId, toIndex: 0 })}
                    >
                      <ArrowDownToLine className="mr-2 size-4" />
                      <span>{t('context.sendBack')}</span>
                    </DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>

                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <AlignCenter className="mr-2 size-4" />
                    <span>{t('context.align')}</span>
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="w-48 rounded-xl">
                    <DropdownMenuItem
                      onClick={() =>
                        dispatch({
                          type: 'update',
                          id: targetId,
                          patch: { x: Math.round((ARTBOARD_WIDTH - targetElement.w) / 2) },
                        })
                      }
                    >
                      <AlignHorizontalJustifyCenter className="mr-2 size-4" />
                      <span>{t('context.centerH')}</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() =>
                        dispatch({
                          type: 'update',
                          id: targetId,
                          patch: { y: Math.round((screen.height - targetElement.h) / 2) },
                        })
                      }
                    >
                      <AlignVerticalJustifyCenter className="mr-2 size-4" />
                      <span>{t('context.centerV')}</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => dispatch({ type: 'update', id: targetId, patch: { x: 16 } })}
                    >
                      <AlignLeft className="mr-2 size-4" />
                      <span>{t('context.alignLeft')}</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() =>
                        dispatch({
                          type: 'update',
                          id: targetId,
                          patch: { x: ARTBOARD_WIDTH - targetElement.w - 16 },
                        })
                      }
                    >
                      <AlignRight className="mr-2 size-4" />
                      <span>{t('context.alignRight')}</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() =>
                        dispatch({
                          type: 'update',
                          id: targetId,
                          patch: { x: 0, w: ARTBOARD_WIDTH },
                        })
                      }
                    >
                      <Maximize2 className="mr-2 size-4" />
                      <span>{t('context.fullWidth')}</span>
                    </DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>

                {targetElement.rotation !== 0 && (
                  <DropdownMenuItem
                    onClick={() =>
                      dispatch({ type: 'update', id: targetId, patch: { rotation: 0 } })
                    }
                  >
                    <RotateCcw className="mr-2 size-4" />
                    <span>{t('context.resetRotation')}</span>
                  </DropdownMenuItem>
                )}

                <DropdownMenuSeparator />

                <DropdownMenuItem
                  variant="destructive"
                  disabled={isSingleton}
                  onClick={() => dispatch({ type: 'remove', id: targetId })}
                >
                  <Trash2 className="mr-2 size-4" />
                  <span>{t('context.delete')}</span>
                  <DropdownMenuShortcut>Del</DropdownMenuShortcut>
                </DropdownMenuItem>
              </>
            ) : (
              <>
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <Plus className="mr-2 size-4" />
                    <span>{t('context.addElement')}</span>
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent className="w-52 rounded-xl">
                    <DropdownMenuLabel>{t('toolboxCategories.content')}</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => addAtPosition('text')}>
                      <Type className="mr-2 size-4" />
                      <span>{t('types.text')}</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => addAtPosition('image')}>
                      <ImageIcon className="mr-2 size-4" />
                      <span>{t('types.image')}</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => addAtPosition('badge')}>
                      <Award className="mr-2 size-4" />
                      <span>{t('types.badge')}</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => addAtPosition('marquee')}>
                      <Megaphone className="mr-2 size-4" />
                      <span>{t('types.marquee')}</span>
                    </DropdownMenuItem>

                    <DropdownMenuSeparator />
                    <DropdownMenuLabel>{t('toolboxCategories.interactive')}</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => addAtPosition('button')}>
                      <MousePointerClick className="mr-2 size-4" />
                      <span>{t('types.button')}</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => addAtPosition('countdown')}>
                      <Clock className="mr-2 size-4" />
                      <span>{t('types.countdown')}</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => addAtPosition('prizeList')}>
                      <Gift className="mr-2 size-4" />
                      <span>{t('types.prizeList')}</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => addAtPosition('social')}>
                      <MessageCircle className="mr-2 size-4" />
                      <span>{t('types.social')}</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => addAtPosition('audio')}>
                      <Volume2 className="mr-2 size-4" />
                      <span>{t('types.audio')}</span>
                    </DropdownMenuItem>

                    <DropdownMenuSeparator />
                    <DropdownMenuLabel>{t('toolboxCategories.decor')}</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => addAtPosition('shape')}>
                      <Shapes className="mr-2 size-4" />
                      <span>{t('types.shape')}</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => addAtPosition('divider')}>
                      <Minus className="mr-2 size-4" />
                      <span>{t('types.divider')}</span>
                    </DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>

                <DropdownMenuSeparator />

                <DropdownMenuItem
                  disabled={!state.past.length}
                  onClick={() => dispatch({ type: 'undo' })}
                >
                  <Undo2 className="mr-2 size-4" />
                  <span>{t('undo')}</span>
                  <DropdownMenuShortcut>⌘Z</DropdownMenuShortcut>
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={!state.future.length}
                  onClick={() => dispatch({ type: 'redo' })}
                >
                  <Redo2 className="mr-2 size-4" />
                  <span>{t('redo')}</span>
                  <DropdownMenuShortcut>⇧⌘Z</DropdownMenuShortcut>
                </DropdownMenuItem>

                <DropdownMenuSeparator />

                <DropdownMenuItem onClick={() => setAutoFit(true)}>
                  <Maximize className="mr-2 size-4" />
                  <span>{t('fit')}</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setZoomManually(zoom + 0.1)}>
                  <ZoomIn className="mr-2 size-4" />
                  <span>{t('zoomIn')}</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setZoomManually(zoom - 0.1)}>
                  <ZoomOut className="mr-2 size-4" />
                  <span>{t('zoomOut')}</span>
                </DropdownMenuItem>

                {selectedElement(state) && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => dispatch({ type: 'select', id: null })}>
                      <X className="mr-2 size-4" />
                      <span>{t('context.deselect')}</span>
                    </DropdownMenuItem>
                  </>
                )}
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </TooltipProvider>
  );
}
