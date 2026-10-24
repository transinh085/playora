import { describe, expect, test } from 'bun:test';
import { z } from 'zod';
import { resolveSkinConfig, resolveTemplateAssets } from './assets';
import { defineTemplate, TemplateValidationError } from './define';
import { field } from './fields';
import { createPreviewSession } from './harness';
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

const dummyInstantServer = {
  present: () => ({ segmentIndex: 0 }),
};

describe('defineTemplate', () => {
  test('normalizes valid instant template definition and derives defaultConfig and formDescriptor', () => {
    const tpl = defineTemplate({
      id: 'lucky-draw',
      version: '1.2.0',
      kind: 'instant',
      name: { vi: 'Vòng quay may mắn', en: 'Lucky Spin' },
      description: { vi: 'Mô tả vòng quay', en: 'Spin description' },
      thumbnail: '/spin/thumb.png',
      tags: ['yep', 'instant'],
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
      server: dummyInstantServer,
    });

    expect(tpl.id).toBe('lucky-draw');
    expect(tpl.kind).toBe('instant');
    expect(tpl.meta).toEqual({
      name: { vi: 'Vòng quay may mắn', en: 'Lucky Spin' },
      description: { vi: 'Mô tả vòng quay', en: 'Spin description' },
      thumbnail: '/spin/thumb.png',
      tags: ['yep', 'instant'],
    });
    expect(tpl.defaultConfig.durationSec).toBe(30);
    expect(tpl.defaultConfig.accentColor).toBe('#FF5500');
    expect(tpl.defaultConfig.copy.title.vi).toBe('Xin chào');
    expect(tpl.hotEditable).toEqual(['copy.title', 'copy.subtitle']);
    expect(tpl.formDescriptor.groups).toEqual(['gameplay', 'appearance']);
  });

  test('validates discriminated union server modules for instant and skill templates', () => {
    expect(() =>
      defineTemplate({
        id: 'bad-instant',
        version: '1.0.0',
        kind: 'instant',
        name: { vi: 'Thiếu server' },
        configSchema: z.object({ durationSec: z.number().default(10) }),
        server: {} as never,
      }),
    ).toThrow(/Instant template must provide a server module with a present\(\) function/);

    expect(() =>
      defineTemplate({
        id: 'bad-skill',
        version: '1.0.0',
        kind: 'skill',
        name: { vi: 'Thiếu skill server' },
        configSchema: z.object({ durationSec: z.number().default(10) }),
        server: {} as never,
      }),
    ).toThrow(
      /Skill template must provide a server module with submissionSchema, validate\(\), and qualifies\(\)/,
    );
  });

  test('requires defaultConfig when configSchema has required fields without defaults', () => {
    expect(() =>
      defineTemplate({
        id: 'missing-default',
        version: '1.0.0',
        kind: 'instant',
        name: { vi: 'Thiếu default' },
        configSchema: z.object({
          durationSec: field.slider({ min: 10, max: 60 }),
        }),
        server: dummyInstantServer,
      }),
    ).toThrow(/defaultConfig required because configSchema has required fields without defaults/);
  });

  test('rejects duplicate asset slot keys', () => {
    expect(() =>
      defineTemplate({
        id: 'dup-slots',
        version: '1.0.0',
        kind: 'instant',
        name: { vi: 'Trùng slot' },
        configSchema: z.object({ durationSec: z.number().default(10) }),
        assetSlots: [
          { key: 'bg', label: { vi: 'Nền 1' }, accept: ['image'] },
          { key: 'bg', label: { vi: 'Nền 2' }, accept: ['image'] },
        ],
        skins: [],
        server: dummyInstantServer,
      }),
    ).toThrow(TemplateValidationError);
  });

  test('rejects config field referencing unknown asset slot key', () => {
    expect(() =>
      defineTemplate({
        id: 'bad-slot-ref',
        version: '1.0.0',
        kind: 'instant',
        name: { vi: 'Sai slot ref' },
        configSchema: z.object({
          sprite: field.asset('missingSlot', { default: '/a.png' }),
        }),
        assetSlots: [{ key: 'bg', label: { vi: 'Nền' }, accept: ['image'] }],
        skins: [],
        server: dummyInstantServer,
      }),
    ).toThrow(/unknown asset slot "missingSlot"/);
  });

  test('rejects hotEditable paths that do not exist in configSchema', () => {
    expect(() =>
      defineTemplate({
        id: 'bad-hot-key',
        version: '1.0.0',
        kind: 'instant',
        name: { vi: 'Sai hotEditable' },
        configSchema: baseConfigSchema,
        assetSlots: [{ key: 'banner', label: { vi: 'Banner' }, accept: ['image'] }],
        skins: [],
        hotEditable: ['copy.nonExistent'],
        server: dummyInstantServer,
      }),
    ).toThrow(/hotEditable path "copy\.nonExistent" does not exist/);
  });

  test('accepts wildcard hotEditable path on nested object', () => {
    const tpl = defineTemplate({
      id: 'wildcard-hot',
      version: '1.0.0',
      kind: 'instant',
      name: { vi: 'Wildcard' },
      configSchema: baseConfigSchema,
      assetSlots: [{ key: 'banner', label: { vi: 'Banner' }, accept: ['image'] }],
      skins: [],
      hotEditable: ['copy.*'],
      server: dummyInstantServer,
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
        kind: 'instant',
        name: { vi: 'Trùng skin' },
        configSchema: baseConfigSchema,
        assetSlots: slots,
        skins: [
          { key: 'tet', name: { vi: 'Tết 1' }, tags: [], assets: { banner: '/1.png' } },
          { key: 'tet', name: { vi: 'Tết 2' }, tags: [], assets: { banner: '/2.png' } },
        ],
        server: dummyInstantServer,
      }),
    ).toThrow(/Duplicate skin key "tet"/);

    // Unknown slot key in skin.assets
    expect(() =>
      defineTemplate({
        id: 'unknown-skin-slot',
        version: '1.0.0',
        kind: 'instant',
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
        server: dummyInstantServer,
      }),
    ).toThrow(/unknown asset slot "ghostSlot"/);

    // Missing required asset slot in skin
    expect(() =>
      defineTemplate({
        id: 'missing-req-slot',
        version: '1.0.0',
        kind: 'instant',
        name: { vi: 'Thiếu slot bắt buộc' },
        configSchema: baseConfigSchema,
        assetSlots: slots,
        skins: [{ key: 'tet', name: { vi: 'Tết' }, tags: [], assets: {} }],
        server: dummyInstantServer,
      }),
    ).toThrow(/missing required asset slot "banner"/);

    // Invalid skin config value (out of range durationSec)
    expect(() =>
      defineTemplate({
        id: 'bad-skin-cfg',
        version: '1.0.0',
        kind: 'instant',
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
        server: dummyInstantServer,
      }),
    ).toThrow(/invalid config for "durationSec"/);
  });

  test('resolves skin assets, brandable logo, and per-slot overrides in order, and exports createPreviewSession', () => {
    const tpl = defineTemplate({
      id: 'asset-order',
      version: '1.0.0',
      kind: 'instant',
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
      server: dummyInstantServer,
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

    // Resolves asset UUIDs stored in config via the render-time assets Record<assetId, url> map
    const assetUuid = '0195f1e2-1111-7000-8000-000000000001';
    const resolvedFromIds = resolveTemplateAssets(tpl, {
      skinKey: 'tet',
      config: { ...tpl.defaultConfig, heroBanner: assetUuid },
      assets: {
        [assetUuid]: 'https://s3.playora.vn/orgs/o1/assets/0195f1e2/original.png?sig=abc',
      },
    });
    expect(resolvedFromIds.url('banner')).toBe(
      'https://s3.playora.vn/orgs/o1/assets/0195f1e2/original.png?sig=abc',
    );
    expect(resolvedFromIds.url(assetUuid)).toBe(
      'https://s3.playora.vn/orgs/o1/assets/0195f1e2/original.png?sig=abc',
    );

    const cfg = resolveSkinConfig(tpl, 'tet', { durationSec: 45 });
    expect(cfg.accentColor).toBe('#EF4444');
    expect(cfg.durationSec).toBe(45);

    expect(typeof clientSdk.createPreviewSession).toBe('function');
    expect(typeof serverSdk.defineTemplate).toBe('function');
    expect(typeof serverSdk.createPreviewSession).toBe('function');
    expect(typeof serverSdk.describeConfigSchema).toBe('function');
  });

  test('createPreviewSession supports both instant and skill templates', async () => {
    const instantTpl = defineTemplate({
      id: 'instant-demo',
      version: '1.0.0',
      kind: 'instant',
      name: { vi: 'Quay nhanh' },
      configSchema: z.object({ bonus: z.number().default(2) }),
      server: {
        present: (outcome, config, rng) => ({
          won: outcome.kind === 'win',
          pick: Math.floor(rng() * config.bonus),
        }),
      },
    });

    const instantSession = createPreviewSession({
      template: instantTpl,
      outcome: {
        kind: 'win',
        prize: { id: 'voucher', name: { vi: 'Voucher 50k' }, type: 'voucher_code' },
      },
      rng: () => 0.75,
    });

    expect(instantSession.state).toBe('ready');
    expect(instantSession.result).toBeNull();
    await instantSession.start();
    expect(instantSession.state).toBe('done');
    expect(instantSession.result).toEqual({
      outcome: {
        kind: 'win',
        prize: { id: 'voucher', name: { vi: 'Voucher 50k' }, type: 'voucher_code' },
      },
      display: { won: true, pick: 1 },
    });

    const skillTpl = defineTemplate({
      id: 'skill-demo',
      version: '1.0.0',
      kind: 'skill',
      name: { vi: 'Hứng quà' },
      configSchema: z.object({ targetScore: z.number().default(100) }),
      server: {
        submissionSchema: z.object({ score: z.number().int().min(0) }),
        validate: (sub, ctx) => {
          if (ctx.endedAt <= ctx.startedAt) {
            return { ok: false, reason: 'invalid_duration' };
          }
          return { ok: true, score: sub.score };
        },
        qualifies: (score, config) => score >= config.targetScore,
        present: (outcome) => ({ badge: outcome.kind === 'win' ? 'gold' : 'silver' }),
      },
    });

    const winOutcome = {
      kind: 'win' as const,
      prize: { id: 'gift', name: { vi: 'Quà' }, type: 'physical' as const },
    };

    const skillSession = createPreviewSession({
      template: skillTpl,
      outcome: winOutcome,
    });

    await skillSession.start();
    expect(skillSession.state).toBe('playing');

    // Score below threshold -> outcome becomes lose
    await skillSession.submit({ score: 50 });
    expect(skillSession.state).toBe('done');
    expect(skillSession.result).toEqual({
      outcome: { kind: 'lose' },
      display: { badge: 'silver' },
    });

    // Score above threshold -> uses configured outcome
    await skillSession.start();
    await skillSession.submit({ score: 120 });
    expect(skillSession.state).toBe('done');
    expect(skillSession.result).toEqual({
      outcome: winOutcome,
      display: { badge: 'gold' },
    });

    // Invalid submission -> error state
    await skillSession.start();
    await skillSession.submit({ score: -5 });
    expect(skillSession.state).toBe('error');
    expect(skillSession.result).toBeNull();
  });
});
