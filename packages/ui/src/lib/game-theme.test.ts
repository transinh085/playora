import { describe, expect, test } from 'bun:test';
import { brandKitVars, contrastRatio, parseHex, readableOn } from './game-theme';

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
