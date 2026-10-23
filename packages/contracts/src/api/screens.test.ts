import { describe, expect, test } from 'bun:test';
import {
  buildScreenLaunchUrl,
  computeAspectFit,
  DEFAULT_SCREEN_LAYOUT,
  parseScreenKeyFragment,
  resolveScreenDimensions,
  ScreenLayout,
} from './screens';

describe('screens contracts & aspect-fit scaling', () => {
  test('ScreenLayout parses defaults and validates custom aspect dimensions', () => {
    expect(ScreenLayout.parse({})).toEqual(DEFAULT_SCREEN_LAYOUT);

    expect(
      ScreenLayout.parse({
        aspect: 'custom',
        custom: { width: 3840, height: 1200 },
        safeAreaPct: 4,
        qrPosition: 'top-left',
        qrSize: 'lg',
        showEventTitle: false,
      }),
    ).toEqual({
      aspect: 'custom',
      custom: { width: 3840, height: 1200 },
      safeAreaPct: 4,
      qrPosition: 'top-left',
      qrSize: 'lg',
      showEventTitle: false,
    });

    // Missing custom dimensions when aspect is 'custom' fails validation
    expect(ScreenLayout.safeParse({ aspect: 'custom' }).success).toBe(false);
    // Out-of-range safeAreaPct fails validation
    expect(ScreenLayout.safeParse({ safeAreaPct: 25 }).success).toBe(false);
    expect(ScreenLayout.safeParse({ safeAreaPct: -1 }).success).toBe(false);
  });

  test('resolveScreenDimensions returns expected logical resolutions for presets and custom', () => {
    expect(resolveScreenDimensions({ aspect: '16:9' })).toEqual({
      width: 1920,
      height: 1080,
      ratio: 16 / 9,
    });
    expect(resolveScreenDimensions({ aspect: '32:9' })).toEqual({
      width: 3840,
      height: 1080,
      ratio: 32 / 9,
    });
    expect(resolveScreenDimensions({ aspect: '9:16' })).toEqual({
      width: 1080,
      height: 1920,
      ratio: 9 / 16,
    });
    expect(
      resolveScreenDimensions({ aspect: 'custom', custom: { width: 2560, height: 1080 } }),
    ).toEqual({
      width: 2560,
      height: 1080,
      ratio: 2560 / 1080,
    });
  });

  test('computeAspectFit scales and letterboxes/pillarboxes stage into viewport', () => {
    // Exact 16:9 fit on 1920x1080
    expect(computeAspectFit({ width: 1920, height: 1080 }, { aspect: '16:9' })).toEqual({
      stageWidth: 1920,
      stageHeight: 1080,
      ratio: 16 / 9,
      width: 1920,
      height: 1080,
      scale: 1,
      offsetX: 0,
      offsetY: 0,
    });

    // Ultra-wide 32:9 stage on a 1920x1080 viewport -> letterboxed vertically (top/bottom bars)
    expect(computeAspectFit({ width: 1920, height: 1080 }, { aspect: '32:9' })).toEqual({
      stageWidth: 3840,
      stageHeight: 1080,
      ratio: 32 / 9,
      width: 1920,
      height: 540,
      scale: 0.5,
      offsetX: 0,
      offsetY: 270,
    });

    // Portrait 9:16 stage on a 1920x1080 viewport -> pillarboxed horizontally (left/right bars)
    expect(computeAspectFit({ width: 1920, height: 1080 }, { aspect: '9:16' })).toEqual({
      stageWidth: 1080,
      stageHeight: 1920,
      ratio: 9 / 16,
      width: 607.5,
      height: 1080,
      scale: 0.5625,
      offsetX: 656.25,
      offsetY: 0,
    });

    // Custom 2000x1000 (2:1) stage on 1000x800 viewport
    expect(
      computeAspectFit(
        { width: 1000, height: 800 },
        { aspect: 'custom', custom: { width: 2000, height: 1000 } },
      ),
    ).toEqual({
      stageWidth: 2000,
      stageHeight: 1000,
      ratio: 2,
      width: 1000,
      height: 500,
      scale: 0.5,
      offsetX: 0,
      offsetY: 150,
    });

    // Zero viewport guard
    expect(computeAspectFit({ width: 0, height: 0 }, { aspect: '16:9' })).toMatchObject({
      width: 0,
      height: 0,
      scale: 1,
    });
  });

  test('buildScreenLaunchUrl puts the key in the URL fragment and parseScreenKeyFragment reads it', () => {
    expect(buildScreenLaunchUrl('http://localhost:3002/', 'raw-key-123')).toBe(
      'http://localhost:3002/screen#k=raw-key-123',
    );
    expect(parseScreenKeyFragment('#k=fresh-key-123', 'old-key')).toEqual({
      key: 'fresh-key-123',
      fromFragment: true,
    });
    expect(parseScreenKeyFragment('', 'stored-key-456')).toEqual({
      key: 'stored-key-456',
      fromFragment: false,
    });
    expect(parseScreenKeyFragment('#other=1', null)).toEqual({
      key: null,
      fromFragment: false,
    });
  });
});
