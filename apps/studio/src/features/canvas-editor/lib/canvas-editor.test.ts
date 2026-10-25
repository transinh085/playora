/// <reference types="bun" />
import { describe, expect, test } from 'bun:test';
import { createEditorState, currentScreen, editorReducer } from './editor-state';
import { moveWithSnap, resizeBox, rotationFromPointer, snapTargets } from './geometry';
import { createDemoDoc, DEMO_BRAND, resolveColor } from './model';

function must<T>(value: T | undefined): T {
  if (value === undefined) throw new Error('missing fixture');
  return value;
}

describe('geometry', () => {
  const box = { x: 100, y: 100, w: 100, h: 50, rotation: 0 };

  test('snaps the closest edge to a target line within the threshold', () => {
    const targets = snapTargets(375, 750, []);
    // Centre would land at 186 → snaps to the artboard centre 187.5.
    const { box: moved, guides } = moveWithSnap(box, 36, 0, targets);
    expect(moved.x + moved.w / 2).toBeCloseTo(187.5, 0);
    expect(guides).toContainEqual({ axis: 'x', at: 187.5 });
  });

  test('does not snap beyond the threshold', () => {
    const { box: moved, guides } = moveWithSnap(box, 20, 0, { x: [500], y: [] });
    expect(moved.x).toBe(120);
    expect(guides).toEqual([]);
  });

  test('resizing from the right edge keeps the left edge fixed', () => {
    const resized = resizeBox(box, [1, 0], 40, 999);
    expect(resized).toMatchObject({ x: 100, w: 140, h: 50 });
  });

  test('resizing from the top-left corner keeps the bottom-right corner fixed', () => {
    const resized = resizeBox(box, [-1, -1], -20, -10);
    expect(resized.x + resized.w).toBe(200);
    expect(resized.y + resized.h).toBe(150);
    expect(resized).toMatchObject({ w: 120, h: 60 });
  });

  test('resizing a rotated box measures the drag along its own axes', () => {
    // Rotated 90°: dragging the local right edge means dragging down in artboard space.
    const rotated = { ...box, rotation: 90 };
    expect(resizeBox(rotated, [1, 0], 0, 30).w).toBe(130);
    expect(resizeBox(rotated, [1, 0], 30, 0).w).toBe(100);
  });

  test('keepRatio locks the aspect ratio on corners', () => {
    const resized = resizeBox(box, [1, 1], 100, 0, true);
    expect(resized.w / resized.h).toBeCloseTo(2, 1);
  });

  test('never shrinks below the minimum size', () => {
    expect(resizeBox(box, [1, 1], -500, -500)).toMatchObject({ w: 8, h: 8 });
  });

  test('rotation follows the pointer and snaps to steps', () => {
    // Pointer straight to the right of the centre (150, 125) → 90°.
    expect(rotationFromPointer(box, 300, 125)).toBe(90);
    expect(rotationFromPointer(box, 300, 140, 15)).toBe(90);
  });
});

describe('editor state', () => {
  const fresh = () => createEditorState(createDemoDoc());

  test('adding an element selects it and records one undo step', () => {
    const before = fresh();
    const after = editorReducer(before, {
      type: 'add',
      elementType: 'text',
      cx: 187,
      cy: 300,
      name: 'Chữ',
    });
    expect(currentScreen(after).elements).toHaveLength(currentScreen(before).elements.length + 1);
    expect(after.selectedId).toBe(currentScreen(after).elements.at(-1)?.id ?? null);
    const undone = editorReducer(after, { type: 'undo' });
    expect(currentScreen(undone).elements).toHaveLength(currentScreen(before).elements.length);
    const redone = editorReducer(undone, { type: 'redo' });
    expect(currentScreen(redone).elements).toHaveLength(currentScreen(after).elements.length);
  });

  test('a coalesced gesture is a single undo step', () => {
    const state = fresh();
    const id = must(currentScreen(state).elements[0]).id;
    let s = editorReducer(state, { type: 'update', id, patch: { x: 10 } });
    s = editorReducer(s, { type: 'update', id, patch: { x: 20 }, coalesce: true });
    s = editorReducer(s, { type: 'update', id, patch: { x: 30 }, coalesce: true });
    expect(must(currentScreen(editorReducer(s, { type: 'undo' })).elements[0]).x).toBe(
      must(currentScreen(state).elements[0]).x,
    );
  });

  test('the game stage cannot be removed or duplicated', () => {
    const state = editorReducer(fresh(), { type: 'selectScreen', screen: 'game' });
    const stage = currentScreen(state).elements.find((e) => e.type === 'gameStage');
    if (!stage) throw new Error('demo game screen has no stage');
    expect(editorReducer(state, { type: 'remove', id: stage.id })).toBe(state);
    expect(editorReducer(state, { type: 'duplicate', id: stage.id })).toBe(state);
  });

  test('reorder moves an element to a new layer index', () => {
    const state = fresh();
    const first = must(currentScreen(state).elements[0]).id;
    const moved = editorReducer(state, { type: 'reorder', id: first, toIndex: 3 });
    expect(must(currentScreen(moved).elements[3]).id).toBe(first);
  });

  test('brand references resolve through the palette', () => {
    expect(resolveColor('brand.accent', DEMO_BRAND)).toBe(DEMO_BRAND.accent);
    expect(resolveColor('#123456', DEMO_BRAND)).toBe('#123456');
  });
});
