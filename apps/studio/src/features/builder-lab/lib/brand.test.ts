import { describe, expect, it } from 'bun:test';
import type { BrandKitSummary } from '@playora/contracts';
import { readSlot } from '../components/quick-edit/slots';
import { applyBrandKitToScreens, brandFromKit, logoUrlFromKit } from './brand';
import { buildScreens } from './starter';

const sampleFiveColorKit: BrandKitSummary = {
  id: '22222222-2222-4222-8222-222222222222',
  organizationId: 'org_123',
  clientId: null,
  name: 'Trà Sữa Mộc',
  tokens: {
    colors: {
      primary: '#0f7c79',
      secondary: '#facf4e',
      accent: '#f59e0b',
      background: '#fffdf9',
      surface: '#f5efe6',
      text: '#1c1917',
    },
    fontHeading: 'Be Vietnam Pro',
    fontBody: 'Be Vietnam Pro',
    logoAssetId: '33333333-3333-4333-8333-333333333333',
    backgroundAssetId: null,
    musicAssetId: null,
  },
  createdAt: '2026-10-20T00:00:00.000Z',
  updatedAt: '2026-10-20T00:00:00.000Z',
};

describe('brandFromKit & applyBrandKitToScreens', () => {
  it('maps all 5 semantic brand colors from BrandKitSummary', () => {
    const brand = brandFromKit(sampleFiveColorKit);
    expect(brand).toEqual({
      primary: '#0f7c79',
      accent: '#f59e0b',
      background: '#fffdf9',
      surface: '#f5efe6',
      text: '#1c1917',
    });
  });

  it('falls back to secondary -> primary for accent and background for surface on legacy 4-color kits', () => {
    const legacyKit: BrandKitSummary = {
      ...sampleFiveColorKit,
      tokens: {
        ...sampleFiveColorKit.tokens,
        colors: {
          primary: '#c81e1e',
          secondary: '#fbbf24',
          background: '#450a0a',
          text: '#fef2f2',
        },
      },
    };
    expect(brandFromKit(legacyKit)).toEqual({
      primary: '#c81e1e',
      accent: '#fbbf24',
      background: '#450a0a',
      surface: '#450a0a',
      text: '#fef2f2',
    });
  });

  it('applies permanent logo URL to campaign screens when logoAssetId is present', () => {
    const logoUrl = logoUrlFromKit(sampleFiveColorKit);
    expect(logoUrl).toContain('/v1/public/assets/33333333-3333-4333-8333-333333333333');

    const baseScreens = buildScreens('spin-wheel', 'everyday');
    const updatedScreens = applyBrandKitToScreens(baseScreens, sampleFiveColorKit);
    expect(readSlot(updatedScreens, 'logo')).toBe(logoUrl);
  });
});
