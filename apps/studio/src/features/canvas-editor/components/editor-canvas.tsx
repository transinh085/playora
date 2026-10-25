'use client';

import { Tag, theme } from 'antd';
import { type Dispatch, useCallback, useEffect, useRef, useState } from 'react';
import { currentScreen, type EditorAction, type EditorState } from '../lib/editor-state';
import {
  type Box,
  type Guide,
  moveWithSnap,
  resizeBox,
  rotationFromPointer,
  snapTargets,
} from '../lib/geometry';
import {
  type AddableType,
  ARTBOARD_WIDTH,
  type BrandPalette,
  type GameStageElement,
  MAX_ARTBOARD_HEIGHT,
  MIN_ARTBOARD_HEIGHT,
} from '../lib/model';
import { type CanvasLabels, type CanvasPrize, CanvasScreen } from './canvas-screen';

/** MIME type the toolbox puts on drag events, carrying an `AddableType`. */
export const TOOLBOX_MIME = 'application/x-playora-canvas-element';

type Gesture =
  | { kind: 'move'; id: string; x0: number; y0: number; box: Box; others: Box[]; started: boolean }
  | {
      kind: 'resize';
      id: string;
      handle: [number, number];
      x0: number;
      y0: number;
      box: Box;
      started: boolean;
    }
  | { kind: 'rotate'; id: string; box: Box; started: boolean }
  | { kind: 'height'; y0: number; height: number; started: boolean };

const HANDLES: [number, number][] = [
  [-1, -1],
  [0, -1],
  [1, -1],
  [1, 0],
  [1, 1],
  [0, 1],
  [-1, 1],
  [-1, 0],
];
const CURSORS: Record<string, string> = {
  '-1,-1': 'nwse-resize',
  '1,1': 'nwse-resize',
  '1,-1': 'nesw-resize',
  '-1,1': 'nesw-resize',
  '0,-1': 'ns-resize',
  '0,1': 'ns-resize',
  '-1,0': 'ew-resize',
  '1,0': 'ew-resize',
};

const toBox = ({ x, y, w, h, rotation }: Box): Box => ({ x, y, w, h, rotation });

export function EditorCanvas({
  state,
  dispatch,
  zoom,
  preview,
  replay,
  brand,
  labels,
  newElementName,
  heightLabel,
  renderStage,
  prizes,
}: {
  state: EditorState;
  dispatch: Dispatch<EditorAction>;
  zoom: number;
  preview: boolean;
  replay: number;
  brand: BrandPalette;
  labels: CanvasLabels;
  newElementName: (type: AddableType) => string;
  heightLabel: string;
  /** Draws the template's mechanism (idle) inside the game stage instead of the demo wheel. */
  renderStage?: (element: GameStageElement) => React.ReactNode;
  prizes?: CanvasPrize[];
}) {
  const { token } = theme.useToken();
  const screen = currentScreen(state);
  const artboardRef = useRef<HTMLDivElement>(null);
  const gesture = useRef<Gesture | null>(null);
  const [guides, setGuides] = useState<Guide[]>([]);
  const [badge, setBadge] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // Latest values for the window listeners, which are bound once.
  const latest = useRef({ state, zoom, dispatch });
  latest.current = { state, zoom, dispatch };

  const toArtboard = useCallback((clientX: number, clientY: number) => {
    const rect = artboardRef.current?.getBoundingClientRect();
    const z = latest.current.zoom;
    return rect ? { x: (clientX - rect.left) / z, y: (clientY - rect.top) / z } : { x: 0, y: 0 };
  }, []);

  useEffect(() => {
    function onMove(e: PointerEvent) {
      const g = gesture.current;
      if (!g) return;
      const { zoom: z, dispatch: send, state: s } = latest.current;
      const coalesce = g.started;
      g.started = true;

      if (g.kind === 'move') {
        const dx = (e.clientX - g.x0) / z;
        const dy = (e.clientY - g.y0) / z;
        const height = currentScreen(s).height;
        const { box, guides: lines } = e.altKey
          ? {
              box: { ...g.box, x: Math.round(g.box.x + dx), y: Math.round(g.box.y + dy) },
              guides: [],
            }
          : moveWithSnap(g.box, dx, dy, snapTargets(ARTBOARD_WIDTH, height, g.others));
        setGuides(lines);
        send({ type: 'update', id: g.id, patch: { x: box.x, y: box.y }, coalesce });
      } else if (g.kind === 'resize') {
        const box = resizeBox(
          g.box,
          g.handle,
          (e.clientX - g.x0) / z,
          (e.clientY - g.y0) / z,
          e.shiftKey,
        );
        setBadge(`${box.w} × ${box.h}`);
        send({
          type: 'update',
          id: g.id,
          patch: { x: box.x, y: box.y, w: box.w, h: box.h },
          coalesce,
        });
      } else if (g.kind === 'rotate') {
        const p = toArtboard(e.clientX, e.clientY);
        const rotation = rotationFromPointer(g.box, p.x, p.y, e.shiftKey ? 15 : undefined);
        setBadge(`${rotation}°`);
        send({ type: 'update', id: g.id, patch: { rotation }, coalesce });
      } else {
        const next = Math.round(g.height + (e.clientY - g.y0) / z);
        const height = Math.max(MIN_ARTBOARD_HEIGHT, Math.min(MAX_ARTBOARD_HEIGHT, next));
        setBadge(`${ARTBOARD_WIDTH} × ${height}`);
        send({ type: 'updateScreen', patch: { height }, coalesce });
      }
    }
    function onUp() {
      gesture.current = null;
      setGuides([]);
      setBadge(null);
    }
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [toArtboard]);

  // Keyboard shortcuts while no form field has focus.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (
        target?.closest('input, textarea, [contenteditable="true"], .ant-select, .ant-color-picker')
      )
        return;
      const { state: s, dispatch: send } = latest.current;
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        send({ type: e.shiftKey ? 'redo' : 'undo' });
        return;
      }
      if (mod && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        send({ type: 'redo' });
        return;
      }
      const selected = currentScreen(s).elements.find((el) => el.id === s.selectedId);
      if (!selected) return;
      if (e.key === 'Escape') send({ type: 'select', id: null });
      else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        send({ type: 'remove', id: selected.id });
      } else if (mod && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        send({ type: 'duplicate', id: selected.id });
      } else if (e.key.startsWith('Arrow') && !selected.locked) {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
        const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;
        send({
          type: 'update',
          id: selected.id,
          patch: { x: selected.x + dx, y: selected.y + dy },
        });
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const selected = screen.elements.find((e) => e.id === state.selectedId && !e.hidden);
  const width = ARTBOARD_WIDTH * zoom;
  const height = screen.height * zoom;

  const frame = (b: Box) => ({
    position: 'absolute' as const,
    left: b.x * zoom,
    top: b.y * zoom,
    width: b.w * zoom,
    height: b.h * zoom,
    transform: `rotate(${b.rotation}deg)`,
  });

  return (
    <div
      ref={artboardRef}
      role="application"
      className="relative"
      style={{ width, height, boxShadow: token.boxShadowSecondary, borderRadius: 4 }}
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes(TOOLBOX_MIME)) e.preventDefault();
      }}
      onDrop={(e) => {
        const type = e.dataTransfer.getData(TOOLBOX_MIME) as AddableType;
        if (!type) return;
        e.preventDefault();
        const p = toArtboard(e.clientX, e.clientY);
        dispatch({ type: 'add', elementType: type, cx: p.x, cy: p.y, name: newElementName(type) });
      }}
      data-testid="canvas-artboard"
    >
      <CanvasScreen
        screen={screen}
        brand={brand}
        scale={zoom}
        labels={labels}
        animate={preview ? replay : undefined}
        runtime={{ renderStage, prizes }}
      />

      {!preview && (
        // Interaction layer: empty-space clicks deselect; each element gets a transparent hit box.
        <div
          className="absolute inset-0"
          onPointerDown={() => dispatch({ type: 'select', id: null })}
          role="presentation"
        >
          {screen.elements.map((el) =>
            el.hidden ? null : (
              <div
                key={el.id}
                data-testid={`canvas-element-${el.type}`}
                style={{
                  ...frame(el),
                  cursor: el.locked ? 'default' : 'move',
                  outline:
                    hoveredId === el.id && el.id !== state.selectedId
                      ? `1px solid ${token.colorPrimaryBorder}`
                      : undefined,
                }}
                onPointerEnter={() => setHoveredId(el.id)}
                onPointerLeave={() => setHoveredId((h) => (h === el.id ? null : h))}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  dispatch({ type: 'select', id: el.id });
                  if (el.locked) return;
                  gesture.current = {
                    kind: 'move',
                    id: el.id,
                    x0: e.clientX,
                    y0: e.clientY,
                    box: toBox(el),
                    others: screen.elements.filter((o) => o.id !== el.id && !o.hidden).map(toBox),
                    started: false,
                  };
                }}
              />
            ),
          )}

          {selected && (
            <div
              style={{
                ...frame(selected),
                outline: `1.5px ${selected.locked ? 'dashed' : 'solid'} ${token.colorPrimary}`,
                pointerEvents: 'none',
              }}
            >
              {!selected.locked && (
                <>
                  {HANDLES.map(([hx, hy]) => (
                    <div
                      key={`${hx},${hy}`}
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        gesture.current = {
                          kind: 'resize',
                          id: selected.id,
                          handle: [hx, hy],
                          x0: e.clientX,
                          y0: e.clientY,
                          box: toBox(selected),
                          started: false,
                        };
                      }}
                      style={{
                        position: 'absolute',
                        left: `calc(${((hx + 1) / 2) * 100}% - 5px)`,
                        top: `calc(${((hy + 1) / 2) * 100}% - 5px)`,
                        width: 10,
                        height: 10,
                        borderRadius: 2,
                        background: token.colorBgContainer,
                        border: `1.5px solid ${token.colorPrimary}`,
                        cursor: CURSORS[`${hx},${hy}`],
                        pointerEvents: 'auto',
                      }}
                    />
                  ))}
                  <div
                    style={{
                      position: 'absolute',
                      left: '50%',
                      top: -28,
                      width: 1.5,
                      height: 22,
                      background: token.colorPrimary,
                    }}
                  />
                  <button
                    type="button"
                    aria-label="rotate"
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      gesture.current = {
                        kind: 'rotate',
                        id: selected.id,
                        box: toBox(selected),
                        started: false,
                      };
                    }}
                    style={{
                      position: 'absolute',
                      left: 'calc(50% - 7px)',
                      top: -36,
                      width: 14,
                      height: 14,
                      borderRadius: '50%',
                      background: token.colorBgContainer,
                      border: `1.5px solid ${token.colorPrimary}`,
                      cursor: 'grab',
                      padding: 0,
                      pointerEvents: 'auto',
                    }}
                  />
                </>
              )}
            </div>
          )}

          {guides.map((g) => (
            <div
              key={`${g.axis}${g.at}`}
              style={{
                position: 'absolute',
                background: token.colorError,
                pointerEvents: 'none',
                ...(g.axis === 'x'
                  ? { left: g.at * zoom, top: 0, bottom: 0, width: 1 }
                  : { top: g.at * zoom, left: 0, right: 0, height: 1 }),
              }}
            />
          ))}
        </div>
      )}

      {!preview && (
        <button
          type="button"
          title={heightLabel}
          aria-label={heightLabel}
          onPointerDown={(e) => {
            e.stopPropagation();
            gesture.current = {
              kind: 'height',
              y0: e.clientY,
              height: screen.height,
              started: false,
            };
          }}
          className="absolute left-1/2 -translate-x-1/2"
          style={{
            bottom: -14,
            width: 48,
            height: 8,
            borderRadius: 4,
            background: token.colorTextQuaternary,
            cursor: 'ns-resize',
            padding: 0,
            border: 0,
          }}
        />
      )}

      {badge && (
        <Tag
          color="processing"
          className="!absolute left-1/2 -translate-x-1/2"
          style={{ bottom: -40 }}
        >
          {badge}
        </Tag>
      )}
    </div>
  );
}
