import { describe, expect, mock, test } from 'bun:test';
import { zodRule } from '@playora/ui/form';
import { renderToStaticMarkup, renderToString } from 'react-dom/server';
import { z } from 'zod';
import {
  AutoForm,
  addListItem,
  extractChangedPath,
  type FormDescriptor,
  getValueAtPath,
  isFieldHotEditable,
  removeListItem,
  reorderListItem,
  resolveFieldError,
  setValueAtPath,
  type WidgetProps,
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
      presets: {
        easy: { durationSec: 120 },
        hard: { durationSec: 30 },
      },
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
      path: 'bgm',
      key: 'bgm',
      type: 'string',
      widget: 'sound',
      slotKey: 'bgmSlot',
      label: { vi: 'Nhạc nền', en: 'Background music' },
      group: 'appearance',
      required: false,
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

function CustomSegmentEditor({ path, value, locale, disabled }: WidgetProps) {
  return (
    <div
      data-testid="custom-segment-widget"
      data-path={path}
      data-locale={locale}
      data-disabled={String(Boolean(disabled))}
    >
      SegmentVal:{String(value ?? '')}
    </div>
  );
}

describe('AutoForm on Ant Design Form (A1, §2.5)', () => {
  test('renders supported widgets (Input, Number, Slider, Switch, Segmented, Select, ColorPicker, asset/sound, list, localized, nested object, Collapse groups) and Alert for unsupported widget without console warnings', () => {
    const warnSpy = mock(() => {});
    const errorSpy = mock(() => {});
    const origWarn = console.warn;
    const origError = console.error;
    console.warn = warnSpy;
    console.error = errorSpy;

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
        bgm: 'audio-uuid-456',
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
              Picked:{assetVal}:{slot?.key ?? 'none'}
            </div>
          )}
          errors={{
            durationSec: ['Thời gian tối đa là 180 giây'],
            'copy.title.vi': ['Tiêu đề tiếng Việt không được để trống'],
          }}
        />,
      );

      expect(warnSpy).not.toHaveBeenCalled();
      expect(errorSpy).not.toHaveBeenCalled();

      // AutoForm and group sections rendered
      expect(htmlVi).toContain('data-slot="auto-form"');
      expect(htmlVi).toContain('data-slot="autoform-groups"');
      expect(htmlVi).toContain('Lối chơi');
      expect(htmlVi).toContain('Giao diện');
      expect(htmlVi).toContain('Nội dung');

      // Label/for association matches input id
      expect(htmlVi).toContain('for="nickname"');
      expect(htmlVi).toContain('id="nickname"');

      // Supported widgets rendered
      expect(htmlVi).toContain('data-widget="text"');
      expect(htmlVi).toContain('data-widget="number"');
      expect(htmlVi).toContain('data-widget="slider"');
      expect(htmlVi).toContain('data-widget="switch"');
      expect(htmlVi).toContain('data-widget="segmented"');
      expect(htmlVi).toContain('data-widget="select"');
      expect(htmlVi).toContain('data-widget="color"');
      expect(htmlVi).toContain('data-widget="asset"');
      expect(htmlVi).toContain('data-widget="sound"');
      expect(htmlVi).toContain('data-widget="list"');
      expect(htmlVi).toContain('data-widget="localized"');
      expect(htmlVi).toContain('data-widget="object"');

      // Component slots present
      expect(htmlVi).toContain('data-slot="input"');
      expect(htmlVi).toContain('data-slot="slider"');
      expect(htmlVi).toContain('data-slot="switch"');
      expect(htmlVi).toContain('data-slot="segmented"');
      expect(htmlVi).toContain('data-slot="color-picker"');
      expect(htmlVi).toContain('data-slot="localized-widget"');

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
      expect(htmlVi).toContain('value="Vàng"');
      expect(htmlVi).toContain('value="Kim cương"');

      // Localized vi/en inputs inside localized widget
      expect(htmlVi).toContain('data-lang="vi"');
      expect(htmlVi).toContain('data-lang="en"');
      expect(htmlVi).toContain('value="Đua YEP"');
      expect(htmlVi).toContain('value="YEP Race"');

      // Inline API errors rendered at field paths (including nested .vi error on localized field)
      expect(htmlVi).toContain('Thời gian tối đa là 180 giây');
      expect(htmlVi).toContain('Tiêu đề tiếng Việt không được để trống');

      // Unsupported widget renders Alert instead of throwing
      expect(htmlVi).toContain('data-slot="alert"');
      expect(htmlVi).toContain('data-widget-unsupported="unknown-fancy-widget"');
      expect(htmlVi).toContain('Widget chưa hỗ trợ: unknown-fancy-widget');

      // English locale + activeGroup filtering
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
      expect(htmlEn).not.toContain('Track color');
    } finally {
      console.warn = origWarn;
      console.error = origError;
    }
  });

  test('resolves custom widgets via widgets prop and falls back to Alert for deprecated/unsupported widgets (richtext, datetime-range, prize-picker)', () => {
    const descriptorWithUnsupported: FormDescriptor = {
      groups: ['content'],
      hotEditablePaths: [],
      fields: [
        {
          path: 'rulesHtml',
          key: 'rulesHtml',
          type: 'string',
          widget: 'richtext',
          label: { vi: 'Thể lệ', en: 'Rules' },
          group: 'content',
          required: false,
          hotEditable: false,
        },
        {
          path: 'campaignWindow',
          key: 'campaignWindow',
          type: 'string',
          widget: 'datetime-range',
          label: { vi: 'Khung giờ', en: 'Schedule' },
          group: 'content',
          required: false,
          hotEditable: false,
        },
        {
          path: 'prizeId',
          key: 'prizeId',
          type: 'string',
          widget: 'prize-picker',
          label: { vi: 'Giải thưởng', en: 'Prize' },
          group: 'content',
          required: false,
          hotEditable: false,
        },
        {
          path: 'customSegment',
          key: 'customSegment',
          type: 'string',
          widget: 'segment-wheel-editor',
          label: { vi: 'Ô vòng quay', en: 'Wheel segment' },
          group: 'content',
          required: true,
          hotEditable: false,
        },
      ],
    };

    const html = renderToStaticMarkup(
      <AutoForm
        descriptor={descriptorWithUnsupported}
        value={{
          rulesHtml: '<p>Hi</p>',
          campaignWindow: '2026-01-01',
          prizeId: 'p1',
          customSegment: 'seg-gold',
        }}
        onChange={() => {}}
        locale="vi"
        widgets={{
          'segment-wheel-editor': CustomSegmentEditor,
        }}
      />,
    );

    // Custom widget found in `widgets` prop renders custom component
    expect(html).toContain('data-testid="custom-segment-widget"');
    expect(html).toContain('SegmentVal:seg-gold');
    expect(html).not.toContain('data-widget-unsupported="segment-wheel-editor"');

    // Deprecated/removed widgets not in `widgets` render Alert fallback without throwing
    expect(html).toContain('data-widget-unsupported="richtext"');
    expect(html).toContain('data-widget-unsupported="datetime-range"');
    expect(html).toContain('data-widget-unsupported="prize-picker"');
  });

  test('disables non-hotEditable fields when game is published while keeping hotEditable fields enabled', () => {
    const htmlPublished = renderToStaticMarkup(
      <AutoForm
        descriptor={fullDescriptor}
        value={{
          nickname: 'Locked Name',
          copy: { title: { vi: 'Sửa được', en: 'Editable' } },
        }}
        onChange={() => {}}
        locale="vi"
        published
      />,
    );

    // Non-hotEditable field is disabled
    expect(htmlPublished).toContain('data-field-path="nickname" data-disabled="true"');
    expect(htmlPublished).toContain('data-field-path="durationSec" data-disabled="true"');
    expect(htmlPublished).toContain('data-field-path="items" data-disabled="true"');

    // Hot-editable field (`copy.title`) remains enabled
    expect(htmlPublished).toContain('data-field-path="copy.title"');
    expect(htmlPublished).not.toContain('data-field-path="copy.title" data-disabled="true"');
  });

  test('Form.List respects minItems and maxItems boundaries on add/remove buttons', () => {
    const listDescriptor: FormDescriptor = {
      groups: ['gameplay'],
      hotEditablePaths: [],
      fields: [
        {
          path: 'segments',
          key: 'segments',
          type: 'array',
          widget: 'list',
          label: { vi: 'Các ô', en: 'Segments' },
          itemLabel: { vi: 'Ô', en: 'Segment' },
          minItems: 2,
          maxItems: 3,
          group: 'gameplay',
          required: true,
          hotEditable: false,
          item: {
            path: 'segments[]',
            key: 'item',
            type: 'string',
            widget: 'text',
            defaultValue: 'Ô mới',
            required: true,
            hotEditable: false,
          },
        },
      ],
    };

    // At minItems (2 items): Remove buttons are disabled, Add button is enabled
    const htmlAtMin = renderToStaticMarkup(
      <AutoForm
        descriptor={listDescriptor}
        value={{ segments: ['Ô 1', 'Ô 2'] }}
        onChange={() => {}}
        locale="vi"
      />,
    );
    expect(htmlAtMin).toMatch(
      /(aria-label="Xoá #1"[^>]*disabled=""|disabled=""[^>]*aria-label="Xoá #1")/,
    );
    expect(htmlAtMin).toMatch(
      /(aria-label="Xoá #2"[^>]*disabled=""|disabled=""[^>]*aria-label="Xoá #2")/,
    );
    const addButtonDisabledAtMin =
      /<button[^>]*disabled=""[^>]*>(?:(?!<\/button>)[\s\S])*Thêm Ô/i.test(htmlAtMin);
    expect(addButtonDisabledAtMin).toBe(false);

    // At maxItems (3 items): Add button is disabled, Remove buttons are enabled
    const htmlAtMax = renderToStaticMarkup(
      <AutoForm
        descriptor={listDescriptor}
        value={{ segments: ['Ô 1', 'Ô 2', 'Ô 3'] }}
        onChange={() => {}}
        locale="vi"
      />,
    );
    expect(htmlAtMax).not.toMatch(
      /(aria-label="Xoá #1"[^>]*disabled=""|disabled=""[^>]*aria-label="Xoá #1")/,
    );
    const addButtonDisabledAtMax =
      /<button[^>]*disabled=""[^>]*>(?:(?!<\/button>)[\s\S])*Thêm Ô/i.test(htmlAtMax);
    expect(addButtonDisabledAtMax).toBe(true);
  });

  test('triggers onChange via Form onValuesChange (including presets) and validates with configSchema via zodRule', async () => {
    const configSchema = z.object({
      nickname: z.string().min(3, 'Nickname must be at least 3 chars'),
      difficulty: z.enum(['easy', 'hard']),
      durationSec: z.number().int().min(10).max(180),
    });

    const onChangeSpy = mock(() => {});
    let triggerCustomChange: ((val: unknown) => void) | undefined;

    const customDescriptor: FormDescriptor = {
      groups: ['gameplay'],
      hotEditablePaths: [],
      fields: [
        {
          path: 'nickname',
          key: 'nickname',
          type: 'string',
          widget: 'custom-text',
          label: { vi: 'Biệt danh', en: 'Nickname' },
          group: 'gameplay',
          required: true,
          hotEditable: false,
        },
        {
          path: 'difficulty',
          key: 'difficulty',
          type: 'enum',
          widget: 'custom-select',
          label: { vi: 'Độ khó', en: 'Difficulty' },
          presets: {
            hard: { durationSec: 30 },
          },
          group: 'gameplay',
          required: true,
          hotEditable: false,
        },
        {
          path: 'durationSec',
          key: 'durationSec',
          type: 'number',
          widget: 'number',
          label: { vi: 'Thời gian', en: 'Duration' },
          group: 'gameplay',
          required: true,
          hotEditable: false,
        },
      ],
    };

    renderToString(
      <AutoForm
        descriptor={customDescriptor}
        configSchema={configSchema}
        value={{ nickname: 'Hero', difficulty: 'easy', durationSec: 60 }}
        onChange={onChangeSpy}
        widgets={{
          'custom-text': () => null,
          'custom-select': ({ onChange }) => {
            triggerCustomChange = onChange;
            return null;
          },
        }}
      />,
    );

    // Changing difficulty to 'hard' triggers onValuesChange and applies preset durationSec = 30
    triggerCustomChange?.('hard');
    expect(onChangeSpy).toHaveBeenCalledWith(
      { nickname: 'Hero', difficulty: 'hard', durationSec: 30 },
      'difficulty',
    );

    // Verify zodRule validation with configSchema
    const rule = zodRule(configSchema, {
      getFieldsValue: () => ({ nickname: 'ab', difficulty: 'easy', durationSec: 60 }),
    });
    await expect(rule.validator({ field: 'nickname' }, 'ab')).rejects.toThrow(
      'Nickname must be at least 3 chars',
    );
    await expect(rule.validator({ field: 'nickname' }, 'valid-name')).resolves.toBeUndefined();
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

    expect(addListItem(added, itemField, 3)).toHaveLength(3);

    const reordered = reorderListItem(added, 0, 2);
    expect(reordered.map((x) => (x as { name: string }).name)).toEqual(['B', 'Lì xì', 'A']);

    const removed = removeListItem(reordered, 1, 1);
    expect(removed).toHaveLength(2);

    expect(removeListItem([{ name: 'Only', points: 1 }], 0, 1)).toHaveLength(1);

    expect(resolveFieldError({ 'draftConfig.durationSec': ['Invalid'] }, 'durationSec')).toBe(
      'Invalid',
    );
    expect(resolveFieldError({ 'copy.title.vi': 'Required VI' }, 'copy.title')).toBe('Required VI');

    expect(extractChangedPath({ copy: { title: { vi: 'Mới' } } })).toBe('copy.title.vi');
    expect(extractChangedPath({ items: [undefined, { name: 'X' }] })).toBe('items.1.name');

    const nonHotField = fullDescriptor.fields[0];
    if (!nonHotField) {
      throw new Error('Expected field');
    }
    expect(isFieldHotEditable(nonHotField, 'nickname', ['copy.title'])).toBe(false);
    expect(isFieldHotEditable(nonHotField, 'copy.title.vi', ['copy.title'])).toBe(true);
  });
});
