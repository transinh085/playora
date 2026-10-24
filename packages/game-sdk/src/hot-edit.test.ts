import { describe, expect, test } from 'bun:test';
import { extractHotConfig, type HotEditableFieldLike, hasNonHotEditableChanges } from './hot-edit';

describe('hot-edit', () => {
  test('extractHotConfig picks and clones only hot-editable paths', () => {
    const source = {
      wheel: { spins: 5, spinDurationSec: 4 },
      copy: {
        title: { vi: 'Quay thưởng', en: 'Spin' },
        cta: { vi: 'Quay ngay' },
      },
    };

    const hot = extractHotConfig(source, ['copy.title', 'copy.cta', 'missing.path']);
    expect(hot).toEqual({
      copy: {
        title: { vi: 'Quay thưởng', en: 'Spin' },
        cta: { vi: 'Quay ngay' },
      },
    });

    // Mutating source does not mutate cloned hot config
    source.copy.title.vi = 'Đã đổi';
    expect((hot.copy as { title: { vi: string } }).title.vi).toBe('Quay thưởng');
  });

  test('hasNonHotEditableChanges detects locked changes and ignores hot-editable or key-order-only changes', () => {
    const fields: HotEditableFieldLike[] = [
      {
        path: 'copy',
        widget: 'object',
        hotEditable: false,
        fields: [
          { path: 'copy.title', widget: 'localized', hotEditable: true },
          { path: 'copy.cta', widget: 'localized', hotEditable: true },
        ],
      },
      {
        path: 'wheel',
        widget: 'object',
        hotEditable: false,
        fields: [
          { path: 'wheel.spins', widget: 'number', hotEditable: false },
          { path: 'wheel.pointerColor', widget: 'color', hotEditable: true },
        ],
      },
      {
        path: 'segments',
        widget: 'list',
        hotEditable: false,
      },
    ];

    const published = {
      copy: {
        title: { vi: 'Tiêu đề cũ', en: 'Old title' },
        cta: { vi: 'Quay' },
      },
      wheel: {
        spins: 5,
        pointerColor: '#FF0000',
      },
      segments: [{ id: '1', label: { vi: 'Ô 1', en: 'Slot 1' } }],
    };

    // Changing only hot-editable fields + reordering object keys on non-hot-editable fields
    const draftHotOnly = {
      copy: {
        title: { vi: 'Tiêu đề mới', en: 'New title' },
        cta: { vi: 'Bấm quay' },
      },
      wheel: {
        spins: 5,
        pointerColor: '#00FF00',
      },
      segments: [{ label: { en: 'Slot 1', vi: 'Ô 1' }, id: '1' }],
    };

    expect(hasNonHotEditableChanges(fields, draftHotOnly, published)).toBe(false);

    // Changing a non-hotEditable leaf field (`wheel.spins`) triggers true
    const draftLockedChanged = {
      ...draftHotOnly,
      wheel: {
        spins: 8,
        pointerColor: '#00FF00',
      },
    };
    expect(hasNonHotEditableChanges(fields, draftLockedChanged, published)).toBe(true);
  });
});
