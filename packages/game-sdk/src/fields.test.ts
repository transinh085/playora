import { describe, expect, test } from 'bun:test';
import { z } from 'zod';
import { describeConfigSchema, field, fieldRegistry, resolveLocalizedText } from './fields';

describe('field helpers & describeConfigSchema', () => {
  const itemSchema = z.object({
    sprite: field.asset('itemSprite', { label: { vi: 'Ảnh vật phẩm', en: 'Item image' } }),
    points: field.number({ min: -50, max: 100, int: true, default: 10, label: 'Điểm' }),
  });

  const schema = z.object({
    durationSec: field.slider({
      min: 15,
      max: 180,
      step: 5,
      int: true,
      default: 30,
      group: 'gameplay',
      label: { vi: 'Thời gian chơi (giây)', en: 'Duration (s)' },
    }),
    difficulty: field.segmented(['easy', 'normal', 'hard'] as const, {
      default: 'normal',
      group: 'gameplay',
      label: { vi: 'Độ khó', en: 'Difficulty' },
      optionLabels: {
        easy: { vi: 'Dễ', en: 'Easy' },
        normal: { vi: 'Vừa', en: 'Normal' },
        hard: { vi: 'Khó', en: 'Hard' },
      },
      presets: {
        easy: { durationSec: 60 },
        hard: { durationSec: 20 },
      },
    }),
    primaryColor: field.color({
      default: '#FF6600',
      group: 'appearance',
      label: { vi: 'Màu chủ đạo', en: 'Primary color' },
    }),
    backgroundAsset: field.asset('background', {
      group: 'appearance',
      label: { vi: 'Ảnh nền', en: 'Background image' },
    }),
    bgm: field
      .sound('bgmSlot', {
        group: 'appearance',
        label: { vi: 'Nhạc nền', en: 'Background music' },
      })
      .optional(),
    showLeaderboard: field.boolean({
      default: true,
      group: 'gameplay',
      label: { vi: 'Hiện bảng xếp hạng', en: 'Show leaderboard' },
    }),
    items: field.list(itemSchema, {
      min: 1,
      max: 8,
      group: 'gameplay',
      label: { vi: 'Danh sách vật phẩm', en: 'Items' },
      itemLabel: { vi: 'Vật phẩm', en: 'Item' },
    }),
    copy: z
      .object({
        title: field.localized({
          maxLength: 80,
          default: { vi: 'Hứng lộc đầu xuân', en: 'Catch the Fortune' },
          label: { vi: 'Tiêu đề', en: 'Title' },
        }),
        rules: field.richtext({
          default: '<p>Luật chơi</p>',
          label: { vi: 'Thể lệ', en: 'Rules' },
        }),
      })
      .register(fieldRegistry, { group: 'content', hotEditable: true }),
  });

  test('produces a fully JSON-serializable FormDescriptor with all widget metadata', () => {
    const descriptor = describeConfigSchema(schema);
    const roundTripped = JSON.parse(JSON.stringify(descriptor));
    expect(roundTripped).toEqual(descriptor);

    expect(descriptor.groups).toEqual(['gameplay', 'appearance', 'content']);
    expect(descriptor.hotEditablePaths).toEqual(['copy.title', 'copy.rules']);

    const byKey = new Map(descriptor.fields.map((f) => [f.key, f]));

    const duration = byKey.get('durationSec');
    expect(duration).toMatchObject({
      path: 'durationSec',
      type: 'number',
      widget: 'slider',
      min: 15,
      max: 180,
      step: 5,
      integer: true,
      defaultValue: 30,
      required: true,
      group: 'gameplay',
      hotEditable: false,
    });

    const difficulty = byKey.get('difficulty');
    expect(difficulty).toMatchObject({
      path: 'difficulty',
      type: 'enum',
      widget: 'segmented',
      defaultValue: 'normal',
      options: [
        { value: 'easy', label: { vi: 'Dễ', en: 'Easy' } },
        { value: 'normal', label: { vi: 'Vừa', en: 'Normal' } },
        { value: 'hard', label: { vi: 'Khó', en: 'Hard' } },
      ],
      presets: {
        easy: { durationSec: 60 },
        hard: { durationSec: 20 },
      },
    });

    const colorField = byKey.get('primaryColor');
    expect(colorField).toMatchObject({
      widget: 'color',
      defaultValue: '#FF6600',
    });

    const bgAsset = byKey.get('backgroundAsset');
    expect(bgAsset).toMatchObject({
      widget: 'asset',
      slotKey: 'background',
      required: true,
    });

    const bgmField = byKey.get('bgm');
    expect(bgmField).toMatchObject({
      widget: 'sound',
      slotKey: 'bgmSlot',
      required: false,
    });

    const itemsField = byKey.get('items');
    expect(itemsField).toMatchObject({
      type: 'array',
      widget: 'list',
      minItems: 1,
      maxItems: 8,
      itemLabel: { vi: 'Vật phẩm', en: 'Item' },
    });
    expect(itemsField?.item?.type).toBe('object');
    expect(itemsField?.item?.fields?.map((f) => f.key)).toEqual(['sprite', 'points']);
    expect(itemsField?.item?.fields?.[0]?.slotKey).toBe('itemSprite');

    const copyField = byKey.get('copy');
    expect(copyField?.type).toBe('object');
    const titleField = copyField?.fields?.find((f) => f.key === 'title');
    expect(titleField).toMatchObject({
      path: 'copy.title',
      type: 'localized',
      widget: 'localized',
      maxLength: 80,
      group: 'content',
      hotEditable: true,
      defaultValue: { vi: 'Hứng lộc đầu xuân', en: 'Catch the Fortune' },
    });
  });

  test('validates color and localized values at runtime', () => {
    const colorSchema = field.color();
    expect(colorSchema.safeParse('#ff00aa').success).toBe(true);
    expect(colorSchema.safeParse('#f0a').success).toBe(true);
    expect(colorSchema.safeParse('not-a-color').success).toBe(false);

    const locSchema = field.localized({ maxLength: 10 });
    expect(locSchema.safeParse({ vi: 'Chào', en: 'Hi' }).success).toBe(true);
    expect(locSchema.safeParse({ vi: '' }).success).toBe(false);
    expect(locSchema.safeParse({ vi: 'Chuỗi quá dài hơn 10 ký tự' }).success).toBe(false);

    expect(resolveLocalizedText({ vi: 'Xin chào', en: 'Hello' }, 'en')).toBe('Hello');
    expect(resolveLocalizedText({ vi: 'Xin chào' }, 'en')).toBe('Xin chào');
  });
});
