'use client';

import type { CanvasPrize } from '@playora/ui/campaign';
import { Button, Separator, Tabs, Tooltip } from '@playora/ui/components';
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
  ChevronRightIcon,
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
import { cx } from '@playora/ui/utils/cx';
import { useTranslations } from 'next-intl';
import {
  type ComponentType,
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

function CtxItem({
  icon: Icon,
  shortcut,
  isDisabled,
  variant = 'default',
  onAction,
  children,
}: {
  icon?: ComponentType<{ className?: string }>;
  shortcut?: string;
  isDisabled?: boolean;
  variant?: 'default' | 'danger';
  onAction: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      disabled={isDisabled}
      onClick={onAction}
      className={cx(
        'flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors disabled:pointer-events-none disabled:opacity-45',
        variant === 'danger'
          ? 'text-text-error-primary hover:bg-notification-error-background'
          : 'text-text-primary hover:bg-background-secondary-hover',
      )}
    >
      <span className="flex items-center gap-2 truncate">
        {Icon && <Icon className="size-3.5 shrink-0 opacity-75" />}
        <span className="truncate">{children}</span>
      </span>
      {shortcut && <span className="font-mono text-[10px] text-text-tertiary">{shortcut}</span>}
    </button>
  );
}

function CtxSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col py-0.5">
      <span className="px-2.5 py-1 text-[10px] font-semibold tracking-wider text-text-tertiary uppercase">
        {title}
      </span>
      {children}
    </div>
  );
}

function CtxSubmenu({
  label,
  icon: Icon,
  className,
  children,
}: {
  label: string;
  textValue?: string;
  icon?: ComponentType<{ className?: string }>;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className="group/sub relative">
      <div className="flex w-full cursor-default items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-xs text-text-primary hover:bg-background-secondary-hover">
        <span className="flex items-center gap-2 truncate">
          {Icon && <Icon className="size-3.5 shrink-0 opacity-75" />}
          <span className="truncate">{label}</span>
        </span>
        <ChevronRightIcon className="size-3.5 shrink-0 text-text-tertiary" />
      </div>
      <div
        className={cx(
          'invisible absolute top-0 left-full z-50 ml-1 rounded-2xl border border-border-button-default bg-background-primary-default p-1.5 opacity-0 shadow-dropdown transition-opacity group-hover/sub:visible group-hover/sub:opacity-100',
          className ?? 'w-48',
        )}
      >
        {children}
      </div>
    </div>
  );
}

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
  orgId,
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
  orgId?: string;
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

  const runMenuAction = (fn: () => void) => {
    fn();
    setMenuState(null);
  };

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
            <Tooltip delay={150}>
              <Tooltip.Trigger>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  isIconOnly
                  aria-label={t('undo')}
                  isDisabled={!state.past.length}
                  onPress={() => dispatch({ type: 'undo' })}
                  className="size-8 rounded-full p-0"
                >
                  <Undo2 className="size-4" />
                </Button>
              </Tooltip.Trigger>
              <Tooltip.Content>{`${t('undo')} (⌘Z)`}</Tooltip.Content>
            </Tooltip>
            <Tooltip delay={150}>
              <Tooltip.Trigger>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  isIconOnly
                  aria-label={t('redo')}
                  isDisabled={!state.future.length}
                  onPress={() => dispatch({ type: 'redo' })}
                  className="size-8 rounded-full p-0"
                >
                  <Redo2 className="size-4" />
                </Button>
              </Tooltip.Trigger>
              <Tooltip.Content>{`${t('redo')} (⇧⌘Z)`}</Tooltip.Content>
            </Tooltip>
          </div>

          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              isIconOnly
              aria-label={t('zoomOut')}
              onPress={() => setZoomManually(zoom - 0.1)}
              className="size-8 rounded-full p-0"
            >
              <Minus className="size-4" />
            </Button>
            <span className="w-12 text-center font-mono text-xs">{Math.round(zoom * 100)}%</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              isIconOnly
              aria-label={t('zoomIn')}
              onPress={() => setZoomManually(zoom + 0.1)}
              className="size-8 rounded-full p-0"
            >
              <Plus className="size-4" />
            </Button>
            <Tooltip delay={150}>
              <Tooltip.Trigger>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  isIconOnly
                  aria-label={t('fit')}
                  onPress={() => setAutoFit(true)}
                  className="size-8 rounded-full p-0"
                >
                  <Maximize className="size-4" />
                </Button>
              </Tooltip.Trigger>
              <Tooltip.Content>{t('fit')}</Tooltip.Content>
            </Tooltip>
          </div>

          <div className="flex items-center gap-2">
            {toolbarEnd}
            <Tabs
              selectedKey={preview ? 'preview' : 'edit'}
              onSelectionChange={(key) => {
                if (key === 'preview') {
                  setPreview(true);
                  setReplay((n) => n + 1);
                  dispatch({ type: 'select', id: null });
                } else {
                  setPreview(false);
                }
              }}
            >
              <Tabs.ListContainer>
                <Tabs.List aria-label={t('edit')}>
                  <Tabs.Tab
                    id="edit"
                    className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium"
                  >
                    <Pencil className="size-3.5" />
                    <span>{t('edit')}</span>
                    <Tabs.Indicator />
                  </Tabs.Tab>
                  <Tabs.Tab
                    id="preview"
                    className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium"
                  >
                    <Play className="size-3.5" />
                    <span>{t('preview')}</span>
                    <Tabs.Indicator />
                  </Tabs.Tab>
                </Tabs.List>
              </Tabs.ListContainer>
            </Tabs>
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
            className="flex h-full min-h-0 justify-center overflow-auto bg-muted/20 py-10"
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

          {menuState && (
            <>
              <div
                aria-hidden="true"
                className="fixed inset-0 z-40"
                onClick={() => setMenuState(null)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setMenuState(null);
                }}
              />
              <div
                role="menu"
                data-testid="canvas-context-menu"
                className="fixed z-50 w-56 rounded-2xl border border-border-button-default bg-background-primary-default p-1.5 shadow-dropdown"
                style={{ left: menuState.x, top: menuState.y }}
              >
                {targetElement && targetId ? (
                  <>
                    <CtxItem
                      icon={Copy}
                      shortcut="⌘D"
                      isDisabled={isSingleton}
                      onAction={() =>
                        runMenuAction(() => dispatch({ type: 'duplicate', id: targetId }))
                      }
                    >
                      {t('context.duplicate')}
                    </CtxItem>
                    <CtxItem
                      icon={targetElement.locked ? Unlock : Lock}
                      onAction={() =>
                        runMenuAction(() =>
                          dispatch({
                            type: 'update',
                            id: targetId,
                            patch: { locked: !targetElement.locked },
                          }),
                        )
                      }
                    >
                      {targetElement.locked ? t('context.unlock') : t('context.lock')}
                    </CtxItem>
                    <CtxItem
                      icon={targetElement.hidden ? Eye : EyeOff}
                      onAction={() =>
                        runMenuAction(() =>
                          dispatch({
                            type: 'update',
                            id: targetId,
                            patch: { hidden: !targetElement.hidden },
                          }),
                        )
                      }
                    >
                      {targetElement.hidden ? t('context.show') : t('context.hide')}
                    </CtxItem>

                    <Separator className="my-1" />

                    <CtxSubmenu
                      label={t('context.layerOrder')}
                      textValue={t('context.layerOrder')}
                      icon={Layers}
                      className="w-48"
                    >
                      <CtxItem
                        icon={ArrowUpToLine}
                        isDisabled={isLast}
                        onAction={() =>
                          runMenuAction(() =>
                            dispatch({
                              type: 'reorder',
                              id: targetId,
                              toIndex: screen.elements.length - 1,
                            }),
                          )
                        }
                      >
                        {t('context.bringFront')}
                      </CtxItem>
                      <CtxItem
                        icon={ChevronUp}
                        isDisabled={isLast}
                        onAction={() =>
                          runMenuAction(() =>
                            dispatch({ type: 'reorder', id: targetId, toIndex: targetIndex + 1 }),
                          )
                        }
                      >
                        {t('context.bringForward')}
                      </CtxItem>
                      <CtxItem
                        icon={ChevronDown}
                        isDisabled={isFirst}
                        onAction={() =>
                          runMenuAction(() =>
                            dispatch({ type: 'reorder', id: targetId, toIndex: targetIndex - 1 }),
                          )
                        }
                      >
                        {t('context.sendBackward')}
                      </CtxItem>
                      <CtxItem
                        icon={ArrowDownToLine}
                        isDisabled={isFirst}
                        onAction={() =>
                          runMenuAction(() =>
                            dispatch({ type: 'reorder', id: targetId, toIndex: 0 }),
                          )
                        }
                      >
                        {t('context.sendBack')}
                      </CtxItem>
                    </CtxSubmenu>

                    <CtxSubmenu
                      label={t('context.align')}
                      textValue={t('context.align')}
                      icon={AlignCenter}
                      className="w-48"
                    >
                      <CtxItem
                        icon={AlignHorizontalJustifyCenter}
                        onAction={() =>
                          runMenuAction(() =>
                            dispatch({
                              type: 'update',
                              id: targetId,
                              patch: { x: Math.round((ARTBOARD_WIDTH - targetElement.w) / 2) },
                            }),
                          )
                        }
                      >
                        {t('context.centerH')}
                      </CtxItem>
                      <CtxItem
                        icon={AlignVerticalJustifyCenter}
                        onAction={() =>
                          runMenuAction(() =>
                            dispatch({
                              type: 'update',
                              id: targetId,
                              patch: { y: Math.round((screen.height - targetElement.h) / 2) },
                            }),
                          )
                        }
                      >
                        {t('context.centerV')}
                      </CtxItem>
                      <CtxItem
                        icon={AlignLeft}
                        onAction={() =>
                          runMenuAction(() =>
                            dispatch({ type: 'update', id: targetId, patch: { x: 16 } }),
                          )
                        }
                      >
                        {t('context.alignLeft')}
                      </CtxItem>
                      <CtxItem
                        icon={AlignRight}
                        onAction={() =>
                          runMenuAction(() =>
                            dispatch({
                              type: 'update',
                              id: targetId,
                              patch: { x: ARTBOARD_WIDTH - targetElement.w - 16 },
                            }),
                          )
                        }
                      >
                        {t('context.alignRight')}
                      </CtxItem>
                      <CtxItem
                        icon={Maximize2}
                        onAction={() =>
                          runMenuAction(() =>
                            dispatch({
                              type: 'update',
                              id: targetId,
                              patch: { x: 0, w: ARTBOARD_WIDTH },
                            }),
                          )
                        }
                      >
                        {t('context.fullWidth')}
                      </CtxItem>
                    </CtxSubmenu>

                    {targetElement.rotation !== 0 && (
                      <CtxItem
                        icon={RotateCcw}
                        onAction={() =>
                          runMenuAction(() =>
                            dispatch({ type: 'update', id: targetId, patch: { rotation: 0 } }),
                          )
                        }
                      >
                        {t('context.resetRotation')}
                      </CtxItem>
                    )}

                    <Separator className="my-1" />

                    <CtxItem
                      variant="danger"
                      icon={Trash2}
                      shortcut="Del"
                      isDisabled={isSingleton}
                      onAction={() =>
                        runMenuAction(() => dispatch({ type: 'remove', id: targetId }))
                      }
                    >
                      {t('context.delete')}
                    </CtxItem>
                  </>
                ) : (
                  <>
                    <CtxSubmenu
                      label={t('context.addElement')}
                      textValue={t('context.addElement')}
                      icon={Plus}
                      className="w-52"
                    >
                      <CtxSection title={t('toolboxCategories.content')}>
                        <CtxItem icon={Type} onAction={() => addAtPosition('text')}>
                          {t('types.text')}
                        </CtxItem>
                        <CtxItem icon={ImageIcon} onAction={() => addAtPosition('image')}>
                          {t('types.image')}
                        </CtxItem>
                        <CtxItem icon={Award} onAction={() => addAtPosition('badge')}>
                          {t('types.badge')}
                        </CtxItem>
                        <CtxItem icon={Megaphone} onAction={() => addAtPosition('marquee')}>
                          {t('types.marquee')}
                        </CtxItem>
                      </CtxSection>

                      <Separator className="my-1" />
                      <CtxSection title={t('toolboxCategories.interactive')}>
                        <CtxItem icon={MousePointerClick} onAction={() => addAtPosition('button')}>
                          {t('types.button')}
                        </CtxItem>
                        <CtxItem icon={Clock} onAction={() => addAtPosition('countdown')}>
                          {t('types.countdown')}
                        </CtxItem>
                        <CtxItem icon={Gift} onAction={() => addAtPosition('prizeList')}>
                          {t('types.prizeList')}
                        </CtxItem>
                        <CtxItem icon={MessageCircle} onAction={() => addAtPosition('social')}>
                          {t('types.social')}
                        </CtxItem>
                        <CtxItem icon={Volume2} onAction={() => addAtPosition('audio')}>
                          {t('types.audio')}
                        </CtxItem>
                      </CtxSection>

                      <Separator className="my-1" />
                      <CtxSection title={t('toolboxCategories.decor')}>
                        <CtxItem icon={Shapes} onAction={() => addAtPosition('shape')}>
                          {t('types.shape')}
                        </CtxItem>
                        <CtxItem icon={Minus} onAction={() => addAtPosition('divider')}>
                          {t('types.divider')}
                        </CtxItem>
                      </CtxSection>
                    </CtxSubmenu>

                    <Separator className="my-1" />

                    <CtxItem
                      icon={Undo2}
                      shortcut="⌘Z"
                      isDisabled={!state.past.length}
                      onAction={() => runMenuAction(() => dispatch({ type: 'undo' }))}
                    >
                      {t('undo')}
                    </CtxItem>
                    <CtxItem
                      icon={Redo2}
                      shortcut="⇧⌘Z"
                      isDisabled={!state.future.length}
                      onAction={() => runMenuAction(() => dispatch({ type: 'redo' }))}
                    >
                      {t('redo')}
                    </CtxItem>

                    <Separator className="my-1" />

                    <CtxItem icon={Maximize} onAction={() => runMenuAction(() => setAutoFit(true))}>
                      {t('fit')}
                    </CtxItem>
                    <CtxItem
                      icon={ZoomIn}
                      onAction={() => runMenuAction(() => setZoomManually(zoom + 0.1))}
                    >
                      {t('zoomIn')}
                    </CtxItem>
                    <CtxItem
                      icon={ZoomOut}
                      onAction={() => runMenuAction(() => setZoomManually(zoom - 0.1))}
                    >
                      {t('zoomOut')}
                    </CtxItem>

                    {selectedElement(state) && (
                      <>
                        <Separator className="my-1" />
                        <CtxItem
                          icon={X}
                          onAction={() =>
                            runMenuAction(() => dispatch({ type: 'select', id: null }))
                          }
                        >
                          {t('context.deselect')}
                        </CtxItem>
                      </>
                    )}
                  </>
                )}
              </div>
            </>
          )}

          {hideHeader && (
            <div className="pointer-events-auto absolute bottom-5 left-1/2 z-30 flex shrink-0 -translate-x-1/2 items-center gap-1.5 rounded-full border bg-background/80 px-3 py-1.5 shadow-lg backdrop-blur-md">
              <Tooltip delay={150}>
                <Tooltip.Trigger>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    isIconOnly
                    aria-label={t('undo')}
                    isDisabled={!state.past.length}
                    onPress={() => dispatch({ type: 'undo' })}
                    className="size-7 rounded-full p-0"
                  >
                    <Undo2 className="size-3.5" />
                  </Button>
                </Tooltip.Trigger>
                <Tooltip.Content>{`${t('undo')} (⌘Z)`}</Tooltip.Content>
              </Tooltip>
              <Tooltip delay={150}>
                <Tooltip.Trigger>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    isIconOnly
                    aria-label={t('redo')}
                    isDisabled={!state.future.length}
                    onPress={() => dispatch({ type: 'redo' })}
                    className="size-7 rounded-full p-0"
                  >
                    <Redo2 className="size-3.5" />
                  </Button>
                </Tooltip.Trigger>
                <Tooltip.Content>{`${t('redo')} (⇧⌘Z)`}</Tooltip.Content>
              </Tooltip>
              <Separator orientation="vertical" className="mx-0.5 h-3" />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                isIconOnly
                aria-label={t('zoomOut')}
                onPress={() => setZoomManually(zoom - 0.1)}
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
                size="sm"
                isIconOnly
                aria-label={t('zoomIn')}
                onPress={() => setZoomManually(zoom + 0.1)}
                className="size-7 rounded-full p-0"
              >
                <Plus className="size-3.5" />
              </Button>
              <Tooltip delay={150}>
                <Tooltip.Trigger>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    isIconOnly
                    aria-label={t('fit')}
                    onPress={() => setAutoFit(true)}
                    className="size-7 rounded-full p-0"
                  >
                    <Maximize className="size-3.5" />
                  </Button>
                </Tooltip.Trigger>
                <Tooltip.Content>{t('fit')}</Tooltip.Content>
              </Tooltip>
              <Separator orientation="vertical" className="mx-0.5 h-3" />
              <Tabs
                selectedKey={preview ? 'preview' : 'edit'}
                onSelectionChange={(key) => {
                  if (key === 'preview') {
                    setPreview(true);
                    setReplay((n) => n + 1);
                    dispatch({ type: 'select', id: null });
                  } else {
                    setPreview(false);
                  }
                }}
              >
                <Tabs.ListContainer>
                  <Tabs.List aria-label={t('edit')}>
                    <Tabs.Tab
                      id="edit"
                      className="flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium"
                    >
                      <Pencil className="size-3" />
                      <span>{t('edit')}</span>
                      <Tabs.Indicator />
                    </Tabs.Tab>
                    <Tabs.Tab
                      id="preview"
                      className="flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium"
                    >
                      <Play className="size-3" />
                      <span>{t('preview')}</span>
                      <Tabs.Indicator />
                    </Tabs.Tab>
                  </Tabs.List>
                </Tabs.ListContainer>
              </Tabs>
            </div>
          )}
        </div>

        <aside className="min-h-0 overflow-y-auto border-l bg-card p-4">
          <PropertiesPanel
            state={state}
            dispatch={dispatch}
            brand={brand}
            orgId={orgId}
            onUploadImage={onUploadImage}
          />
        </aside>
      </div>
    </div>
  );
}
