import { describe, expect, test } from 'bun:test';
import {
  brandKitVars,
  contrastRatio,
  gameThemeConfig,
  isDark,
  parseHex,
  readableOn,
  resolveGameTheme,
  skins,
} from './game-theme';
import { getStudioTheme } from './studio-theme';
import { tokens } from './tokens';

describe('contrast', () => {
  test('black on white is 21:1', () => {
    expect(contrastRatio('#000', '#ffffff')).toBeCloseTo(21, 5);
  });

  test('parses short and long hex, rejects garbage', () => {
    expect(parseHex('#f0a')).toEqual([255, 0, 170]);
    expect(parseHex('7C3AED')).toEqual([124, 58, 237]);
    expect(parseHex('red')).toBeNull();
  });

  test('picks dark text on yellow and white text on violet', () => {
    expect(readableOn('#ffd400')).not.toBe('#ffffff');
    expect(readableOn('#6d28d9')).toBe('#ffffff');
    expect(isDark('#ffd400')).toBe(false);
    expect(isDark('#6d28d9')).toBe(true);
  });
});

describe('brandKitVars', () => {
  test('maps colours and derives readable foregrounds', () => {
    const vars = brandKitVars({ primary: '#e30613', background: '#ffffff', radius: 'square' });
    expect(vars['--game-primary']).toBe('#e30613');
    expect(vars['--game-primary-fg']).toBe('#ffffff');
    expect(vars['--game-bg']).toBe('#ffffff');
    expect(vars['--game-fg']).not.toBe('#ffffff');
    expect(vars['--game-radius']).toBe('0.25rem');
  });

  test('replaces a text colour that is unreadable on the background', () => {
    const vars = brandKitVars({ background: '#101010', text: '#202020' });
    expect(vars['--game-fg']).toBe('#ffffff');
  });

  test('keeps a readable text colour', () => {
    const vars = brandKitVars({ background: '#101010', text: '#ffe08a' });
    expect(vars['--game-fg']).toBe('#ffe08a');
  });

  test('skips invalid colours so the skin shows through', () => {
    expect(brandKitVars({ primary: 'not-a-colour', accent: '' })).toEqual({});
  });
});

describe('gameThemeConfig & resolveGameTheme', () => {
  test('generates valid ThemeConfig for all shipped skins', () => {
    for (const skin of skins) {
      const resolved = resolveGameTheme({ skin });
      expect(resolved.skin).toBe(skin);
      expect(resolved.theme.token?.colorPrimary).toBeTruthy();
      expect(resolved.theme.token?.borderRadius).toBe(tokens.radius.game);
    }
  });

  test('overrides skin tokens with brand kit while preserving contrast', () => {
    const cfg = gameThemeConfig({
      skin: 'tet',
      brand: {
        primary: '#ffd400',
        background: '#101010',
        text: '#202020',
        radius: 'soft',
        fontDisplay: 'Unbounded',
      },
    });
    expect(cfg.token?.colorPrimary).toBe('#ffd400');
    expect(cfg.token?.colorTextLightSolid).toBe('#140b26');
    expect(cfg.token?.colorBgBase).toBe('#101010');
    expect(cfg.token?.colorTextBase).toBe('#ffffff');
    expect(cfg.token?.borderRadius).toBe(12);
    expect(cfg.token?.fontFamily).toContain('Unbounded');
  });
});

describe('studioTheme', () => {
  test('maps primitive tokens into light and dark ThemeConfig', () => {
    const lightCfg = getStudioTheme('light');
    const darkCfg = getStudioTheme('dark');
    expect(lightCfg.token?.colorPrimary).toBe(tokens.teal[600]);
    expect(darkCfg.token?.colorPrimary).toBe(tokens.teal[400]);
    expect(lightCfg.token?.borderRadius).toBe(8);
    expect(darkCfg.token?.borderRadius).toBe(8);
  });
});
