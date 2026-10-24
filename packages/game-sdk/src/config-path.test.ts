import { describe, expect, test } from 'bun:test';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import {
  canonicalJson,
  collectAssetOccurrences,
  collectBuiltInAssetStrings,
  extractConfigAssetIds,
  getAtPath,
  isBuiltInAssetPath,
  pickAssetUrls,
  setAtPath,
  validateTemplateConfig,
} from './config-path';
import type { FieldDescriptor } from './types';

function computeHash(config: unknown): string {
  return createHash('sha256').update(canonicalJson(config)).digest('hex');
}

describe('config-path', () => {
  test('getAtPath and setAtPath read and write nested dot paths', () => {
    const target: Record<string, unknown> = {
      wheel: { spins: 5 },
      segments: [{ label: { vi: 'Giải 1' } }],
    };

    expect(getAtPath(target, '')).toBe(target);
    expect(getAtPath(target, 'wheel.spins')).toBe(5);
    expect(getAtPath(target, 'segments.0.label.vi')).toBe('Giải 1');
    expect(getAtPath(target, 'wheel.missing.deep')).toBeUndefined();
    expect(getAtPath(null, 'wheel.spins')).toBeUndefined();

    setAtPath(target, 'wheel.spinDurationSec', 4.5);
    setAtPath(target, 'copy.cta.vi', 'Quay ngay');
    expect(getAtPath(target, 'wheel.spinDurationSec')).toBe(4.5);
    expect(getAtPath(target, 'copy.cta.vi')).toBe('Quay ngay');

    // Overwriting a primitive intermediate creates an object
    setAtPath(target, 'wheel.spins.nested', true);
    expect(getAtPath(target, 'wheel.spins.nested')).toBe(true);
  });

  test('canonicalJson sorts object keys, omits undefined keys, converts undefined array items to null, and matches pinned SHA-256 hash fixture', () => {
    const fixtureA = {
      wheel: {
        spinDurationSec: 4.5,
        spins: 5,
        pointerPosition: 'top',
        unusedOptional: undefined,
      },
      copy: {
        cta: { en: 'Spin now', vi: 'Quay ngay' },
        title: { vi: 'Vòng quay may mắn', en: 'Lucky Wheel' },
      },
      segments: [
        {
          id: 'seg-1',
          color: '#EF4444',
          label: { vi: 'Giải nhất', en: 'First Prize' },
          prizeSlot: 'slot_1',
        },
        {
          prizeSlot: undefined,
          label: { vi: 'Chúc may mắn' },
          color: '#F59E0B',
          id: 'seg-2',
        },
      ],
      flags: [true, undefined, null, 0, 'ok'],
    };

    const fixtureB = {
      flags: [true, null, null, 0, 'ok'],
      segments: [
        {
          prizeSlot: 'slot_1',
          label: { en: 'First Prize', vi: 'Giải nhất' },
          id: 'seg-1',
          color: '#EF4444',
        },
        {
          id: 'seg-2',
          color: '#F59E0B',
          label: { vi: 'Chúc may mắn' },
        },
      ],
      copy: {
        title: { en: 'Lucky Wheel', vi: 'Vòng quay may mắn' },
        cta: { vi: 'Quay ngay', en: 'Spin now' },
      },
      wheel: {
        pointerPosition: 'top',
        spins: 5,
        spinDurationSec: 4.5,
      },
    };

    const expectedCanonical =
      '{"copy":{"cta":{"en":"Spin now","vi":"Quay ngay"},"title":{"en":"Lucky Wheel","vi":"Vòng quay may mắn"}},"flags":[true,null,null,0,"ok"],"segments":[{"color":"#EF4444","id":"seg-1","label":{"en":"First Prize","vi":"Giải nhất"},"prizeSlot":"slot_1"},{"color":"#F59E0B","id":"seg-2","label":{"vi":"Chúc may mắn"}}],"wheel":{"pointerPosition":"top","spinDurationSec":4.5,"spins":5}}';
    const expectedHash = createHash('sha256').update(expectedCanonical).digest('hex');

    expect(canonicalJson(fixtureA)).toBe(expectedCanonical);
    expect(canonicalJson(fixtureB)).toBe(expectedCanonical);
    expect(computeHash(fixtureA)).toBe(expectedHash);
    expect(computeHash(fixtureB)).toBe(expectedHash);
    expect(computeHash(fixtureA)).toBe(
      '6ccc5de72075bfb74afa4cdbed8f30007ab394c2ad8c3d85627254a9d73011b4',
    );
  });

  test('collectAssetOccurrences, collectBuiltInAssetStrings, isBuiltInAssetPath, and extractConfigAssetIds inspect nested fields', () => {
    const fields: FieldDescriptor[] = [
      {
        path: 'backgroundAsset',
        key: 'backgroundAsset',
        type: 'string',
        widget: 'asset',
        slotKey: 'bg',
        required: false,
        defaultValue: '/skins/tet/bg.png',
        hotEditable: true,
      },
      {
        path: 'audio',
        key: 'audio',
        type: 'object',
        widget: 'object',
        required: true,
        hotEditable: true,
        fields: [
          {
            path: 'audio.tickSound',
            key: 'tickSound',
            type: 'string',
            widget: 'sound',
            slotKey: 'tick',
            required: false,
            defaultValue: '/assets/spin-wheel/tick.mp3',
            hotEditable: true,
          },
        ],
      },
      {
        path: 'segments',
        key: 'segments',
        type: 'array',
        widget: 'list',
        required: true,
        hotEditable: false,
        item: {
          path: 'segments.*',
          key: '*',
          type: 'object',
          widget: 'object',
          required: true,
          hotEditable: false,
          fields: [
            {
              path: 'segments.*.icon',
              key: 'icon',
              type: 'string',
              widget: 'asset',
              slotKey: 'segment_icon',
              required: false,
              hotEditable: false,
            },
          ],
        },
      },
    ];

    const assetUuid1 = '01965b5e-1234-7000-8000-000000000001';
    const assetUuid2 = '01965b5e-1234-7000-8000-000000000002';

    const config = {
      backgroundAsset: assetUuid1,
      audio: {
        tickSound: '/assets/spin-wheel/tick.mp3',
      },
      segments: [{ icon: assetUuid2 }, { icon: '' }],
    };

    const occurrences = collectAssetOccurrences(fields, config);
    expect(occurrences).toEqual([
      {
        path: 'backgroundAsset',
        slotKey: 'bg',
        widget: 'asset',
        value: assetUuid1,
      },
      {
        path: 'audio.tickSound',
        slotKey: 'tick',
        widget: 'sound',
        value: '/assets/spin-wheel/tick.mp3',
      },
      {
        path: 'segments.0.icon',
        slotKey: 'segment_icon',
        widget: 'asset',
        value: assetUuid2,
      },
    ]);

    expect(extractConfigAssetIds(fields, config)).toEqual([assetUuid1, assetUuid2]);

    const builtIns = collectBuiltInAssetStrings({
      formDescriptor: { fields },
      skins: [{ assets: { bg: 'builtin://skin-bg' } }],
    });
    expect(isBuiltInAssetPath('builtin://skin-bg', builtIns)).toBe(true);
    expect(isBuiltInAssetPath('/assets/spin-wheel/tick.mp3', builtIns)).toBe(true);
    expect(isBuiltInAssetPath('/templates/wheel/frame.svg', builtIns)).toBe(true);
    expect(isBuiltInAssetPath(assetUuid1, builtIns)).toBe(false);

    expect(
      pickAssetUrls([assetUuid1, 'missing'], {
        [assetUuid1]: 'https://cdn.example.com/a1.png',
      }),
    ).toEqual({ [assetUuid1]: 'https://cdn.example.com/a1.png' });

    const templateStub = {
      configSchema: z.object({
        backgroundAsset: z.string().optional(),
        audio: z.object({ tickSound: z.string().optional() }),
        segments: z.array(z.object({ icon: z.string().optional() })),
      }),
      formDescriptor: { fields },
      assetSlots: [
        { key: 'bg', label: { vi: 'Nền' }, accept: ['image' as const] },
        { key: 'tick', label: { vi: 'Âm' }, accept: ['audio' as const] },
        { key: 'segment_icon', label: { vi: 'Icon' }, accept: ['image' as const] },
      ],
      skins: [{ assets: { bg: 'builtin://skin-bg' } }],
    };

    const validRes = validateTemplateConfig(templateStub, config);
    expect(validRes.ok).toBe(true);
    if (validRes.ok) {
      expect(validRes.externalAssets).toEqual([
        { path: 'backgroundAsset', assetId: assetUuid1, expectedAccept: ['image'] },
        { path: 'segments.0.icon', assetId: assetUuid2, expectedAccept: ['image'] },
      ]);
    }

    const badUrlRes = validateTemplateConfig(templateStub, {
      ...config,
      backgroundAsset: 'https://evil.example.com/direct.png',
    });
    expect(badUrlRes.ok).toBe(false);
    if (!badUrlRes.ok) {
      expect(badUrlRes.fieldErrors.backgroundAsset).toBeDefined();
    }
  });
});
