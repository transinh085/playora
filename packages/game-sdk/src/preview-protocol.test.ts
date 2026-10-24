import { describe, expect, test } from 'bun:test';
import {
  PREVIEW_READY_TYPE,
  PREVIEW_UPDATE_TYPE,
  PreviewMessage,
  PreviewReadyMessage,
  toPlayOutcome,
} from './preview-protocol';

describe('preview-protocol', () => {
  test('PreviewMessage parses valid Studio update payload and legacy update payloads', () => {
    const studioPayload = PreviewMessage.parse({
      type: PREVIEW_UPDATE_TYPE,
      config: { spins: 6 },
      skinKey: 'tet',
      brand: {
        logoUrl: 'https://cdn.example.com/logo.png',
        colors: {
          primary: '#F59E0B',
          secondary: '#EF4444',
          accent: '#F59E0B',
          background: '#0F172A',
          text: '#F8FAFC',
        },
        fontHeading: 'Inter',
      },
      locale: 'vi',
      outcome: 'win',
      assets: { 'asset-1': 'https://cdn.example.com/a1.png' },
    });

    expect(studioPayload.type).toBe('playora:preview-update');
    expect(studioPayload.skinKey).toBe('tet');
    expect(studioPayload.outcome).toBe('win');

    // Legacy / partial payload without explicit type is still accepted when known fields exist
    const partial = PreviewMessage.safeParse({
      config: { spins: 3 },
      outcome: {
        kind: 'win',
        prize: {
          id: 'p1',
          name: { vi: 'Giải đặc biệt' },
          type: 'physical',
        },
      },
    });
    expect(partial.success).toBe(true);
  });

  test('PreviewMessage rejects unrelated postMessage payloads and invalid fields', () => {
    expect(PreviewMessage.safeParse(null).success).toBe(false);
    expect(PreviewMessage.safeParse('hello').success).toBe(false);
    expect(PreviewMessage.safeParse({}).success).toBe(false);
    expect(PreviewMessage.safeParse({ source: 'react-devtools-content-script' }).success).toBe(
      false,
    );
    expect(PreviewMessage.safeParse({ type: PREVIEW_READY_TYPE }).success).toBe(false);
    expect(PreviewMessage.safeParse({ type: PREVIEW_UPDATE_TYPE, locale: 'fr' }).success).toBe(
      false,
    );
  });

  test('PreviewReadyMessage validates ready handshake', () => {
    expect(PreviewReadyMessage.safeParse({ type: PREVIEW_READY_TYPE }).success).toBe(true);
    expect(PreviewReadyMessage.safeParse({ type: PREVIEW_UPDATE_TYPE }).success).toBe(false);
  });

  test('toPlayOutcome converts presets and preserves full PlayOutcome objects', () => {
    expect(toPlayOutcome('win')).toEqual({
      kind: 'win',
      prize: {
        id: 'prize-1',
        name: { vi: 'Giải mẫu', en: 'Sample prize' },
        type: 'voucher_code',
      },
      voucherCode: 'DEMO-2026',
    });
    expect(toPlayOutcome('lose')).toEqual({ kind: 'lose' });
    expect(toPlayOutcome('out_of_stock')).toEqual({ kind: 'out_of_stock' });

    const customOutcome = {
      kind: 'win' as const,
      prize: { id: 'p-99', name: { vi: 'Quà' }, type: 'e_gift' as const },
    };
    expect(toPlayOutcome(customOutcome)).toBe(customOutcome);
  });
});
