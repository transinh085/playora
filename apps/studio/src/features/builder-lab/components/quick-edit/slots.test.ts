/// <reference types="bun" />
import { describe, expect, test } from 'bun:test';
import { presetSrc, SCREEN_KEYS } from '@/features/canvas-editor/lib/model';
import type { Campaign } from '../../api';
import { buildScreens, defaultPrizes, defaultRules, skinBrand } from '../../lib/starter';
import { presentSlots, readSlot, slotUsage, switchSkin, writeSlot } from './slots';

function campaign(): Campaign {
  const now = new Date().toISOString();
  return {
    id: 'c1',
    organizationId: 'org1',
    slug: 'test',
    name: 'Test',
    templateKey: 'spin-wheel',
    skinKey: 'tet',
    brand: skinBrand('tet'),
    screens: buildScreens('spin-wheel', 'tet'),
    prizes: defaultPrizes(),
    rules: defaultRules(),
    status: 'draft',
    phase: 'draft',
    paused: false,
    version: 0,
    publishedAt: null,
    hasUnpublishedChanges: false,
    updatedAt: now,
    createdAt: now,
  };
}

describe('quick edit slots', () => {
  test('the template exposes all five slots and the logo appears on two screens', () => {
    const doc = buildScreens('spin-wheel', 'tet');
    expect(presentSlots(doc)).toEqual(['logo', 'productPhoto', 'title', 'promoText', 'cta']);
    expect(slotUsage(doc, 'logo')).toBe(2);
  });

  test('writing a slot updates every element carrying it, on every screen', () => {
    const doc = buildScreens('spin-wheel', 'tet');
    const next = writeSlot(doc, 'logo', 'data:image/png;base64,xx');
    const logos = SCREEN_KEYS.flatMap((k) => next[k].elements.filter((e) => e.slot === 'logo'));
    expect(logos).toHaveLength(2);
    for (const logo of logos)
      expect(logo.type === 'image' && logo.src).toBe('data:image/png;base64,xx');
    // Screens without the slot keep their identity (cheap re-renders).
    expect(next.game).toBe(doc.game);
  });

  test('text and button slots write content and label', () => {
    let doc = buildScreens('gift-box', 'everyday');
    doc = writeSlot(doc, 'title', 'QUÀ TẶNG');
    doc = writeSlot(doc, 'cta', 'MỞ NGAY');
    expect(readSlot(doc, 'title')).toBe('QUÀ TẶNG');
    expect(readSlot(doc, 'cta')).toBe('MỞ NGAY');
  });

  test('switching skin keeps edited slots, resets untouched ones and keeps prizes', () => {
    const c = campaign();
    c.screens = writeSlot(c.screens, 'logo', 'data:custom-logo');
    c.prizes = [{ ...defaultPrizes()[0], name: 'Bánh mì' } as Campaign['prizes'][number]];
    const switched = switchSkin(c, 'grand-opening');
    expect(switched.skinKey).toBe('grand-opening');
    expect(switched.brand).toEqual(skinBrand('grand-opening'));
    expect(readSlot(switched.screens, 'logo')).toBe('data:custom-logo');
    // The default title follows the new skin instead of keeping "TẾT 2027".
    expect(readSlot(switched.screens, 'title')).toContain('KHAI TRƯƠNG');
    expect(readSlot(switched.screens, 'productPhoto')).toBe(presetSrc('coffee'));
    expect(c.prizes[0]?.name).toBe('Bánh mì');
  });
});
