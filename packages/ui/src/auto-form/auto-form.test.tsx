import { describe, expect, mock, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  AutoForm,
  addListItem,
  type FormDescriptor,
  getValueAtPath,
  removeListItem,
  reorderListItem,
  resolveFieldError,
  setValueAtPath,
} from './index';

const fullDescriptor: FormDescriptor = {
  groups: ['gameplay', 'appearance', 'content'],
  hotEditablePaths: ['copy.title'],
  fields: [
    {
      path: 'nickname',
      key: 'nickname',
      type: 'string',
      widget: 'text',
      label: { vi: 'Biệt danh', en: 'Nickname' },
      placeholder: { vi: 'Nhập biệt danh', en: 'Enter nickname' },
      group: 'gameplay',
      required: true,
      hotEditable: false,
    },
    {
      path: 'maxPlayers',
      key: 'maxPlayers',
      type: 'number',
      widget: 'number',
      label: { vi: 'Số người tối đa', en: 'Max players' },
      min: 2,
      max: 500,
      integer: true,
      defaultValue: 50,
      group: 'gameplay',
      required: true,
      hotEditable: false,
    },
    {
      path: 'durationSec',
      key: 'durationSec',
      type: 'number',
      widget: 'slider',
      label: { vi: 'Thời gian đua (giây)', en: 'Race duration (seconds)' },
      min: 10,
      max: 180,
      step: 5,
      integer: true,
      defaultValue: 60,
      group: 'gameplay',
      required: true,
      hotEditable: false,
    },
    {
      path: 'showLeaderboard',
      key: 'showLeaderboard',
      type: 'boolean',
      widget: 'switch',
      label: { vi: 'Hiện bảng xếp hạng', en: 'Show leaderboard' },
      defaultValue: true,
      group: 'gameplay',
      required: true,
      hotEditable: false,
    },
    {
      path: 'mode',
      key: 'mode',
      type: 'enum',
      widget: 'segmented',
      label: { vi: 'Chế độ thi đấu', en: 'Race mode' },
      options: [
        { value: 'team', label: { vi: 'Theo đội', en: 'Team' } },
        { value: 'solo', label: { vi: 'Cá nhân', en: 'Solo' } },
      ],
      defaultValue: 'team',
      group: 'gameplay',
      required: true,
      hotEditable: false,
    },
    {
      path: 'difficulty',
      key: 'difficulty',
      type: 'enum',
      widget: 'select',
      label: { vi: 'Độ khó', en: 'Difficulty' },
      options: [
        { value: 'easy', label: { vi: 'Dễ', en: 'Easy' } },
        { value: 'hard', label: { vi: 'Khó', en: 'Hard' } },
      ],
      defaultValue: 'easy',
      group: 'gameplay',
      required: true,
      hotEditable: false,
    },
    {
      path: 'trackColor',
      key: 'trackColor',
      type: 'string',
      widget: 'color',
      label: { vi: 'Màu đường đua', en: 'Track color' },
      defaultValue: '#F59E0B',
      group: 'appearance',
      required: true,
      hotEditable: false,
    },
    {
      path: 'runnerSprite',
      key: 'runnerSprite',
      type: 'string',
      widget: 'asset',
      slotKey: 'runner',
      label: { vi: 'Nhân vật đua', en: 'Runner sprite' },
      defaultValue: '/assets/spin-wheel/wheel.png',
      group: 'appearance',
      required: true,
      hotEditable: false,
    },
    {
      path: 'items',
      key: 'items',
      type: 'array',
      widget: 'list',
      label: { vi: 'Danh sách vật phẩm', en: 'Item list' },
      itemLabel: { vi: 'Vật phẩm', en: 'Item' },
      minItems: 1,
      maxItems: 4,
      group: 'gameplay',
      required: true,
      hotEditable: false,
      item: {
        path: 'items[]',
        key: 'item',
        type: 'object',
        widget: 'object',
        required: true,
        hotEditable: false,
        fields: [
          {
            path: 'items[].name',
            key: 'name',
            type: 'string',
            widget: 'text',
            label: { vi: 'Tên vật phẩm', en: 'Item name' },
            defaultValue: 'Lì xì',
            required: true,
            hotEditable: false,
          },
          {
            path: 'items[].points',
            key: 'points',
            type: 'number',
            widget: 'number',
            label: { vi: 'Điểm thưởng', en: 'Bonus points' },
            defaultValue: 10,
            required: true,
            hotEditable: false,
          },
        ],
      },
    },
    {
      path: 'copy',
      key: 'copy',
      type: 'object',
      widget: 'object',
      label: { vi: 'Nội dung hiển thị', en: 'Display copy' },
      group: 'content',
      required: true,
      hotEditable: true,
      fields: [
        {
          path: 'copy.title',
          key: 'title',
          type: 'localized',
          widget: 'localized',
          label: { vi: 'Tiêu đề', en: 'Title' },
          defaultValue: { vi: 'Vòng quay may mắn', en: 'Lucky Spin' },
          required: true,
          hotEditable: true,
        },
      ],
    },
    {
      path: 'mysteryField',
      key: 'mysteryField',
      type: 'string',
      widget: 'unknown-fancy-widget',
      label: { vi: 'Trường lạ', en: 'Mystery field' },
      defaultValue: 'fallback-val',
      group: 'content',
      required: false,
      hotEditable: false,
    },
  ],
};

describe('AutoForm rendering & widget helpers (BLD-02)', () => {
  test('renders text, number, slider, switch, segmented, select, color with brand palette, asset with injected picker, list, localized (vi/en tabs), object/group, and unknown widget fallback with dev warning', () => {
    const warnSpy = mock(() => {});
    const originalWarn = console.warn;
    console.warn = warnSpy;

    try {
      const value = {
        nickname: 'Playora Hero',
        maxPlayers: 120,
        durationSec: 75,
        showLeaderboard: true,
        mode: 'team',
        difficulty: 'hard',
        trackColor: '#F59E0B',
        runnerSprite: 'asset-uuid-123',
        items: [
          { name: 'Vàng', points: 20 },
          { name: 'Kim cương', points: 50 },
        ],
        copy: {
          title: { vi: 'Đua YEP', en: 'YEP Race' },
        },
        mysteryField: 'custom-value',
      };

      const htmlVi = renderToStaticMarkup(
        <AutoForm
          descriptor={fullDescriptor}
          value={value}
          onChange={() => {}}
          locale="vi"
          brandPalette={['#7c3aed', '#f59e0b', '#10b981']}
          assetSlots={[
            {
              key: 'runner',
              label: { vi: 'Nhân vật đua', en: 'Runner sprite' },
              ratio: '1:1',
              minPx: 256,
              accept: ['image'],
            },
          ]}
          renderAssetPicker={({ value: assetVal, slot }) => (
            <div data-testid="custom-asset-picker">
              Picked:{assetVal}:{slot?.key}
            </div>
          )}
          errors={{
            durationSec: ['Thời gian tối đa là 180 giây'],
            'copy.title.vi': ['Tiêu đề tiếng Việt không được để trống'],
          }}
        />,
      );

      // All widgets rendered
      expect(htmlVi).toContain('data-widget="text"');
      expect(htmlVi).toContain('data-widget="number"');
      expect(htmlVi).toContain('data-widget="slider"');
      expect(htmlVi).toContain('data-widget="switch"');
      expect(htmlVi).toContain('data-widget="segmented"');
      expect(htmlVi).toContain('data-widget="select"');
      expect(htmlVi).toContain('data-widget="color"');
      expect(htmlVi).toContain('data-widget="asset"');
      expect(htmlVi).toContain('data-widget="list"');
      expect(htmlVi).toContain('data-widget="localized"');
      expect(htmlVi).toContain('data-widget="object"');

      // Brand palette swatches rendered in color widget
      expect(htmlVi).toContain('data-color="#7c3aed"');
      expect(htmlVi).toContain('data-color="#f59e0b"');
      expect(htmlVi).toContain('data-color="#10b981"');

      // Injected asset picker + slot constraints rendered
      expect(htmlVi).toContain('data-testid="custom-asset-picker"');
      expect(htmlVi).toContain('Picked:asset-uuid-123:runner');
      expect(htmlVi).toContain('1:1 · ≥256px');

      // List items rendered with add/remove/reorder controls
      expect(htmlVi).toContain('Vật phẩm #1');
      expect(htmlVi).toContain('Vật phẩm #2');
      expect(htmlVi).toContain('Thêm Vật phẩm');

      // Localized vi/en tabs rendered
      expect(htmlVi).toContain('data-lang="vi"');
      expect(htmlVi).toContain('data-lang="en"');
      expect(htmlVi).toContain('value="Đua YEP"');
      expect(htmlVi).toContain('value="YEP Race"');

      // Inline API errors rendered at field paths (including nested .vi error on localized field)
      expect(htmlVi).toContain('Thời gian tối đa là 180 giây');
      expect(htmlVi).toContain('Tiêu đề tiếng Việt không được để trống');

      // Unknown widget fell back to text input and logged a dev warning
      expect(htmlVi).toContain('data-widget-fallback="unknown-fancy-widget"');
      expect(warnSpy).toHaveBeenCalled();

      // English locale renders English labels
      const htmlEn = renderToStaticMarkup(
        <AutoForm
          descriptor={fullDescriptor}
          value={value}
          onChange={() => {}}
          locale="en"
          activeGroup="gameplay"
        />,
      );
      expect(htmlEn).toContain('Race duration (seconds)');
      expect(htmlEn).toContain('Show leaderboard');
      expect(htmlEn).not.toContain('Track color'); // filtered out by activeGroup="gameplay"
    } finally {
      console.warn = originalWarn;
    }
  });

  test('path state helpers and list add/remove/reorder operations update config immutably', () => {
    const initial = {
      durationSec: 60,
      copy: { title: { vi: 'Chào', en: 'Hi' } },
      items: [
        { name: 'A', points: 10 },
        { name: 'B', points: 20 },
      ],
    };

    const next = setValueAtPath(initial, 'copy.title.vi', 'Xin chào');
    expect(getValueAtPath(next, 'copy.title.vi')).toBe('Xin chào');
    expect(getValueAtPath(initial, 'copy.title.vi')).toBe('Chào');

    const nextItem = setValueAtPath(next, 'items.1.points', 99);
    expect(getValueAtPath(nextItem, 'items.1.points')).toBe(99);

    const itemField = fullDescriptor.fields.find((f) => f.key === 'items')?.item;
    const added = addListItem(initial.items, itemField, 4);
    expect(added).toHaveLength(3);
    expect(added[2]).toEqual({ name: 'Lì xì', points: 10 });

    // Respects maxItems
    expect(addListItem(added, itemField, 3)).toHaveLength(3);

    const reordered = reorderListItem(added, 0, 2);
    expect(reordered.map((x) => (x as { name: string }).name)).toEqual(['B', 'Lì xì', 'A']);

    const removed = removeListItem(reordered, 1, 1);
    expect(removed).toHaveLength(2);

    // Respects minItems
    expect(removeListItem([{ name: 'Only', points: 1 }], 0, 1)).toHaveLength(1);

    // Error resolution supports direct path, draftConfig prefix, and localized .vi/.en suffix
    expect(resolveFieldError({ 'draftConfig.durationSec': ['Invalid'] }, 'durationSec')).toBe(
      'Invalid',
    );
    expect(resolveFieldError({ 'copy.title.vi': 'Required VI' }, 'copy.title')).toBe('Required VI');
  });
});
