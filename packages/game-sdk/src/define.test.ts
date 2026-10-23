import { describe, expect, test } from 'bun:test';
import { z } from 'zod';
import { resolveSkinConfig, resolveTemplateAssets } from './assets';
import { defineTemplate, TemplateValidationError } from './define';
import { field } from './fields';
import * as clientSdk from './index';
import * as serverSdk from './server';

const baseConfigSchema = z.object({
  durationSec: field.slider({ min: 10, max: 120, default: 30, int: true, group: 'gameplay' }),
  accentColor: field.color({ default: '#FF5500', group: 'appearance' }),
  heroBanner: field.asset('banner', { default: '/default-banner.png', group: 'appearance' }),
  copy: z
    .object({
      title: field.localized({ default: { vi: 'Xin chào', en: 'Hello' } }),
      subtitle: field.text({ default: 'Chào mừng' }),
    })
    .prefault({}),
});

describe('defineTemplate', () => {
  test('normalizes valid template definition and derives defaultConfig and formDescriptor', () => {
    const tpl = defineTemplate({
      id: 'quiz-show',
      version: '1.2.0',
      kind: 'live',
      name: { vi: 'Đố vui trực tiếp', en: 'Live Quiz' },
      description: { vi: 'Mô tả đố vui', en: 'Quiz description' },
      thumbnail: '/quiz/thumb.png',
      tags: ['yep', 'quiz'],
      configSchema: baseConfigSchema,
      assetSlots: [
        {
          key: 'banner',
          label: { vi: 'Ảnh bìa', en: 'Banner' },
          required: true,
          ratio: '16:9',
          minPx: 1280,
          accept: ['image'],
        },
        {
          key: 'logo',
          label: { vi: 'Logo thương hiệu', en: 'Brand logo' },
          required: false,
          brandable: true,
          accept: ['image'],
        },
      ],
      skins: [
        {
          key: 'yep',
          name: { vi: 'YEP Gala', en: 'YEP Gala' },
          tags: ['yep'],
          assets: { banner: '/skins/yep/banner.png' },
          config: { accentColor: '#F59E0B' },
        },
      ],
      hotEditable: ['copy.title', 'copy.subtitle'],
    });

    expect(tpl.id).toBe('quiz-show');
    expect(tpl.meta).toEqual({
      name: { vi: 'Đố vui trực tiếp', en: 'Live Quiz' },
      description: { vi: 'Mô tả đố vui', en: 'Quiz description' },
      thumbnail: '/quiz/thumb.png',
      tags: ['yep', 'quiz'],
    });
    expect(tpl.defaultConfig.durationSec).toBe(30);
    expect(tpl.defaultConfig.accentColor).toBe('#FF5500');
    expect(tpl.defaultConfig.copy.title.vi).toBe('Xin chào');
    expect(tpl.hotEditable).toEqual(['copy.title', 'copy.subtitle']);
    expect(tpl.formDescriptor.groups).toEqual(['gameplay', 'appearance']);
  });

  test('requires defaultConfig when configSchema has required fields without defaults', () => {
    expect(() =>
      defineTemplate({
        id: 'missing-default',
        version: '1.0.0',
        kind: 'live',
        name: { vi: 'Thiếu default' },
        configSchema: z.object({
          durationSec: field.slider({ min: 10, max: 60 }),
        }),
      }),
    ).toThrow(/defaultConfig required because configSchema has required fields without defaults/);
  });

  test('rejects duplicate asset slot keys', () => {
    expect(() =>
      defineTemplate({
        id: 'dup-slots',
        version: '1.0.0',
        kind: 'live',
        name: { vi: 'Trùng slot' },
        configSchema: z.object({ durationSec: z.number().default(10) }),
        assetSlots: [
          { key: 'bg', label: { vi: 'Nền 1' }, accept: ['image'] },
          { key: 'bg', label: { vi: 'Nền 2' }, accept: ['image'] },
        ],
        skins: [],
      }),
    ).toThrow(TemplateValidationError);
  });

  test('rejects config field referencing unknown asset slot key', () => {
    expect(() =>
      defineTemplate({
        id: 'bad-slot-ref',
        version: '1.0.0',
        kind: 'live',
        name: { vi: 'Sai slot ref' },
        configSchema: z.object({
          sprite: field.asset('missingSlot', { default: '/a.png' }),
        }),
        assetSlots: [{ key: 'bg', label: { vi: 'Nền' }, accept: ['image'] }],
        skins: [],
      }),
    ).toThrow(/unknown asset slot "missingSlot"/);
  });

  test('rejects hotEditable paths that do not exist in configSchema', () => {
    expect(() =>
      defineTemplate({
        id: 'bad-hot-key',
        version: '1.0.0',
        kind: 'live',
        name: { vi: 'Sai hotEditable' },
        configSchema: baseConfigSchema,
        assetSlots: [{ key: 'banner', label: { vi: 'Banner' }, accept: ['image'] }],
        skins: [],
        hotEditable: ['copy.nonExistent'],
      }),
    ).toThrow(/hotEditable path "copy\.nonExistent" does not exist/);
  });

  test('accepts wildcard hotEditable path on nested object', () => {
    const tpl = defineTemplate({
      id: 'wildcard-hot',
      version: '1.0.0',
      kind: 'live',
      name: { vi: 'Wildcard' },
      configSchema: baseConfigSchema,
      assetSlots: [{ key: 'banner', label: { vi: 'Banner' }, accept: ['image'] }],
      skins: [],
      hotEditable: ['copy.*'],
    });
    expect(tpl.hotEditable).toContain('copy.title');
    expect(tpl.hotEditable).toContain('copy.subtitle');
  });

  test('rejects skins with duplicate keys, unknown asset slots, missing required slots, or invalid config', () => {
    const slots = [
      { key: 'banner', label: { vi: 'Banner' }, required: true, accept: ['image' as const] },
    ];

    // Duplicate skin key
    expect(() =>
      defineTemplate({
        id: 'dup-skin',
        version: '1.0.0',
        kind: 'live',
        name: { vi: 'Trùng skin' },
        configSchema: baseConfigSchema,
        assetSlots: slots,
        skins: [
          { key: 'tet', name: { vi: 'Tết 1' }, tags: [], assets: { banner: '/1.png' } },
          { key: 'tet', name: { vi: 'Tết 2' }, tags: [], assets: { banner: '/2.png' } },
        ],
      }),
    ).toThrow(/Duplicate skin key "tet"/);

    // Unknown slot key in skin.assets
    expect(() =>
      defineTemplate({
        id: 'unknown-skin-slot',
        version: '1.0.0',
        kind: 'live',
        name: { vi: 'Skin dư slot' },
        configSchema: baseConfigSchema,
        assetSlots: slots,
        skins: [
          {
            key: 'tet',
            name: { vi: 'Tết' },
            tags: [],
            assets: { banner: '/1.png', ghostSlot: '/ghost.png' },
          },
        ],
      }),
    ).toThrow(/unknown asset slot "ghostSlot"/);

    // Missing required asset slot in skin
    expect(() =>
      defineTemplate({
        id: 'missing-req-slot',
        version: '1.0.0',
        kind: 'live',
        name: { vi: 'Thiếu slot bắt buộc' },
        configSchema: baseConfigSchema,
        assetSlots: slots,
        skins: [{ key: 'tet', name: { vi: 'Tết' }, tags: [], assets: {} }],
      }),
    ).toThrow(/missing required asset slot "banner"/);

    // Invalid skin config value (out of range durationSec)
    expect(() =>
      defineTemplate({
        id: 'bad-skin-cfg',
        version: '1.0.0',
        kind: 'live',
        name: { vi: 'Sai config skin' },
        configSchema: baseConfigSchema,
        assetSlots: slots,
        skins: [
          {
            key: 'tet',
            name: { vi: 'Tết' },
            tags: [],
            assets: { banner: '/1.png' },
            config: { durationSec: 999 },
          },
        ],
      }),
    ).toThrow(/invalid config for "durationSec"/);
  });

  test('resolves skin assets, brandable logo, and per-slot overrides in order, and separates client/server exports', () => {
    const tpl = defineTemplate({
      id: 'asset-order',
      version: '1.0.0',
      kind: 'live',
      name: { vi: 'Thứ tự asset' },
      configSchema: baseConfigSchema,
      assetSlots: [
        { key: 'banner', label: { vi: 'Banner' }, required: true, accept: ['image'] },
        {
          key: 'logo',
          label: { vi: 'Logo' },
          required: false,
          brandable: true,
          accept: ['image'],
        },
      ],
      skins: [
        {
          key: 'tet',
          name: { vi: 'Tết' },
          tags: ['tet'],
          assets: { banner: '/tet/banner.png', logo: '/tet/default-logo.png' },
          config: { accentColor: '#EF4444' },
        },
      ],
    });

    const assets = resolveTemplateAssets(tpl, {
      skinKey: 'tet',
      brand: {
        logoUrl: 'https://cdn.playora.vn/org/logo.png',
        colors: { primary: '#111111', background: '#000000', text: '#FFFFFF' },
      },
      overrides: {
        banner: 'https://cdn.playora.vn/custom/banner.png',
      },
    });

    expect(assets.url('banner')).toBe('https://cdn.playora.vn/custom/banner.png');
    expect(assets.url('banner', { width: 640 })).toBe(
      'https://cdn.playora.vn/custom/banner.png?w=640',
    );
    expect(assets.url('logo')).toBe('https://cdn.playora.vn/org/logo.png');

    const cfg = resolveSkinConfig(tpl, 'tet', { durationSec: 45 });
    expect(cfg.accentColor).toBe('#EF4444');
    expect(cfg.durationSec).toBe(45);

    expect('createTestRoom' in clientSdk).toBe(false);
    expect('transitionRound' in clientSdk).toBe(false);
    expect('tapRaceTemplate' in clientSdk).toBe(false);

    expect(typeof serverSdk.defineTemplate).toBe('function');
    expect(typeof serverSdk.createTestRoom).toBe('function');
    expect(typeof serverSdk.transitionRound).toBe('function');
    expect(typeof serverSdk.describeConfigSchema).toBe('function');
    expect(typeof serverSdk.estimateClockOffset).toBe('function');
  });
});
