/** Pure geometry for the canvas editor: move with snapping, rotated resize, rotation. */

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
  rotation: number;
}

export interface Guide {
  axis: 'x' | 'y';
  /** Artboard coordinate of the guide line. */
  at: number;
}

export const MIN_SIZE = 8;
export const SNAP_THRESHOLD = 5;

const rad = (deg: number) => (deg * Math.PI) / 180;

function rotate(x: number, y: number, deg: number): [number, number] {
  const c = Math.cos(rad(deg));
  const s = Math.sin(rad(deg));
  return [x * c - y * s, x * s + y * c];
}

/**
 * Moves `box` by (dx, dy), snapping its left/centre/right and top/middle/bottom to the closest
 * target line within the threshold. Targets are artboard edges/centre plus other boxes' lines.
 */
export function moveWithSnap(
  box: Box,
  dx: number,
  dy: number,
  targets: { x: number[]; y: number[] },
  threshold = SNAP_THRESHOLD,
): { box: Box; guides: Guide[] } {
  let x = box.x + dx;
  let y = box.y + dy;
  const guides: Guide[] = [];

  const snap = (start: number, size: number, lines: number[], axis: 'x' | 'y') => {
    let best: { delta: number; at: number } | null = null;
    for (const edge of [start, start + size / 2, start + size]) {
      for (const line of lines) {
        const delta = line - edge;
        if (Math.abs(delta) <= threshold && (!best || Math.abs(delta) < Math.abs(best.delta))) {
          best = { delta, at: line };
        }
      }
    }
    if (best) guides.push({ axis, at: best.at });
    return best ? start + best.delta : start;
  };

  x = snap(x, box.w, targets.x, 'x');
  y = snap(y, box.h, targets.y, 'y');
  // Half-pixel precision so odd artboard widths (375) can still centre exactly.
  const half = (n: number) => Math.round(n * 2) / 2;
  return { box: { ...box, x: half(x), y: half(y) }, guides };
}

/** Snap lines for the artboard and every other visible element. */
export function snapTargets(width: number, height: number, others: Box[]) {
  const x = [0, width / 2, width];
  const y = [0, height / 2, height];
  for (const o of others) {
    x.push(o.x, o.x + o.w / 2, o.x + o.w);
    y.push(o.y, o.y + o.h / 2, o.y + o.h);
  }
  return { x, y };
}

/**
 * Resizes a (possibly rotated) box from a handle. `handle` is (-1|0|1, -1|0|1): which edges move.
 * The pointer delta is taken in artboard space and projected onto the box's own axes, so the
 * opposite edge stays put even when the box is rotated. `keepRatio` locks the aspect ratio.
 */
export function resizeBox(
  box: Box,
  handle: [number, number],
  dx: number,
  dy: number,
  keepRatio = false,
): Box {
  const [hx, hy] = handle;
  const [lx, ly] = rotate(dx, dy, -box.rotation);
  let w = Math.max(MIN_SIZE, box.w + hx * lx);
  let h = Math.max(MIN_SIZE, box.h + hy * ly);

  if (keepRatio && hx !== 0 && hy !== 0) {
    const ratio = box.w / box.h;
    if (w / h > ratio) h = w / ratio;
    else w = h * ratio;
  }

  // Move the centre by half the growth along each moving axis, back in artboard space.
  const [cx, cy] = rotate((hx * (w - box.w)) / 2, (hy * (h - box.h)) / 2, box.rotation);
  const centreX = box.x + box.w / 2 + cx;
  const centreY = box.y + box.h / 2 + cy;
  return {
    ...box,
    w: Math.round(w),
    h: Math.round(h),
    x: Math.round(centreX - w / 2),
    y: Math.round(centreY - h / 2),
  };
}

/** Angle (0–359) from the box centre to the pointer; snaps to 15° steps when `step` is set. */
export function rotationFromPointer(box: Box, px: number, py: number, step?: number): number {
  const cx = box.x + box.w / 2;
  const cy = box.y + box.h / 2;
  let deg = (Math.atan2(py - cy, px - cx) * 180) / Math.PI + 90;
  if (step) deg = Math.round(deg / step) * step;
  else {
    // Gentle magnet towards the right angles.
    const nearest = Math.round(deg / 90) * 90;
    if (Math.abs(deg - nearest) < 4) deg = nearest;
  }
  return Math.round(((deg % 360) + 360) % 360);
}
